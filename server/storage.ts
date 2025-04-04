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
  type InsertActiveQuestion 
} from "@shared/schema";
import { randomBytes } from "crypto";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

// Storage interface
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
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private questions: Map<number, Question>;
  private responses: Map<number, Response>;
  private loveslices: Map<number, Loveslice>;
  private activeQuestions: Map<number, ActiveQuestion>;
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private questionIdCounter: number;
  private responseIdCounter: number;
  private lovesliceIdCounter: number;
  private activeQuestionIdCounter: number;

  constructor() {
    this.users = new Map();
    this.questions = new Map();
    this.responses = new Map();
    this.loveslices = new Map();
    this.activeQuestions = new Map();
    
    this.userIdCounter = 1;
    this.questionIdCounter = 1;
    this.responseIdCounter = 1;
    this.lovesliceIdCounter = 1;
    this.activeQuestionIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
    
    // Seed initial questions
    this.seedQuestions();
  }

  // User related methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const inviteCode = randomBytes(6).toString('hex');
    const user: User = { ...insertUser, id, inviteCode, partnerId: null };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async linkPartner(userId: number, partnerId: number): Promise<boolean> {
    const user = this.users.get(userId);
    const partner = this.users.get(partnerId);
    
    if (!user || !partner) return false;
    
    user.partnerId = partnerId;
    user.isIndividual = false;
    partner.partnerId = userId;
    partner.isIndividual = false;
    
    this.users.set(userId, user);
    this.users.set(partnerId, partner);
    
    return true;
  }

  async getUserByInviteCode(inviteCode: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.inviteCode === inviteCode,
    );
  }

  // Question related methods
  async getQuestions(): Promise<Question[]> {
    return Array.from(this.questions.values());
  }

  async getQuestion(id: number): Promise<Question | undefined> {
    return this.questions.get(id);
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const id = this.questionIdCounter++;
    const newQuestion: Question = { ...question, id };
    this.questions.set(id, newQuestion);
    return newQuestion;
  }

  async getQuestionsByTheme(theme: string): Promise<Question[]> {
    return Array.from(this.questions.values()).filter(
      (question) => question.theme === theme,
    );
  }

  // Active question related methods
  async assignQuestionToUser(data: InsertActiveQuestion): Promise<ActiveQuestion> {
    const id = this.activeQuestionIdCounter++;
    const now = new Date();
    const activeQuestion: ActiveQuestion = { 
      ...data, 
      id, 
      assignedAt: now, 
      isAnswered: false 
    };
    
    this.activeQuestions.set(id, activeQuestion);
    return activeQuestion;
  }

  async getActiveQuestionForUser(userId: number): Promise<{ activeQuestion: ActiveQuestion, question: Question } | undefined> {
    const activeQuestion = Array.from(this.activeQuestions.values()).find(
      (aq) => aq.userId === userId && !aq.isAnswered
    );
    
    if (!activeQuestion) return undefined;
    
    const question = this.questions.get(activeQuestion.questionId);
    if (!question) return undefined;
    
    return { activeQuestion, question };
  }

  async markActiveQuestionAsAnswered(id: number): Promise<ActiveQuestion | undefined> {
    const activeQuestion = this.activeQuestions.get(id);
    if (!activeQuestion) return undefined;
    
    activeQuestion.isAnswered = true;
    this.activeQuestions.set(id, activeQuestion);
    
    return activeQuestion;
  }

  // Response related methods
  async createResponse(response: InsertResponse): Promise<Response> {
    const id = this.responseIdCounter++;
    const now = new Date();
    const newResponse: Response = { ...response, id, createdAt: now };
    
    this.responses.set(id, newResponse);
    
    // Mark the active question as answered
    const activeQuestion = Array.from(this.activeQuestions.values()).find(
      (aq) => aq.userId === response.userId && aq.questionId === response.questionId && !aq.isAnswered
    );
    
    if (activeQuestion) {
      await this.markActiveQuestionAsAnswered(activeQuestion.id);
    }
    
    // Check if a loveslice can be created
    await this.checkAndCreateLoveslice(response);
    
    return newResponse;
  }

  async getResponsesByQuestionAndUser(questionId: number, userId: number): Promise<Response | undefined> {
    return Array.from(this.responses.values()).find(
      (response) => response.questionId === questionId && response.userId === userId
    );
  }

  // Loveslice related methods
  async createLoveslice(loveslice: InsertLoveslice): Promise<Loveslice> {
    const id = this.lovesliceIdCounter++;
    const now = new Date();
    const newLoveslice: Loveslice = { ...loveslice, id, createdAt: now, privateNote: null };
    
    this.loveslices.set(id, newLoveslice);
    return newLoveslice;
  }

  async getLoveslices(userId: number): Promise<any[]> {
    const loveslicesList = Array.from(this.loveslices.values()).filter(
      (ls) => ls.user1Id === userId || ls.user2Id === userId
    );
    
    return Promise.all(loveslicesList.map(async (ls) => {
      const question = await this.getQuestion(ls.questionId);
      const response1 = this.responses.get(ls.response1Id);
      const response2 = this.responses.get(ls.response2Id);
      const user1 = await this.getUser(ls.user1Id);
      const user2 = await this.getUser(ls.user2Id);
      
      return {
        id: ls.id,
        question,
        responses: [
          { user: user1, content: response1?.content },
          { user: user2, content: response2?.content }
        ],
        createdAt: ls.createdAt,
        privateNote: ls.privateNote
      };
    }));
  }

  async getLovesliceById(id: number): Promise<any | undefined> {
    const loveslice = this.loveslices.get(id);
    if (!loveslice) return undefined;
    
    const question = await this.getQuestion(loveslice.questionId);
    const response1 = this.responses.get(loveslice.response1Id);
    const response2 = this.responses.get(loveslice.response2Id);
    const user1 = await this.getUser(loveslice.user1Id);
    const user2 = await this.getUser(loveslice.user2Id);
    
    return {
      id: loveslice.id,
      question,
      responses: [
        { user: user1, content: response1?.content },
        { user: user2, content: response2?.content }
      ],
      createdAt: loveslice.createdAt,
      privateNote: loveslice.privateNote
    };
  }

  async updateLovesliceNote(id: number, note: string): Promise<Loveslice | undefined> {
    const loveslice = this.loveslices.get(id);
    if (!loveslice) return undefined;
    
    loveslice.privateNote = note;
    this.loveslices.set(id, loveslice);
    
    return loveslice;
  }

  // Helper methods
  private async checkAndCreateLoveslice(newResponse: Response): Promise<void> {
    const user = await this.getUser(newResponse.userId);
    if (!user || !user.partnerId) return;
    
    const partner = await this.getUser(user.partnerId);
    if (!partner) return;
    
    const partnerResponse = await this.getResponsesByQuestionAndUser(
      newResponse.questionId,
      partner.id
    );
    
    if (partnerResponse) {
      // Both partners have responded, create a loveslice
      await this.createLoveslice({
        questionId: newResponse.questionId,
        user1Id: user.id,
        user2Id: partner.id,
        response1Id: newResponse.id,
        response2Id: partnerResponse.id,
        privateNote: null
      });
    }
  }

  // Seed initial questions
  private async seedQuestions() {
    const questionsData: InsertQuestion[] = [
      // Trust theme
      { content: "What helps you feel safe enough to be fully yourself with me?", theme: "Trust" },
      { content: "What's one thing you've never told me, not because it's bad—but because it felt too vulnerable?", theme: "Trust" },
      
      // Intimacy theme
      { content: "What do you miss most when we're emotionally distant?", theme: "Intimacy" },
      { content: "How do you like to be touched when you're feeling sad?", theme: "Intimacy" },
      
      // Conflict theme
      { content: "When I withdraw during conflict, what do you imagine I'm feeling?", theme: "Conflict" },
      { content: "What's something you wish I understood better when we argue?", theme: "Conflict" },
      
      // Dreams theme
      { content: "If we could build a life anywhere, what would it look like?", theme: "Dreams" },
      { content: "What do you still hope to experience together that we haven't yet?", theme: "Dreams" },
      
      // Play theme
      { content: "What's one silly or spontaneous thing we could do this month?", theme: "Play" },
      { content: "When do you feel most light-hearted around me?", theme: "Play" }
    ];
    
    for (const question of questionsData) {
      await this.createQuestion(question);
    }
  }
}

export const storage = new MemStorage();
