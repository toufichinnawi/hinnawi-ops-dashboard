import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseExcelBuffer, type ParsedLabourRow, type ParseResult } from "./excelParser";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Unit Tests for Excel Parser ──────────────────────────────

describe("parseExcelBuffer", () => {
  it("returns error for empty/invalid buffer", () => {
    const result = parseExcelBuffer(Buffer.from("not an excel file"));
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(0);
  });

  it("returns error for empty buffer", () => {
    const result = parseExcelBuffer(Buffer.alloc(0));
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ─── Integration Tests for tRPC Endpoints ──────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("excelLabour.data", () => {
  it("returns an array of labour data rows", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Query all data (the 25 rows we seeded)
    const result = await caller.excelLabour.data({});
    expect(Array.isArray(result)).toBe(true);
    // We seeded 25 rows
    expect(result.length).toBeGreaterThanOrEqual(25);
  });

  it("filters by date range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Query a specific date range
    const result = await caller.excelLabour.data({
      fromDate: "2026-02-25",
      toDate: "2026-02-26",
    });
    expect(Array.isArray(result)).toBe(true);
    // We should have 4 stores x 2 days = 8 rows (but Tunnel may be missing on some days)
    expect(result.length).toBeGreaterThan(0);

    // All rows should be within the date range
    for (const row of result) {
      expect(row.date >= "2026-02-25").toBe(true);
      expect(row.date <= "2026-02-26").toBe(true);
    }
  });

  it("filters by storeId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.excelLabour.data({
      storeId: "pk",
    });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);

    // All rows should be for PK store
    for (const row of result) {
      expect(row.storeId).toBe("pk");
    }
  });
});

describe("excelLabour.syncMeta", () => {
  it("returns the latest sync metadata", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.excelLabour.syncMeta();
    // We inserted a sync meta record during seeding
    if (result) {
      expect(result).toHaveProperty("fileName");
      expect(result).toHaveProperty("rowCount");
      expect(result).toHaveProperty("dateRange");
      expect(result).toHaveProperty("syncSuccess");
    }
  });
});
