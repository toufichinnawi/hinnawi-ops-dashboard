import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
}

function createUserContext(): { ctx: TrpcContext } {
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
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Expense Categories", () => {
  it("lists all expense categories", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const categories = await caller.expenseCategories.list();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toHaveProperty("name");
    expect(categories[0]).toHaveProperty("pnlSection");
  });

  it("creates a new expense category", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.expenseCategories.create({
      name: "Test Category",
      description: "A test category",
      pnlSection: "operating",
      sortOrder: 99,
    });
    expect(result).toHaveProperty("id");
  });
});

describe("Vendors", () => {
  it("lists all vendors", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const vendors = await caller.vendors.list();
    expect(Array.isArray(vendors)).toBe(true);
    expect(vendors.length).toBeGreaterThan(0);
    expect(vendors[0]).toHaveProperty("name");
  });

  it("creates a new vendor", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.vendors.create({
      name: "Test Vendor",
      contactRole: "Test Contact",
      description: "A test vendor",
      phone: "555-0000",
      email: "test@vendor.com",
      notes: "Test notes",
    });
    expect(result).toHaveProperty("id");
  });
});

describe("Expenses", () => {
  it("creates and lists expenses", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const created = await caller.expenses.create({
      storeCode: "PK",
      categoryId: 1,
      vendorId: 1,
      amount: 150.5,
      description: "Test expense",
      expenseDate: "2026-03-01",
      status: "pending",
    });
    expect(created).toHaveProperty("id");

    const expenseList = await caller.expenses.list({
      storeCode: "PK",
    });
    expect(Array.isArray(expenseList)).toBe(true);
    expect(expenseList.length).toBeGreaterThan(0);
  });
});

describe("COGS Targets", () => {
  it("upserts and lists COGS targets", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    await caller.cogsTargets.upsert({
      storeCode: "PK",
      month: 3,
      year: 2026,
      targetAmount: 5000,
    });

    const targets = await caller.cogsTargets.list({
      month: 3,
      year: 2026,
    });
    expect(Array.isArray(targets)).toBe(true);
    const pkTarget = targets.find((t: any) => t.storeCode === "PK");
    expect(pkTarget).toBeDefined();
    expect(Number(pkTarget!.targetAmount)).toBe(5000);
  });
});

describe("Inventory Items", () => {
  it("creates and lists inventory items", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const created = await caller.inventoryItems.create({
      name: "Test Flour",
      category: "Dry Goods",
      unit: "kg",
      parLevel: 50,
    });
    expect(created).toHaveProperty("id");

    const items = await caller.inventoryItems.list();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe("Inventory Counts", () => {
  it("bulk upserts inventory counts", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // First create an item
    const item = await caller.inventoryItems.create({
      name: "Count Test Item",
      category: "Test",
      unit: "ea",
      parLevel: 10,
    });

    const result = await caller.inventoryCounts.bulkUpsert({
      counts: [{ itemId: item.id, storeCode: "PK", countDate: "2026-03-01", quantity: 25 }],
    });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("P&L", () => {
  it("returns P&L summary for a month", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const pnl = await caller.pnl.summary({
      month: 3,
      year: 2026,
    });
    expect(pnl).toHaveProperty("totalExpenses");
    expect(pnl).toHaveProperty("byCategory");
    expect(Array.isArray(pnl.byCategory)).toBe(true);
  });
});

describe("Admin", () => {
  it("lists users as admin", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const users = await caller.admin.users();
    expect(Array.isArray(users)).toBe(true);
  });

  it("rejects non-admin from listing users", async () => {
    const { ctx } = createUserContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users()).rejects.toThrow();
  });
});
