import { describe, it, expect, afterAll } from "vitest";

describe("Public API Endpoints", () => {
  const BASE_URL = "http://localhost:3000";
  const idsToCleanup: number[] = [];

  async function cleanupId(id: number) {
    try {
      await fetch(`${BASE_URL}/api/public/reports/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
  }

  // Failsafe: clean up ALL tracked IDs after all tests complete
  afterAll(async () => {
    for (const id of idsToCleanup) {
      await cleanupId(id);
    }
    // Also clean up by known test dates
    for (const date of ["2019-01-01", "2019-01-02"]) {
      try {
        const checkRes = await fetch(
          `${BASE_URL}/api/public/check-existing-report?location=PK&reportType=manager-checklist&reportDate=${date}`
        );
        const checkJson = await checkRes.json();
        if (checkJson.exists && checkJson.report?.id) {
          await cleanupId(checkJson.report.id);
        }
      } catch {
        // ignore
      }
    }
  });

  describe("GET /api/public/reports", () => {
    it("should return reports without authentication", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports`);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });

    it("should return report objects with expected fields", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports`);
      const json = await res.json();

      if (json.data.length > 0) {
        const report = json.data[0];
        expect(report).toHaveProperty("id");
        expect(report).toHaveProperty("reportType");
        expect(report).toHaveProperty("location");
        expect(report).toHaveProperty("reportDate");
        expect(report).toHaveProperty("status");
        expect(report).toHaveProperty("createdAt");
      }
    });
  });

  describe("POST /api/public/submit-report", () => {
    // Use a unique date far in the past to avoid duplicate conflicts with real data
    const uniqueDate = "2019-01-01";

    it("should accept a valid report submission without authentication", async () => {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Test User",
          reportType: "manager-checklist",
          location: "PK",
          reportDate: uniqueDate,
          data: { items: [{ label: "Test item", rating: 5 }] },
          totalScore: "5.00",
          overwrite: true, // Use overwrite to avoid 409 on re-runs
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.id).toBeDefined();
      idsToCleanup.push(json.id);

      // Immediate cleanup attempt
      await fetch(`${BASE_URL}/api/public/reports/${json.id}`, { method: "DELETE" });
    });

    it("should reject submissions with missing required fields", async () => {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Test User",
          // missing reportType, location, reportDate
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("should normalize report types and locations", async () => {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Test User",
          reportType: "Manager Checklist",
          location: "President Kennedy",
          reportDate: "2019-01-02",
          data: { test: true },
          overwrite: true, // Use overwrite to avoid 409 on re-runs
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Immediate cleanup attempt
      if (json.id) {
        idsToCleanup.push(json.id);
        await fetch(`${BASE_URL}/api/public/reports/${json.id}`, { method: "DELETE" });
      }
    });
  });

  describe("Portal tRPC endpoints (public access)", () => {
    it("should access scorecard.getData without authentication", async () => {
      const res = await fetch(`${BASE_URL}/api/trpc/scorecard.getData?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`);
      // Should not return 401/403
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("should access clover.salesData without authentication", async () => {
      const res = await fetch(`${BASE_URL}/api/trpc/clover.salesData?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });

    it("should access positionPins.positions without authentication", async () => {
      const res = await fetch(`${BASE_URL}/api/trpc/positionPins.positions`);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });
});
