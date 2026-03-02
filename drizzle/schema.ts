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
