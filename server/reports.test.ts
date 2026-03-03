import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext() {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@hinnawi.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return ctx;
}

function createUserContext() {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "regular-user",
    email: "user@hinnawi.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return ctx;
}

function createPublicContext() {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };

  return ctx;
}

describe("storePins", () => {
  it("public can list stores (no PINs exposed)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const stores = await caller.storePins.stores();
    expect(Array.isArray(stores)).toBe(true);
    // Should have stores seeded from our SQL insert
    expect(stores.length).toBeGreaterThanOrEqual(1);
    // Verify no PIN is exposed in the public response
    for (const store of stores) {
      expect(store).toHaveProperty("storeCode");
      expect(store).toHaveProperty("storeName");
      expect(store).not.toHaveProperty("pin");
    }
  });

  it("public can verify a correct PIN", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // We seeded 1234 for all stores
    const result = await caller.storePins.verify({
      storeCode: "MK",
      pin: "1234",
    });
    expect(result).toEqual({ valid: true });
  });

  it("public gets invalid for wrong PIN", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.storePins.verify({
      storeCode: "MK",
      pin: "9999",
    });
    expect(result).toEqual({ valid: false });
  });

  it("admin can list all store PINs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const pins = await caller.storePins.list();
    expect(Array.isArray(pins)).toBe(true);
    expect(pins.length).toBeGreaterThanOrEqual(1);
    // Admin response should include the PIN
    for (const pin of pins) {
      expect(pin).toHaveProperty("pin");
      expect(pin).toHaveProperty("storeCode");
    }
  });

  it("non-admin cannot list all store PINs", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.storePins.list()).rejects.toThrow();
  });
});

describe("reports", () => {
  it("authenticated user can submit a report", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.reports.submit({
      reportType: "manager-checklist",
      location: "MK",
      reportDate: "2026-03-03",
      data: { items: [{ label: "Test item", rating: 5 }] },
      totalScore: "5.00",
    });

    expect(result).toBeDefined();
    // createReportSubmission returns { id: insertId } from the router
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("authenticated user can view their own reports", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);

    const reports = await caller.reports.myReports();
    expect(Array.isArray(reports)).toBe(true);
    // Should have at least the one we just submitted
    expect(reports.length).toBeGreaterThanOrEqual(1);
  });

  it("admin can view all reports", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const reports = await caller.reports.allReports();
    expect(Array.isArray(reports)).toBe(true);
  });

  it("unauthenticated user cannot submit via tRPC", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.reports.submit({
        reportType: "manager-checklist",
        location: "MK",
        reportDate: "2026-03-03",
        data: {},
      })
    ).rejects.toThrow();
  });
});
