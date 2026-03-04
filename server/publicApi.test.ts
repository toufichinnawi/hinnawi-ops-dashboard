import { describe, it, expect } from "vitest";

describe("Public API Endpoints", () => {
  const BASE_URL = "http://localhost:3000";

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
    it("should accept a valid report submission without authentication", async () => {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Test User",
          reportType: "manager-checklist",
          location: "PK",
          reportDate: "2026-03-04",
          data: { items: [{ label: "Test item", rating: 5 }] },
          totalScore: "5.00",
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.id).toBeDefined();
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
          reportDate: "2026-03-04",
          data: { test: true },
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
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
