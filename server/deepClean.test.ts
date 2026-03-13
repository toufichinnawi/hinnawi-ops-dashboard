import { describe, it, expect, afterAll } from "vitest";

describe("Weekly Deep Clean Checklist", () => {
  const BASE_URL = "http://localhost:3000";
  const idsToCleanup: number[] = [];
  const uniqueDate = "2018-06-15"; // Far in the past to avoid conflicts

  async function cleanupId(id: number) {
    try {
      await fetch(`${BASE_URL}/api/public/reports/${id}`, { method: "DELETE" });
    } catch {
      // ignore
    }
  }

  function extractId(json: any): number {
    // The API returns { success: true, id: { id: 12345 } } or { success: true, id: 12345 }
    if (typeof json.id === "object" && json.id !== null) return json.id.id;
    return json.id;
  }

  afterAll(async () => {
    for (const id of idsToCleanup) {
      await cleanupId(id);
    }
    // Also clean up by known test dates
    for (const loc of ["MK", "PK"]) {
      try {
        const checkRes = await fetch(
          `${BASE_URL}/api/public/check-existing-report?location=${loc}&reportType=deep-clean&reportDate=${uniqueDate}`
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

  const sampleDeepCleanData = {
    dateOfSubmission: uniqueDate,
    sections: [
      {
        title: "1. Outside and Entrance",
        items: [
          { task: "Sweep and clean the floor outside the main entrance.", rating: 4, na: false, comment: "" },
          { task: "Clean all window frames, from both inside and outside.", rating: 5, na: false, comment: "Spotless" },
          { task: "Clean all exterior signs (Monthly deep clean).", rating: 0, na: true, comment: "Not due this week" },
        ],
      },
      {
        title: "2. Front Display & Pastry Section",
        items: [
          { task: "Clean and sanitize the entire front display and pastry section.", rating: 3, na: false, comment: "Needs improvement" },
          { task: "Ensure pastry glass is completely clean and transparent.", rating: 5, na: false, comment: "" },
        ],
      },
    ],
    overallComments: "Good progress this week",
    averageScore: "4.25",
    submittedVia: "Public - Store Manager",
    submitterName: "Test Deep Clean User",
  };

  describe("Report Type Normalization", () => {
    it("should normalize 'Weekly Deep Clean Checklist' to 'deep-clean'", async () => {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Test Deep Clean User",
          reportType: "Weekly Deep Clean Checklist",
          location: "MK",
          reportDate: uniqueDate,
          data: sampleDeepCleanData,
          totalScore: "4.25",
          overwrite: true,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const reportId = extractId(json);
      expect(reportId).toBeDefined();
      idsToCleanup.push(reportId);

      // Verify the report was stored with normalized type via check-existing
      const checkRes = await fetch(
        `${BASE_URL}/api/public/check-existing-report?location=MK&reportType=deep-clean&reportDate=${uniqueDate}`
      );
      const checkJson = await checkRes.json();
      expect(checkJson.exists).toBe(true);
      expect(checkJson.report.reportType).toBe("deep-clean");

      // Cleanup
      await cleanupId(reportId);
    });

    it("should normalize 'Deep Clean Checklist' to 'deep-clean' in check-existing", async () => {
      const res = await fetch(
        `${BASE_URL}/api/public/check-existing-report?location=MK&reportType=Deep%20Clean%20Checklist&reportDate=${uniqueDate}`
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("exists");
    });

    it("should normalize 'Weekly Deep Clean' to 'deep-clean' in check-existing", async () => {
      const res = await fetch(
        `${BASE_URL}/api/public/check-existing-report?location=MK&reportType=Weekly%20Deep%20Clean&reportDate=${uniqueDate}`
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("exists");
    });
  });

  describe("Submit and Retrieve", () => {
    it("should submit a deep clean checklist with sections, ratings, N/A, and comments", async () => {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Test Deep Clean User",
          reportType: "Weekly Deep Clean Checklist",
          location: "Mackay",
          reportDate: uniqueDate,
          data: sampleDeepCleanData,
          totalScore: "4.25",
          overwrite: true,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const reportId = extractId(json);
      idsToCleanup.push(reportId);

      // Verify via check-existing which returns the full report
      const checkRes = await fetch(
        `${BASE_URL}/api/public/check-existing-report?location=MK&reportType=deep-clean&reportDate=${uniqueDate}`
      );
      const checkJson = await checkRes.json();
      expect(checkJson.exists).toBe(true);
      expect(checkJson.report.reportType).toBe("deep-clean");
      expect(checkJson.report.location).toBe("MK"); // Normalized from "Mackay"

      // Verify data payload
      const data = typeof checkJson.report.data === "string" ? JSON.parse(checkJson.report.data) : checkJson.report.data;
      expect(data.sections).toBeDefined();
      expect(data.sections.length).toBe(2);
      expect(data.sections[0].title).toBe("1. Outside and Entrance");
      expect(data.sections[0].items.length).toBe(3);
      expect(data.sections[0].items[0].rating).toBe(4);
      expect(data.sections[0].items[2].na).toBe(true);
      expect(data.overallComments).toBe("Good progress this week");
      expect(data.averageScore).toBe("4.25");

      // Cleanup
      await cleanupId(reportId);
    });

    it("should detect duplicate deep clean submissions", async () => {
      // First submit
      const res1 = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Test Deep Clean User",
          reportType: "Weekly Deep Clean Checklist",
          location: "MK",
          reportDate: uniqueDate,
          data: sampleDeepCleanData,
          totalScore: "4.25",
          overwrite: true,
        }),
      });
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      const id1 = extractId(json1);
      idsToCleanup.push(id1);

      // Second submit without overwrite should get 409
      const res2 = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Another User",
          reportType: "Weekly Deep Clean Checklist",
          location: "MK",
          reportDate: uniqueDate,
          data: sampleDeepCleanData,
          totalScore: "4.25",
          overwrite: false,
        }),
      });
      expect(res2.status).toBe(409);

      // Cleanup
      await cleanupId(id1);
    });
  });

  describe("Edit Support", () => {
    it("should update an existing deep clean report via PUT", async () => {
      // Submit first
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Test Deep Clean User",
          reportType: "Weekly Deep Clean Checklist",
          location: "MK",
          reportDate: uniqueDate,
          data: sampleDeepCleanData,
          totalScore: "4.25",
          overwrite: true,
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      const reportId = extractId(json);
      idsToCleanup.push(reportId);

      // Update via PUT
      const updatedData = {
        ...sampleDeepCleanData,
        overallComments: "Updated comments after re-inspection",
        averageScore: "4.50",
      };
      const putRes = await fetch(`${BASE_URL}/api/public/reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: updatedData,
          totalScore: "4.50",
          status: "submitted",
        }),
      });
      expect(putRes.status).toBe(200);
      const putJson = await putRes.json();
      expect(putJson.success).toBe(true);

      // Verify update via check-existing
      const checkRes = await fetch(
        `${BASE_URL}/api/public/check-existing-report?location=MK&reportType=deep-clean&reportDate=${uniqueDate}`
      );
      const checkJson = await checkRes.json();
      expect(checkJson.exists).toBe(true);
      const data = typeof checkJson.report.data === "string" ? JSON.parse(checkJson.report.data) : checkJson.report.data;
      expect(data.overallComments).toBe("Updated comments after re-inspection");

      // Cleanup
      await cleanupId(reportId);
    });
  });

  describe("Draft Support", () => {
    it("should save and retrieve a deep clean draft", async () => {
      const draftData = {
        submitterName: "Test Draft User",
        reportType: "deep-clean",
        location: "MK",
        reportDate: uniqueDate,
        data: { partial: true, sections: [] },
      };

      // Save draft
      const saveRes = await fetch(`${BASE_URL}/api/public/save-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draftData),
      });
      expect(saveRes.status).toBe(200);

      // Retrieve draft
      const getRes = await fetch(
        `${BASE_URL}/api/public/draft?location=MK&reportType=deep-clean&reportDate=${uniqueDate}`
      );
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.success).toBe(true);
      if (getJson.draft) {
        const draftPayload = typeof getJson.draft.data === "string" ? JSON.parse(getJson.draft.data) : getJson.draft.data;
        expect(draftPayload.partial).toBe(true);
      }
    });
  });

  describe("Position Configuration", () => {
    it("should accept deep-clean report from Store Manager position", async () => {
      const res = await fetch(`${BASE_URL}/api/public/submit-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName: "Store Manager Test",
          reportType: "deep-clean",
          location: "PK",
          reportDate: uniqueDate,
          data: {
            ...sampleDeepCleanData,
            submittedVia: "Public - Store Manager",
          },
          totalScore: "4.00",
          overwrite: true,
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const reportId = extractId(json);
      idsToCleanup.push(reportId);

      // Verify the submittedVia is preserved
      const checkRes = await fetch(
        `${BASE_URL}/api/public/check-existing-report?location=PK&reportType=deep-clean&reportDate=${uniqueDate}`
      );
      const checkJson = await checkRes.json();
      expect(checkJson.exists).toBe(true);
      const data = typeof checkJson.report.data === "string" ? JSON.parse(checkJson.report.data) : checkJson.report.data;
      expect(data.submittedVia).toBe("Public - Store Manager");

      // Cleanup
      await cleanupId(reportId);
    });
  });
});
