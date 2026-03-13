import { eq, desc, and, gte, lte, lt, sql, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  teamsWebhooks, InsertTeamsWebhook, TeamsWebhook,
  alertRules, InsertAlertRule, AlertRule,
  alertHistory, InsertAlertHistory, AlertHistoryEntry,
  scheduledSummary, InsertScheduledSummary, ScheduledSummary,
  cloverConnections, InsertCloverConnection, CloverConnection,
  cloverDailySales, InsertCloverDailySales, CloverDailySales,
  cloverShifts, InsertCloverShift, CloverShift,
  sevenShiftsConnections, InsertSevenShiftsConnection, SevenShiftsConnection,
  sevenShiftsDailySales, InsertSevenShiftsDailySales, SevenShiftsDailySales,
  excelLabourData, InsertExcelLabourData, ExcelLabourData,
  excelSyncMeta, InsertExcelSyncMeta, ExcelSyncMeta,
  reportSubmissions, InsertReportSubmission, ReportSubmission,
  storePins, InsertStorePin, StorePin,
  expenseCategories, InsertExpenseCategory, ExpenseCategory,
  vendors, InsertVendor, Vendor,
  expenses, InsertExpense, Expense,
  cogsTargets, InsertCogsTarget, CogsTarget,
  inventoryItems, InsertInventoryItem, InventoryItem,
  inventoryCounts, InsertInventoryCount, InventoryCount,
  positionPins, InsertPositionPin, PositionPin,
  koomiDailySales, InsertKoomiDailySales, KoomiDailySales,
  qboTokens, InsertQboToken, QboToken,
  qboCogs, InsertQboCogs, QboCogs,
  invoices, InsertInvoice, Invoice,
  reportNotes, InsertReportNote, ReportNote,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      console.log("[Database] Initializing connection...");
      _db = drizzle(process.env.DATABASE_URL);
      console.log("[Database] Connection initialized successfully");
    } catch (error) {
      console.error("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (!_db) {
    console.error("[Database] DB is null. DATABASE_URL set:", !!process.env.DATABASE_URL);
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Teams Webhooks ──────────────────────────────────────────────

export async function listWebhooks(): Promise<TeamsWebhook[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(teamsWebhooks).orderBy(desc(teamsWebhooks.createdAt));
}

export async function getWebhookById(id: number): Promise<TeamsWebhook | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(teamsWebhooks).where(eq(teamsWebhooks.id, id)).limit(1);
  return rows[0];
}

export async function createWebhook(data: InsertTeamsWebhook): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(teamsWebhooks).values(data);
}

export async function updateWebhook(id: number, data: Partial<InsertTeamsWebhook>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(teamsWebhooks).set(data).where(eq(teamsWebhooks.id, id));
}

export async function deleteWebhook(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(teamsWebhooks).where(eq(teamsWebhooks.id, id));
}

// ─── Alert Rules ─────────────────────────────────────────────────

export async function listAlertRules(): Promise<AlertRule[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alertRules).orderBy(desc(alertRules.createdAt));
}

export async function getAlertRuleById(id: number): Promise<AlertRule | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(alertRules).where(eq(alertRules.id, id)).limit(1);
  return rows[0];
}

export async function createAlertRule(data: InsertAlertRule): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(alertRules).values(data);
}

export async function updateAlertRule(id: number, data: Partial<InsertAlertRule>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(alertRules).set(data).where(eq(alertRules.id, id));
}

export async function deleteAlertRule(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(alertRules).where(eq(alertRules.id, id));
}

// ─── Alert History ───────────────────────────────────────────────

export async function listAlertHistory(limit = 50): Promise<AlertHistoryEntry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(alertHistory).orderBy(desc(alertHistory.sentAt)).limit(limit);
}

export async function createAlertHistoryEntry(data: InsertAlertHistory): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(alertHistory).values(data);
}

// ─── Scheduled Summary ───────────────────────────────────────────

export async function getScheduledSummary(): Promise<ScheduledSummary | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(scheduledSummary).limit(1);
  return rows[0];
}

export async function upsertScheduledSummary(data: Partial<InsertScheduledSummary> & { webhookId: number }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getScheduledSummary();
  if (existing) {
    await db.update(scheduledSummary).set(data).where(eq(scheduledSummary.id, existing.id));
  } else {
    await db.insert(scheduledSummary).values(data);
  }
}

export async function updateScheduledSummaryRun(id: number, success: boolean): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scheduledSummary).set({ lastRunAt: new Date(), lastRunSuccess: success }).where(eq(scheduledSummary.id, id));
}

// ─── Clover Connections ─────────────────────────────────────────────

export async function listCloverConnections(): Promise<CloverConnection[]> {
  const db = await getDb();
  if (!db) {
    console.error("[Clover] listCloverConnections: DB not available");
    throw new Error("Database not available");
  }
  try {
    const result = await db.select().from(cloverConnections).orderBy(desc(cloverConnections.createdAt));
    console.log(`[Clover] listCloverConnections: found ${result.length} connections`);
    return result;
  } catch (error) {
    console.error("[Clover] listCloverConnections error:", error);
    throw error;
  }
}

export async function getCloverConnectionById(id: number): Promise<CloverConnection | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(cloverConnections).where(eq(cloverConnections.id, id)).limit(1);
  return rows[0];
}

export async function getCloverConnectionByMerchantId(merchantId: string): Promise<CloverConnection | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(cloverConnections).where(eq(cloverConnections.merchantId, merchantId)).limit(1);
  return rows[0];
}

export async function createCloverConnection(data: InsertCloverConnection): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(cloverConnections).values(data);
}

export async function updateCloverConnection(id: number, data: Partial<InsertCloverConnection>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(cloverConnections).set(data).where(eq(cloverConnections.id, id));
}

export async function deleteCloverConnection(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(cloverConnections).where(eq(cloverConnections.id, id));
}

// ─── Clover Daily Sales ─────────────────────────────────────────────

export async function upsertCloverDailySales(data: InsertCloverDailySales): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if entry exists for this merchant + date
  const existing = await db.select().from(cloverDailySales)
    .where(eq(cloverDailySales.merchantId, data.merchantId))
    .limit(500);
  const match = existing.find(e => e.date === data.date);
  if (match) {
    await db.update(cloverDailySales).set(data).where(eq(cloverDailySales.id, match.id));
  } else {
    await db.insert(cloverDailySales).values(data);
  }
}

export async function getCloverSalesByConnection(connectionId: number, limit = 30): Promise<CloverDailySales[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cloverDailySales)
    .where(eq(cloverDailySales.connectionId, connectionId))
    .orderBy(desc(cloverDailySales.date))
    .limit(limit);
}

export async function getAllCloverSales(limit = 120): Promise<CloverDailySales[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cloverDailySales)
    .orderBy(desc(cloverDailySales.date))
    .limit(limit);
}

export async function getCloverSalesByDateRange(fromDate: string, toDate: string): Promise<CloverDailySales[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cloverDailySales)
    .where(and(
      gte(cloverDailySales.date, fromDate),
      lte(cloverDailySales.date, toDate)
    ))
    .orderBy(desc(cloverDailySales.date));
}

// ─── Clover Shifts ──────────────────────────────────────────────────

export async function upsertCloverShift(data: InsertCloverShift): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(cloverShifts)
    .where(eq(cloverShifts.shiftId, data.shiftId))
    .limit(1);
  if (existing.length > 0) {
    await db.update(cloverShifts).set(data).where(eq(cloverShifts.id, existing[0].id));
  } else {
    await db.insert(cloverShifts).values(data);
  }
}

export async function getCloverShiftsByConnection(connectionId: number, limit = 200): Promise<CloverShift[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cloverShifts)
    .where(eq(cloverShifts.connectionId, connectionId))
    .orderBy(desc(cloverShifts.inTime))
    .limit(limit);
}

export async function getAllCloverShifts(limit = 500): Promise<CloverShift[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cloverShifts)
    .orderBy(desc(cloverShifts.inTime))
    .limit(limit);
}

// ─── 7shifts Connections ────────────────────────────────────────────

export async function listSevenShiftsConnections(): Promise<SevenShiftsConnection[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sevenShiftsConnections).orderBy(desc(sevenShiftsConnections.createdAt));
}

export async function getSevenShiftsConnectionById(id: number): Promise<SevenShiftsConnection | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(sevenShiftsConnections).where(eq(sevenShiftsConnections.id, id)).limit(1);
  return rows[0];
}

export async function getSevenShiftsConnectionByLocationId(locationId: number): Promise<SevenShiftsConnection | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(sevenShiftsConnections).where(eq(sevenShiftsConnections.locationId, locationId)).limit(1);
  return rows[0];
}

export async function createSevenShiftsConnection(data: InsertSevenShiftsConnection): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(sevenShiftsConnections).values(data);
}

export async function updateSevenShiftsConnection(id: number, data: Partial<InsertSevenShiftsConnection>): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sevenShiftsConnections).set(data).where(eq(sevenShiftsConnections.id, id));
}

export async function deleteSevenShiftsConnection(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sevenShiftsConnections).where(eq(sevenShiftsConnections.id, id));
}

// ─── 7shifts Daily Sales ────────────────────────────────────────────

export async function upsertSevenShiftsDailySales(data: InsertSevenShiftsDailySales): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(sevenShiftsDailySales)
    .where(and(
      eq(sevenShiftsDailySales.locationId, data.locationId),
      eq(sevenShiftsDailySales.date, data.date)
    ))
    .limit(1);
  if (existing.length > 0) {
    await db.update(sevenShiftsDailySales).set(data).where(eq(sevenShiftsDailySales.id, existing[0].id));
  } else {
    await db.insert(sevenShiftsDailySales).values(data);
  }
}

export async function getAllSevenShiftsSales(limit = 120): Promise<SevenShiftsDailySales[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sevenShiftsDailySales)
    .orderBy(desc(sevenShiftsDailySales.date))
    .limit(limit);
}

export async function getSevenShiftsSalesByDateRange(fromDate: string, toDate: string): Promise<SevenShiftsDailySales[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sevenShiftsDailySales)
    .where(and(
      gte(sevenShiftsDailySales.date, fromDate),
      lte(sevenShiftsDailySales.date, toDate)
    ))
    .orderBy(desc(sevenShiftsDailySales.date));
}

export async function getSevenShiftsSalesByConnection(connectionId: number, limit = 60): Promise<SevenShiftsDailySales[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sevenShiftsDailySales)
    .where(eq(sevenShiftsDailySales.connectionId, connectionId))
    .orderBy(desc(sevenShiftsDailySales.date))
    .limit(limit);
}

// ─── Excel Labour Data ─────────────────────────────────────────────

export async function upsertExcelLabourData(data: InsertExcelLabourData): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if entry exists for this store + date
  const existing = await db.select().from(excelLabourData)
    .where(and(
      eq(excelLabourData.storeId, data.storeId),
      eq(excelLabourData.date, data.date)
    ))
    .limit(1);
  if (existing.length > 0) {
    await db.update(excelLabourData).set(data).where(eq(excelLabourData.id, existing[0].id));
  } else {
    await db.insert(excelLabourData).values(data);
  }
}

export async function bulkUpsertExcelLabourData(rows: InsertExcelLabourData[]): Promise<number> {
  let upserted = 0;
  for (const row of rows) {
    await upsertExcelLabourData(row);
    upserted++;
  }
  return upserted;
}

export async function getAllExcelLabourData(limit = 500): Promise<ExcelLabourData[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(excelLabourData)
    .orderBy(desc(excelLabourData.date))
    .limit(limit);
}

export async function getExcelLabourByDateRange(fromDate: string, toDate: string): Promise<ExcelLabourData[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(excelLabourData)
    .where(and(
      gte(excelLabourData.date, fromDate),
      lte(excelLabourData.date, toDate)
    ))
    .orderBy(desc(excelLabourData.date));
}

export async function getExcelLabourByStore(storeId: string, limit = 60): Promise<ExcelLabourData[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(excelLabourData)
    .where(eq(excelLabourData.storeId, storeId))
    .orderBy(desc(excelLabourData.date))
    .limit(limit);
}

export async function deleteAllExcelLabourData(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(excelLabourData);
}

// ─── Excel Sync Meta ───────────────────────────────────────────────

export async function getLatestExcelSyncMeta(): Promise<ExcelSyncMeta | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(excelSyncMeta)
    .orderBy(desc(excelSyncMeta.lastSyncAt))
    .limit(1);
  return rows[0];
}

export async function createExcelSyncMeta(data: InsertExcelSyncMeta): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(excelSyncMeta).values(data);
}

// ─── Report Submissions ───────────────────────────────────────────

/**
 * Get an existing draft for a given location, reportType, and week range.
 * Drafts are identified by status='draft'.
 */
export async function getDraft(location: string, reportType: string, reportDate: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(reportSubmissions).where(
    and(
      eq(reportSubmissions.location, location),
      eq(reportSubmissions.reportType, reportType),
      eq(reportSubmissions.reportDate, reportDate),
      eq(reportSubmissions.status, "draft")
    )
  ).limit(1);
  return rows[0] || null;
}

/**
 * Save or update a draft report. If a draft already exists for the same
 * location/reportType/reportDate, update it. Otherwise create a new one.
 */
export async function saveDraft(data: {
  location: string;
  reportType: string;
  reportDate: string;
  data: any;
  totalScore?: string | null;
  submitterName?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getDraft(data.location, data.reportType, data.reportDate);
  if (existing) {
    await db.update(reportSubmissions).set({
      data: data.data,
      totalScore: data.totalScore || null,
    }).where(eq(reportSubmissions.id, existing.id));
    return { id: existing.id, updated: true };
  } else {
    const result = await db.insert(reportSubmissions).values({
      userId: null as any,
      reportType: data.reportType,
      location: data.location,
      reportDate: data.reportDate,
      data: data.data,
      totalScore: data.totalScore || null,
      status: "draft",
    });
    return { id: result[0].insertId, updated: false };
  }
}

export async function checkExistingReport(location: string, reportType: string, reportDate: string) {
  const db = await getDb();
  if (!db) return null;
  // Only check for submitted/reviewed reports, not drafts
  const rows = await db.select().from(reportSubmissions).where(
    and(
      eq(reportSubmissions.location, location),
      eq(reportSubmissions.reportType, reportType),
      eq(reportSubmissions.reportDate, reportDate),
      sql`${reportSubmissions.status} != 'draft'`
    )
  ).limit(1);
  return rows[0] || null;
}

/**
 * Check for existing Sales bagel order for the same client + date.
 * Sales orders are unique by location + reportType + reportDate + clientName.
 */
export async function checkExistingSalesOrder(location: string, reportType: string, reportDate: string, clientName: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(reportSubmissions).where(
    and(
      eq(reportSubmissions.location, location),
      eq(reportSubmissions.reportType, reportType),
      eq(reportSubmissions.reportDate, reportDate),
      sql`${reportSubmissions.status} != 'draft'`,
      sql`JSON_EXTRACT(${reportSubmissions.data}, '$.clientName') = ${clientName}`
    )
  ).limit(1);
  return rows[0] || null;
}

export async function createReportSubmission(data: InsertReportSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(reportSubmissions).values(data);
  return { id: result[0].insertId };
}

export async function updateReportSubmission(id: number, data: Partial<InsertReportSubmission>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reportSubmissions).set(data).where(eq(reportSubmissions.id, id));
  return { success: true };
}

export async function deleteReportSubmission(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reportSubmissions).where(eq(reportSubmissions.id, id));
  return { success: true };
}

export async function getReportById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(reportSubmissions).where(eq(reportSubmissions.id, id)).limit(1);
  return rows[0] || null;
}

export async function getReportsByUser(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reportSubmissions)
    .where(eq(reportSubmissions.userId, userId))
    .orderBy(desc(reportSubmissions.createdAt))
    .limit(limit);
}

export async function getReportsByLocation(location: string, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(reportSubmissions)
    .where(eq(reportSubmissions.location, location))
    .orderBy(desc(reportSubmissions.createdAt))
    .limit(limit);
}

export async function getAllReports(limit = 10000) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: reportSubmissions.id,
      userId: reportSubmissions.userId,
      reportType: reportSubmissions.reportType,
      location: reportSubmissions.location,
      reportDate: reportSubmissions.reportDate,
      data: reportSubmissions.data,
      totalScore: reportSubmissions.totalScore,
      status: reportSubmissions.status,
      createdAt: reportSubmissions.createdAt,
      userName: users.name,
    })
    .from(reportSubmissions)
    .leftJoin(users, eq(reportSubmissions.userId, users.id))
    .orderBy(desc(reportSubmissions.createdAt))
    .limit(limit);
  return rows;
}

// ─── Scorecard Queries ────────────────────────────────────────────

export async function getReportsByDateRange(fromDate: string, toDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: reportSubmissions.id,
      reportType: reportSubmissions.reportType,
      location: reportSubmissions.location,
      reportDate: reportSubmissions.reportDate,
      totalScore: reportSubmissions.totalScore,
      status: reportSubmissions.status,
      data: reportSubmissions.data,
      createdAt: reportSubmissions.createdAt,
    })
    .from(reportSubmissions)
    .where(
      and(
        gte(reportSubmissions.reportDate, fromDate),
        lte(reportSubmissions.reportDate, toDate)
      )
    )
    .orderBy(desc(reportSubmissions.createdAt));
}

// ─── Store PINs ───────────────────────────────────────────────────

export async function getAllStorePins() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(storePins).orderBy(storePins.storeCode);
}

export async function upsertStorePin(data: {
  storeCode: string;
  storeName: string;
  pin: string;
  updatedBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(storePins)
    .where(eq(storePins.storeCode, data.storeCode))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(storePins)
      .set({
        pin: data.pin,
        storeName: data.storeName,
        updatedBy: data.updatedBy ?? null,
      })
      .where(eq(storePins.storeCode, data.storeCode));
    return { id: existing[0].id, updated: true };
  } else {
    const result = await db.insert(storePins).values({
      storeCode: data.storeCode,
      storeName: data.storeName,
      pin: data.pin,
      updatedBy: data.updatedBy ?? null,
    });
    return { id: result[0].insertId, updated: false };
  }
}

export async function verifyStorePin(
  storeCode: string,
  pin: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(storePins)
    .where(
      and(
        eq(storePins.storeCode, storeCode),
        eq(storePins.pin, pin),
        eq(storePins.isActive, "yes")
      )
    )
    .limit(1);
  return result.length > 0;
}

export async function getActiveStorePinsPublic() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      storeCode: storePins.storeCode,
      storeName: storePins.storeName,
    })
    .from(storePins)
    .where(eq(storePins.isActive, "yes"))
    .orderBy(storePins.storeName);
}


// ─── Position PINs ───

export async function getAllPositionPins() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(positionPins).orderBy(positionPins.positionLabel);
}

export async function upsertPositionPin(data: {
  positionSlug: string;
  positionLabel: string;
  pin: string;
  updatedBy?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db
    .select()
    .from(positionPins)
    .where(eq(positionPins.positionSlug, data.positionSlug))
    .limit(1);
  if (existing.length > 0) {
    await db
      .update(positionPins)
      .set({ pin: data.pin, positionLabel: data.positionLabel, updatedBy: data.updatedBy })
      .where(eq(positionPins.positionSlug, data.positionSlug));
    return { id: existing[0].id, updated: true };
  } else {
    const [result] = await db.insert(positionPins).values(data).$returningId();
    return { id: result.id, updated: false };
  }
}

export async function verifyPositionPin(
  positionSlug: string,
  pin: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db
    .select()
    .from(positionPins)
    .where(
      and(
        eq(positionPins.positionSlug, positionSlug),
        eq(positionPins.pin, pin),
        eq(positionPins.isActive, "yes")
      )
    )
    .limit(1);
  return result.length > 0;
}

export async function getActivePositionPinsPublic() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      positionSlug: positionPins.positionSlug,
      positionLabel: positionPins.positionLabel,
    })
    .from(positionPins)
    .where(eq(positionPins.isActive, "yes"))
    .orderBy(positionPins.positionLabel);
}

export async function seedDefaultPositionPins() {
  const db = await getDb();
  if (!db) return;
  const existing = await db.select().from(positionPins).limit(1);
  if (existing.length > 0) return; // Already seeded
  const defaults = [
    { positionSlug: "operations-manager", positionLabel: "Operations Manager", pin: "4821" },
    { positionSlug: "store-manager", positionLabel: "Store Manager", pin: "3597" },
    { positionSlug: "assistant-manager", positionLabel: "Assistant Manager", pin: "6143" },
    { positionSlug: "staff", positionLabel: "Staff", pin: "1234" },
    { positionSlug: "bagel-factory", positionLabel: "Bagel Factory", pin: "7256" },
  ];
  for (const d of defaults) {
    await db.insert(positionPins).values(d);
  }
}

// ─── Expense Categories ───

export async function getExpenseCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenseCategories).orderBy(expenseCategories.pnlSection, expenseCategories.sortOrder);
}

export async function createExpenseCategory(data: InsertExpenseCategory) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(expenseCategories).values(data).$returningId();
  return result;
}

export async function updateExpenseCategory(id: number, data: Partial<InsertExpenseCategory>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(expenseCategories).set(data).where(eq(expenseCategories.id, id));
}

export async function deleteExpenseCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(expenseCategories).where(eq(expenseCategories.id, id));
}

// ─── Vendors ───

export async function getVendors() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vendors).orderBy(vendors.name);
}

export async function createVendor(data: InsertVendor) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(vendors).values(data).$returningId();
  return result;
}

export async function updateVendor(id: number, data: Partial<InsertVendor>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(vendors).set(data).where(eq(vendors.id, id));
}

export async function deleteVendor(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(vendors).where(eq(vendors.id, id));
}

// ─── Expenses ───

export async function getExpenses(filters?: { storeCode?: string; startDate?: string; endDate?: string; status?: string; categoryId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.storeCode) conditions.push(eq(expenses.storeCode, filters.storeCode));
  if (filters?.status) conditions.push(eq(expenses.status, filters.status as any));
  if (filters?.categoryId) conditions.push(eq(expenses.categoryId, filters.categoryId));
  if (filters?.startDate) conditions.push(gte(expenses.expenseDate, filters.startDate));
  if (filters?.endDate) conditions.push(lte(expenses.expenseDate, filters.endDate));

  if (conditions.length > 0) {
    return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.expenseDate));
  }
  return db.select().from(expenses).orderBy(desc(expenses.expenseDate));
}

export async function createExpense(data: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(expenses).values(data).$returningId();
  return result;
}

export async function updateExpense(id: number, data: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(expenses).set(data).where(eq(expenses.id, id));
}

export async function deleteExpense(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(expenses).where(eq(expenses.id, id));
}

export async function getExpensesByMonth(month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
  return db.select().from(expenses)
    .where(and(gte(expenses.expenseDate, startDate), lt(expenses.expenseDate, endDate)))
    .orderBy(desc(expenses.expenseDate));
}

// ─── COGS Targets ───

export async function getCogsTargets(month: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  if (month === 0) {
    return db.select().from(cogsTargets).where(eq(cogsTargets.year, year));
  }
  return db.select().from(cogsTargets)
    .where(and(eq(cogsTargets.month, month), eq(cogsTargets.year, year)));
}

export async function upsertCogsTarget(data: InsertCogsTarget) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await db.select().from(cogsTargets)
    .where(and(
      eq(cogsTargets.storeCode, data.storeCode),
      eq(cogsTargets.month, data.month),
      eq(cogsTargets.year, data.year)
    ));
  if (existing.length > 0) {
    await db.update(cogsTargets).set({ targetAmount: data.targetAmount }).where(eq(cogsTargets.id, existing[0].id));
    return existing[0];
  }
  const [result] = await db.insert(cogsTargets).values(data).$returningId();
  return result;
}

// ─── Inventory Items ───

export async function getInventoryItems(category?: string) {
  const db = await getDb();
  if (!db) return [];
  if (category) {
    return db.select().from(inventoryItems)
      .where(and(eq(inventoryItems.category, category), eq(inventoryItems.isActive, true)))
      .orderBy(inventoryItems.name);
  }
  return db.select().from(inventoryItems)
    .where(eq(inventoryItems.isActive, true))
    .orderBy(inventoryItems.name);
}

export async function createInventoryItem(data: InsertInventoryItem) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(inventoryItems).values(data).$returningId();
  return result;
}

export async function updateInventoryItem(id: number, data: Partial<InsertInventoryItem>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(inventoryItems).set(data).where(eq(inventoryItems.id, id));
}

export async function deleteInventoryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(inventoryItems).set({ isActive: false }).where(eq(inventoryItems.id, id));
}

// ─── Inventory Counts ───

export async function getInventoryCounts(storeCode: string, countDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryCounts)
    .where(and(eq(inventoryCounts.storeCode, storeCode), eq(inventoryCounts.countDate, countDate)))
    .orderBy(inventoryCounts.itemId);
}

export async function upsertInventoryCount(data: InsertInventoryCount) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const existing = await db.select().from(inventoryCounts)
    .where(and(
      eq(inventoryCounts.itemId, data.itemId),
      eq(inventoryCounts.storeCode, data.storeCode),
      eq(inventoryCounts.countDate, data.countDate)
    ));
  if (existing.length > 0) {
    await db.update(inventoryCounts)
      .set({ quantity: data.quantity, countedBy: data.countedBy })
      .where(eq(inventoryCounts.id, existing[0].id));
    return existing[0];
  }
  const [result] = await db.insert(inventoryCounts).values(data).$returningId();
  return result;
}

export async function bulkUpsertInventoryCounts(counts: InsertInventoryCount[]) {
  const results = [];
  for (const c of counts) {
    results.push(await upsertInventoryCount(c));
  }
  return results;
}

// ─── Admin: User Management ───

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(users.name);
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

// ─── Koomi/MYR Daily Sales ──────────────────────────────────────────

export async function upsertKoomiDailySales(data: InsertKoomiDailySales): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Check if entry exists for this store + date
  const existing = await db.select().from(koomiDailySales)
    .where(and(
      eq(koomiDailySales.koomiLocationId, data.koomiLocationId),
      eq(koomiDailySales.date, data.date)
    ))
    .limit(1);
  if (existing.length > 0) {
    await db.update(koomiDailySales).set(data).where(eq(koomiDailySales.id, existing[0].id));
  } else {
    await db.insert(koomiDailySales).values(data);
  }
}

export async function getAllKoomiSales(limit = 120): Promise<KoomiDailySales[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(koomiDailySales)
    .orderBy(desc(koomiDailySales.date))
    .limit(limit);
}

export async function getKoomiSalesByStore(storeId: string, limit = 60): Promise<KoomiDailySales[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(koomiDailySales)
    .where(eq(koomiDailySales.storeId, storeId))
    .orderBy(desc(koomiDailySales.date))
    .limit(limit);
}

export async function getKoomiSalesByDateRange(fromDate: string, toDate: string): Promise<KoomiDailySales[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(koomiDailySales)
    .where(and(
      gte(koomiDailySales.date, fromDate),
      lte(koomiDailySales.date, toDate)
    ))
    .orderBy(desc(koomiDailySales.date));
}

// ─── QuickBooks Online Token Helpers ───

export async function upsertQboToken(data: Omit<InsertQboToken, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(qboTokens).values(data as any)
    .onDuplicateKeyUpdate({
      set: {
        companyName: sql`VALUES(companyName)`,
        accessToken: sql`VALUES(accessToken)`,
        refreshToken: sql`VALUES(refreshToken)`,
        accessTokenExpiresAt: sql`VALUES(accessTokenExpiresAt)`,
        refreshTokenExpiresAt: sql`VALUES(refreshTokenExpiresAt)`,
        isActive: sql`VALUES(isActive)`,
      },
    });
}

export async function getActiveQboToken(): Promise<QboToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(qboTokens)
    .where(eq(qboTokens.isActive, true))
    .limit(1);
  return rows[0];
}

export async function updateQboToken(id: number, data: Partial<InsertQboToken>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(qboTokens).set(data).where(eq(qboTokens.id, id));
}

export async function deleteQboToken(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(qboTokens).where(eq(qboTokens.id, id));
}

// ─── QuickBooks COGS Helpers ───

export async function upsertQboCogs(data: Omit<InsertQboCogs, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Check if record exists for this realm + store + period
  const existing = await db.select().from(qboCogs)
    .where(and(
      eq(qboCogs.realmId, data.realmId),
      eq(qboCogs.storeId, data.storeId),
      eq(qboCogs.periodStart, data.periodStart),
      eq(qboCogs.periodEnd, data.periodEnd)
    ))
    .limit(1);

  if (existing.length > 0) {
    await db.update(qboCogs).set({
      cogsAmount: data.cogsAmount,
      revenue: data.revenue,
      grossProfit: data.grossProfit,
      cogsPercent: data.cogsPercent,
      cogsBreakdown: data.cogsBreakdown,
      storeName: data.storeName,
      qboLocationId: data.qboLocationId,
      qboLocationName: data.qboLocationName,
    }).where(eq(qboCogs.id, existing[0].id));
  } else {
    await db.insert(qboCogs).values(data as any);
  }
}

export async function getQboCogsByDateRange(fromDate: string, toDate: string): Promise<QboCogs[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qboCogs)
    .where(and(
      gte(qboCogs.periodStart, fromDate),
      lte(qboCogs.periodEnd, toDate)
    ))
    .orderBy(desc(qboCogs.periodEnd));
}

export async function getQboCogsByStore(storeId: string, limit = 12): Promise<QboCogs[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qboCogs)
    .where(eq(qboCogs.storeId, storeId))
    .orderBy(desc(qboCogs.periodEnd))
    .limit(limit);
}

export async function getAllQboCogs(limit = 50): Promise<QboCogs[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(qboCogs)
    .orderBy(desc(qboCogs.periodEnd))
    .limit(limit);
}

// ─── Invoices ───

export async function createInvoice(data: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(invoices).values(data);
  return result[0].insertId;
}

export async function getInvoiceById(id: number): Promise<Invoice | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return rows[0];
}

export async function getAllInvoices(filters?: {
  storeCode?: string;
  vendorName?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
}): Promise<Invoice[]> {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.storeCode) conditions.push(eq(invoices.storeCode, filters.storeCode));
  if (filters?.vendorName) conditions.push(eq(invoices.vendorName, filters.vendorName));
  if (filters?.status) conditions.push(eq(invoices.status, filters.status as any));
  if (filters?.fromDate) conditions.push(gte(invoices.invoiceDate, filters.fromDate));
  if (filters?.toDate) conditions.push(lte(invoices.invoiceDate, filters.toDate));

  if (conditions.length > 0) {
    return db.select().from(invoices).where(and(...conditions)).orderBy(desc(invoices.createdAt));
  }
  return db.select().from(invoices).orderBy(desc(invoices.createdAt));
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

export async function deleteInvoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(invoices).where(eq(invoices.id, id));
}

// ─── Report Notes & Flags ───

export async function getReportNotes(reportId: number): Promise<ReportNote[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reportNotes)
    .where(eq(reportNotes.reportId, reportId))
    .orderBy(desc(reportNotes.createdAt));
}

export async function getReportNotesByReportIds(reportIds: number[]): Promise<ReportNote[]> {
  const db = await getDb();
  if (!db) return [];
  if (reportIds.length === 0) return [];
  return db.select().from(reportNotes)
    .where(inArray(reportNotes.reportId, reportIds))
    .orderBy(desc(reportNotes.createdAt));
}

export async function createReportNote(data: InsertReportNote): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(reportNotes).values(data).$returningId();
  return result;
}

export async function updateReportNote(id: number, data: { note?: string; flagType?: "none" | "needs-review" | "follow-up" | "resolved" }): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(reportNotes).set(data).where(eq(reportNotes.id, id));
}

export async function deleteReportNote(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(reportNotes).where(eq(reportNotes.id, id));
}

export async function setReportFlag(reportId: number, flagType: string, createdBy: string): Promise<{ id: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Upsert: if a flag note exists for this report, update it; otherwise create one
  const existing = await db.select().from(reportNotes)
    .where(and(
      eq(reportNotes.reportId, reportId),
      sql`${reportNotes.note} = '__FLAG__'`
    ))
    .limit(1);
  if (existing.length > 0) {
    await db.update(reportNotes)
      .set({ flagType: flagType as any, createdBy })
      .where(eq(reportNotes.id, existing[0].id));
    return { id: existing[0].id };
  }
  const [result] = await db.insert(reportNotes).values({
    reportId,
    note: "__FLAG__",
    flagType: flagType as any,
    createdBy,
  }).$returningId();
  return result;
}

export async function getReportFlags(reportIds: number[]): Promise<Record<number, string>> {
  const db = await getDb();
  if (!db) return {};
  if (reportIds.length === 0) return {};
  const rows = await db.select().from(reportNotes)
    .where(and(
      inArray(reportNotes.reportId, reportIds),
      sql`${reportNotes.note} = '__FLAG__'`,
      sql`${reportNotes.flagType} != 'none'`
    ));
  const flags: Record<number, string> = {};
  for (const r of rows) {
    flags[r.reportId] = r.flagType;
  }
  return flags;
}
