import { describe, it, expect } from "vitest";

// ─── Unit tests for Koomi/MYR scraper ───────────────────────────────

describe("Koomi Scraper", () => {
  describe("KOOMI_STORES mapping", () => {
    it("should have 3 stores defined", async () => {
      const { KOOMI_STORES } = await import("./koomi");
      expect(KOOMI_STORES).toHaveLength(3);
    });

    it("should have correct store IDs", async () => {
      const { KOOMI_STORES } = await import("./koomi");
      const ids = KOOMI_STORES.map(s => s.id);
      expect(ids).toContain("mk");
      expect(ids).toContain("tunnel");
      expect(ids).toContain("pk");
    });

    it("should have correct Koomi location IDs", async () => {
      const { KOOMI_STORES } = await import("./koomi");
      const koomiIds = KOOMI_STORES.map(s => s.koomiId);
      expect(koomiIds).toContain("2207");  // Mackay
      expect(koomiIds).toContain("1036");  // Cathcart/Tunnel
      expect(koomiIds).toContain("1037");  // President Kennedy
    });

    it("should have correct store names", async () => {
      const { KOOMI_STORES } = await import("./koomi");
      const mackay = KOOMI_STORES.find(s => s.id === "mk");
      expect(mackay?.name).toContain("Mackay");
      const tunnel = KOOMI_STORES.find(s => s.id === "tunnel");
      expect(tunnel?.name).toContain("Cathcart");
      const pk = KOOMI_STORES.find(s => s.id === "pk");
      expect(pk?.name).toContain("President Kennedy");
    });
  });

  describe("getTodayEST", () => {
    it("should return a valid YYYY-MM-DD date string", async () => {
      const { getTodayEST } = await import("./koomi");
      const today = getTodayEST();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return a date that is today or yesterday (timezone edge case)", async () => {
      const { getTodayEST } = await import("./koomi");
      const today = getTodayEST();
      const now = new Date();
      const todayUTC = now.toISOString().slice(0, 10);
      const yesterdayUTC = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
      expect([todayUTC, yesterdayUTC]).toContain(today);
    });
  });

  describe("parseDashboardData", () => {
    it("should parse typical dashboard HTML with sales data", async () => {
      const { parseDashboardData } = await import("./koomi");
      const html = `
        <div class="title-element">Total Gross Sales</div>
        </div></div><div class="row"><label for="total-0" class="element"></label>
        <div class="element">$ 2962.11</div>
        </div></div>
        <div class="dash-right-block"><div class="row alternate-legend">
        <label for="top-3" class="element"></label>
        <div class="element"><div class="title-element">Total Net Sales</div>
        </div></div><div class="row"><label for="total-3" class="element"></label>
        <div class="element">$ 2838.25</div>
        </div></div>
        <div class="title-element">Total Net Salaries</div>
        </div></div><div class="row"><label for="total-6" class="element"></label>
        <div class="element">$ 485.19 (17%)</div>
      `;

      const result = parseDashboardData(html);
      expect(result).not.toBeNull();
      expect(result!.grossSales).toBe(2962.11);
      expect(result!.netSales).toBe(2838.25);
      expect(result!.netSalaries).toBe(485.19);
      expect(result!.labourPercent).toBe(17);
    });

    it("should handle comma-separated thousands in sales figures", async () => {
      const { parseDashboardData } = await import("./koomi");
      const html = `
        <div>Total Gross Sales</div><div>$ 12,345.67</div>
        <div>Total Net Sales</div><div>$ 11,234.56</div>
        <div>Total Net Salaries</div><div>$ 1,234.56 (10%)</div>
      `;

      const result = parseDashboardData(html);
      expect(result).not.toBeNull();
      expect(result!.grossSales).toBe(12345.67);
      expect(result!.netSales).toBe(11234.56);
      expect(result!.netSalaries).toBe(1234.56);
      expect(result!.labourPercent).toBe(10);
    });

    it("should handle zero sales day", async () => {
      const { parseDashboardData } = await import("./koomi");
      const html = `
        <div>Total Gross Sales</div><div>$ 0.00</div>
        <div>Total Net Sales</div><div>$ 0.00</div>
        <div>Total Net Salaries</div><div>$ 0.00 (0%)</div>
      `;

      const result = parseDashboardData(html);
      expect(result).not.toBeNull();
      expect(result!.grossSales).toBe(0);
      expect(result!.netSales).toBe(0);
    });

    it("should return null for HTML without sales data", async () => {
      const { parseDashboardData } = await import("./koomi");
      const html = `<html><body>Welcome! Login</body></html>`;
      const result = parseDashboardData(html);
      expect(result).toBeNull();
    });
  });

  describe("Koomi login (integration)", () => {
    it("should successfully login with valid credentials", async () => {
      if (!process.env.KOOMI_EMAIL || !process.env.KOOMI_PASSWORD) {
        console.log("Skipping integration test: KOOMI_EMAIL/KOOMI_PASSWORD not set");
        return;
      }

      const { koomiLogin } = await import("./koomi");
      const success = await koomiLogin();
      expect(success).toBe(true);
    }, 30000);

    it("should scrape today's data for all stores", async () => {
      if (!process.env.KOOMI_EMAIL || !process.env.KOOMI_PASSWORD) {
        console.log("Skipping integration test: KOOMI_EMAIL/KOOMI_PASSWORD not set");
        return;
      }

      const { scrapeAllStores, getTodayEST } = await import("./koomi");
      const today = getTodayEST();
      const data = await scrapeAllStores(today);

      expect(data.length).toBeGreaterThanOrEqual(1);

      for (const entry of data) {
        expect(entry.storeId).toBeTruthy();
        expect(entry.storeName).toBeTruthy();
        expect(entry.koomiLocationId).toBeTruthy();
        expect(entry.date).toBe(today);
        expect(typeof entry.grossSales).toBe("number");
        expect(typeof entry.netSales).toBe("number");
        expect(typeof entry.netSalaries).toBe("number");
        expect(typeof entry.labourPercent).toBe("number");
      }

      console.log("[Test] Koomi scrape results:", JSON.stringify(data, null, 2));
    }, 60000);
  });
});
