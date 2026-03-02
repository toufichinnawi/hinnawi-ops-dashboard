import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, float } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Teams webhook configurations — stores the webhook URL for each channel
 */
export const teamsWebhooks = mysqlTable("teams_webhooks", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  webhookUrl: text("webhookUrl").notNull(),
  channelName: varchar("channelName", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastTestedAt: timestamp("lastTestedAt"),
  lastTestSuccess: boolean("lastTestSuccess"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TeamsWebhook = typeof teamsWebhooks.$inferSelect;
export type InsertTeamsWebhook = typeof teamsWebhooks.$inferInsert;

/**
 * Alert rules — defines what triggers an alert and where it goes
 */
export const alertRules = mysqlTable("alert_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["labour_threshold", "report_overdue", "sales_drop", "custom"]).notNull(),
  webhookId: int("webhookId").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  threshold: float("threshold"),
  config: json("config"),
  lastTriggeredAt: timestamp("lastTriggeredAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AlertRule = typeof alertRules.$inferSelect;
export type InsertAlertRule = typeof alertRules.$inferInsert;

/**
 * Alert history — log of all sent alerts
 */
export const alertHistory = mysqlTable("alert_history", {
  id: int("id").autoincrement().primaryKey(),
  ruleId: int("ruleId"),
  webhookId: int("webhookId").notNull(),
  alertType: varchar("alertType", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  storeId: varchar("storeId", { length: 64 }),
  severity: mysqlEnum("severity", ["critical", "warning", "info", "success"]).default("info").notNull(),
  delivered: boolean("delivered").default(false).notNull(),
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type AlertHistoryEntry = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = typeof alertHistory.$inferInsert;

/**
 * Scheduled summary configuration — stores settings for automated daily summaries
 */
export const scheduledSummary = mysqlTable("scheduled_summary", {
  id: int("id").autoincrement().primaryKey(),
  webhookId: int("webhookId").notNull(),
  isEnabled: boolean("isEnabled").default(false).notNull(),
  scheduleHour: int("scheduleHour").default(21).notNull(), // 0-23, default 9 PM
  scheduleMinute: int("scheduleMinute").default(0).notNull(),
  timezone: varchar("timezone", { length: 64 }).default("America/Toronto").notNull(),
  lastRunAt: timestamp("lastRunAt"),
  lastRunSuccess: boolean("lastRunSuccess"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledSummary = typeof scheduledSummary.$inferSelect;
export type InsertScheduledSummary = typeof scheduledSummary.$inferInsert;

/**
 * Clover POS connections — stores OAuth tokens for each merchant/store
 */
export const cloverConnections = mysqlTable("clover_connections", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("storeName", { length: 255 }).notNull(),
  merchantId: varchar("merchantId", { length: 64 }).notNull().unique(),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  lastSyncSuccess: boolean("lastSyncSuccess"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CloverConnection = typeof cloverConnections.$inferSelect;
export type InsertCloverConnection = typeof cloverConnections.$inferInsert;

/**
 * Clover daily sales — cached daily aggregates from Clover API
 */
export const cloverDailySales = mysqlTable("clover_daily_sales", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  merchantId: varchar("merchantId", { length: 64 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  totalSales: float("totalSales").default(0).notNull(),
  totalTips: float("totalTips").default(0).notNull(),
  totalTax: float("totalTax").default(0).notNull(),
  orderCount: int("orderCount").default(0).notNull(),
  refundAmount: float("refundAmount").default(0).notNull(),
  netSales: float("netSales").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CloverDailySales = typeof cloverDailySales.$inferSelect;
export type InsertCloverDailySales = typeof cloverDailySales.$inferInsert;

/**
 * Clover employee shifts — cached shift data for labour tracking
 */
export const cloverShifts = mysqlTable("clover_shifts", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  merchantId: varchar("merchantId", { length: 64 }).notNull(),
  employeeId: varchar("employeeId", { length: 64 }).notNull(),
  employeeName: varchar("employeeName", { length: 255 }),
  shiftId: varchar("shiftId", { length: 64 }).notNull(),
  inTime: timestamp("inTime").notNull(),
  outTime: timestamp("outTime"),
  hoursWorked: float("hoursWorked"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CloverShift = typeof cloverShifts.$inferSelect;
export type InsertCloverShift = typeof cloverShifts.$inferInsert;
