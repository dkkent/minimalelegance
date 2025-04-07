import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, varchar, date, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User role enum
export const userRoleEnum = pgEnum("user_role", ["user", "admin", "superadmin"]);

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  partnerId: integer("partner_id"),
  inviteCode: text("invite_code"),
  isIndividual: boolean("is_individual").notNull().default(true),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  firebaseUid: text("firebase_uid").unique(),
  profilePicture: text("profile_picture"),
  role: userRoleEnum("role").default("user").notNull(),
  lastAdminLogin: timestamp("last_admin_login"),
});

// Partnerships table to track unique relationships between users
export const partnerships = pgTable("partnerships", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertPartnershipSchema = createInsertSchema(partnerships).pick({
  user1Id: true,
  user2Id: true,
});

export type InsertPartnership = z.infer<typeof insertPartnershipSchema>;
export type Partnership = typeof partnerships.$inferSelect;

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  isIndividual: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Questions schema
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  theme: text("theme").notNull(), // Using 'theme' as it exists in the database
  userGenerated: boolean("user_generated").default(false),
  isApproved: boolean("is_approved").default(true),
  createdById: integer("created_by_id").references(() => users.id),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  content: true,
  theme: true,
  userGenerated: true,
  isApproved: true,
  createdById: true,
});

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

// Responses schema
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertResponseSchema = createInsertSchema(responses).pick({
  userId: true,
  questionId: true,
  content: true,
});

export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responses.$inferSelect;

// Loveslices schema (written loveslices from question responses)
export const loveslices = pgTable("loveslices", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questions.id),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  response1Id: integer("response1_id").notNull().references(() => responses.id),
  response2Id: integer("response2_id").notNull().references(() => responses.id),
  partnershipId: integer("partnership_id").references(() => partnerships.id),
  privateNote: text("private_note"),
  type: text("type").notNull().default("written"), // 'written' or 'spoken'
  hasStartedConversation: boolean("has_started_conversation").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLovesliceSchema = createInsertSchema(loveslices).pick({
  questionId: true,
  user1Id: true,
  user2Id: true,
  response1Id: true,
  response2Id: true,
  partnershipId: true,
  privateNote: true,
  type: true,
  hasStartedConversation: true,
});

export type InsertLoveslice = z.infer<typeof insertLovesliceSchema>;
export type Loveslice = typeof loveslices.$inferSelect;

// Conversations schema (follow-up discussions after loveslices are formed)
export const conversationOutcomeEnum = pgEnum("conversation_outcome", [
  "connected",
  "tried_and_listened",
  "hard_but_honest",
  "no_outcome",
]);

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  lovesliceId: integer("loveslice_id").references(() => loveslices.id),
  starterId: integer("starter_id").references(() => conversationStarters.id),
  initiatedByUserId: integer("initiated_by_user_id").notNull().references(() => users.id),
  partnershipId: integer("partnership_id").references(() => partnerships.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  endedAt: timestamp("ended_at"),
  durationSeconds: integer("duration_seconds"),
  outcome: conversationOutcomeEnum("outcome").default("no_outcome"),
  createdSpokenLoveslice: boolean("created_spoken_loveslice").default(false),
  endInitiatedByUserId: integer("end_initiated_by_user_id").references(() => users.id),
  endInitiatedAt: timestamp("end_initiated_at"),
  endConfirmedByUserId: integer("end_confirmed_by_user_id").references(() => users.id),
  endConfirmedAt: timestamp("end_confirmed_at"),
  finalNote: text("final_note"),
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  lovesliceId: true,
  starterId: true,
  initiatedByUserId: true,
  partnershipId: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Conversation Messages schema
export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationMessageSchema = createInsertSchema(conversationMessages).pick({
  conversationId: true,
  userId: true,
  content: true,
});

export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type ConversationMessage = typeof conversationMessages.$inferSelect & {
  user?: User;
};

// Spoken Loveslices schema (from meaningful conversations)
export const spokenLoveslices = pgTable("spoken_loveslices", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  partnershipId: integer("partnership_id").references(() => partnerships.id),
  outcome: conversationOutcomeEnum("outcome").notNull(),
  theme: text("theme").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  continuedOffline: boolean("continued_offline").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSpokenLovesliceSchema = createInsertSchema(spokenLoveslices).pick({
  conversationId: true,
  user1Id: true,
  user2Id: true,
  partnershipId: true,
  outcome: true,
  theme: true,
  durationSeconds: true,
  continuedOffline: true,
});

export type InsertSpokenLoveslice = z.infer<typeof insertSpokenLovesliceSchema>;
export type SpokenLoveslice = typeof spokenLoveslices.$inferSelect & {
  // Extended properties for hydrated/joined data
  user1?: User;
  user2?: User;
  conversation?: Conversation & {
    messages?: ConversationMessage[];
  };
};

// Active questions schema (questions assigned to users)
export const activeQuestions = pgTable("active_questions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  isAnswered: boolean("is_answered").notNull().default(false),
  isSkipped: boolean("is_skipped").notNull().default(false),
  skipNote: text("skip_note"),
  skippedAt: timestamp("skipped_at"),
});

export const insertActiveQuestionSchema = createInsertSchema(activeQuestions).pick({
  userId: true,
  questionId: true,
});

export type InsertActiveQuestion = z.infer<typeof insertActiveQuestionSchema>;
export type ActiveQuestion = typeof activeQuestions.$inferSelect;

// Conversation starters schema
// Note: This table has both direct fields (content, theme) and references to the questions table
// The new unified approach will gradually shift to using only the questions table reference
export const conversationStarters = pgTable("conversation_starters", {
  id: serial("id").primaryKey(),
  baseQuestionId: integer("base_question_id").references(() => questions.id),
  lovesliceId: integer("loveslice_id").references(() => loveslices.id),
  markedAsMeaningful: boolean("marked_as_meaningful").default(false),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // These fields are in the database but will be deprecated in favor of the questions table
  content: text("content"),
  theme: text("theme"),
});

export const insertConversationStarterSchema = createInsertSchema(conversationStarters).pick({
  baseQuestionId: true,
  lovesliceId: true,
  markedAsMeaningful: true,
  used: true,
  content: true,
  theme: true,
});

export type InsertConversationStarter = z.infer<typeof insertConversationStarterSchema>;
export type ConversationStarter = typeof conversationStarters.$inferSelect & {
  question?: Question; // For join operations
};

// Journal Entries schema (for search/browsing across all loveslices and conversations)
export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  partnershipId: integer("partnership_id").references(() => partnerships.id),
  writtenLovesliceId: integer("written_loveslice_id").references(() => loveslices.id),
  spokenLovesliceId: integer("spoken_loveslice_id").references(() => spokenLoveslices.id),
  theme: text("theme").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  searchableContent: text("searchable_content").notNull(),
});

export const insertJournalEntrySchema = createInsertSchema(journalEntries).pick({
  user1Id: true,
  user2Id: true,
  partnershipId: true,
  writtenLovesliceId: true,
  spokenLovesliceId: true,
  theme: true,
  searchableContent: true,
});

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect & {
  // Extended types for expanded data
  writtenLoveslice?: {
    id: number;
    questionId: number;
    user1Id: number;
    user2Id: number;
    response1Id: number;
    response2Id: number;
    privateNote: string | null;
    type: string;
    hasStartedConversation: boolean;
    createdAt: Date;
    question?: {
      id: number;
      content: string;
      theme: string;
      userGenerated?: boolean;
      isApproved?: boolean;
      createdById?: number;
    };
    responses?: Array<{
      id: number;
      userId: number;
      questionId: number;
      content: string;
      createdAt: Date;
      user?: {
        id: number;
        name: string;
        email: string;
        partnerId: number | null;
      };
    }>;
  };
  spokenLoveslice?: {
    id: number;
    conversationId: number;
    user1Id: number;
    user2Id: number;
    theme: string;
    outcome: string;
    createdAt: Date;
    conversation?: {
      id: number;
      lovesliceId: number | null;
      starterId: number | null;
      initiatedByUserId: number;
      startedAt: Date;
      endedAt: Date | null;
      durationSeconds: number | null;
      outcome: string | null;
      user1EndRequested: boolean;
      user2EndRequested: boolean;
      createdSpokenLoveslice: boolean;
      finalNote: string | null;
    };
  };
};

// User Activity schema (for tracking streaks and garden health)
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  actionType: varchar("action_type", { length: 30 }).notNull(), // 'response', 'conversation', 'spoken_loveslice', etc.
  streak: integer("streak").notNull().default(1),
  gardenHealth: integer("garden_health").notNull().default(100),
});

export const insertUserActivitySchema = createInsertSchema(userActivity).pick({
  userId: true,
  date: true,
  actionType: true,
  streak: true,
  gardenHealth: true,
});

export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivity.$inferSelect;

// Admin audit logs schema
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(), // 'user', 'question', 'starter', etc.
  entityId: integer("entity_id"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).pick({
  adminId: true,
  action: true,
  entityType: true,
  entityId: true,
  details: true,
  ipAddress: true,
  userAgent: true,
});

export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;
export type AdminLog = typeof adminLogs.$inferSelect;
