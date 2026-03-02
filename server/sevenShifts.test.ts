import { describe, it, expect } from "vitest";

describe("7shifts API Authentication", () => {
  it("should authenticate with the access token and list companies", async () => {
    const token = process.env.SEVEN_SHIFTS_ACCESS_TOKEN;
    expect(token).toBeTruthy();

    const res = await fetch("https://api.7shifts.com/v2/companies", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "x-api-version": "2025-03-01",
      },
    });

    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);

    // Log company info for debugging
    console.log(
      "7shifts companies:",
      json.data.map((c: any) => ({ id: c.id, name: c.name }))
    );
  });
});
