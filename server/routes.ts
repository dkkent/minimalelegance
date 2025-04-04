import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import { insertResponseSchema } from "@shared/schema";

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
      // In a real app, we would send an email here with the invite link
      // For now, we'll just return the invite code
      
      res.status(200).json({ 
        inviteCode: req.user.inviteCode,
        message: `In a production environment, an email would be sent to ${email} with your invite code.`
      });
    } catch (error) {
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
      const { password, ...userWithoutPassword } = updatedUser;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Get the current active question for the user
  app.get("/api/active-question", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const userId = req.user.id;
      let result = await storage.getActiveQuestionForUser(userId);
      
      // If the user doesn't have an active question, assign one
      if (!result) {
        // Get all available questions
        const allQuestions = await storage.getQuestions();
        
        // Randomly select a question
        const randomIndex = Math.floor(Math.random() * allQuestions.length);
        const selectedQuestion = allQuestions[randomIndex];
        
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
      
      res.status(200).json({
        ...result,
        userHasAnswered: !!userResponse,
        partnerHasAnswered: !!partnerResponse
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

  // Get a specific loveslice
  app.get("/api/loveslices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const loveslice = await storage.getLovesliceById(parseInt(req.params.id));
      
      if (!loveslice) {
        return res.status(404).json({ message: "Loveslice not found" });
      }
      
      // Check if the user is part of this loveslice
      if (loveslice.responses[0].user.id !== req.user.id && loveslice.responses[1].user.id !== req.user.id) {
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
      if (loveslice.responses[0].user.id !== req.user.id && loveslice.responses[1].user.id !== req.user.id) {
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
      let starters;
      
      if (theme && typeof theme === 'string') {
        // Get starters for a specific theme
        starters = await storage.getConversationStartersByTheme(theme);
      } else {
        // Get all starters from all themes by getting each theme and combining them
        const themes = ["Trust", "Intimacy", "Conflict", "Dreams", "Play", "Money"];
        starters = [];
        
        for (const themeItem of themes) {
          const themeStarters = await storage.getConversationStartersByTheme(themeItem);
          starters = [...starters, ...themeStarters];
        }
      }
      
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

  // Create the HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
