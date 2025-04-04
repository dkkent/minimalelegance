import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  partnerId: integer("partner_id").references(() => users.id),
  inviteCode: text("invite_code"),
  isIndividual: boolean("is_individual").notNull().default(true),
});

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
  theme: text("theme").notNull(),
});

export const insertQuestionSchema = createInsertSchema(questions).pick({
  content: true,
  theme: true,
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

// Loveslices schema
export const loveslices = pgTable("loveslices", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questions.id),
  user1Id: integer("user1_id").notNull().references(() => users.id),
  user2Id: integer("user2_id").notNull().references(() => users.id),
  response1Id: integer("response1_id").notNull().references(() => responses.id),
  response2Id: integer("response2_id").notNull().references(() => responses.id),
  privateNote: text("private_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLovesliceSchema = createInsertSchema(loveslices).pick({
  questionId: true,
  user1Id: true,
  user2Id: true,
  response1Id: true,
  response2Id: true,
  privateNote: true,
});

export type InsertLoveslice = z.infer<typeof insertLovesliceSchema>;
export type Loveslice = typeof loveslices.$inferSelect;

// Active questions schema (questions assigned to users)
export const activeQuestions = pgTable("active_questions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  questionId: integer("question_id").notNull().references(() => questions.id),
  assignedAt: timestamp("assigned_at").notNull().defaultNow(),
  isAnswered: boolean("is_answered").notNull().default(false),
});

export const insertActiveQuestionSchema = createInsertSchema(activeQuestions).pick({
  userId: true,
  questionId: true,
});

export type InsertActiveQuestion = z.infer<typeof insertActiveQuestionSchema>;
export type ActiveQuestion = typeof activeQuestions.$inferSelect;

// Conversation starters schema
export const conversationStarters = pgTable("conversation_starters", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  theme: text("theme").notNull(),
  baseQuestionId: integer("base_question_id").references(() => questions.id),
  lovesliceId: integer("loveslice_id").references(() => loveslices.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertConversationStarterSchema = createInsertSchema(conversationStarters).pick({
  content: true,
  theme: true,
  baseQuestionId: true,
  lovesliceId: true,
});

export type InsertConversationStarter = z.infer<typeof insertConversationStarterSchema>;
export type ConversationStarter = typeof conversationStarters.$inferSelect;

// User Activity schema (for tracking streaks and garden health)
export const userActivity = pgTable("user_activity", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  actionType: varchar("action_type", { length: 30 }).notNull(), // 'response', 'conversation', etc.
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
