import { 
  users, 
  type User, 
  type InsertUser, 
  questions, 
  type Question, 
  type InsertQuestion,
  responses, 
  type Response, 
  type InsertResponse,
  loveslices, 
  type Loveslice, 
  type InsertLoveslice,
  activeQuestions, 
  type ActiveQuestion, 
  type InsertActiveQuestion,
  conversationStarters,
  type ConversationStarter,
  type InsertConversationStarter,
  userActivity,
  type UserActivity,
  type InsertUserActivity,
  conversations,
  type Conversation,
  type InsertConversation,
  conversationMessages,
  type ConversationMessage,
  type InsertConversationMessage,
  spokenLoveslices,
  type SpokenLoveslice,
  type InsertSpokenLoveslice,
  journalEntries,
  type JournalEntry,
  type InsertJournalEntry,
  conversationOutcomeEnum,
  partnerships,
  type Partnership,
  type InsertPartnership,
  adminLogs,
  type AdminLog,
  type InsertAdminLog,
  userRoleEnum
} from "@shared/schema";
import { db } from "./db";
import { and, eq, desc, gte, lte, sql, or } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

// PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Helper methods
  formatUserProfilePicture<T extends {profilePicture?: string | null}>(user: T | undefined): T | undefined;
  
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  createPasswordResetToken(email: string): Promise<string | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  linkPartner(userId: number, partnerId: number): Promise<boolean>;
  disconnectPartners(userId: number, partnerId: number): Promise<boolean>;
  getUserByInviteCode(inviteCode: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  linkFirebaseAccount(userId: number, firebaseUid: string): Promise<User | undefined>;
  getPartner(userId: number): Promise<User | undefined>;
  getUserPartnerships(userId: number): Promise<Partnership[]>;
  getCurrentPartnership(userId: number): Promise<Partnership | undefined>;
  getActivePartnership(userId: number, partnerId: number): Promise<Partnership | undefined>;
  
  // Question related methods
  getQuestions(): Promise<Question[]>;
  getQuestion(id: number): Promise<Question | undefined>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  getQuestionsByTheme(theme: string): Promise<Question[]>;
  
  // Active question related methods
  assignQuestionToUser(data: InsertActiveQuestion): Promise<ActiveQuestion>;
  getActiveQuestionForUser(userId: number): Promise<{ activeQuestion: ActiveQuestion, question: Question } | undefined>;
  markActiveQuestionAsAnswered(id: number): Promise<ActiveQuestion | undefined>;
  
  // Response related methods
  createResponse(response: InsertResponse): Promise<Response>;
  getResponsesByQuestionAndUser(questionId: number, userId: number): Promise<Response | undefined>;
  
  // Loveslice related methods
  createLoveslice(loveslice: InsertLoveslice): Promise<Loveslice>;
  getLoveslices(userId: number): Promise<any[]>;
  getLovesliceById(id: number): Promise<any | undefined>;
  updateLovesliceNote(id: number, note: string): Promise<Loveslice | undefined>;
  updateLovesliceHasStartedConversation(id: number, hasStarted: boolean): Promise<Loveslice | undefined>;
  
  // Conversation related methods (for in-app follow-up discussions)
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversationById(id: number): Promise<Conversation | undefined>;
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  updateConversationOutcome(id: number, outcome: string, durationSeconds: number): Promise<Conversation | undefined>;
  initiateConversationEnding(id: number, userId: number): Promise<Conversation | undefined>;
  confirmConversationEnding(id: number, userId: number): Promise<Conversation | undefined>;
  addConversationFinalNote(id: number, note: string): Promise<Conversation | undefined>;
  cancelConversationEnding(id: number): Promise<Conversation | undefined>;
  
  // Conversation messages methods
  createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage>;
  getConversationMessages(conversationId: number): Promise<ConversationMessage[]>;
  
  // Spoken Loveslice methods (from meaningful conversations)
  createSpokenLoveslice(spokenLoveslice: InsertSpokenLoveslice): Promise<SpokenLoveslice>;
  getSpokenLoveslicesByUserId(userId: number): Promise<SpokenLoveslice[]>;
  getSpokenLovesliceById(id: number): Promise<SpokenLoveslice | undefined>;
  
  // Journal methods (for unified view of written and spoken loveslices)
  createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry>;
  getJournalEntriesByUserId(userId: number): Promise<JournalEntry[]>;
  searchJournalEntries(userId: number, query: string): Promise<JournalEntry[]>;
  getJournalEntriesByTheme(userId: number, theme: string): Promise<JournalEntry[]>;
  
  // Conversation starter related methods
  createConversationStarter(starter: InsertConversationStarter): Promise<ConversationStarter>;
  getConversationStartersByTheme(theme: string): Promise<ConversationStarter[]>;
  getRandomConversationStarter(theme?: string): Promise<ConversationStarter | undefined>;
  markConversationStarterAsMeaningful(id: number): Promise<ConversationStarter | undefined>;
  markConversationStarterAsUsed(id: number): Promise<ConversationStarter | undefined>;
  
  // User activity and garden health related methods
  recordUserActivity(userId: number, actionType: string): Promise<UserActivity>;
  getUserActivity(userId: number, fromDate: Date, toDate: Date): Promise<UserActivity[]>;
  getCurrentStreak(userId: number): Promise<number>;
  getGardenHealth(userId: number): Promise<number>;
  
  // Admin related methods
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: number, role: 'user' | 'admin' | 'superadmin'): Promise<User | undefined>;
  createAdminLog(log: InsertAdminLog): Promise<AdminLog>;
  getAdminLogs(offset?: number, limit?: number, adminId?: number, fromDate?: Date, toDate?: Date): Promise<{logs: AdminLog[], total: number}>;
  getUserCount(): Promise<number>;
  getPartnershipCount(): Promise<number>;
  getActiveUserCount(days?: number): Promise<number>;
  getRecentJournalEntryCount(days?: number): Promise<number>;
  getAllConversationStarters(): Promise<ConversationStarter[]>;
  getThemes(): Promise<string[]>;
  updateConversationStarter(id: number, data: Partial<ConversationStarter>): Promise<ConversationStarter | undefined>;
  deleteConversationStarter(id: number): Promise<boolean>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  /**
   * Helper function to ensure profile picture paths are properly formatted
   * Made public for use in API routes
   * @param user The user object to format
   * @returns A user object with properly formatted profile picture path
   */
  formatUserProfilePicture<T extends {profilePicture?: string | null}>(user: T | undefined): T | undefined {
    if (!user) return undefined;
    
    if (user.profilePicture) {
      // Only need to format if it's not empty
      if (user.profilePicture.trim() !== '') {
        const imagePath = user.profilePicture.startsWith('/') 
          ? user.profilePicture 
          : `/uploads/profile_pictures/${user.profilePicture}`;
          
        // Log for debugging
        console.log(`[formatUserProfilePicture] Original path: "${user.profilePicture}", Formatted path: "${imagePath}"`);
        
        // Update the user object
        user.profilePicture = imagePath;
      }
    }
    
    return user;
  }
  
  /**
   * Helper function to sanitize user data before sending to client
   * Removes sensitive fields like password, resetToken, etc.
   * @param user The user object to sanitize
   * @returns A sanitized user object safe for client consumption
   */
  private sanitizeUser<T extends Partial<User>>(user: T | undefined): Omit<T, 'password' | 'resetToken' | 'resetTokenExpiry'> | undefined {
    if (!user) return undefined;
    
    // Create a new object without sensitive fields
    const { 
      password, 
      resetToken, 
      resetTokenExpiry, 
      ...safeUserData 
    } = user as any;
    
    // NOTE: We don't need to format the profile picture here anymore
    // It's already done by formatUserProfilePicture which should be called before this
    
    return safeUserData;
  }

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true
    });

    // Seed questions and conversation starters (only run this once)
    this.seedQuestionsIfNeeded();
    this.seedConversationStartersIfNeeded();
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return this.formatUserProfilePicture(user);
  }
  
  /**
   * Get user data but sanitized for client consumption (removes sensitive fields)
   */
  async getSanitizedUser(id: number): Promise<Omit<User, 'password' | 'resetToken' | 'resetTokenExpiry'> | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    
    // First format the profile picture, then sanitize the user
    const formattedUser = this.formatUserProfilePicture(user);
    console.log(`[getSanitizedUser] Formatted user for ID ${id}:`, formattedUser?.profilePicture);
    
    return this.sanitizeUser(formattedUser);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return this.formatUserProfilePicture(user);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Generate a unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 10);
    
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, inviteCode })
      .returning();
    
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    
    return user;
  }
  
  async createPasswordResetToken(email: string): Promise<string | undefined> {
    // Find the user by email
    const user = await this.getUserByEmail(email);
    if (!user) return undefined;
    
    // Generate a random token
    const resetToken = Math.random().toString(36).substring(2, 15) + 
                       Math.random().toString(36).substring(2, 15);
    
    // Set token expiry to 1 hour from now
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Save the token to the user record
    await db
      .update(users)
      .set({ resetToken, resetTokenExpiry })
      .where(eq(users.id, user.id));
    
    return resetToken;
  }
  
  async getUserByResetToken(token: string): Promise<User | undefined> {
    // Format current timestamp as ISO string for proper comparison with DB date
    const now = new Date().toISOString();
    
    // Find user by reset token and ensure it's not expired
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.resetToken, token),
        // Ensure resetTokenExpiry is after current time (not expired)
        sql`${users.resetTokenExpiry} > ${now}`
      ));
    
    return this.formatUserProfilePicture(user);
  }
  
  async resetPassword(token: string, newPassword: string): Promise<boolean> {
    const user = await this.getUserByResetToken(token);
    if (!user) return false;
    
    // Update the user's password and clear the reset token
    await db
      .update(users)
      .set({ 
        password: newPassword, // Note: The password should be hashed by the caller
        resetToken: null,
        resetTokenExpiry: null
      })
      .where(eq(users.id, user.id));
    
    return true;
  }

  async linkPartner(userId: number, partnerId: number): Promise<boolean> {
    try {
      // Create a new partnership entry
      const [partnership] = await db
        .insert(partnerships)
        .values({
          user1Id: userId,
          user2Id: partnerId,
          isActive: true,
        })
        .returning();
      
      if (!partnership) {
        console.error("Failed to create partnership record");
        return false;
      }
      
      // Update both users with their partner's ID and set isIndividual to false
      await db
        .update(users)
        .set({ partnerId, isIndividual: false })
        .where(eq(users.id, userId));
      
      await db
        .update(users)
        .set({ partnerId: userId, isIndividual: false })
        .where(eq(users.id, partnerId));
      
      return true;
    } catch (error) {
      console.error("Error linking partners:", error);
      return false;
    }
  }
  
  async getActivePartnership(userId: number, partnerId: number): Promise<Partnership | undefined> {
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.isActive, true),
          or(
            and(
              eq(partnerships.user1Id, userId),
              eq(partnerships.user2Id, partnerId)
            ),
            and(
              eq(partnerships.user1Id, partnerId),
              eq(partnerships.user2Id, userId)
            )
          )
        )
      );
    
    return partnership;
  }
  
  async disconnectPartners(userId: number, partnerId: number): Promise<boolean> {
    try {
      // Find the active partnership
      const partnership = await this.getActivePartnership(userId, partnerId);
      
      if (!partnership) {
        console.error("No active partnership found between users");
        return false;
      }
      
      // Mark the partnership as inactive and set end date
      await db
        .update(partnerships)
        .set({ 
          isActive: false,
          endedAt: new Date()
        })
        .where(eq(partnerships.id, partnership.id));
      
      // Update both users - set partnerId to null and isIndividual to true
      await db
        .update(users)
        .set({ partnerId: null, isIndividual: true })
        .where(eq(users.id, userId));
      
      await db
        .update(users)
        .set({ partnerId: null, isIndividual: true })
        .where(eq(users.id, partnerId));
      
      return true;
    } catch (error) {
      console.error("Error disconnecting partners:", error);
      return false;
    }
  }

  async getUserByInviteCode(inviteCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.inviteCode, inviteCode));
    return this.formatUserProfilePicture(user);
  }
  
  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return this.formatUserProfilePicture(user);
  }
  
  async linkFirebaseAccount(userId: number, firebaseUid: string): Promise<User | undefined> {
    // First, check if this Firebase UID is already linked to another account
    const existingUser = await this.getUserByFirebaseUid(firebaseUid);
    if (existingUser && existingUser.id !== userId) {
      // This Firebase account is already linked to a different user
      throw new Error("This social account is already linked to another Loveslices account");
    }
    
    // Update the user with the Firebase UID
    const [user] = await db
      .update(users)
      .set({ firebaseUid })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }
  
  async unlinkFirebaseAccount(userId: number): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ firebaseUid: null })
      .where(eq(users.id, userId))
      .returning();
    
    return user;
  }
  
  async getPartner(userId: number): Promise<User | undefined> {
    // First get the user to find their partnerId
    const user = await this.getUser(userId);
    
    if (!user || !user.partnerId) {
      return undefined;
    }
    
    // Now get the partner's information
    return this.getUser(user.partnerId);
  }
  
  async getUserPartnerships(userId: number): Promise<Partnership[]> {
    // Get all partnerships where the user is either user1 or user2
    const partnershipList = await db
      .select()
      .from(partnerships)
      .where(
        or(
          eq(partnerships.user1Id, userId),
          eq(partnerships.user2Id, userId)
        )
      )
      .orderBy(desc(partnerships.startedAt));
    
    return partnershipList;
  }
  
  async getCurrentPartnership(userId: number): Promise<Partnership | undefined> {
    // Get the current active partnership if any
    const [partnership] = await db
      .select()
      .from(partnerships)
      .where(
        and(
          eq(partnerships.isActive, true),
          or(
            eq(partnerships.user1Id, userId),
            eq(partnerships.user2Id, userId)
          )
        )
      );
    
    return partnership;
  }

  async getQuestions(): Promise<Question[]> {
    return db.select().from(questions);
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    const [question] = await db.select().from(questions).where(eq(questions.id, id));
    return question;
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const [newQuestion] = await db
      .insert(questions)
      .values(question)
      .returning();
    
    return newQuestion;
  }

  async getQuestionsByTheme(theme: string): Promise<Question[]> {
    return db.select().from(questions).where(eq(questions.theme, theme));
  }

  async assignQuestionToUser(data: InsertActiveQuestion): Promise<ActiveQuestion> {
    const [activeQuestion] = await db
      .insert(activeQuestions)
      .values(data)
      .returning();
    
    return activeQuestion;
  }

  async getActiveQuestionForUser(userId: number): Promise<{ activeQuestion: ActiveQuestion, question: Question } | undefined> {
    const result = await db
      .select({
        activeQuestion: activeQuestions,
        question: questions
      })
      .from(activeQuestions)
      .innerJoin(questions, eq(activeQuestions.questionId, questions.id))
      .where(and(
        eq(activeQuestions.userId, userId),
        eq(activeQuestions.isAnswered, false)
      ))
      .limit(1);
    
    if (result.length === 0) return undefined;
    
    return {
      activeQuestion: result[0].activeQuestion,
      question: result[0].question
    };
  }

  async markActiveQuestionAsAnswered(id: number): Promise<ActiveQuestion | undefined> {
    const [updatedActiveQuestion] = await db
      .update(activeQuestions)
      .set({ isAnswered: true })
      .where(eq(activeQuestions.id, id))
      .returning();
    
    return updatedActiveQuestion;
  }

  async createResponse(response: InsertResponse): Promise<Response> {
    const [newResponse] = await db
      .insert(responses)
      .values(response)
      .returning();
    
    // Check if this response should create a loveslice (if partner has also answered)
    await this.checkAndCreateLoveslice(newResponse);
    
    return newResponse;
  }

  async getResponsesByQuestionAndUser(questionId: number, userId: number): Promise<Response | undefined> {
    const [response] = await db
      .select()
      .from(responses)
      .where(and(
        eq(responses.questionId, questionId),
        eq(responses.userId, userId)
      ));
    
    return response;
  }

  async createLoveslice(loveslice: InsertLoveslice): Promise<Loveslice> {
    const [newLoveslice] = await db
      .insert(loveslices)
      .values(loveslice)
      .returning();
    
    return newLoveslice;
  }

  async getLoveslices(userId: number): Promise<any[]> {
    // First, get the user to check if they have a partner
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
      
    // This query is more complex, as we need to join multiple tables and create a custom result
    let queryResults;
    
    if (!user || !user.partnerId) {
      // If user has no partner, only show their own loveslices
      queryResults = await db.execute(sql`
        WITH user_loveslices AS (
          SELECT 
            l.*, 
            q.content as question_content, 
            q.theme as question_theme,
            CASE WHEN l.user1_id = ${userId} THEN r1.content ELSE r2.content END as user_response_content,
            CASE WHEN l.user1_id = ${userId} THEN r2.content ELSE r1.content END as partner_response_content,
            CASE WHEN l.user1_id = ${userId} THEN u2.id ELSE u1.id END as partner_id,
            CASE WHEN l.user1_id = ${userId} THEN u2.name ELSE u1.name END as partner_name,
            CASE WHEN l.user1_id = ${userId} THEN u1.profile_picture ELSE u2.profile_picture END as user_profile_picture,
            CASE WHEN l.user1_id = ${userId} THEN u2.profile_picture ELSE u1.profile_picture END as partner_profile_picture
          FROM loveslices l
          JOIN questions q ON l.question_id = q.id
          JOIN responses r1 ON l.response1_id = r1.id
          JOIN responses r2 ON l.response2_id = r2.id
          JOIN users u1 ON l.user1_id = u1.id
          JOIN users u2 ON l.user2_id = u2.id
          WHERE l.user1_id = ${userId} OR l.user2_id = ${userId}
        )
        SELECT * FROM user_loveslices
        ORDER BY created_at DESC
      `);
    } else {
      // If user has a partner, also show loveslices where their partner is a participant
      queryResults = await db.execute(sql`
        WITH user_loveslices AS (
          SELECT 
            l.*, 
            q.content as question_content, 
            q.theme as question_theme,
            CASE 
              WHEN l.user1_id = ${userId} THEN r1.content 
              WHEN l.user2_id = ${userId} THEN r2.content
              WHEN l.user1_id = ${user.partnerId} THEN r1.content
              ELSE r2.content 
            END as user_response_content,
            CASE 
              WHEN l.user1_id = ${userId} THEN r2.content 
              WHEN l.user2_id = ${userId} THEN r1.content
              WHEN l.user1_id = ${user.partnerId} THEN r2.content
              ELSE r1.content 
            END as partner_response_content,
            CASE 
              WHEN l.user1_id = ${userId} THEN u2.id 
              WHEN l.user2_id = ${userId} THEN u1.id
              WHEN l.user1_id = ${user.partnerId} THEN u2.id
              ELSE u1.id 
            END as partner_id,
            CASE 
              WHEN l.user1_id = ${userId} THEN u2.name 
              WHEN l.user2_id = ${userId} THEN u1.name
              WHEN l.user1_id = ${user.partnerId} THEN u2.name
              ELSE u1.name 
            END as partner_name,
            CASE 
              WHEN l.user1_id = ${userId} THEN u1.profile_picture
              WHEN l.user2_id = ${userId} THEN u2.profile_picture
              WHEN l.user1_id = ${user.partnerId} THEN u1.profile_picture
              ELSE u2.profile_picture 
            END as user_profile_picture,
            CASE 
              WHEN l.user1_id = ${userId} THEN u2.profile_picture
              WHEN l.user2_id = ${userId} THEN u1.profile_picture
              WHEN l.user1_id = ${user.partnerId} THEN u2.profile_picture
              ELSE u1.profile_picture 
            END as partner_profile_picture
          FROM loveslices l
          JOIN questions q ON l.question_id = q.id
          JOIN responses r1 ON l.response1_id = r1.id
          JOIN responses r2 ON l.response2_id = r2.id
          JOIN users u1 ON l.user1_id = u1.id
          JOIN users u2 ON l.user2_id = u2.id
          WHERE l.user1_id = ${userId} OR l.user2_id = ${userId} OR l.user1_id = ${user.partnerId} OR l.user2_id = ${user.partnerId}
        )
        SELECT * FROM user_loveslices
        ORDER BY created_at DESC
      `);
    }
    
    return queryResults as any[];
  }

  async getLovesliceById(id: number): Promise<any | undefined> {
    const results = await db.execute(sql`
      SELECT 
        l.*,
        q.id as question_id,
        q.content as question_content,
        q.theme as question_theme,
        r1.id as response1_id,
        r1.content as response1_content,
        r1.created_at as response1_created_at,
        r2.id as response2_id,
        r2.content as response2_content,
        r2.created_at as response2_created_at,
        u1.id as user1_id,
        u1.name as user1_name,
        u1.email as user1_email,
        u1.partner_id as user1_partner_id,
        u1.profile_picture as user1_profile_picture,
        u2.id as user2_id,
        u2.name as user2_name,
        u2.email as user2_email,
        u2.partner_id as user2_partner_id,
        u2.profile_picture as user2_profile_picture
      FROM loveslices l
      JOIN questions q ON l.question_id = q.id
      JOIN responses r1 ON l.response1_id = r1.id
      JOIN responses r2 ON l.response2_id = r2.id
      JOIN users u1 ON l.user1_id = u1.id
      JOIN users u2 ON l.user2_id = u2.id
      WHERE l.id = ${id}
    `);
    
    if (results.length === 0) return undefined;
    
    const result = results[0] as any;
    
    // Restructure the response to match the expected format
    return {
      id: result.id,
      questionId: result.question_id,
      user1Id: result.user1_id,
      user2Id: result.user2_id,
      response1Id: result.response1_id,
      response2Id: result.response2_id,
      privateNote: result.private_note,
      type: result.type,
      hasStartedConversation: result.has_started_conversation,
      createdAt: result.created_at,
      question: {
        id: result.question_id,
        content: result.question_content,
        theme: result.question_theme,
        createdAt: null // We don't have this in the query
      },
      responses: [
        {
          id: result.response1_id,
          userId: result.user1_id,
          questionId: result.question_id,
          content: result.response1_content,
          createdAt: result.response1_created_at,
          user: this.formatUserProfilePicture({
            id: result.user1_id,
            name: result.user1_name,
            email: result.user1_email,
            partnerId: result.user1_partner_id,
            profilePicture: result.user1_profile_picture
          })
        },
        {
          id: result.response2_id,
          userId: result.user2_id,
          questionId: result.question_id,
          content: result.response2_content,
          createdAt: result.response2_created_at,
          user: this.formatUserProfilePicture({
            id: result.user2_id,
            name: result.user2_name,
            email: result.user2_email,
            partnerId: result.user2_partner_id,
            profilePicture: result.user2_profile_picture
          })
        }
      ]
    };
  }

  async updateLovesliceNote(id: number, note: string): Promise<Loveslice | undefined> {
    const [updatedLoveslice] = await db
      .update(loveslices)
      .set({ privateNote: note })
      .where(eq(loveslices.id, id))
      .returning();
    
    return updatedLoveslice;
  }
  
  async updateLovesliceHasStartedConversation(id: number, hasStarted: boolean): Promise<Loveslice | undefined> {
    const [updatedLoveslice] = await db
      .update(loveslices)
      .set({ hasStartedConversation: hasStarted })
      .where(eq(loveslices.id, id))
      .returning();
    
    return updatedLoveslice;
  }
  
  // Conversation starter methods
  async createConversationStarter(starter: InsertConversationStarter): Promise<ConversationStarter> {
    const [newStarter] = await db
      .insert(conversationStarters)
      .values(starter)
      .returning();
    
    return newStarter;
  }
  
  async getConversationStartersByTheme(theme: string): Promise<ConversationStarter[]> {
    return db.select()
      .from(conversationStarters)
      .where(eq(conversationStarters.theme, theme))
      .orderBy(desc(conversationStarters.createdAt)); // Sort by newest first
  }
  
  async getRandomConversationStarter(theme?: string): Promise<ConversationStarter | undefined> {
    let results;
    
    if (theme) {
      // If theme is provided, filter by theme and unused
      results = await db
        .select()
        .from(conversationStarters)
        .where(and(
          eq(conversationStarters.used, false),
          eq(conversationStarters.theme, theme)
        ))
        .orderBy(sql`RANDOM()`)
        .limit(1);
    } else {
      // Otherwise just filter by unused
      results = await db
        .select()
        .from(conversationStarters)
        .where(eq(conversationStarters.used, false))
        .orderBy(sql`RANDOM()`)
        .limit(1);
    }
    
    return results.length > 0 ? results[0] : undefined;
  }
  
  async getConversationStarterById(id: number): Promise<ConversationStarter | undefined> {
    const [starter] = await db
      .select()
      .from(conversationStarters)
      .where(eq(conversationStarters.id, id));
    
    return starter;
  }
  
  async markConversationStarterAsMeaningful(id: number): Promise<ConversationStarter | undefined> {
    const [updatedStarter] = await db
      .update(conversationStarters)
      .set({ markedAsMeaningful: true, used: true })
      .where(eq(conversationStarters.id, id))
      .returning();
    
    return updatedStarter;
  }
  
  async markConversationStarterAsUsed(id: number): Promise<ConversationStarter | undefined> {
    const [updatedStarter] = await db
      .update(conversationStarters)
      .set({ used: true })
      .where(eq(conversationStarters.id, id))
      .returning();
    
    return updatedStarter;
  }
  
  // User activity methods
  async recordUserActivity(userId: number, actionType: string): Promise<UserActivity> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize to start of day
    
    // Format the date as a string in YYYY-MM-DD format
    const todayStr = today.toISOString().split('T')[0];
    
    // Get previous day's activity to calculate streak
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if user already has activity for today
    const [existingActivity] = await db
      .select()
      .from(userActivity)
      .where(and(
        eq(userActivity.userId, userId),
        eq(sql`${userActivity.date}::text`, todayStr)
      ));
    
    if (existingActivity) {
      // Just return the existing activity, don't duplicate
      return existingActivity;
    }
    
    // Find the most recent activity to determine streak
    const [latestActivity] = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.date))
      .limit(1);
    
    let streak = 1;
    let gardenHealth = 100;
    
    if (latestActivity) {
      const latestDate = new Date(latestActivity.date);
      const dayDiff = Math.round((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDiff === 1) {
        // User was active yesterday, continue streak
        streak = latestActivity.streak + 1;
        gardenHealth = Math.min(100, latestActivity.gardenHealth + 5); // Increase health, max 100
      } else if (dayDiff > 1) {
        // Streak broken
        streak = 1;
        gardenHealth = Math.max(50, latestActivity.gardenHealth - (dayDiff * 10)); // Decrease health
      } else {
        // Same day (shouldn't happen due to the check above)
        streak = latestActivity.streak;
        gardenHealth = latestActivity.gardenHealth;
      }
    }
    
    // Create new activity record
    const [newActivity] = await db
      .insert(userActivity)
      .values({
        userId: userId,
        date: todayStr,
        actionType: actionType,
        streak: streak,
        gardenHealth: gardenHealth
      })
      .returning();
    
    return newActivity;
  }
  
  async getUserActivity(userId: number, fromDate: Date, toDate: Date): Promise<UserActivity[]> {
    const fromDateStr = fromDate.toISOString().split('T')[0];
    const toDateStr = toDate.toISOString().split('T')[0];
    
    return db
      .select()
      .from(userActivity)
      .where(and(
        eq(userActivity.userId, userId),
        sql`${userActivity.date}::text >= ${fromDateStr}`,
        sql`${userActivity.date}::text <= ${toDateStr}`
      ))
      .orderBy(userActivity.date);
  }
  
  async getCurrentStreak(userId: number): Promise<number> {
    const [latestActivity] = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.date))
      .limit(1);
    
    return latestActivity?.streak || 0;
  }
  
  async getGardenHealth(userId: number): Promise<number> {
    const [latestActivity] = await db
      .select()
      .from(userActivity)
      .where(eq(userActivity.userId, userId))
      .orderBy(desc(userActivity.date))
      .limit(1);
    
    return latestActivity?.gardenHealth || 100;
  }
  
  // Admin methods implementation
  
  /**
   * Get all users in the system (for admin use)
   * Returns users with profile pictures properly formatted
   */
  async getAllUsers(): Promise<User[]> {
    const userList = await db
      .select()
      .from(users)
      .orderBy(users.id);
    
    // Format each user's profile picture
    return userList.map(user => this.formatUserProfilePicture(user)!);
  }
  
  /**
   * Update user role (admin only)
   * @param userId The ID of the user to update
   * @param role The new role to assign
   * @returns The updated user object or undefined if not found
   */
  async updateUserRole(userId: number, role: 'user' | 'admin' | 'superadmin'): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        role,
        // If upgrading to admin, set the last login time
        ...(role === 'admin' || role === 'superadmin' ? { lastAdminLogin: new Date() } : {})
      })
      .where(eq(users.id, userId))
      .returning();
    
    return this.formatUserProfilePicture(user);
  }
  
  /**
   * Create an admin log entry
   * @param log The log data to insert
   * @returns The created log entry
   */
  async createAdminLog(log: InsertAdminLog): Promise<AdminLog> {
    const [newLog] = await db
      .insert(adminLogs)
      .values(log)
      .returning();
    
    return newLog;
  }
  
  /**
   * Get admin logs with pagination
   * @param offset The offset for pagination
   * @param limit The limit for pagination
   * @param adminId Optional: Filter by admin ID
   * @param fromDate Optional: Filter by date range start
   * @param toDate Optional: Filter by date range end
   * @returns Array of admin log entries
   */
  async getAdminLogs(offset = 0, limit = 50, adminId?: number, fromDate?: Date, toDate?: Date): Promise<{logs: AdminLog[], total: number}> {
    let query = db.select().from(adminLogs);
    
    // Apply filters if provided
    if (adminId) {
      query = query.where(eq(adminLogs.adminId, adminId));
    }
    
    if (fromDate && toDate) {
      query = query.where(
        and(
          gte(adminLogs.createdAt, fromDate),
          lte(adminLogs.createdAt, toDate)
        )
      );
    } else if (fromDate) {
      query = query.where(gte(adminLogs.createdAt, fromDate));
    } else if (toDate) {
      query = query.where(lte(adminLogs.createdAt, toDate));
    }
    
    // Get total count for pagination
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(adminLogs);
    const total = countResult[0]?.count || 0;
    
    // Apply pagination and sorting
    const logs = await query
      .orderBy(desc(adminLogs.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Enhance with admin names
    const adminIds = [...new Set(logs.map(log => log.adminId))];
    
    if (adminIds.length > 0) {
      const admins = await db.select({
        id: users.id,
        name: users.name
      })
      .from(users)
      .where(inArray(users.id, adminIds));
      
      const adminMap = new Map(admins.map(admin => [admin.id, admin.name]));
      
      return {
        logs: logs.map(log => ({
          ...log,
          adminName: adminMap.get(log.adminId) || 'Unknown Admin'
        })),
        total
      };
    }
    
    return { logs, total };
  }
  
  /**
   * Get all conversation starters with associated data
   * @returns Array of conversation starters with theme and creator info
   */
  async getAllConversationStarters(): Promise<{ starters: any[] }> {
    const starters = await db.select({
      id: questions.id,
      content: questions.content,
      themeId: questions.theme,
      isGlobal: questions.isPublic,
      createdAt: questions.created,
      createdBy: questions.createdBy
    })
    .from(questions)
    .orderBy(desc(questions.created));
    
    // Get related data (themes, creator users)
    const themeValues = await this.getThemes();
    const userIds = starters.map(s => s.createdBy).filter(Boolean);
    
    let userMap = new Map();
    if (userIds.length > 0) {
      const users = await db.select({
        id: users.id,
        name: users.name
      })
      .from(users)
      .where(inArray(users.id, userIds));
      
      userMap = new Map(users.map(u => [u.id, u.name]));
    }
    
    // Create a theme map for easy lookup
    const themeMap = new Map(themeValues.themes.map(t => [t.id, t]));
    
    // Enhance starters with related data
    const enhancedStarters = starters.map(starter => ({
      ...starter,
      themeName: themeMap.get(starter.themeId)?.name || 'Unknown',
      createdByName: starter.createdBy ? userMap.get(starter.createdBy) : null
    }));
    
    return { starters: enhancedStarters };
  }
  
  /**
   * Get all available themes
   * @returns Array of theme objects with id, name, and color
   */
  async getThemes(): Promise<{ themes: { id: number, name: string, color: string }[] }> {
    // For now, return hardcoded themes
    // In the future, this should come from a database table
    const themes = [
      { id: 1, name: 'Trust', color: '#4299e1' },
      { id: 2, name: 'Intimacy', color: '#ed64a6' },
      { id: 3, name: 'Growth', color: '#48bb78' },
      { id: 4, name: 'Communication', color: '#f6ad55' },
      { id: 5, name: 'Conflict Resolution', color: '#9f7aea' },
      { id: 6, name: 'Future Plans', color: '#667eea' }
    ];
    
    return { themes };
  }
  
  /**
   * Get total user count for admin dashboard
   * @returns The total number of users
   */
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return result[0]?.count || 0;
  }
  
  /**
   * Get total partnership count for admin dashboard
   * @returns The total number of partnerships (users with partners)
   */
  async getPartnershipCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(users)
      .where(
        and(
          isNotNull(users.partnerId),
          not(eq(users.partnerId, 0))
        )
      );
    
    // Each partnership involves 2 users, so divide by 2
    return Math.floor((result[0]?.count || 0) / 2);
  }
  
  /**
   * Get active user count for admin dashboard
   * @param days Number of days to consider for activity
   * @returns The number of users active in the specified timeframe
   */
  async getActiveUserCount(days = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Consider a user active if they have recent response, journal or login activity
    const activeUsers = await db.select({ userId: responses.userId })
      .from(responses)
      .where(gte(responses.created, cutoffDate))
      .groupBy(responses.userId);
    
    return activeUsers.length;
  }
  
  /**
   * Get recent journal entry count for admin dashboard
   * @param days Number of days to consider
   * @returns The number of journal entries in the specified timeframe
   */
  async getRecentJournalEntryCount(days = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(journalEntries)
      .where(gte(journalEntries.createdAt, cutoffDate));
    
    return result[0]?.count || 0;
  }
  
  /**
   * Update conversation starter
   * @param id The ID of the starter to update
   * @param data The data to update
   * @returns The updated starter or undefined if not found
   */
  async updateConversationStarter(id: number, data: { content?: string, themeId?: number, isGlobal?: boolean }): Promise<any> {
    const updateData: any = {};
    
    if (data.content !== undefined) updateData.content = data.content;
    if (data.themeId !== undefined) updateData.theme = data.themeId;
    if (data.isGlobal !== undefined) updateData.isPublic = data.isGlobal;
    
    const [updated] = await db
      .update(questions)
      .set(updateData)
      .where(eq(questions.id, id))
      .returning();
    
    return updated;
  }
  
  /**
   * Delete conversation starter
   * @param id The ID of the starter to delete
   * @returns Success status
   */
  async deleteConversationStarter(id: number): Promise<boolean> {
    const result = await db
      .delete(questions)
      .where(eq(questions.id, id));
    
    return true;
  }

  private async checkAndCreateLoveslice(newResponse: Response): Promise<void> {
    // Get the user who created this response
    const user = await this.getUser(newResponse.userId);
    if (!user || !user.partnerId) return;
    
    // Find if partner has responded to the same question
    const partnerResponse = await this.getResponsesByQuestionAndUser(
      newResponse.questionId,
      user.partnerId
    );
    
    if (partnerResponse) {
      // Get the question to include its theme
      const question = await this.getQuestion(newResponse.questionId);
      if (!question) return;
      
      // Both partners have responded, create a loveslice
      const lovesliceData: InsertLoveslice = {
        questionId: newResponse.questionId,
        user1Id: user.id,
        user2Id: user.partnerId,
        response1Id: newResponse.id,
        response2Id: partnerResponse.id,
        privateNote: null,
        type: "written",
        hasStartedConversation: false
      };
      
      // Create the loveslice
      const newLoveslice = await this.createLoveslice(lovesliceData);
      
      // Also create a journal entry for this loveslice for easier searching
      await this.createJournalEntry({
        user1Id: user.id,
        user2Id: user.partnerId,
        writtenLovesliceId: newLoveslice.id,
        spokenLovesliceId: null,
        theme: question.theme,
        searchableContent: `Written loveslice about ${question.theme}: "${question.content}" - Responses: "${newResponse.content}" and "${partnerResponse.content}"`
      });
    }
  }

  private async seedQuestionsIfNeeded() {
    // Check if we already have questions
    const existingQuestions = await db.select().from(questions).limit(1);
    if (existingQuestions.length > 0) {
      console.log("Questions already exist, skipping seed.");
      return;
    }

    console.log("Seeding questions...");
    
    // Trust theme
    await this.createQuestion({
      content: "What's one behavior that makes you feel the most secure in our relationship?",
      theme: "Trust",
    });
    await this.createQuestion({
      content: "What's one secret you've been hesitant to share with me?",
      theme: "Trust",
    });
    await this.createQuestion({
      content: "When have you felt most trusted by me?",
      theme: "Trust",
    });

    // Intimacy theme
    await this.createQuestion({
      content: "What's one way I could make you feel more loved that I'm not currently doing?",
      theme: "Intimacy",
    });
    await this.createQuestion({
      content: "What's a memory with me that you cherish the most?",
      theme: "Intimacy",
    });
    await this.createQuestion({
      content: "What physical touch makes you feel most connected to me?",
      theme: "Intimacy",
    });

    // Conflict theme
    await this.createQuestion({
      content: "What's one thing I do during disagreements that you wish I would stop?",
      theme: "Conflict",
    });
    await this.createQuestion({
      content: "What's something you wish I understood about how you handle conflict?",
      theme: "Conflict",
    });
    await this.createQuestion({
      content: "How can I better support you after we've had a disagreement?",
      theme: "Conflict",
    });

    // Dreams theme
    await this.createQuestion({
      content: "What's one dream for our future that you haven't told me about yet?",
      theme: "Dreams",
    });
    await this.createQuestion({
      content: "What's one adventure you'd love for us to experience together?",
      theme: "Dreams",
    });
    await this.createQuestion({
      content: "How do you envision our relationship evolving over the next five years?",
      theme: "Dreams",
    });

    // Play theme
    await this.createQuestion({
      content: "What activity or hobby would you like us to try together?",
      theme: "Play",
    });
    await this.createQuestion({
      content: "What's something playful or silly you'd like to see more of in our relationship?",
      theme: "Play",
    });
    await this.createQuestion({
      content: "When was the last time you felt truly carefree and joyful with me?",
      theme: "Play",
    });

    console.log("Seeding questions complete.");
  }
  
  private async seedConversationStartersIfNeeded() {
    // Check if we already have conversation starters
    const existingStarters = await db.select().from(conversationStarters).limit(1);
    if (existingStarters.length > 0) {
      console.log("Conversation starters already exist, checking for money theme starters...");
      
      // Check if we have Money theme starters
      const moneyStarters = await db
        .select()
        .from(conversationStarters)
        .where(eq(conversationStarters.theme, "Money"))
        .limit(1);
      
      // If Money theme starters exist, we're done
      if (moneyStarters.length > 0) {
        console.log("Money theme starters already exist, skipping seed.");
        return;
      }
      
      // Otherwise, just add the Money theme starters
      console.log("Adding Money theme conversation starters...");
      await this.seedMoneyThemeStarters();
      console.log("Money theme conversation starters added.");
      return;
    }
    
    console.log("Seeding conversation starters...");
    
    // Trust theme
    await this.createConversationStarter({
      content: "If we could improve one aspect of trust in our relationship, what would it be?",
      theme: "Trust",
      baseQuestionId: null,
      lovesliceId: null,
      markedAsMeaningful: false
    });
    await this.createConversationStarter({
      content: "What's something I do that makes you feel safe and secure?",
      theme: "Trust",
      baseQuestionId: null,
      lovesliceId: null
    });
    
    // Intimacy theme
    await this.createConversationStarter({
      content: "How would you describe our emotional connection right now?",
      theme: "Intimacy",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "What's a moment when you felt truly seen and understood by me?",
      theme: "Intimacy",
      baseQuestionId: null,
      lovesliceId: null
    });
    
    // Conflict theme
    await this.createConversationStarter({
      content: "Is there a recurring misunderstanding between us that we should address?",
      theme: "Conflict",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "What's your preferred way to resolve tension between us?",
      theme: "Conflict",
      baseQuestionId: null,
      lovesliceId: null
    });
    
    // Dreams theme
    await this.createConversationStarter({
      content: "What's something you hope we can accomplish together in the next year?",
      theme: "Dreams",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "If we could design our ideal day together, what would it look like?",
      theme: "Dreams",
      baseQuestionId: null,
      lovesliceId: null
    });
    
    // Play theme
    await this.createConversationStarter({
      content: "What's a childhood game or activity you'd love to share with me?",
      theme: "Play",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "How can we bring more spontaneity and fun into our daily routine?",
      theme: "Play",
      baseQuestionId: null,
      lovesliceId: null
    });
    
    // Money theme
    await this.seedMoneyThemeStarters();
    
    console.log("Seeding conversation starters complete.");
  }
  
  private async seedMoneyThemeStarters() {
    // Money theme starters
    await this.createConversationStarter({
      content: "What's one financial goal we could work toward together?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "How do our different spending habits affect our relationship?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "What financial decisions should we make together versus individually?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "What does financial security mean to you?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "How do you think our upbringing has shaped our views on money?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "What's one money habit you wish we could improve together?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "If we had a financial windfall, how would you want us to use it?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "How open should we be with each other about our individual finances?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "What are your thoughts on saving versus spending for experiences?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
    await this.createConversationStarter({
      content: "How should we balance individual financial freedom with shared goals?",
      theme: "Money",
      baseQuestionId: null,
      lovesliceId: null
    });
  }
  
  // Conversation methods start here
  
  // Conversation methods (follow-up discussions)
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db
      .insert(conversations)
      .values(conversation)
      .returning();
    
    return newConversation;
  }
  
  async getConversationById(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.id, id));
    
    if (!conversation) return undefined;
    
    // Since we can't directly add custom fields to the Conversation type,
    // we'll just return the conversation object as is.
    // The related data would need to be fetched separately using the IDs
    
    return conversation;
  }
  
  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    // Get user info to include with conversations
    const user = await this.getUser(userId);
    
    // Simple select to get all conversations for this user
    const conversationList = await db
      .select()
      .from(conversations)
      .where(
        eq(conversations.initiatedByUserId, userId)
      )
      .orderBy(desc(conversations.startedAt));
      
    // For each conversation, fetch the initiator and partner info
    const results = await Promise.all(conversationList.map(async (conversation) => {
      const initiatorId = conversation.initiatedByUserId;
      const initiator = await this.getUser(initiatorId);
      
      const partnerId = initiator?.partnerId;
      const partner = partnerId ? await this.getUser(partnerId) : null;
      
      return {
        conversation,
        initiatedBy: initiator ? {
          id: initiator.id,
          name: initiator.name,
          email: initiator.email,
          profilePicture: initiator.profilePicture
        } : null,
        partner: partner ? {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          profilePicture: partner.profilePicture
        } : null
      };
    }));
    
    // Format profile picture paths and return processed conversations
    return results.map(result => {
      const conversation = result.conversation;
      const initiatedBy = result.initiatedBy ? {
        ...result.initiatedBy,
        profilePicture: result.initiatedBy.profilePicture ? 
          (result.initiatedBy.profilePicture.startsWith('/') ? 
            result.initiatedBy.profilePicture : 
            `/uploads/profile_pictures/${result.initiatedBy.profilePicture}`) : 
          null
      } : null;
      
      const partnerInfo = result.partner ? {
        ...result.partner,
        profilePicture: result.partner.profilePicture ? 
          (result.partner.profilePicture.startsWith('/') ? 
            result.partner.profilePicture : 
            `/uploads/profile_pictures/${result.partner.profilePicture}`) : 
          null
      } : null;
      
      return {
        ...conversation,
        initiatedBy,
        partner: partnerInfo
      };
    });
  }
  
  async updateConversationOutcome(id: number, outcome: string, durationSeconds: number): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        outcome: outcome as any, // This cast is necessary because the enum types are complex
        durationSeconds,
        endedAt: new Date(),
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return updatedConversation;
  }
  
  async updateConversationCreatedSpokenLoveslice(id: number, created: boolean): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        createdSpokenLoveslice: created,
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return updatedConversation;
  }
  
  async initiateConversationEnding(id: number, userId: number): Promise<Conversation | undefined> {
    const now = new Date();
    
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        endInitiatedByUserId: userId,
        endInitiatedAt: now
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return updatedConversation;
  }
  
  async confirmConversationEnding(id: number, userId: number): Promise<Conversation | undefined> {
    const now = new Date();
    // Calculate duration in seconds from start to now
    const conversation = await this.getConversationById(id);
    if (!conversation) return undefined;
    
    const startTime = new Date(conversation.startedAt);
    const durationSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        endConfirmedByUserId: userId,
        endConfirmedAt: now,
        endedAt: now,
        durationSeconds
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return updatedConversation;
  }
  
  async addConversationFinalNote(id: number, note: string): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        finalNote: note
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return updatedConversation;
  }
  
  async cancelConversationEnding(id: number): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({
        endInitiatedByUserId: null,
        endInitiatedAt: null,
        endConfirmedByUserId: null,
        endConfirmedAt: null
      })
      .where(eq(conversations.id, id))
      .returning();
    
    return updatedConversation;
  }
  
  // Conversation messages methods
  async createConversationMessage(message: InsertConversationMessage): Promise<ConversationMessage> {
    const [newMessage] = await db
      .insert(conversationMessages)
      .values(message)
      .returning();
    
    return newMessage;
  }
  
  async getConversationMessages(conversationId: number): Promise<ConversationMessage[]> {
    const messages = await db
      .select({
        message: conversationMessages,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
          partnerId: users.partnerId,
          profilePicture: users.profilePicture
        }
      })
      .from(conversationMessages)
      .leftJoin(users, eq(conversationMessages.userId, users.id))
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(conversationMessages.createdAt);
    
    // Process the results to add the properly formatted profile picture path
    return messages.map(result => ({
      ...result.message,
      user: result.user ? {
        ...result.user,
        profilePicture: result.user.profilePicture ? 
          (result.user.profilePicture.startsWith('/') ? 
            result.user.profilePicture : 
            `/uploads/profile_pictures/${result.user.profilePicture}`) : 
          null
      } : null
    }));
  }
  
  // Spoken Loveslice methods
  async createSpokenLoveslice(spokenLoveslice: InsertSpokenLoveslice): Promise<SpokenLoveslice> {
    const [newSpokenLoveslice] = await db
      .insert(spokenLoveslices)
      .values(spokenLoveslice)
      .returning();
    
    // When a spoken loveslice is created, also create a journal entry for it
    const conversation = await this.getConversationById(spokenLoveslice.conversationId);
    
    if (conversation) {
      // Create journal entry for this spoken loveslice
      await this.createJournalEntry({
        user1Id: spokenLoveslice.user1Id,
        user2Id: spokenLoveslice.user2Id,
        writtenLovesliceId: null,
        spokenLovesliceId: newSpokenLoveslice.id,
        theme: spokenLoveslice.theme,
        searchableContent: `Spoken conversation about ${spokenLoveslice.theme}: ${
          spokenLoveslice.outcome === 'connected' ? 'We connected' :
          spokenLoveslice.outcome === 'tried_and_listened' ? 'We tried and listened' :
          spokenLoveslice.outcome === 'hard_but_honest' ? 'It was hard but honest' : 'We had a conversation'
        }`
      });
      
      // Update the conversation to mark it as having created a spoken loveslice
      await db
        .update(conversations)
        .set({ createdSpokenLoveslice: true })
        .where(eq(conversations.id, conversation.id));
    }
    
    return newSpokenLoveslice;
  }
  
  async getSpokenLoveslicesByUserId(userId: number): Promise<SpokenLoveslice[]> {
    // First, get the user to check if they have a partner
    const user = await this.getUser(userId);
    const partnerId = user?.partnerId;
    
    // Get the base spoken loveslices
    let spokenLoveslicesList;
    
    if (!partnerId) {
      // If user has no partner, only show their own loveslices
      spokenLoveslicesList = await db
        .select()
        .from(spokenLoveslices)
        .where(or(
          eq(spokenLoveslices.user1Id, userId),
          eq(spokenLoveslices.user2Id, userId)
        ))
        .orderBy(desc(spokenLoveslices.createdAt));
    } else {
      // If user has a partner, also show loveslices where their partner is a participant
      spokenLoveslicesList = await db
        .select()
        .from(spokenLoveslices)
        .where(or(
          eq(spokenLoveslices.user1Id, userId),
          eq(spokenLoveslices.user2Id, userId),
          eq(spokenLoveslices.user1Id, partnerId),
          eq(spokenLoveslices.user2Id, partnerId)
        ))
        .orderBy(desc(spokenLoveslices.createdAt));
    }
    
    // Enhance spoken loveslices with user data including properly formatted profile pictures
    for (const loveslice of spokenLoveslicesList) {
      // Get user data for both users in the spoken loveslice
      const user1 = await this.getUser(loveslice.user1Id);
      const user2 = await this.getUser(loveslice.user2Id);
      
      // Add user data to the loveslice (user data already includes formatted profile pictures through getUser)
      // The formatUserProfilePicture helper is automatically applied in getUser
      loveslice.user1 = user1;
      loveslice.user2 = user2;
    }
    
    return spokenLoveslicesList;
  }
  
  async getSpokenLovesliceById(id: number): Promise<SpokenLoveslice | undefined> {
    const [spokenLoveslice] = await db
      .select()
      .from(spokenLoveslices)
      .where(eq(spokenLoveslices.id, id));
    
    if (!spokenLoveslice) {
      return undefined;
    }
    
    // Get user data and format profile pictures for both users
    const user1 = await this.getUser(spokenLoveslice.user1Id);
    const user2 = await this.getUser(spokenLoveslice.user2Id);
    
    // Format profile picture paths explicitly using helper function
    const formattedUser1 = this.formatUserProfilePicture(user1);
    const formattedUser2 = this.formatUserProfilePicture(user2);
    
    // Add formatted user data to the spokenLoveslice object
    spokenLoveslice.user1 = formattedUser1;
    spokenLoveslice.user2 = formattedUser2;
    
    // If there's a conversation, also fetch messages with user data
    if (spokenLoveslice.conversationId) {
      const conversation = await this.getConversationById(spokenLoveslice.conversationId);
      
      if (conversation) {
        // Get messages with properly formatted user data (including profile pictures)
        const messages = await this.getConversationMessages(conversation.id);
        
        // For each message, add the user data with properly formatted profile pictures
        for (const message of messages) {
          const messageUser = await this.getUser(message.userId);
          message.user = messageUser; // getUser already applies formatUserProfilePicture
        }
        
        // Add the enhanced conversation with messages to the spoken loveslice
        spokenLoveslice.conversation = {
          ...conversation,
          messages
        };
      }
    }
    
    return spokenLoveslice;
  }
  
  // Journal methods
  async createJournalEntry(entry: InsertJournalEntry): Promise<JournalEntry> {
    const [newEntry] = await db
      .insert(journalEntries)
      .values(entry)
      .returning();
    
    return newEntry;
  }
  
  async getJournalEntriesByUserId(userId: number): Promise<JournalEntry[]> {
    // Get the user to check if they have a partner
    const user = await this.getUser(userId);
    const partnerId = user?.partnerId;

    // First, get all journal entries for this user and their partner if they have one
    const entries = await db
      .select()
      .from(journalEntries)
      .where(
        partnerId 
          ? or(
              // Include entries where either the user or their partner is involved
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId),
              eq(journalEntries.user1Id, partnerId),
              eq(journalEntries.user2Id, partnerId)
            )
          : or(
              // If no partner, only include this user's entries
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId)
            )
      )
      .orderBy(desc(journalEntries.createdAt));
    
    // Enhance entries with loveslice data
    for (const entry of entries) {
      // If it's a written loveslice, fetch the details
      if (entry.writtenLovesliceId) {
        const loveslice = await this.getLovesliceById(entry.writtenLovesliceId);
        if (loveslice) {
          // Get the question
          const question = await this.getQuestion(loveslice.questionId);
          
          // Get both responses
          const response1 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response1Id));
            
          const response2 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response2Id));
          
          // Get user info for the responses
          const user1 = await this.getUser(loveslice.user1Id);
          const user2 = await this.getUser(loveslice.user2Id);
            
          // Always explicitly format profile picture paths
          const formattedUser1 = this.formatUserProfilePicture(user1);
          const formattedUser2 = this.formatUserProfilePicture(user2);
          
          // Log the formatted user data for debugging
          console.log(`Journal entry user1: ${formattedUser1?.name}, ID: ${formattedUser1?.id}, profilePicture: ${formattedUser1?.profilePicture}`);
          console.log(`Journal entry user2: ${formattedUser2?.name}, ID: ${formattedUser2?.id}, profilePicture: ${formattedUser2?.profilePicture}`);
          
          // Add the data to the entry with properly formatted user objects for responses
          (entry as any).writtenLoveslice = {
            ...loveslice,
            question,
            responses: [
              { 
                ...response1[0], 
                user: formattedUser1 
              },
              { 
                ...response2[0], 
                user: formattedUser2
              }
            ]
          };
        }
      }
      
      // If it's a spoken loveslice, fetch the details
      if (entry.spokenLovesliceId) {
        // Use the method we just fixed which ensures proper profile picture formatting
        const spokenLoveslice = await this.getSpokenLovesliceById(entry.spokenLovesliceId);
        if (spokenLoveslice) {
          // Since getSpokenLovesliceById already handles user data and formatting,
          // just assign the result directly
          (entry as any).spokenLoveslice = spokenLoveslice;
        }
      }
    }
    
    return entries;
  }
  
  async searchJournalEntries(userId: number, query: string): Promise<JournalEntry[]> {
    // Get the user to check if they have a partner
    const user = await this.getUser(userId);
    const partnerId = user?.partnerId;
    
    // First get the base entries
    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(
        partnerId 
          ? or(
              // Include entries where either the user or their partner is involved
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId),
              eq(journalEntries.user1Id, partnerId),
              eq(journalEntries.user2Id, partnerId)
            )
          : or(
              // If no partner, only include this user's entries
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId)
            ),
        sql`${journalEntries.searchableContent} ILIKE ${`%${query}%`}`
      ))
      .orderBy(desc(journalEntries.createdAt));
    
    // Enhance entries with loveslice data (same as in getJournalEntriesByUserId)
    for (const entry of entries) {
      if (entry.writtenLovesliceId) {
        const loveslice = await this.getLovesliceById(entry.writtenLovesliceId);
        if (loveslice) {
          const question = await this.getQuestion(loveslice.questionId);
          
          const response1 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response1Id));
            
          const response2 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response2Id));
          
          // Get user info for the responses
          const user1 = await this.getUser(loveslice.user1Id);
          const user2 = await this.getUser(loveslice.user2Id);
          
          // Always explicitly format profile picture paths
          const formattedUser1 = this.formatUserProfilePicture(user1);
          const formattedUser2 = this.formatUserProfilePicture(user2);
            
          (entry as any).writtenLoveslice = {
            ...loveslice,
            question,
            responses: [
              { 
                ...response1[0], 
                user: formattedUser1 
              },
              { 
                ...response2[0], 
                user: formattedUser2
              }
            ]
          };
        }
      }
      
      if (entry.spokenLovesliceId) {
        // Use the method we just fixed which ensures proper profile picture formatting
        const spokenLoveslice = await this.getSpokenLovesliceById(entry.spokenLovesliceId);
        if (spokenLoveslice) {
          // Since getSpokenLovesliceById already handles user data and formatting,
          // just assign the result directly
          (entry as any).spokenLoveslice = spokenLoveslice;
        }
      }
    }
    
    return entries;
  }
  
  async getJournalEntriesByTheme(userId: number, theme: string): Promise<JournalEntry[]> {
    // Get the user to check if they have a partner
    const user = await this.getUser(userId);
    const partnerId = user?.partnerId;
    
    // First get the base entries
    const entries = await db
      .select()
      .from(journalEntries)
      .where(and(
        partnerId 
          ? or(
              // Include entries where either the user or their partner is involved
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId),
              eq(journalEntries.user1Id, partnerId),
              eq(journalEntries.user2Id, partnerId)
            )
          : or(
              // If no partner, only include this user's entries
              eq(journalEntries.user1Id, userId),
              eq(journalEntries.user2Id, userId)
            ),
        eq(journalEntries.theme, theme)
      ))
      .orderBy(desc(journalEntries.createdAt));
    
    // Enhance entries with loveslice data (same as in getJournalEntriesByUserId)
    for (const entry of entries) {
      if (entry.writtenLovesliceId) {
        const loveslice = await this.getLovesliceById(entry.writtenLovesliceId);
        if (loveslice) {
          const question = await this.getQuestion(loveslice.questionId);
          
          const response1 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response1Id));
            
          const response2 = await db
            .select()
            .from(responses)
            .where(eq(responses.id, loveslice.response2Id));
          
          // Get user info for the responses
          const user1 = await this.getUser(loveslice.user1Id);
          const user2 = await this.getUser(loveslice.user2Id);
          
          // Always explicitly format profile picture paths
          const formattedUser1 = this.formatUserProfilePicture(user1);
          const formattedUser2 = this.formatUserProfilePicture(user2);
            
          (entry as any).writtenLoveslice = {
            ...loveslice,
            question,
            responses: [
              { 
                ...response1[0], 
                user: formattedUser1 
              },
              { 
                ...response2[0], 
                user: formattedUser2
              }
            ]
          };
        }
      }
      
      if (entry.spokenLovesliceId) {
        // Use the method we just fixed which ensures proper profile picture formatting
        const spokenLoveslice = await this.getSpokenLovesliceById(entry.spokenLovesliceId);
        if (spokenLoveslice) {
          // Since getSpokenLovesliceById already handles user data and formatting,
          // just assign the result directly
          (entry as any).spokenLoveslice = spokenLoveslice;
        }
      }
    }
    
    return entries;
  }
  
  /**
   * Delete a user account and all associated data 
   * (or anonymize where needed to preserve relational integrity)
   */
  async deleteUser(id: number): Promise<boolean> {
    try {
      // Start a transaction for data consistency
      await db.transaction(async (tx) => {
        // Get user data for associated deletions
        const user = await this.getUser(id);
        if (!user) throw new Error("User not found");
        
        // Delete related data in relational order (child records first)
        
        // 1. Delete user's conversation messages
        await tx
          .delete(conversationMessages)
          .where(eq(conversationMessages.userId, id));
          
        // 2. Delete user's active questions
        await tx
          .delete(activeQuestions)
          .where(eq(activeQuestions.userId, id));
          
        // 3. Delete user's user activity records
        await tx
          .delete(userActivity)
          .where(eq(userActivity.userId, id));
          
        // 4. Delete journal entries
        await tx
          .delete(journalEntries)
          .where(or(
            eq(journalEntries.user1Id, id),
            eq(journalEntries.user2Id, id)
          ));
          
        // 5. Handle connected user (partner)
        if (user.partnerId) {
          // Update partner to be individual again
          await tx
            .update(users)
            .set({ 
              partnerId: null,
              isIndividual: true
            })
            .where(eq(users.id, user.partnerId));
        }
        
        // 6. Delete the user record
        await tx
          .delete(users)
          .where(eq(users.id, id));
      });
      
      return true;
    } catch (error) {
      console.error("Error deleting user:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();