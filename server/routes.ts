import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { WebSocketServer, WebSocket } from 'ws';
import { 
  insertResponseSchema, 
  insertConversationSchema, 
  insertConversationMessageSchema,
  insertSpokenLovesliceSchema,
  insertJournalEntrySchema,
  conversationOutcomeEnum,
  activeQuestions,
  responses,
  questions
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, isNull, not } from "drizzle-orm";


export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Invite a partner
  app.post("/api/invite-partner", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { email, message } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Partner email is required" });
    }
    
    try {
      // Generate or retrieve invite code
      let inviteCode = req.user.inviteCode;
      
      // If no invite code exists for the user, generate one
      if (!inviteCode) {
        inviteCode = randomBytes(6).toString('hex');
        await storage.updateUser(req.user.id, { inviteCode });
      }
      
      // Import the sendPartnerInvitationEmail function only when needed
      // to avoid circular dependencies
      const { sendPartnerInvitationEmail } = await import('./utils/sendgrid');
      
      try {
        // Send the invitation email
        const emailSent = await sendPartnerInvitationEmail({
          to: email,
          inviterName: req.user.name,
          inviteCode,
          personalMessage: message
        });
        
        console.log(`Email sending result: ${emailSent ? 'success' : 'failed'}`);
        
        if (emailSent) {
          res.status(200).json({ 
            inviteCode,
            emailSent: true,
            message: `Invitation successfully sent to ${email}`
          });
        } else {
          // The email was not sent, but we have an invite code
          res.status(202).json({ 
            inviteCode,
            emailSent: false,
            message: `The invitation code was generated (${inviteCode}), but the email could not be sent. Please check your SendGrid configuration.`
          });
        }
      } catch (error) {
        const emailError = error as Error;
        console.error('Error sending invitation email:', emailError);
        res.status(202).json({ 
          inviteCode,
          emailSent: false,
          message: `Error sending email: ${emailError.message || 'Unknown error'}. Your invite code is: ${inviteCode}`
        });
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // Accept a partner invitation
  app.post("/api/accept-invitation", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ message: "Invite code is required" });
    }
    
    try {
      const inviter = await storage.getUserByInviteCode(inviteCode);
      if (!inviter) {
        return res.status(404).json({ message: "Invalid invite code" });
      }
      
      if (inviter.id === req.user.id) {
        return res.status(400).json({ message: "You cannot link with yourself" });
      }
      
      if (inviter.partnerId) {
        return res.status(400).json({ message: "This user is already linked with a partner" });
      }
      
      if (req.user.partnerId) {
        return res.status(400).json({ message: "You are already linked with a partner" });
      }
      
      const success = await storage.linkPartner(inviter.id, req.user.id);
      if (!success) {
        return res.status(500).json({ message: "Failed to link partners" });
      }
      
      const updatedUser = await storage.getUser(req.user.id);
      
      if (updatedUser) {
        const { password, ...userWithoutPassword } = updatedUser;
        res.status(200).json(userWithoutPassword);
      } else {
        res.status(500).json({ message: "Failed to retrieve updated user information" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Get the current active question for the user
  app.get("/api/active-question", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      const referer = req.query.referer as string || 'default';
      let result = await storage.getActiveQuestionForUser(userId);
      
      // If the user doesn't have an active question, or if the request is from question-page 
      // and the user has already answered the current question, assign a new one
      if (!result || (referer === 'question-page' && result && await storage.getResponsesByQuestionAndUser(result.question.id, userId))) {
        // Get all available questions
        const allQuestions = await storage.getQuestions();
        
        if (!allQuestions || allQuestions.length === 0) {
          return res.status(404).json({ message: "No questions available" });
        }
        
        // If we need to assign a new question, first mark the current one as answered if it exists
        if (result) {
          await storage.markActiveQuestionAsAnswered(result.activeQuestion.id);
        }
        
        // Find a question that hasn't been answered before or pick a random one if all have been answered
        let selectedQuestion;
        // This logic keeps track of answered questions to avoid showing them again
        const answeredQuestions = await db
          .select({
            questionId: activeQuestions.questionId
          })
          .from(activeQuestions)
          .where(eq(activeQuestions.userId, userId));
          
        const answeredQuestionIds = answeredQuestions.map(q => q.questionId);
        
        // Filter questions that haven't been answered yet
        const unansweredQuestions = allQuestions.filter(q => !answeredQuestionIds.includes(q.id));
        
        if (unansweredQuestions.length > 0) {
          // Randomly select from unanswered questions
          const randomIndex = Math.floor(Math.random() * unansweredQuestions.length);
          selectedQuestion = unansweredQuestions[randomIndex];
        } else {
          // If all questions have been answered, just pick a random one
          const randomIndex = Math.floor(Math.random() * allQuestions.length);
          selectedQuestion = allQuestions[randomIndex];
        }
        
        // Create an active question
        const activeQuestion = await storage.assignQuestionToUser({
          userId,
          questionId: selectedQuestion.id
        });
        
        result = {
          activeQuestion,
          question: selectedQuestion
        };
      }
      
      // Check if the user or their partner has already answered
      const userResponse = await storage.getResponsesByQuestionAndUser(
        result.question.id,
        userId
      );
      
      const partnerResponse = req.user.partnerId 
        ? await storage.getResponsesByQuestionAndUser(
            result.question.id,
            req.user.partnerId
          ) 
        : null;
      
      // For the home page, we don't want to automatically mark questions as answered
      // We only do that in the question-page view or after submitting a response
      if (userResponse && referer !== 'home-page') {
        await storage.markActiveQuestionAsAnswered(result.activeQuestion.id);
      }
      
      res.status(200).json({
        ...result,
        userHasAnswered: !!userResponse,
        partnerHasAnswered: !!partnerResponse,
        referer
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get active question" });
    }
  });

  // Submit a response to a question
  app.post("/api/responses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { questionId, content } = req.body;
      
      if (!questionId || !content) {
        return res.status(400).json({ message: "Question ID and response content are required" });
      }
      
      // Check if the question exists
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      // Check if the user has already answered this question
      const existingResponse = await storage.getResponsesByQuestionAndUser(
        questionId,
        req.user.id
      );
      
      if (existingResponse) {
        return res.status(400).json({ message: "You have already answered this question" });
      }
      
      // Create the response
      const response = await storage.createResponse({
        userId: req.user.id,
        questionId,
        content
      });
      
      // Mark the active question as answered so it doesn't show up again in the question page
      const activeQuestion = await storage.getActiveQuestionForUser(req.user.id);
      if (activeQuestion && activeQuestion.activeQuestion.questionId === questionId) {
        await storage.markActiveQuestionAsAnswered(activeQuestion.activeQuestion.id);
      }
      
      // Check if a loveslice was created (if both partners have answered)
      const partner = req.user.partnerId 
        ? await storage.getUser(req.user.partnerId) 
        : null;
      
      const partnerResponse = partner 
        ? await storage.getResponsesByQuestionAndUser(questionId, partner.id) 
        : null;
      
      res.status(201).json({
        response,
        lovesliceCreated: !!partnerResponse
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  // Get loveslices for the user
  app.get("/api/loveslices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const loveslices = await storage.getLoveslices(req.user.id);
      
      // Sort by creation date, newest first
      loveslices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.status(200).json(loveslices);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch loveslices" });
    }
  });
  
  // Get pending responses (questions user has answered but partner hasn't)
  app.get("/api/pending-responses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get all questions that the user has answered
      const userAnsweredQuestions = await db
        .select({
          questionId: responses.questionId
        })
        .from(responses)
        .where(eq(responses.userId, req.user.id));
      
      const questionIds = userAnsweredQuestions.map(q => q.questionId);
      
      if (questionIds.length === 0) {
        return res.status(200).json([]);
      }
      
      // For each question, get details
      const pendingResponses = [];
      
      for (const qId of questionIds) {
        const userResponse = await storage.getResponsesByQuestionAndUser(qId, req.user.id);
        const question = await storage.getQuestion(qId);
        
        // Check if a loveslice already exists for this question
        // We'll only show pending responses if the loveslice doesn't exist yet
        const existingLoveslices = await storage.getLoveslices(req.user.id);
        const lovesliceExists = existingLoveslices.some(ls => ls.question.id === qId);
        
        // Only add if there's no loveslice yet
        if (userResponse && question && !lovesliceExists) {
          pendingResponses.push({
            question,
            userResponse,
            answeredAt: userResponse.createdAt,
          });
        }
      }
      
      // Sort by creation date, newest first
      pendingResponses.sort((a, b) => new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime());
      
      res.status(200).json(pendingResponses);
    } catch (error) {
      console.error("Failed to fetch pending responses:", error);
      res.status(500).json({ message: "Failed to fetch pending responses" });
    }
  });

  // Get a specific loveslice
  app.get("/api/loveslices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const loveslice = await storage.getLovesliceById(parseInt(req.params.id));
      
      if (!loveslice) {
        return res.status(404).json({ message: "Loveslice not found" });
      }
      
      // Check if the user is part of this loveslice
      const participant1Id = loveslice.responses[0].user.id;
      const participant2Id = loveslice.responses[1].user.id;
      
      const isDirectParticipant = participant1Id === req.user.id || participant2Id === req.user.id;
      
      // If not a direct participant, check if user is a partner of one of the participants
      let isPartnerOfParticipant = false;
      if (!isDirectParticipant && req.user.partnerId) {
        isPartnerOfParticipant = participant1Id === req.user.partnerId || participant2Id === req.user.partnerId;
      }
      
      if (!isDirectParticipant && !isPartnerOfParticipant) {
        return res.status(403).json({ message: "You do not have access to this loveslice" });
      }
      
      res.status(200).json(loveslice);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch loveslice" });
    }
  });

  // Update a loveslice's private note
  app.patch("/api/loveslices/:id/note", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { note } = req.body;
      const lovesliceId = parseInt(req.params.id);
      
      // Get the loveslice to check ownership
      const loveslice = await storage.getLovesliceById(lovesliceId);
      
      if (!loveslice) {
        return res.status(404).json({ message: "Loveslice not found" });
      }
      
      // Check if the user is part of this loveslice
      const participant1Id = loveslice.responses[0].user.id;
      const participant2Id = loveslice.responses[1].user.id;
      
      const isDirectParticipant = participant1Id === req.user.id || participant2Id === req.user.id;
      
      // If not a direct participant, check if user is a partner of one of the participants
      let isPartnerOfParticipant = false;
      if (!isDirectParticipant && req.user.partnerId) {
        isPartnerOfParticipant = participant1Id === req.user.partnerId || participant2Id === req.user.partnerId;
      }
      
      if (!isDirectParticipant && !isPartnerOfParticipant) {
        return res.status(403).json({ message: "You do not have access to this loveslice" });
      }
      
      // Update the note
      const updatedLoveslice = await storage.updateLovesliceNote(lovesliceId, note);
      
      res.status(200).json({ success: true, privateNote: note });
    } catch (error) {
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  // Get conversation starters
  app.get("/api/conversation-starters", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { theme } = req.query;
      let starters: Awaited<ReturnType<typeof storage.getConversationStartersByTheme>> = [];
      
      if (theme && typeof theme === 'string') {
        // Get starters for a specific theme
        starters = await storage.getConversationStartersByTheme(theme);
      } else {
        // Get all starters from all themes by getting each theme and combining them
        const themes = ["Trust", "Intimacy", "Conflict", "Dreams", "Play", "Money"];
        
        for (const themeItem of themes) {
          const themeStarters = await storage.getConversationStartersByTheme(themeItem);
          starters = [...starters, ...themeStarters];
        }
      }
      
      // Sort starters by creation date (newest first)
      starters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.status(200).json(starters);
    } catch (error) {
      console.error("Failed to fetch conversation starters:", error);
      res.status(500).json({ message: "Failed to fetch conversation starters" });
    }
  });
  
  // Get a random conversation starter by theme
  app.get("/api/conversation-starters/random", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { theme } = req.query;
      const themeParam = typeof theme === 'string' ? theme : undefined;
      
      const starter = await storage.getRandomConversationStarter(themeParam);
      
      if (!starter) {
        return res.status(404).json({ message: "No conversation starters found" });
      }
      
      res.status(200).json(starter);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch conversation starter" });
    }
  });
  
  // Create a conversation starter
  app.post("/api/conversation-starters", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { content, theme, baseQuestionId, lovesliceId } = req.body;
      
      if (!content || !theme) {
        return res.status(400).json({ message: "Content and theme are required" });
      }
      
      const starter = await storage.createConversationStarter({
        content,
        theme,
        baseQuestionId: baseQuestionId || null,
        lovesliceId: lovesliceId || null
      });
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'create_starter');
      
      res.status(201).json(starter);
    } catch (error) {
      res.status(500).json({ message: "Failed to create conversation starter" });
    }
  });
  
  // Get user activity stats (streak and garden health)
  app.get("/api/user-activity/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const streak = await storage.getCurrentStreak(req.user.id);
      const gardenHealth = await storage.getGardenHealth(req.user.id);
      
      res.status(200).json({ streak, gardenHealth });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity stats" });
    }
  });
  
  // Get user activity history
  app.get("/api/user-activity/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Default to last 30 days if not specified
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - days);
      
      const activities = await storage.getUserActivity(req.user.id, fromDate, toDate);
      
      res.status(200).json(activities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity history" });
    }
  });
  
  // Record a user activity (manually trigger activity recording)
  app.post("/api/user-activity", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { actionType } = req.body;
      
      if (!actionType) {
        return res.status(400).json({ message: "Action type is required" });
      }
      
      const activity = await storage.recordUserActivity(req.user.id, actionType);
      
      res.status(201).json(activity);
    } catch (error) {
      res.status(500).json({ message: "Failed to record activity" });
    }
  });

  // ==============================================
  // NEW API ENDPOINTS FOR CONVERSATIONS
  // ==============================================
  
  // Get all conversations for the user
  app.get("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversations = await storage.getConversationsByUserId(req.user.id);
      res.status(200).json(conversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get a specific conversation
  app.get("/api/conversations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getConversationById(conversationId);
      
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user is part of this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // Get messages for this conversation
      const messages = await storage.getConversationMessages(conversationId);
      
      res.status(200).json({
        ...conversation,
        messages
      });
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Start a new conversation
  app.post("/api/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { lovesliceId, starterId } = req.body;
      
      if (!lovesliceId && !starterId) {
        return res.status(400).json({ message: "Either lovesliceId or starterId is required" });
      }
      
      // If lovesliceId is provided, check if user has access to it
      if (lovesliceId) {
        const loveslice = await storage.getLovesliceById(lovesliceId);
        if (!loveslice) {
          return res.status(404).json({ message: "Loveslice not found" });
        }
        
        const participant1Id = loveslice.responses[0].user.id;
        const participant2Id = loveslice.responses[1].user.id;
        
        const isDirectParticipant = participant1Id === req.user.id || participant2Id === req.user.id;
        
        // If not a direct participant, check if user is a partner of one of the participants
        let isPartnerOfParticipant = false;
        if (!isDirectParticipant && req.user.partnerId) {
          isPartnerOfParticipant = participant1Id === req.user.partnerId || participant2Id === req.user.partnerId;
        }
        
        if (!isDirectParticipant && !isPartnerOfParticipant) {
          return res.status(403).json({ message: "You do not have access to this loveslice" });
        }
        
        // Update loveslice to mark that a conversation was started from it
        await storage.updateLovesliceHasStartedConversation(lovesliceId, true);
      }
      
      // If starterId is provided, check if it exists and mark it as used
      if (starterId) {
        const starter = await storage.getConversationStarterById(starterId);
        if (!starter) {
          return res.status(404).json({ message: "Conversation starter not found" });
        }
        
        // Mark the conversation starter as used
        await storage.markConversationStarterAsUsed(starterId);
      }
      
      // Create the conversation
      const conversation = await storage.createConversation({
        lovesliceId: lovesliceId || null,
        starterId: starterId || null,
        initiatedByUserId: req.user.id,
      });
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'start_conversation');
      
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Initiate conversation ending (for shared ending flow)
  app.patch("/api/conversations/:id/initiate-end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // If a conversation is already ended, don't allow ending to be initiated
      if (conversation.endedAt) {
        return res.status(400).json({ message: "This conversation has already ended" });
      }
      
      // If ending is already initiated by this user, just return the conversation
      if (conversation.endInitiatedByUserId === req.user.id) {
        return res.status(200).json(conversation);
      }
      
      // Initiate ending
      const updatedConversation = await storage.initiateConversationEnding(conversationId, req.user.id);
      res.status(200).json(updatedConversation);
    } catch (error) {
      console.error("Failed to initiate conversation ending:", error);
      res.status(500).json({ message: "Failed to initiate conversation ending" });
    }
  });
  
  // Confirm conversation ending (when partner agrees to end)
  app.patch("/api/conversations/:id/confirm-end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      const { finalNote } = req.body;
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // If a conversation is already ended, don't allow it to be confirmed again
      if (conversation.endedAt) {
        return res.status(400).json({ message: "This conversation has already ended" });
      }
      
      // Check if an end has been initiated
      if (!conversation.endInitiatedByUserId) {
        return res.status(400).json({ message: "Conversation ending has not been initiated" });
      }
      
      // Don't let the same user who initiated also confirm
      if (conversation.endInitiatedByUserId === req.user.id) {
        return res.status(400).json({ message: "You already initiated the ending, waiting for partner confirmation" });
      }
      
      // Add final note if provided
      if (finalNote) {
        await storage.addConversationFinalNote(conversationId, finalNote);
      }
      
      // Confirm ending
      const updatedConversation = await storage.confirmConversationEnding(conversationId, req.user.id);
      res.status(200).json(updatedConversation);
    } catch (error) {
      console.error("Failed to confirm conversation ending:", error);
      res.status(500).json({ message: "Failed to confirm conversation ending" });
    }
  });
  
  // Cancel conversation ending (if either user changes their mind)
  app.patch("/api/conversations/:id/cancel-end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // If a conversation is already ended, don't allow cancellation
      if (conversation.endedAt) {
        return res.status(400).json({ message: "This conversation has already ended" });
      }
      
      // Cancel ending
      const updatedConversation = await storage.cancelConversationEnding(conversationId);
      res.status(200).json(updatedConversation);
    } catch (error) {
      console.error("Failed to cancel conversation ending:", error);
      res.status(500).json({ message: "Failed to cancel conversation ending" });
    }
  });
  
  // End a conversation and optionally create a spoken loveslice (legacy direct ending)
  app.patch("/api/conversations/:id/end", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      const { outcome, createSpokenLoveslice, theme, continueOffline } = req.body;
      
      // Validate outcome
      const validOutcomes = conversationOutcomeEnum.enumValues;
      if (!outcome || !validOutcomes.includes(outcome)) {
        return res.status(400).json({ 
          message: `Outcome is required and must be one of: ${validOutcomes.join(', ')}` 
        });
      }
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // If a conversation is already ended, don't allow it to be ended again
      if (conversation.endedAt) {
        return res.status(400).json({ message: "This conversation has already ended" });
      }
      
      // Calculate duration
      const now = new Date();
      const durationSeconds = Math.floor((now.getTime() - new Date(conversation.startedAt).getTime()) / 1000);
      
      // Update the conversation
      const updatedConversation = await storage.updateConversationOutcome(
        conversationId, 
        outcome, 
        durationSeconds
      );
      
      // If user wants to create a spoken loveslice or continue conversation offline
      let spokenLoveslice = null;
      // Only create a loveslice if the user has a partner (except for testing where we bypass this check)
      if ((createSpokenLoveslice || continueOffline)) {
        // We need a theme for the spoken loveslice
        if (!theme) {
          return res.status(400).json({ message: "Theme is required to create a spoken loveslice" });
        }
        
        // If continuing offline, add a message in the conversation noting this
        if (continueOffline) {
          await storage.createConversationMessage({
            conversationId,
            userId: req.user.id,
            content: "🌱 This conversation will continue in person. It has been saved as a Spoken Loveslice."
          });
        }
        
        // Create the spoken loveslice
        // For testing, if user doesn't have a partner, we can use their own ID
        const partnerId = req.user.partnerId || req.user.id;
        
        spokenLoveslice = await storage.createSpokenLoveslice({
          conversationId,
          user1Id: req.user.id,
          user2Id: partnerId,
          outcome,
          theme,
          durationSeconds,
          continuedOffline: !!continueOffline
        });
        
        // Mark the conversation as having created a spoken loveslice
        await storage.updateConversationCreatedSpokenLoveslice(conversationId, true);
        
        // Record user activity
        await storage.recordUserActivity(req.user.id, 'create_spoken_loveslice');
      }
      
      res.status(200).json({
        conversation: updatedConversation,
        spokenLoveslice
      });
    } catch (error) {
      console.error("Failed to end conversation:", error);
      res.status(500).json({ message: "Failed to end conversation" });
    }
  });

  // Add a message to a conversation
  app.post("/api/conversations/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }
      
      // Get the conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      if (conversation.initiatedByUserId !== req.user.id && 
          (!req.user.partnerId || conversation.initiatedByUserId !== req.user.partnerId)) {
        return res.status(403).json({ message: "You do not have access to this conversation" });
      }
      
      // Check if conversation has ended
      if (conversation.endedAt) {
        return res.status(400).json({ message: "Cannot add message to an ended conversation" });
      }
      
      // Create the message
      const message = await storage.createConversationMessage({
        conversationId,
        userId: req.user.id,
        content
      });
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'send_message');
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Failed to create message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });
  
  // ==============================================
  // NEW API ENDPOINTS FOR JOURNAL ENTRIES
  // ==============================================
  
  // Get all journal entries for the user
  app.get("/api/journal", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { theme, search } = req.query;
      let entries;
      
      if (search && typeof search === 'string') {
        // Search journal entries
        entries = await storage.searchJournalEntries(req.user.id, search);
      } else if (theme && typeof theme === 'string') {
        // Get entries by theme
        entries = await storage.getJournalEntriesByTheme(req.user.id, theme);
      } else {
        // Get all entries
        entries = await storage.getJournalEntriesByUserId(req.user.id);
      }
      
      // Sort entries by creation date, newest first
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.status(200).json(entries);
    } catch (error) {
      console.error("Failed to fetch journal entries:", error);
      res.status(500).json({ message: "Failed to fetch journal entries" });
    }
  });
  
  // Create a new journal entry
  app.post("/api/journal", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { writtenLovesliceId, spokenLovesliceId, theme, searchableContent } = req.body;
      
      if (!theme || !searchableContent) {
        return res.status(400).json({ message: "Theme and searchableContent are required" });
      }
      
      if (!writtenLovesliceId && !spokenLovesliceId) {
        return res.status(400).json({ message: "Either writtenLovesliceId or spokenLovesliceId is required" });
      }
      
      // Check if the user has a partner
      if (!req.user.partnerId) {
        return res.status(400).json({ message: "You need a partner to create journal entries" });
      }
      
      // Create the journal entry
      const entry = await storage.createJournalEntry({
        user1Id: req.user.id,
        user2Id: req.user.partnerId,
        writtenLovesliceId: writtenLovesliceId || null,
        spokenLovesliceId: spokenLovesliceId || null,
        theme,
        searchableContent
      });
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'create_journal_entry');
      
      res.status(201).json(entry);
    } catch (error) {
      console.error("Failed to create journal entry:", error);
      res.status(500).json({ message: "Failed to create journal entry" });
    }
  });
  
  // ==============================================
  // NEW API ENDPOINTS FOR SPOKEN LOVESLICES
  // ==============================================
  
  // Get all spoken loveslices for the user
  app.get("/api/spoken-loveslices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const spokenLoveslices = await storage.getSpokenLoveslicesByUserId(req.user.id);
      
      // Sort by creation date, newest first
      spokenLoveslices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      res.status(200).json(spokenLoveslices);
    } catch (error) {
      console.error("Failed to fetch spoken loveslices:", error);
      res.status(500).json({ message: "Failed to fetch spoken loveslices" });
    }
  });
  
  // Get a specific spoken loveslice
  app.get("/api/spoken-loveslices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const spokenLovesliceId = parseInt(req.params.id);
      const spokenLoveslice = await storage.getSpokenLovesliceById(spokenLovesliceId);
      
      if (!spokenLoveslice) {
        return res.status(404).json({ message: "Spoken loveslice not found" });
      }
      
      // Check if the user is part of this spoken loveslice or is a partner of someone in the loveslice
      const isDirectParticipant = spokenLoveslice.user1Id === req.user.id || spokenLoveslice.user2Id === req.user.id;
      
      // If not a direct participant, check if user is a partner of one of the participants
      let isPartnerOfParticipant = false;
      if (!isDirectParticipant && req.user.partnerId) {
        isPartnerOfParticipant = 
          spokenLoveslice.user1Id === req.user.partnerId || 
          spokenLoveslice.user2Id === req.user.partnerId;
      }
      
      if (!isDirectParticipant && !isPartnerOfParticipant) {
        return res.status(403).json({ message: "You do not have access to this spoken loveslice" });
      }
      
      // Get the associated conversation if it exists
      let conversation = null;
      if (spokenLoveslice.conversationId) {
        conversation = await storage.getConversationById(spokenLoveslice.conversationId);
        
        // Get messages for this conversation if it exists
        if (conversation) {
          const messages = await storage.getConversationMessages(spokenLoveslice.conversationId);
          conversation = { ...conversation, messages };
        }
      }
      
      res.status(200).json({
        ...spokenLoveslice,
        conversation
      });
    } catch (error) {
      console.error("Failed to fetch spoken loveslice:", error);
      res.status(500).json({ message: "Failed to fetch spoken loveslice" });
    }
  });
  
  // Mark a conversation starter as meaningful (after a good conversation)
  app.patch("/api/conversation-starters/:id/mark-meaningful", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const starterId = parseInt(req.params.id);
      
      const updatedStarter = await storage.markConversationStarterAsMeaningful(starterId);
      
      if (!updatedStarter) {
        return res.status(404).json({ message: "Conversation starter not found" });
      }
      
      // Record user activity
      await storage.recordUserActivity(req.user.id, 'mark_starter_meaningful');
      
      res.status(200).json(updatedStarter);
    } catch (error) {
      console.error("Failed to mark conversation starter as meaningful:", error);
      res.status(500).json({ message: "Failed to mark conversation starter as meaningful" });
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  
  // Set up WebSocket server for real-time communication
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Map to store user connections
  const userConnections = new Map<number, WebSocket>();
  
  wss.on('connection', function connection(ws) {
    // Initial connection state
    let userId: number | null = null;
    
    ws.on('message', async function incoming(message) {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle authentication message to identify user
        if (data.type === 'auth') {
          userId = data.userId;
          console.log(`User ${userId} connected to WebSocket`);
          // Ensure userId is a number before using it as a key
          if (typeof userId === 'number') {
            userConnections.set(userId, ws);
          }
        }
        
        // Handle conversation ending initiation
        else if (data.type === 'initiate_ending' && userId) {
          const { conversationId, partnerId, userName } = data;
          
          if (partnerId && userConnections.has(partnerId)) {
            const partnerWs = userConnections.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({
                type: 'ending_requested',
                conversationId,
                requestedBy: {
                  id: userId,
                  name: userName
                }
              }));
              console.log(`Sent ending request notification to user ${partnerId}`);
            }
          }
        }
        
        // Handle conversation ending confirmation
        else if (data.type === 'confirm_ending' && userId) {
          const { conversationId, partnerId } = data;
          
          if (partnerId && userConnections.has(partnerId)) {
            const partnerWs = userConnections.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({
                type: 'ending_confirmed',
                conversationId
              }));
              console.log(`Sent ending confirmation to user ${partnerId}`);
            }
          }
        }
        
        // Handle conversation ending cancellation
        else if (data.type === 'cancel_ending' && userId) {
          const { conversationId, partnerId } = data;
          
          if (partnerId && userConnections.has(partnerId)) {
            const partnerWs = userConnections.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({
                type: 'ending_cancelled',
                conversationId
              }));
              console.log(`Sent ending cancellation to user ${partnerId}`);
            }
          }
        }
        
        // Handle adding final note
        else if (data.type === 'add_final_note' && userId) {
          const { conversationId, partnerId, note } = data;
          
          if (partnerId && userConnections.has(partnerId)) {
            const partnerWs = userConnections.get(partnerId);
            if (partnerWs && partnerWs.readyState === WebSocket.OPEN) {
              partnerWs.send(JSON.stringify({
                type: 'final_note_added',
                conversationId,
                note
              }));
              console.log(`Sent final note update to user ${partnerId}`);
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', function() {
      if (userId) {
        console.log(`User ${userId} disconnected from WebSocket`);
        userConnections.delete(userId);
      }
    });
  });

  return httpServer;
}
