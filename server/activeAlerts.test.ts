import { describe, it, expect } from "vitest";

const BASE_URL = "http://localhost:3000";

describe("Active Alerts API", () => {
  it("GET /api/public/active-alerts returns success with alerts array", async () => {
    const res = await fetch(`${BASE_URL}/api/public/active-alerts`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.alerts)).toBe(true);
    expect(body.weekRange).toBeDefined();
    expect(body.weekRange.from).toBeDefined();
    expect(body.weekRange.to).toBeDefined();
    expect(body.today).toBeDefined();
    expect(body.generatedAt).toBeDefined();
  });

  it("returns alerts with correct shape", async () => {
    const res = await fetch(`${BASE_URL}/api/public/active-alerts`);
    const body = await res.json();
    expect(body.alerts.length).toBeGreaterThan(0);

    for (const alert of body.alerts) {
      expect(alert).toHaveProperty("id");
      expect(alert).toHaveProperty("type");
      expect(alert).toHaveProperty("message");
      expect(alert).toHaveProperty("store");
      expect(alert).toHaveProperty("category");
      expect(alert).toHaveProperty("timestamp");
      expect(["critical", "warning", "info", "success"]).toContain(alert.type);
      expect(["missing-audit", "missing-daily", "missing-weekly", "high-labour", "labour-ok"]).toContain(alert.category);
    }
  });

  it("weekRange represents Monday to Friday", async () => {
    const res = await fetch(`${BASE_URL}/api/public/active-alerts`);
    const body = await res.json();
    const from = new Date(body.weekRange.from + "T00:00:00");
    const to = new Date(body.weekRange.to + "T00:00:00");

    // Monday = 1, Friday = 5
    expect(from.getDay()).toBe(1); // Monday
    expect(to.getDay()).toBe(5); // Friday
  });

  it("alerts are sorted by severity (critical first)", async () => {
    const res = await fetch(`${BASE_URL}/api/public/active-alerts`);
    const body = await res.json();
    const priority: Record<string, number> = { critical: 0, warning: 1, info: 2, success: 3 };
    
    for (let i = 1; i < body.alerts.length; i++) {
      const prev = priority[body.alerts[i - 1].type] ?? 99;
      const curr = priority[body.alerts[i].type] ?? 99;
      expect(prev).toBeLessThanOrEqual(curr);
    }
  });

  it("each store appears at most once per category", async () => {
    const res = await fetch(`${BASE_URL}/api/public/active-alerts`);
    const body = await res.json();
    const seen = new Set<string>();

    for (const alert of body.alerts) {
      const key = `${alert.store}-${alert.category}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it("labour alerts include percentage and target info", async () => {
    const res = await fetch(`${BASE_URL}/api/public/active-alerts`);
    const body = await res.json();
    const labourAlerts = body.alerts.filter(
      (a: any) => a.category === "high-labour" || a.category === "labour-ok"
    );

    for (const alert of labourAlerts) {
      // Should contain percentage info like "38.6%"
      expect(alert.message).toMatch(/\d+\.\d+%/);
      // Should reference target
      expect(alert.message).toMatch(/target/i);
    }
  });
});
