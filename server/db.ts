import { eq, desc, and, gte, lte } from "drizzle-orm";
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
