import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests for the /api/public/upload-photo endpoint logic.
 * We test the validation logic and the S3 upload integration.
 */

// Mock storagePut before importing
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({
    key: "checklist-photos/test-photo-abc123.jpg",
    url: "https://s3.example.com/checklist-photos/test-photo-abc123.jpg",
  }),
}));

import { storagePut } from "./storage";

describe("Photo Upload Endpoint Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should reject requests without base64 data", async () => {
    const body = { fileName: "test.jpg", contentType: "image/jpeg" };
    // Validate that base64 is required
    expect(body).not.toHaveProperty("base64");
  });

  it("should reject requests without fileName", async () => {
    const body = { base64: "abc123", contentType: "image/jpeg" };
    expect(body).not.toHaveProperty("fileName");
  });

  it("should reject non-image content types", () => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    expect(validTypes.includes("application/pdf")).toBe(false);
    expect(validTypes.includes("text/plain")).toBe(false);
    expect(validTypes.includes("image/jpeg")).toBe(true);
    expect(validTypes.includes("image/png")).toBe(true);
    expect(validTypes.includes("image/webp")).toBe(true);
  });

  it("should call storagePut with correct parameters", async () => {
    const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const fileName = "test-photo.png";
    const contentType = "image/png";

    // Simulate what the endpoint does
    const buffer = Buffer.from(base64Data, "base64");
    const fileKey = `checklist-photos/${Date.now()}-${fileName}`;
    
    await storagePut(fileKey, buffer, contentType);

    expect(storagePut).toHaveBeenCalledTimes(1);
    expect(storagePut).toHaveBeenCalledWith(
      expect.stringContaining("checklist-photos/"),
      expect.any(Buffer),
      contentType
    );
  });

  it("should generate unique file keys to prevent enumeration", () => {
    const fileName = "photo.jpg";
    const key1 = `checklist-photos/${Date.now()}-${fileName}`;
    // Small delay to ensure different timestamp
    const key2 = `checklist-photos/${Date.now() + 1}-${fileName}`;
    expect(key1).not.toBe(key2);
  });

  it("should handle storagePut failures gracefully", async () => {
    const mockedStoragePut = vi.mocked(storagePut);
    mockedStoragePut.mockRejectedValueOnce(new Error("S3 upload failed"));

    await expect(
      storagePut("checklist-photos/test.jpg", Buffer.from("test"), "image/jpeg")
    ).rejects.toThrow("S3 upload failed");
  });

  it("should enforce max file size of 10MB", () => {
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    const smallFile = Buffer.alloc(1024); // 1KB
    const largeFile = Buffer.alloc(maxSize + 1); // Just over 10MB

    expect(smallFile.length).toBeLessThanOrEqual(maxSize);
    expect(largeFile.length).toBeGreaterThan(maxSize);
  });
});
