import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:3000";
const uniqueDate = "2019-06-15"; // Far past date to avoid conflicts

describe("Draft Save/Load API", () => {
  const draftPayload = {
    submitterName: "Test Manager",
    reportType: "manager-checklist",
    location: "PK",
    reportDate: uniqueDate,
    data: {
      name: "Test Manager",
      weekStart: "2019-06-10",
      weekEnd: "2019-06-16",
      tasks: [{ rating: 4, isNA: false, comment: "Good" }],
      comments: "Draft test",
    },
    totalScore: "4.0",
  };

  // Clean up any existing draft/report for this date before tests
  it("should clean up test data first", async () => {
    // Try to delete any existing draft
    const draftRes = await fetch(
      `${BASE_URL}/api/public/draft?location=PK&reportType=manager-checklist&reportDate=${uniqueDate}`
    );
    const draftBody = await draftRes.json();
    if (draftBody.draft) {
      await fetch(`${BASE_URL}/api/public/reports/${draftBody.draft.id}`, {
        method: "DELETE",
      });
    }
  });

  it("should save a draft via POST /api/public/save-draft", async () => {
    const res = await fetch(`${BASE_URL}/api/public/save-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftPayload),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.id).toBeDefined();
  });

  it("should load the saved draft via GET /api/public/draft", async () => {
    const res = await fetch(
      `${BASE_URL}/api/public/draft?location=PK&reportType=manager-checklist&reportDate=${uniqueDate}`
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.draft).not.toBeNull();
    expect(body.draft.status).toBe("draft");
    expect(body.draft.data.name).toBe("Test Manager");
    expect(body.draft.data.comments).toBe("Draft test");
  });

  it("should update an existing draft (not create a duplicate)", async () => {
    const updatedPayload = {
      ...draftPayload,
      data: { ...draftPayload.data, comments: "Updated draft" },
    };
    const res = await fetch(`${BASE_URL}/api/public/save-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedPayload),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.updated).toBe(true);

    // Verify the update
    const loadRes = await fetch(
      `${BASE_URL}/api/public/draft?location=PK&reportType=manager-checklist&reportDate=${uniqueDate}`
    );
    const loadBody = await loadRes.json();
    expect(loadBody.draft.data.comments).toBe("Updated draft");
  });

  it("should return null draft for non-existent location/date", async () => {
    const res = await fetch(
      `${BASE_URL}/api/public/draft?location=XX&reportType=manager-checklist&reportDate=2000-01-01`
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.draft).toBeNull();
  });

  it("should not treat draft as duplicate when submitting final report", async () => {
    // Submit a final report for the same date — should NOT get 409 conflict
    const submitRes = await fetch(`${BASE_URL}/api/public/submit-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitterName: "Test Manager",
        reportType: "manager-checklist",
        location: "PK",
        reportDate: uniqueDate,
        data: draftPayload.data,
        totalScore: "4.0",
      }),
    });
    expect(submitRes.status).toBe(200);
    const submitBody = await submitRes.json();
    expect(submitBody.success).toBe(true);

    // Draft should be gone now
    const draftRes = await fetch(
      `${BASE_URL}/api/public/draft?location=PK&reportType=manager-checklist&reportDate=${uniqueDate}`
    );
    const draftBody = await draftRes.json();
    expect(draftBody.draft).toBeNull();
  });

  it("should validate required fields on save-draft", async () => {
    const res = await fetch(`${BASE_URL}/api/public/save-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submitterName: "Test" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("should validate required query params on get-draft", async () => {
    const res = await fetch(`${BASE_URL}/api/public/draft?location=PK`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  // Clean up: delete the submitted report
  it("should clean up test data", async () => {
    const reportsRes = await fetch(`${BASE_URL}/api/public/reports`);
    const reportsBody = await reportsRes.json();
    const testReport = reportsBody.data?.find(
      (r: any) => r.reportDate === uniqueDate && r.location === "PK" && r.reportType === "manager-checklist"
    );
    if (testReport) {
      await fetch(`${BASE_URL}/api/public/reports/${testReport.id}`, {
        method: "DELETE",
      });
    }
  });
});

describe("Draft normalization", () => {
  const uniqueDate2 = "2019-07-01";

  it("should normalize report type names in save-draft", async () => {
    const res = await fetch(`${BASE_URL}/api/public/save-draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitterName: "Test",
        reportType: "Store Weekly Audit",
        location: "Mackay",
        reportDate: uniqueDate2,
        data: { test: true },
      }),
    });
    expect(res.status).toBe(200);

    // Should be normalized to ops-manager-checklist / MK
    const loadRes = await fetch(
      `${BASE_URL}/api/public/draft?location=MK&reportType=ops-manager-checklist&reportDate=${uniqueDate2}`
    );
    const loadBody = await loadRes.json();
    expect(loadBody.draft).not.toBeNull();
    expect(loadBody.draft.reportType).toBe("ops-manager-checklist");
    expect(loadBody.draft.location).toBe("MK");

    // Clean up
    await fetch(`${BASE_URL}/api/public/reports/${loadBody.draft.id}`, {
      method: "DELETE",
    });
  });
});
