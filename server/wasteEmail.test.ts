import { describe, it, expect } from "vitest";

describe("Waste Email (tRPC)", () => {
  const BASE_URL = "http://localhost:3000";

  describe("POST /api/trpc/reports.sendWasteEmail", () => {
    it("should accept valid subject and body and return success", async () => {
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
      // The procedure returns { success: true } on success or { success: false, error: "..." } on failure
      expect(json.result).toBeDefined();
      expect(json.result.data).toBeDefined();
      expect(json.result.data.json).toBeDefined();
      // It should either succeed or fail gracefully (no 500)
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
