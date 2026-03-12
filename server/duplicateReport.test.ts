import { describe, it, expect, beforeAll, afterAll } from "vitest";

/**
 * Tests for the duplicate report detection (409 Conflict) on the public submit-report endpoint.
 * This verifies the core server-side logic that all forms depend on:
 *   1. First submission with overwrite:false → 200 OK
 *   2. Second submission with overwrite:false (same type/location/date) → 409 Conflict
 *   3. Submission with overwrite:true → 200 OK (replaces existing)
 */
describe("Duplicate Report Detection (409 Conflict)", () => {
  const BASE_URL = "http://localhost:3000";
  // Use a random suffix to make test dates unique per run
  const runId = Date.now().toString(36);
  const idsToCleanup: number[] = [];

  async function submitReport(payload: Record<string, unknown>) {
    const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return { res, json: await res.json() };
  }

  async function cleanupId(id: number) {
    try {
      await fetch(`${BASE_URL}/api/public/reports/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
  }

  // Clean up any leftover test data from previous runs for our test dates
  beforeAll(async () => {
    // We'll use dates like 2098-01-XX which are unlikely to conflict
  });

  afterAll(async () => {
    for (const id of idsToCleanup) {
      await cleanupId(id);
    }
  });

  it("should accept first submission with overwrite:false, then 409 on duplicate, then overwrite:true succeeds", async () => {
    // Use a truly unique date by embedding the run ID in the report data
    const uniqueDate = "2098-01-01";
    const reportType = `TestDup_${runId}`;

    // Step 1: First submission → 200
    const { res: res1, json: json1 } = await submitReport({
      submitterName: "Test User A",
      reportType,
      location: "PK",
      reportDate: uniqueDate,
      data: { items: [{ label: "Test item", rating: 5 }] },
      totalScore: "5.00",
      overwrite: false,
    });

    expect(res1.status).toBe(200);
    expect(json1.success).toBe(true);
    expect(json1.id).toBeDefined();
    idsToCleanup.push(json1.id);

    // Step 2: Duplicate submission → 409
    const { res: res2, json: json2 } = await submitReport({
      submitterName: "Test User B",
      reportType,
      location: "PK",
      reportDate: uniqueDate,
      data: { items: [{ label: "Different data", rating: 3 }] },
      overwrite: false,
    });

    expect(res2.status).toBe(409);
    expect(json2.error).toBe("duplicate");
    expect(json2.message).toBeDefined();
    expect(json2.existing).toBeDefined();
    expect(json2.existing.submitterName).toBe("Test User A");
    expect(json2.existing.submittedAt).toBeDefined();

    // Step 3: Overwrite → 200
    const { res: res3, json: json3 } = await submitReport({
      submitterName: "Test User B",
      reportType,
      location: "PK",
      reportDate: uniqueDate,
      data: { items: [{ label: "Overwritten data", rating: 4 }] },
      totalScore: "4.00",
      overwrite: true,
    });

    expect(res3.status).toBe(200);
    expect(json3.success).toBe(true);
    expect(json3.id).toBeDefined();
    idsToCleanup.push(json3.id);
  });

  it("should detect duplicates for Bagel Orders", async () => {
    const reportType = `BagelDup_${runId}`;
    const bagelDate = "2098-02-01";

    // First submission
    const { res: res1, json: json1 } = await submitReport({
      submitterName: "Baker A",
      reportType,
      location: "MK",
      reportDate: bagelDate,
      data: { orders: [{ type: "Sesame", quantity: "5", unit: "dozen" }] },
      overwrite: false,
    });
    expect(res1.status).toBe(200);
    idsToCleanup.push(json1.id);

    // Duplicate → 409
    const { res: res2, json: json2 } = await submitReport({
      submitterName: "Baker B",
      reportType,
      location: "MK",
      reportDate: bagelDate,
      data: { orders: [{ type: "Sesame", quantity: "10", unit: "dozen" }] },
      overwrite: false,
    });
    expect(res2.status).toBe(409);
    expect(json2.existing.submitterName).toBe("Baker A");

    // Overwrite → 200
    const { res: res3, json: json3 } = await submitReport({
      submitterName: "Baker B",
      reportType,
      location: "MK",
      reportDate: bagelDate,
      data: { orders: [{ type: "Sesame", quantity: "10", unit: "dozen" }] },
      overwrite: true,
    });
    expect(res3.status).toBe(200);
    idsToCleanup.push(json3.id);
  });

  it("should detect duplicates for Pastry Orders", async () => {
    const reportType = `PastryDup_${runId}`;
    const pastryDate = "2098-03-01";

    // First submission
    const { res: res1, json: json1 } = await submitReport({
      submitterName: "Pastry Chef A",
      reportType,
      location: "TN",
      reportDate: pastryDate,
      data: { orders: [{ type: "Croissant", quantity: "20", unit: "unit" }] },
      overwrite: false,
    });
    expect(res1.status).toBe(200);
    idsToCleanup.push(json1.id);

    // Duplicate → 409
    const { res: res2, json: json2 } = await submitReport({
      submitterName: "Pastry Chef B",
      reportType,
      location: "TN",
      reportDate: pastryDate,
      data: { orders: [{ type: "Croissant", quantity: "30", unit: "unit" }] },
      overwrite: false,
    });
    expect(res2.status).toBe(409);
    expect(json2.existing.submitterName).toBe("Pastry Chef A");
  });

  it("should allow same report type on different dates without conflict", async () => {
    const reportType = `DateDup_${runId}`;
    const dateA = "2098-04-01";
    const dateB = "2098-04-02";

    const { res: res1, json: json1 } = await submitReport({
      submitterName: "User X",
      reportType,
      location: "PK",
      reportDate: dateA,
      data: { bagels: [] },
      overwrite: false,
    });
    expect(res1.status).toBe(200);
    idsToCleanup.push(json1.id);

    const { res: res2, json: json2 } = await submitReport({
      submitterName: "User X",
      reportType,
      location: "PK",
      reportDate: dateB,
      data: { bagels: [] },
      overwrite: false,
    });
    expect(res2.status).toBe(200);
    idsToCleanup.push(json2.id);
  });

  it("should allow same report type on same date but different locations", async () => {
    const reportType = `LocDup_${runId}`;
    const sharedDate = "2098-05-01";

    const { res: res1, json: json1 } = await submitReport({
      submitterName: "Manager A",
      reportType,
      location: "PK",
      reportDate: sharedDate,
      data: { dailyChecks: {} },
      overwrite: false,
    });
    expect(res1.status).toBe(200);
    idsToCleanup.push(json1.id);

    const { res: res2, json: json2 } = await submitReport({
      submitterName: "Manager B",
      reportType,
      location: "MK",
      reportDate: sharedDate,
      data: { dailyChecks: {} },
      overwrite: false,
    });
    expect(res2.status).toBe(200);
    idsToCleanup.push(json2.id);
  });
});
