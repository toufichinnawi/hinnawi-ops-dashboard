import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };

  return { ctx };
}

describe("production.pastryOrders", () => {
  it("returns empty array when no pastry orders exist", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Mock the db module to return no reports
    vi.doMock("./db", () => ({
      getReportsByDateRange: vi.fn().mockResolvedValue([]),
    }));

    const result = await caller.production.pastryOrders({
      fromDate: "2026-03-01",
      toDate: "2026-03-11",
    });

    expect(Array.isArray(result)).toBe(true);
  });

  it("filters only pastry-orders report type", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockReports = [
      { id: 1, reportType: "pastry-orders", location: "PK", data: "{}" },
      { id: 2, reportType: "Pastry Orders", location: "MK", data: "{}" },
      { id: 3, reportType: "bagel-orders", location: "PK", data: "{}" },
      { id: 4, reportType: "Daily Report", location: "ON", data: "{}" },
    ];

    vi.doMock("./db", () => ({
      getReportsByDateRange: vi.fn().mockResolvedValue(mockReports),
    }));

    // Re-import to pick up mocked module
    const { appRouter: freshRouter } = await import("./routers");
    const freshCaller = freshRouter.createCaller(ctx);

    const result = await freshCaller.production.pastryOrders({
      fromDate: "2026-03-01",
      toDate: "2026-03-11",
    });

    // Should only include pastry-orders and Pastry Orders types
    expect(result.length).toBe(2);
    expect(result.every((r: any) => r.reportType === "pastry-orders" || r.reportType === "Pastry Orders")).toBe(true);
  });

  it("requires fromDate and toDate parameters", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Test that calling without required params throws
    await expect(
      (caller.production.pastryOrders as any)({})
    ).rejects.toThrow();
  });

  it("does not include bagel orders in results", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mockReports = [
      { id: 1, reportType: "bagel-orders", location: "PK", data: "{}" },
      { id: 2, reportType: "Bagel Orders", location: "MK", data: "{}" },
    ];

    vi.doMock("./db", () => ({
      getReportsByDateRange: vi.fn().mockResolvedValue(mockReports),
    }));

    const { appRouter: freshRouter2 } = await import("./routers");
    const freshCaller2 = freshRouter2.createCaller(ctx);

    const result = await freshCaller2.production.pastryOrders({
      fromDate: "2026-03-01",
      toDate: "2026-03-11",
    });

    expect(result.length).toBe(0);
  });
});
