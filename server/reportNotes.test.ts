import { describe, it, expect, beforeAll, afterAll } from "vitest";

describe("Report Notes & Flags API", () => {
  const BASE_URL = "http://localhost:3000";
  let testReportId: number;

  // Create a test report to attach notes/flags to
  beforeAll(async () => {
    const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitterName: "Notes Test User",
        reportType: "manager-checklist",
        location: "PK",
        reportDate: "2018-06-15",
        data: { items: [{ label: "Test", rating: 5 }] },
        totalScore: "5.00",
        overwrite: true,
      }),
    });
    const json = await res.json();
    // The submit-report endpoint may return id as {id: number} or number
    testReportId = typeof json.id === "object" ? json.id.id : json.id;
  });

  // Cleanup test report
  afterAll(async () => {
    if (testReportId) {
      await fetch(`${BASE_URL}/api/public/reports/${testReportId}`, { method: "DELETE" });
    }
  });

  describe("GET /api/public/reports/:id/notes", () => {
    it("should return empty notes for a new report", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.notes).toEqual([]);
      expect(json.flag).toBe("none");
    });

    it("should return 400 for invalid report ID", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/abc/notes`);
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/public/reports/:id/notes", () => {
    it("should create a note", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "This is a test note", createdBy: "Test Manager" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.id).toBeDefined();
    });

    it("should reject empty note text", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "", createdBy: "Test Manager" }),
      });
      expect(res.status).toBe(400);
    });

    it("should reject missing author", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "A note without author" }),
      });
      expect(res.status).toBe(400);
    });

    it("should reject whitespace-only note", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "   ", createdBy: "Test Manager" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("Notes CRUD flow", () => {
    let noteId: number;

    it("should create, read, update, and delete a note", async () => {
      // Create
      const createRes = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "CRUD test note", createdBy: "Ops Manager" }),
      });
      const createJson = await createRes.json();
      expect(createJson.success).toBe(true);
      noteId = createJson.id;

      // Read — should include the note
      const readRes = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`);
      const readJson = await readRes.json();
      expect(readJson.notes.some((n: any) => n.id === noteId)).toBe(true);

      // Update
      const updateRes = await fetch(`${BASE_URL}/api/public/report-notes/${noteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Updated CRUD note" }),
      });
      expect(updateRes.status).toBe(200);

      // Verify update
      const readRes2 = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`);
      const readJson2 = await readRes2.json();
      const updatedNote = readJson2.notes.find((n: any) => n.id === noteId);
      expect(updatedNote?.note).toBe("Updated CRUD note");

      // Delete
      const deleteRes = await fetch(`${BASE_URL}/api/public/report-notes/${noteId}`, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);

      // Verify deletion
      const readRes3 = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`);
      const readJson3 = await readRes3.json();
      expect(readJson3.notes.some((n: any) => n.id === noteId)).toBe(false);
    });
  });

  describe("PUT /api/public/report-notes/:id", () => {
    it("should return 400 for invalid note ID", async () => {
      const res = await fetch(`${BASE_URL}/api/public/report-notes/abc`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "test" }),
      });
      expect(res.status).toBe(400);
    });

    it("should reject empty note text on update", async () => {
      // Create a note first
      const createRes = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "Will update", createdBy: "Test" }),
      });
      const { id } = await createRes.json();

      const res = await fetch(`${BASE_URL}/api/public/report-notes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: "" }),
      });
      expect(res.status).toBe(400);

      // Cleanup
      await fetch(`${BASE_URL}/api/public/report-notes/${id}`, { method: "DELETE" });
    });
  });

  describe("DELETE /api/public/report-notes/:id", () => {
    it("should return 400 for invalid note ID", async () => {
      const res = await fetch(`${BASE_URL}/api/public/report-notes/abc`, { method: "DELETE" });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/public/reports/:id/flag", () => {
    it("should set a flag on a report", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagType: "needs-review", createdBy: "Ops Manager" }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify flag is set
      const notesRes = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`);
      const notesJson = await notesRes.json();
      expect(notesJson.flag).toBe("needs-review");
    });

    it("should change flag on a report", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagType: "resolved", createdBy: "Ops Manager" }),
      });
      expect(res.status).toBe(200);

      const notesRes = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`);
      const notesJson = await notesRes.json();
      expect(notesJson.flag).toBe("resolved");
    });

    it("should remove flag by setting to none", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagType: "none", createdBy: "Ops Manager" }),
      });
      expect(res.status).toBe(200);

      const notesRes = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/notes`);
      const notesJson = await notesRes.json();
      expect(notesJson.flag).toBe("none");
    });

    it("should reject missing flagType", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ createdBy: "Ops Manager" }),
      });
      expect(res.status).toBe(400);
    });

    it("should reject missing createdBy", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/${testReportId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagType: "needs-review" }),
      });
      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid report ID", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/abc/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagType: "needs-review", createdBy: "Test" }),
      });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/public/reports/flags (batch)", () => {
    it("should return flags for multiple reports", async () => {
      // Set a flag first
      await fetch(`${BASE_URL}/api/public/reports/${testReportId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagType: "follow-up", createdBy: "Test" }),
      });

      const res = await fetch(`${BASE_URL}/api/public/reports/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds: [testReportId, 999999] }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.flags).toBeDefined();
      expect(json.flags[testReportId]).toBe("follow-up");
    });

    it("should reject non-array reportIds", async () => {
      const res = await fetch(`${BASE_URL}/api/public/reports/flags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportIds: "not-an-array" }),
      });
      expect(res.status).toBe(400);
    });
  });
});
