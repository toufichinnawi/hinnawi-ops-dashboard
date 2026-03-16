import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:3000";

describe("Invoice Multi-Page API", () => {
  describe("POST /api/public/invoices/upload-photo", () => {
    it("rejects missing fields", async () => {
      const res = await fetch(`${BASE_URL}/api/public/invoices/upload-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Missing required fields");
    });

    it("rejects non-image content type", async () => {
      const res = await fetch(`${BASE_URL}/api/public/invoices/upload-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: Buffer.from("test").toString("base64"),
          fileName: "test.txt",
          contentType: "text/plain",
        }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Only image files");
    });

    it("uploads a valid image and returns photoUrl and photoKey", async () => {
      // Create a minimal 1x1 PNG
      const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const res = await fetch(`${BASE_URL}/api/public/invoices/upload-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: pngBase64,
          fileName: "test-invoice.png",
          contentType: "image/png",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.photoUrl).toBeDefined();
      expect(body.photoKey).toBeDefined();
      expect(body.photoKey).toContain("invoices/");
      // Should NOT have ocrData (upload-photo doesn't run OCR)
      expect(body.ocrData).toBeUndefined();
    });
  });

  describe("POST /api/public/invoices/analyze", () => {
    it("rejects missing imageUrls", async () => {
      const res = await fetch(`${BASE_URL}/api/public/invoices/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("imageUrls");
    });

    it("rejects empty imageUrls array", async () => {
      const res = await fetch(`${BASE_URL}/api/public/invoices/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: [] }),
      });
      expect(res.status).toBe(400);
    });

    it("rejects too many pages", async () => {
      const urls = Array.from({ length: 21 }, (_, i) => `https://example.com/page${i}.jpg`);
      const res = await fetch(`${BASE_URL}/api/public/invoices/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls: urls }),
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("max 20");
    });
  });

  describe("Legacy endpoint POST /api/public/invoices/upload", () => {
    it("still works for backward compatibility", async () => {
      const pngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const res = await fetch(`${BASE_URL}/api/public/invoices/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base64: pngBase64,
          fileName: "test-legacy.png",
          contentType: "image/png",
        }),
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.photoUrl).toBeDefined();
      expect(body.photoKey).toBeDefined();
    });
  });
});
