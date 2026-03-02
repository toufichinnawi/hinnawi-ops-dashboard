import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  teamsWebhooks, InsertTeamsWebhook, TeamsWebhook,
  alertRules, InsertAlertRule, AlertRule,
  alertHistory, InsertAlertHistory, AlertHistoryEntry,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
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
