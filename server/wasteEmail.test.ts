import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

/**
 * Waste Email Tests
 *
 * These tests verify the input validation of the sendWasteEmail tRPC procedure
 * WITHOUT actually sending real emails. The first test (valid input) is skipped
 * because it triggers a real MS Graph API call that sends email to production
 * recipients. Only input validation tests (missing subject, missing body, empty
 * input) are run — these fail at the tRPC input validation layer before any
 * email is sent.
 */
describe("Waste Email (tRPC)", () => {
  const BASE_URL = "http://localhost:3000";

  describe("POST /api/trpc/reports.sendWasteEmail", () => {
    // SKIP: This test actually sends a real email via MS Graph to toufic@bagelandcafe.com
    // It should only be run manually when verifying email delivery end-to-end
    it.skip("should accept valid subject and body and return success", async () => {
      const res = await fetch(`${BASE_URL}/api/trpc/reports.sendWasteEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            subject: "Test Waste Report - Vitest",
            body: "This is a test waste report from the vitest suite.",
          },
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.result).toBeDefined();
      expect(json.result.data).toBeDefined();
      expect(json.result.data.json).toBeDefined();
      expect(typeof json.result.data.json.success).toBe("boolean");
    });

    it("should reject missing subject", async () => {
      const res = await fetch(`${BASE_URL}/api/trpc/reports.sendWasteEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            body: "Body without subject",
          },
        }),
      });
      // tRPC returns 400 for input validation errors
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("should reject missing body", async () => {
      const res = await fetch(`${BASE_URL}/api/trpc/reports.sendWasteEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            subject: "Subject without body",
          },
        }),
      });
      const json = await res.json();
      expect(json.error).toBeDefined();
    });

    it("should reject empty JSON input", async () => {
      const res = await fetch(`${BASE_URL}/api/trpc/reports.sendWasteEmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: {} }),
      });
      const json = await res.json();
      expect(json.error).toBeDefined();
    });
  });
});
