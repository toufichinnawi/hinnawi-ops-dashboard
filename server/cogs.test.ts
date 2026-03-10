import { describe, it, expect, beforeAll, afterAll } from "vitest";

const BASE = `http://localhost:${process.env.PORT ?? 3000}`;

describe("COGS Summary API", () => {
  let testInvoiceId: number;

  beforeAll(async () => {
    // Create a test invoice with COGS category
    const res = await fetch(`${BASE}/api/public/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeCode: "pk",
        vendorName: "Test COGS Vendor",
        invoiceNumber: "COGS-TEST-001",
        invoiceDate: "2026-01-15",
        total: 250.50,
        subtotal: 225.00,
        tax: 25.50,
        photoUrl: "https://example.com/test-cogs.jpg",
        photoUrls: [
          { url: "https://example.com/test-cogs-1.jpg", key: "test-cogs-1" },
          { url: "https://example.com/test-cogs-2.jpg", key: "test-cogs-2" },
        ],
        photoKey: "test-cogs-key",
        verifiedBy: "COGS Test User",
        category: "cogs",
      }),
    });
    const data = await res.json();
    testInvoiceId = typeof data.id === "object" ? data.id.id : data.id;
  });

  afterAll(async () => {
    // Clean up test invoice
    if (testInvoiceId) {
      await fetch(`${BASE}/api/public/invoices/${testInvoiceId}`, {
        method: "DELETE",
      });
    }
  });

  it("GET /api/public/cogs-summary returns valid response shape", async () => {
    const res = await fetch(`${BASE}/api/public/cogs-summary`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(typeof data.totalCogs).toBe("number");
    expect(typeof data.totalInvoices).toBe("number");
    expect(typeof data.byStore).toBe("object");
  });

  it("COGS summary includes the test invoice", async () => {
    const res = await fetch(`${BASE}/api/public/cogs-summary`);
    const data = await res.json();
    expect(data.totalCogs).toBeGreaterThan(0);
    expect(data.totalInvoices).toBeGreaterThan(0);
    // Check that pk store has data
    expect(data.byStore.pk).toBeDefined();
    expect(data.byStore.pk.total).toBeGreaterThan(0);
    expect(data.byStore.pk.count).toBeGreaterThan(0);
  });

  it("COGS summary supports date range filtering", async () => {
    const res = await fetch(`${BASE}/api/public/cogs-summary?fromDate=2026-01-01&toDate=2026-01-31`);
    const data = await res.json();
    expect(data.success).toBe(true);
    // The test invoice is dated 2026-01-15, so it should be included
    expect(data.totalInvoices).toBeGreaterThan(0);
  });

  it("COGS summary returns empty for future date range", async () => {
    const res = await fetch(`${BASE}/api/public/cogs-summary?fromDate=2099-01-01&toDate=2099-12-31`);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.totalCogs).toBe(0);
    expect(data.totalInvoices).toBe(0);
  });

  it("Invoice creation accepts multi-photo (photoUrls) and category", async () => {
    // Create an invoice with multiple photos
    const res = await fetch(`${BASE}/api/public/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeCode: "mk",
        vendorName: "Multi-Photo Vendor",
        invoiceNumber: "MP-TEST-001",
        invoiceDate: "2026-01-20",
        total: 100.00,
        photoUrl: "https://example.com/multi-1.jpg",
        photoUrls: [
          { url: "https://example.com/multi-1.jpg", key: "multi-1" },
          { url: "https://example.com/multi-2.jpg", key: "multi-2" },
          { url: "https://example.com/multi-3.jpg", key: "multi-3" },
        ],
        photoKey: "multi-1",
        verifiedBy: "Multi Photo Tester",
        category: "cogs",
      }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.id).toBeDefined();

    // Clean up
    const id = typeof data.id === "object" ? data.id.id : data.id;
    await fetch(`${BASE}/api/public/invoices/${id}`, { method: "DELETE" });
  });

  it("Invoice creation works with invoiceNumber provided", async () => {
    const res = await fetch(`${BASE}/api/public/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeCode: "pk",
        vendorName: "Invoice Number Vendor",
        invoiceNumber: "INV-REQUIRED-001",
        photoUrl: "https://example.com/test.jpg",
        photoKey: "test-inv-required-key",
        verifiedBy: "Test User",
        category: "cogs",
      }),
    });
    const data = await res.json();
    expect(data.success).toBe(true);

    // Clean up
    const id = typeof data.id === "object" ? data.id.id : data.id;
    await fetch(`${BASE}/api/public/invoices/${id}`, { method: "DELETE" });
  });
});
