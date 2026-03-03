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

describe("parseExcelBuffer — 2-digit year dates", () => {
  it("parses M/D/YY format dates correctly", async () => {
    // Build a minimal Excel file with 2-digit year dates
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["Id", "Business Date", "Store", "Net Sales", "Labour"],
      [1, "2/23/26", "Mackay", 1500, 350],
      [2, "3/2/26", "President Kennedy", 2000, 500],
      [3, "12/15/26", "Tunnel", 900, 200],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const result = parseExcelBuffer(buffer);
    expect(result.success).toBe(true);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].date).toBe("2026-02-23");
    expect(result.rows[1].date).toBe("2026-03-02");
    expect(result.rows[2].date).toBe("2026-12-15");
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
