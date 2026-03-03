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

/**
 * 7shifts connections — stores access tokens and company/location info
 */
export const sevenShiftsConnections = mysqlTable("seven_shifts_connections", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("storeName", { length: 255 }).notNull(),
  companyId: int("companyId").notNull(),
  companyName: varchar("companyName", { length: 255 }),
  locationId: int("locationId").notNull(),
  locationName: varchar("locationName", { length: 255 }),
  accessToken: text("accessToken").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncAt: timestamp("lastSyncAt"),
  lastSyncSuccess: boolean("lastSyncSuccess"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SevenShiftsConnection = typeof sevenShiftsConnections.$inferSelect;
export type InsertSevenShiftsConnection = typeof sevenShiftsConnections.$inferInsert;

/**
 * 7shifts daily sales & labour — cached daily aggregates from 7shifts API
 */
export const sevenShiftsDailySales = mysqlTable("seven_shifts_daily_sales", {
  id: int("id").autoincrement().primaryKey(),
  connectionId: int("connectionId").notNull(),
  locationId: int("locationId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  totalSales: float("totalSales").default(0).notNull(), // in dollars
  projectedSales: float("projectedSales").default(0).notNull(),
  labourCost: float("labourCost").default(0).notNull(),
  projectedLabourCost: float("projectedLabourCost").default(0).notNull(),
  labourMinutes: int("labourMinutes").default(0).notNull(),
  overtimeMinutes: int("overtimeMinutes").default(0).notNull(),
  labourPercent: float("labourPercent").default(0).notNull(),
  salesPerLabourHour: float("salesPerLabourHour").default(0).notNull(),
  orderCount: int("orderCount").default(0).notNull(), // actual_items
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SevenShiftsDailySales = typeof sevenShiftsDailySales.$inferSelect;
export type InsertSevenShiftsDailySales = typeof sevenShiftsDailySales.$inferInsert;

/**
 * Excel labour data — parsed from SharePoint/OneDrive daily report Excel file
 * Contains daily labour costs and net sales for all 4 stores
 */
export const excelLabourData = mysqlTable("excel_labour_data", {
  id: int("id").autoincrement().primaryKey(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  store: varchar("store", { length: 64 }).notNull(), // "Tunnel", "Ontario", "Mackay", "President Kennedy"
  storeId: varchar("storeId", { length: 32 }).notNull(), // "tunnel", "ontario", "mk", "pk"
  netSales: float("netSales").default(0).notNull(),
  labourCost: float("labourCost").default(0).notNull(),
  labourPercent: float("labourPercent").default(0).notNull(),
  notes: text("notes"),
  sourceRowId: int("sourceRowId"), // ID from the Excel file for dedup
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExcelLabourData = typeof excelLabourData.$inferSelect;
export type InsertExcelLabourData = typeof excelLabourData.$inferInsert;

/**
 * Excel sync metadata — tracks when the Excel file was last synced
 */
export const excelSyncMeta = mysqlTable("excel_sync_meta", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  rowCount: int("rowCount").default(0).notNull(),
  dateRange: varchar("dateRange", { length: 64 }), // "2026-02-23 to 2026-03-01"
  lastSyncAt: timestamp("lastSyncAt").defaultNow().notNull(),
  syncSuccess: boolean("syncSuccess").default(true).notNull(),
  errorMessage: text("errorMessage"),
});

export type ExcelSyncMeta = typeof excelSyncMeta.$inferSelect;
export type InsertExcelSyncMeta = typeof excelSyncMeta.$inferInsert;

// ─── Report Submissions ───

export const reportSubmissions = mysqlTable("report_submissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  reportType: varchar("reportType", { length: 100 }).notNull(),
  location: varchar("location", { length: 100 }).notNull(),
  reportDate: varchar("reportDate", { length: 20 }).notNull(),
  data: json("data").notNull(),
  totalScore: varchar("totalScore", { length: 20 }),
  status: mysqlEnum("status", ["draft", "submitted", "reviewed"]).default("submitted").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReportSubmission = typeof reportSubmissions.$inferSelect;
export type InsertReportSubmission = typeof reportSubmissions.$inferInsert;

// ─── Store PINs for Public Checklist Access ───

export const storePins = mysqlTable("store_pins", {
  id: int("id").autoincrement().primaryKey(),
  storeCode: varchar("storeCode", { length: 10 }).notNull().unique(),
  storeName: varchar("storeName", { length: 100 }).notNull(),
  pin: varchar("pin", { length: 10 }).notNull(),
  isActive: mysqlEnum("isActive", ["yes", "no"]).default("yes").notNull(),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StorePin = typeof storePins.$inferSelect;
export type InsertStorePin = typeof storePins.$inferInsert;

// ─── Expense Categories ───

export const expenseCategories = mysqlTable("expense_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  pnlSection: mysqlEnum("pnlSection", ["cogs", "operating", "labour", "other"]).default("other").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

// ─── Vendors & Suppliers ───

export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  contactRole: varchar("contactRole", { length: 255 }),
  description: text("description"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 320 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

// ─── Expenses ───

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  storeCode: varchar("storeCode", { length: 10 }).notNull(),
  categoryId: int("categoryId").notNull(),
  vendorId: int("vendorId"),
  amount: float("amount").notNull(),
  description: text("description"),
  expenseDate: varchar("expenseDate", { length: 10 }).notNull(), // YYYY-MM-DD
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  receiptUrl: text("receiptUrl"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ─── COGS Targets ───

export const cogsTargets = mysqlTable("cogs_targets", {
  id: int("id").autoincrement().primaryKey(),
  storeCode: varchar("storeCode", { length: 10 }).notNull(),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  targetAmount: float("targetAmount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CogsTarget = typeof cogsTargets.$inferSelect;
export type InsertCogsTarget = typeof cogsTargets.$inferInsert;

// ─── Inventory Items ───

export const inventoryItems = mysqlTable("inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  unit: varchar("unit", { length: 50 }).default("each").notNull(),
  parLevel: float("parLevel"),
  cost: float("cost"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

// ─── Inventory Counts ───

export const inventoryCounts = mysqlTable("inventory_counts", {
  id: int("id").autoincrement().primaryKey(),
  itemId: int("itemId").notNull(),
  storeCode: varchar("storeCode", { length: 10 }).notNull(),
  countDate: varchar("countDate", { length: 10 }).notNull(), // YYYY-MM-DD
  quantity: float("quantity").notNull(),
  countedBy: varchar("countedBy", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InventoryCount = typeof inventoryCounts.$inferSelect;
export type InsertInventoryCount = typeof inventoryCounts.$inferInsert;
