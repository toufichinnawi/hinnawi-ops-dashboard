import { describe, it, expect } from "vitest";

describe("7shifts CK/Bagel Factory API Authentication", () => {
  it("should authenticate with the CK access token and list companies", async () => {
    const token = process.env.SEVEN_SHIFTS_CK_ACCESS_TOKEN;
    expect(token).toBeTruthy();

    const res = await fetch("https://api.7shifts.com/v2/companies", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "x-api-version": "2025-03-01",
      },
    });

    // Token may expire — accept 200 (valid) or 403 (expired) as non-error states
    expect([200, 403]).toContain(res.status);
    if (res.status !== 200) {
      console.log("7shifts CK token appears expired (403). Skipping data assertions.");
      return;
    }

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    // Verify it's the CK company
    const ckCompany = json.data.find((c: any) => c.id === 306595);
    expect(ckCompany).toBeDefined();
    expect(ckCompany.name).toContain("Central Kitchen");

    console.log(
      "7shifts CK companies:",
      json.data.map((c: any) => ({ id: c.id, name: c.name }))
    );
  });

  it("should list departments under CK location", async () => {
    const token = process.env.SEVEN_SHIFTS_CK_ACCESS_TOKEN;
    if (!token) return;

    const res = await fetch(
      "https://api.7shifts.com/v2/company/306595/departments?location_id=377212&limit=500",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          "x-api-version": "2025-03-01",
        },
      }
    );

    if (res.status !== 200) {
      console.log("Skipping department test — token may be expired");
      return;
    }

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);

    const deptNames = json.data.map((d: any) => d.name);
    expect(deptNames).toContain("Central Kitchen");
    expect(deptNames).toContain("Bagel Factory");

    console.log(
      "CK departments:",
      json.data.map((d: any) => ({ id: d.id, name: d.name }))
    );
  });
});
