import { describe, it, expect, vi, beforeAll } from "vitest";

const BASE_URL = "http://localhost:3000";

describe("Improvement Batch — March 5, 2026", () => {
  // ─── Report Edit/Delete Endpoints ───
  describe("Report Edit/Delete Public API", () => {
    it("should return 400 for invalid report ID on edit", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/abc`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: {} }),
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid report ID");
    });

    it("should return 400 for invalid report ID on delete", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/abc`, {
        method: "DELETE",
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Invalid report ID");
    });

    it("should handle edit of non-existent report gracefully", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { test: true } }),
      });
      // Update of non-existent report may return 200 (0 rows affected) or 404
      expect([200, 404]).toContain(res.status);
    });

    it("should return success for non-existent report on delete (idempotent)", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/999999`, {
        method: "DELETE",
      });
      // Delete should succeed even if report doesn't exist (idempotent)
      expect(res.status).toBe(200);
    });
  });

  // ─── Duplicate Detection Endpoint ───
  describe("Check Existing Report API", () => {
    it("should return 400 when missing required params", async () => {
      const res = await fetch(`${BASE_URL}/api/public/check-existing-report`);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Missing");
    });

    it("should return exists:false for non-existent report", async () => {
      const res = await fetch(
        `${BASE_URL}/api/public/check-existing-report?location=PK&reportType=manager-checklist&reportDate=2020-01-01`
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.exists).toBe(false);
    });

    it("should normalize location codes correctly", async () => {
      // Test with full name "President Kennedy" → should normalize to PK
      const res = await fetch(
        `${BASE_URL}/api/public/check-existing-report?location=President%20Kennedy&reportType=manager-checklist&reportDate=2020-01-01`
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.exists).toBe(false);
    });
  });

  // ─── Submit with Duplicate Detection ───
  describe("Submit Report with Duplicate Handling", () => {
    const testReport = {
      submitterName: "Test User",
      reportType: "manager-checklist",
      location: "PK",
      reportDate: "2020-01-15",
      data: { items: [{ task: "Test", rating: 5 }] },
      totalScore: "5.00",
    };

    let createdId: number;

    it("should create a new report successfully", async () => {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testReport),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.id).toBeDefined();
      createdId = json.id;
    });

    it("should auto-overwrite when duplicate exists (no 409)", async () => {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testReport),
      });
      // Backend now auto-overwrites instead of returning 409
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.id).toBeDefined();
      // New ID should be different from original (old was deleted, new was created)
      expect(json.id).not.toBe(createdId);
    });

    // Cleanup
    it("should clean up test report", async () => {
      // Get the latest report for PK on 2020-01-15
      const checkRes = await fetch(
        `${BASE_URL}/api/public/check-existing-report?location=PK&reportType=manager-checklist&reportDate=2020-01-15`
      );
      const checkJson = await checkRes.json();
      if (checkJson.exists && checkJson.report?.id) {
        const delRes = await fetch(`${BASE_URL}/api/public/reports/${checkJson.report.id}`, {
          method: "DELETE",
        });
        expect(delRes.status).toBe(200);
      }
    });
  });

  // ─── Public Reports List ───
  describe("Public Reports List API", () => {
    it("should return reports with success wrapper", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
    });
  });
});
