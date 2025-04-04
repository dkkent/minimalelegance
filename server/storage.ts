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
  type InsertUserActivity
} from "@shared/schema";
import { db } from "./db";
import { and, eq, desc, gte, lte, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

// PostgreSQL session store
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  linkPartner(userId: number, partnerId: number): Promise<boolean>;
  getUserByInviteCode(inviteCode: string): Promise<User | undefined>;
  
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
  
  // Conversation starter related methods
  createConversationStarter(starter: InsertConversationStarter): Promise<ConversationStarter>;
  getConversationStartersByTheme(theme: string): Promise<ConversationStarter[]>;
  getRandomConversationStarter(theme?: string): Promise<ConversationStarter | undefined>;
  
  // User activity and garden health related methods
  recordUserActivity(userId: number, actionType: string): Promise<UserActivity>;
  getUserActivity(userId: number, fromDate: Date, toDate: Date): Promise<UserActivity[]>;
  getCurrentStreak(userId: number): Promise<number>;
  getGardenHealth(userId: number): Promise<number>;
  
  // Session store
  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

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
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
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

  async linkPartner(userId: number, partnerId: number): Promise<boolean> {
    try {
      // Update the user
      await db
        .update(users)
        .set({ partnerId, isIndividual: false })
        .where(eq(users.id, userId));
      
      // Update the partner
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

  async getUserByInviteCode(inviteCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.inviteCode, inviteCode));
    return user;
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
    // This query is more complex, as we need to join multiple tables and create a custom result
    const queryResults = await db.execute(sql`
      WITH user_loveslices AS (
        SELECT 
          l.*, 
          q.content as question_content, 
          q.theme as question_theme,
          CASE WHEN l.user1_id = ${userId} THEN r1.content ELSE r2.content END as user_response_content,
          CASE WHEN l.user1_id = ${userId} THEN r2.content ELSE r1.content END as partner_response_content,
          CASE WHEN l.user1_id = ${userId} THEN u2.id ELSE u1.id END as partner_id,
          CASE WHEN l.user1_id = ${userId} THEN u2.name ELSE u1.name END as partner_name
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
    
    return queryResults as any[];
  }

  async getLovesliceById(id: number): Promise<any | undefined> {
    const results = await db.execute(sql`
      SELECT 
        l.*,
        q.content as question_content,
        q.theme as question_theme,
        r1.content as response1_content,
        r2.content as response2_content,
        u1.name as user1_name,
        u2.name as user2_name
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
    return {
      ...result,
      question: {
        id: result.question_id,
        content: result.question_content,
        theme: result.question_theme
      },
      response1: {
        id: result.response1_id,
        content: result.response1_content
      },
      response2: {
        id: result.response2_id,
        content: result.response2_content
      },
      user1: {
        id: result.user1_id,
        name: result.user1_name
      },
      user2: {
        id: result.user2_id,
        name: result.user2_name
      }
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
  
  // Conversation starter methods
  async createConversationStarter(starter: InsertConversationStarter): Promise<ConversationStarter> {
    const [newStarter] = await db
      .insert(conversationStarters)
      .values(starter)
      .returning();
    
    return newStarter;
  }
  
  async getConversationStartersByTheme(theme: string): Promise<ConversationStarter[]> {
    return db.select().from(conversationStarters).where(eq(conversationStarters.theme, theme));
  }
  
  async getRandomConversationStarter(theme?: string): Promise<ConversationStarter | undefined> {
    let query = db.select().from(conversationStarters);
    
    if (theme) {
      query = query.where(eq(conversationStarters.theme, theme));
    }
    
    // Order by random and limit to 1
    const results = await query.orderBy(sql`RANDOM()`).limit(1);
    
    return results.length > 0 ? results[0] : undefined;
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
      // Both partners have responded, create a loveslice
      const lovesliceData: InsertLoveslice = {
        questionId: newResponse.questionId,
        user1Id: user.id,
        user2Id: user.partnerId,
        response1Id: newResponse.id,
        response2Id: partnerResponse.id,
        privateNote: null,
      };
      
      await this.createLoveslice(lovesliceData);
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
      lovesliceId: null
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
}

export const storage = new DatabaseStorage();