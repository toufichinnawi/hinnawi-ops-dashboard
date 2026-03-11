import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => ({
  getAllInvoices: vi.fn(),
}));

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("foodCost.byStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty data when no invoices exist", async () => {
    const { getAllInvoices } = await import("./db");
    (getAllInvoices as any).mockResolvedValue([]);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.foodCost.byStore({
      fromDate: "2026-03-01",
      toDate: "2026-03-11",
    });

    expect(result).toEqual({
      byStore: [],
      topVendors: [],
      totalFoodCost: 0,
      totalInvoices: 0,
    });
  });

  it("aggregates invoices by store with correct store ID mapping", async () => {
    const { getAllInvoices } = await import("./db");
    (getAllInvoices as any).mockResolvedValue([
      {
        id: 1,
        storeCode: "pk",
        vendorName: "Dube Loiselle",
        invoiceDate: "2026-03-05",
        subtotal: 500.00,
        tax: 74.69,
        total: 574.69,
        category: "cogs",
        status: "verified",
      },
      {
        id: 2,
        storeCode: "pk",
        vendorName: "Sysco",
        invoiceDate: "2026-03-06",
        subtotal: 300.00,
        tax: 44.85,
        total: 344.85,
        category: "cogs",
        status: "verified",
      },
      {
        id: 3,
        storeCode: "mk",
        vendorName: "Dube Loiselle",
        invoiceDate: "2026-03-07",
        subtotal: 200.00,
        tax: 29.90,
        total: 229.90,
        category: "cogs",
        status: "verified",
      },
    ]);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.foodCost.byStore({
      fromDate: "2026-03-01",
      toDate: "2026-03-11",
    });

    // Should have 2 stores
    expect(result.byStore).toHaveLength(2);
    expect(result.totalInvoices).toBe(3);
    expect(result.totalFoodCost).toBeCloseTo(1149.44, 1);

    // PK store
    const pk = result.byStore.find(s => s.storeId === "pk");
    expect(pk).toBeDefined();
    expect(pk!.invoiceCount).toBe(2);
    expect(pk!.total).toBeCloseTo(919.54, 1);
    expect(pk!.topVendors).toHaveLength(2);

    // MK store
    const mk = result.byStore.find(s => s.storeId === "mk");
    expect(mk).toBeDefined();
    expect(mk!.invoiceCount).toBe(1);
    expect(mk!.total).toBeCloseTo(229.90, 1);
  });

  it("maps uppercase location codes to frontend store IDs", async () => {
    const { getAllInvoices } = await import("./db");
    (getAllInvoices as any).mockResolvedValue([
      {
        id: 1,
        storeCode: "ON",
        vendorName: "Test Vendor",
        invoiceDate: "2026-03-05",
        subtotal: 100.00,
        tax: 14.98,
        total: 114.98,
        category: "cogs",
        status: "verified",
      },
      {
        id: 2,
        storeCode: "TN",
        vendorName: "Test Vendor",
        invoiceDate: "2026-03-06",
        subtotal: 150.00,
        tax: 22.47,
        total: 172.47,
        category: "cogs",
        status: "verified",
      },
    ]);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.foodCost.byStore({
      fromDate: "2026-03-01",
      toDate: "2026-03-11",
    });

    // ON should map to "ontario", TN should map to "tunnel"
    const ontario = result.byStore.find(s => s.storeId === "ontario");
    expect(ontario).toBeDefined();
    expect(ontario!.total).toBeCloseTo(114.98, 1);

    const tunnel = result.byStore.find(s => s.storeId === "tunnel");
    expect(tunnel).toBeDefined();
    expect(tunnel!.total).toBeCloseTo(172.47, 1);
  });

  it("skips non-cogs invoices", async () => {
    const { getAllInvoices } = await import("./db");
    (getAllInvoices as any).mockResolvedValue([
      {
        id: 1,
        storeCode: "pk",
        vendorName: "Office Supplies",
        invoiceDate: "2026-03-05",
        subtotal: 50.00,
        tax: 7.49,
        total: 57.49,
        category: "opex",
        status: "verified",
      },
      {
        id: 2,
        storeCode: "pk",
        vendorName: "Dube Loiselle",
        invoiceDate: "2026-03-05",
        subtotal: 500.00,
        tax: 74.69,
        total: 574.69,
        category: "cogs",
        status: "verified",
      },
    ]);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.foodCost.byStore({
      fromDate: "2026-03-01",
      toDate: "2026-03-11",
    });

    // Only the cogs invoice should be counted
    expect(result.totalInvoices).toBe(1);
    expect(result.totalFoodCost).toBeCloseTo(574.69, 1);
  });

  it("returns top vendors sorted by total cost", async () => {
    const { getAllInvoices } = await import("./db");
    (getAllInvoices as any).mockResolvedValue([
      {
        id: 1,
        storeCode: "pk",
        vendorName: "Sysco",
        invoiceDate: "2026-03-05",
        subtotal: 800.00,
        tax: 119.76,
        total: 919.76,
        category: "cogs",
        status: "verified",
      },
      {
        id: 2,
        storeCode: "pk",
        vendorName: "Dube Loiselle",
        invoiceDate: "2026-03-06",
        subtotal: 500.00,
        tax: 74.85,
        total: 574.85,
        category: "cogs",
        status: "verified",
      },
      {
        id: 3,
        storeCode: "mk",
        vendorName: "Sysco",
        invoiceDate: "2026-03-07",
        subtotal: 300.00,
        tax: 44.91,
        total: 344.91,
        category: "cogs",
        status: "verified",
      },
    ]);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.foodCost.byStore({
      fromDate: "2026-03-01",
      toDate: "2026-03-11",
    });

    expect(result.topVendors).toHaveLength(2);
    // Sysco should be first (higher total)
    expect(result.topVendors[0].vendorName).toBe("Sysco");
    expect(result.topVendors[0].total).toBeCloseTo(1264.67, 1);
    expect(result.topVendors[0].storeCount).toBe(2); // PK + MK
    expect(result.topVendors[0].invoiceCount).toBe(2);

    // Dube Loiselle second
    expect(result.topVendors[1].vendorName).toBe("Dube Loiselle");
    expect(result.topVendors[1].storeCount).toBe(1); // PK only
  });

  it("skips invoices with zero or negative total", async () => {
    const { getAllInvoices } = await import("./db");
    (getAllInvoices as any).mockResolvedValue([
      {
        id: 1,
        storeCode: "pk",
        vendorName: "Test",
        invoiceDate: "2026-03-05",
        subtotal: 0,
        tax: 0,
        total: 0,
        category: "cogs",
        status: "verified",
      },
      {
        id: 2,
        storeCode: "pk",
        vendorName: "Real Vendor",
        invoiceDate: "2026-03-06",
        subtotal: 100.00,
        tax: 14.98,
        total: 114.98,
        category: "cogs",
        status: "verified",
      },
    ]);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.foodCost.byStore({
      fromDate: "2026-03-01",
      toDate: "2026-03-11",
    });

    expect(result.totalInvoices).toBe(1);
    expect(result.totalFoodCost).toBeCloseTo(114.98, 1);
  });
});
