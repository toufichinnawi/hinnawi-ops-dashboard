import { describe, it, expect, afterAll } from "vitest";

const BASE = "http://localhost:3000";

// Track IDs for cleanup
const createdIds: number[] = [];

// Use a unique date to avoid duplicate conflicts with other tests
const UNIQUE_DATE = "2098-11-15";

afterAll(async () => {
  // Clean up all test records
  for (const id of createdIds) {
    try {
      await fetch(`${BASE}/api/public/reports/${id}`, { method: "DELETE" });
    } catch {}
  }
  // Fallback: clean by date
  try {
    const res = await fetch(`${BASE}/api/public/reports`);
    const data = await res.json();
    for (const r of data?.data || []) {
      if (r.reportDate === UNIQUE_DATE) {
        await fetch(`${BASE}/api/public/reports/${r.id}`, { method: "DELETE" });
      }
    }
  } catch {}
});

describe("Report Edit (PUT /api/public/reports/:id)", () => {
  let testReportId: number;

  it("should create a report for editing", async () => {
    const createRes = await fetch(`${BASE}/api/public/submit-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitterName: "EditTest User",
        reportType: "Manager Checklist",
        location: "pk",
        reportDate: UNIQUE_DATE,
        data: {
          tasks: [{ task: "Open store", done: true }],
          submittedVia: "Public - Store Manager",
          submitterName: "EditTest User",
        },
      }),
    });
    expect(createRes.ok).toBe(true);
    const created = await createRes.json();
    testReportId = created.id?.id || created.data?.id || created.id;
    expect(testReportId).toBeTruthy();
    createdIds.push(testReportId);
  });

  it("should update the report via PUT", async () => {
    expect(testReportId).toBeTruthy();
    const updateRes = await fetch(`${BASE}/api/public/reports/${testReportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: {
          tasks: [{ task: "Open store", done: true }, { task: "Check inventory", done: false }],
          submittedVia: "Public - Store Manager",
          submitterName: "EditTest User (Updated)",
        },
        status: "submitted",
      }),
    });
    expect(updateRes.ok).toBe(true);
    const updated = await updateRes.json();
    expect(updated.success).toBe(true);
  });

  it("should verify the updated data is persisted", async () => {
    expect(testReportId).toBeTruthy();
    const getRes = await fetch(`${BASE}/api/public/reports`);
    const allReports = await getRes.json();
    const updatedReport = allReports.data?.find((r: any) => r.id === testReportId);
    expect(updatedReport).toBeTruthy();
    const data = typeof updatedReport.data === "string" ? JSON.parse(updatedReport.data) : updatedReport.data;
    expect(data.submitterName).toBe("EditTest User (Updated)");
    expect(data.tasks).toHaveLength(2);
  });

  it("should handle update for non-existent report gracefully", async () => {
    const res = await fetch(`${BASE}/api/public/reports/999999999`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: { test: true },
        status: "submitted",
      }),
    });
    // Server may return 200 (no-op update) or 404 — either is acceptable
    expect(res.status).toBeLessThan(500);
  });
});
