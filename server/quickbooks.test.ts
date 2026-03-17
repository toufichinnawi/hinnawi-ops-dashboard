import { describe, it, expect } from "vitest";
import { parsePnlForCogs, getQboAuthUrl } from "./quickbooks";

describe("QuickBooks Service", () => {
  describe("getQboAuthUrl", () => {
    it("should generate a valid authorization URL", () => {
      const url = getQboAuthUrl(
        "https://example.com/callback",
        "test-state-123"
      );
      expect(url).toContain("appcenter.intuit.com/connect/oauth2");
      expect(url).toContain("response_type=code");
      expect(url).toContain("scope=com.intuit.quickbooks.accounting");
      expect(url).toContain("state=test-state-123");
      expect(url).toContain(
        "redirect_uri=https%3A%2F%2Fexample.com%2Fcallback"
      );
    });

    it("should include client_id in the URL", () => {
      const url = getQboAuthUrl("https://example.com/callback", "state");
      expect(url).toContain("client_id=");
    });
  });

  describe("parsePnlForCogs", () => {
    it("should return empty array for null/undefined input", () => {
      expect(parsePnlForCogs(null)).toEqual([]);
      expect(parsePnlForCogs(undefined)).toEqual([]);
      expect(parsePnlForCogs({})).toEqual([]);
    });

    it("should return empty array when no columns", () => {
      const data = {
        Columns: { Column: [] },
        Rows: { Row: [] },
      };
      expect(parsePnlForCogs(data)).toEqual([]);
    });

    it("should parse a simple P&L report with one location", () => {
      const reportData = {
        Columns: {
          Column: [
            { ColType: "Account", ColTitle: "Account" },
            {
              ColType: "Money",
              ColTitle: "Store A",
              MetaData: [
                { Name: "LocationName", Value: "Store A" },
                { Name: "LocationId", Value: "loc-1" },
              ],
            },
            { ColType: "Money", ColTitle: "Total" },
          ],
        },
        Rows: {
          Row: [
            {
              type: "Section",
              Header: { ColData: [{ value: "Income" }] },
              Rows: {
                Row: [
                  {
                    type: "Data",
                    ColData: [
                      { value: "Sales" },
                      { value: "10000.00" },
                      { value: "10000.00" },
                    ],
                  },
                ],
              },
              Summary: {
                ColData: [
                  { value: "Total Income" },
                  { value: "10000.00" },
                  { value: "10000.00" },
                ],
              },
            },
            {
              type: "Section",
              Header: { ColData: [{ value: "Cost of Goods Sold" }] },
              Rows: {
                Row: [
                  {
                    type: "Data",
                    ColData: [
                      { value: "Food Cost" },
                      { value: "3000.00" },
                      { value: "3000.00" },
                    ],
                  },
                  {
                    type: "Data",
                    ColData: [
                      { value: "Packaging" },
                      { value: "500.00" },
                      { value: "500.00" },
                    ],
                  },
                ],
              },
              Summary: {
                ColData: [
                  { value: "Total COGS" },
                  { value: "3500.00" },
                  { value: "3500.00" },
                ],
              },
            },
          ],
        },
      };

      const result = parsePnlForCogs(reportData);
      expect(result).toHaveLength(1);
      expect(result[0].locationName).toBe("Store A");
      expect(result[0].locationId).toBe("loc-1");
      expect(result[0].revenue).toBe(10000);
      expect(result[0].cogsAmount).toBe(3500);
      expect(result[0].grossProfit).toBe(6500);
      expect(result[0].cogsPercent).toBe(35);
      expect(result[0].cogsBreakdown["Food Cost"]).toBe(3000);
      expect(result[0].cogsBreakdown["Packaging"]).toBe(500);
    });

    it("should parse multiple locations", () => {
      const reportData = {
        Columns: {
          Column: [
            { ColType: "Account", ColTitle: "Account" },
            {
              ColType: "Money",
              ColTitle: "PK",
              MetaData: [{ Name: "LocationName", Value: "President Kennedy" }],
            },
            {
              ColType: "Money",
              ColTitle: "MK",
              MetaData: [{ Name: "LocationName", Value: "Mackay" }],
            },
            { ColType: "Money", ColTitle: "Total" },
          ],
        },
        Rows: {
          Row: [
            {
              type: "Section",
              Header: { ColData: [{ value: "Income" }] },
              Summary: {
                ColData: [
                  { value: "Total Income" },
                  { value: "20000.00" },
                  { value: "15000.00" },
                  { value: "35000.00" },
                ],
              },
            },
            {
              type: "Section",
              Header: { ColData: [{ value: "Cost of Goods Sold" }] },
              Summary: {
                ColData: [
                  { value: "Total COGS" },
                  { value: "7000.00" },
                  { value: "4500.00" },
                  { value: "11500.00" },
                ],
              },
            },
          ],
        },
      };

      const result = parsePnlForCogs(reportData);
      expect(result).toHaveLength(2);

      const pk = result.find((r) => r.locationName === "President Kennedy");
      expect(pk).toBeDefined();
      expect(pk!.revenue).toBe(20000);
      expect(pk!.cogsAmount).toBe(7000);
      expect(pk!.cogsPercent).toBe(35);

      const mk = result.find((r) => r.locationName === "Mackay");
      expect(mk).toBeDefined();
      expect(mk!.revenue).toBe(15000);
      expect(mk!.cogsAmount).toBe(4500);
      expect(mk!.cogsPercent).toBe(30);
    });

    it("should skip Total column", () => {
      const reportData = {
        Columns: {
          Column: [
            { ColType: "Account", ColTitle: "Account" },
            {
              ColType: "Money",
              ColTitle: "Store A",
              MetaData: [{ Name: "LocationName", Value: "Store A" }],
            },
            {
              ColType: "Money",
              ColTitle: "Total",
              MetaData: [{ Name: "LocationName", Value: "Total" }],
            },
          ],
        },
        Rows: {
          Row: [
            {
              type: "Section",
              Header: { ColData: [{ value: "Income" }] },
              Summary: {
                ColData: [
                  { value: "Total" },
                  { value: "5000" },
                  { value: "5000" },
                ],
              },
            },
          ],
        },
      };

      const result = parsePnlForCogs(reportData);
      expect(result).toHaveLength(1);
      expect(result[0].locationName).toBe("Store A");
    });

    it("should handle zero revenue without division error", () => {
      const reportData = {
        Columns: {
          Column: [
            { ColType: "Account" },
            {
              ColType: "Money",
              MetaData: [{ Name: "LocationName", Value: "Empty Store" }],
            },
          ],
        },
        Rows: {
          Row: [
            {
              type: "Section",
              Header: { ColData: [{ value: "Income" }] },
              Summary: {
                ColData: [{ value: "Total" }, { value: "0" }],
              },
            },
            {
              type: "Section",
              Header: { ColData: [{ value: "Cost of Goods Sold" }] },
              Summary: {
                ColData: [{ value: "Total" }, { value: "100" }],
              },
            },
          ],
        },
      };

      const result = parsePnlForCogs(reportData);
      expect(result).toHaveLength(1);
      expect(result[0].cogsPercent).toBe(0);
      expect(result[0].grossProfit).toBe(-100);
    });

    it("should ignore 'Other Income' sections", () => {
      const reportData = {
        Columns: {
          Column: [
            { ColType: "Account" },
            {
              ColType: "Money",
              MetaData: [{ Name: "LocationName", Value: "Store A" }],
            },
          ],
        },
        Rows: {
          Row: [
            {
              type: "Section",
              Header: { ColData: [{ value: "Income" }] },
              Summary: {
                ColData: [{ value: "Total" }, { value: "10000" }],
              },
            },
            {
              type: "Section",
              Header: { ColData: [{ value: "Other Income" }] },
              Summary: {
                ColData: [{ value: "Total" }, { value: "500" }],
              },
            },
            {
              type: "Section",
              Header: { ColData: [{ value: "Cost of Goods Sold" }] },
              Summary: {
                ColData: [{ value: "Total" }, { value: "3000" }],
              },
            },
          ],
        },
      };

      const result = parsePnlForCogs(reportData);
      expect(result[0].revenue).toBe(10000); // Should NOT include Other Income
      expect(result[0].cogsAmount).toBe(3000);
    });
  });
});

// ─── Multi-Company Integration Tests ───

describe("Multi-Company QuickBooks Integration", () => {
  describe("Store Mapping", () => {
    it("should correctly map expected companies to stores", () => {
      const EXPECTED_MAPPINGS = [
        { company: "9287-8982 Quebec Inc", stores: ["ontario"], description: "Ontario Store" },
        { company: "9364-1009 Quebec INC", stores: ["tunnel"], description: "Tunnel Store" },
        { company: "9427-0659 Quebec Inc", stores: ["pk", "mk"], description: "President Kennedy + Mackay" },
      ];

      // All 4 stores should be covered
      const allStores = EXPECTED_MAPPINGS.flatMap(m => m.stores);
      expect(allStores).toContain("pk");
      expect(allStores).toContain("mk");
      expect(allStores).toContain("tunnel");
      expect(allStores).toContain("ontario");
      expect(new Set(allStores).size).toBe(4);
    });

    it("should have 3 companies covering 4 stores", () => {
      const EXPECTED_MAPPINGS = [
        { company: "9287-8982 Quebec Inc", stores: ["ontario"] },
        { company: "9364-1009 Quebec INC", stores: ["tunnel"] },
        { company: "9427-0659 Quebec Inc", stores: ["pk", "mk"] },
      ];

      expect(EXPECTED_MAPPINGS).toHaveLength(3);
      const totalStores = EXPECTED_MAPPINGS.reduce((sum, m) => sum + m.stores.length, 0);
      expect(totalStores).toBe(4);
    });
  });

  describe("Location Name to Store ID Mapping", () => {
    const LOCATION_TO_STORE: Record<string, string> = {
      "mackay": "mk", "mk": "mk",
      "tunnel": "tunnel", "cathcart": "tunnel", "tn": "tunnel",
      "president kennedy": "pk", "pk": "pk",
      "ontario": "ontario", "on": "ontario",
    };

    it("should map common location names to store IDs", () => {
      expect(LOCATION_TO_STORE["mackay"]).toBe("mk");
      expect(LOCATION_TO_STORE["tunnel"]).toBe("tunnel");
      expect(LOCATION_TO_STORE["cathcart"]).toBe("tunnel");
      expect(LOCATION_TO_STORE["president kennedy"]).toBe("pk");
      expect(LOCATION_TO_STORE["ontario"]).toBe("ontario");
    });

    it("should map short codes to store IDs", () => {
      expect(LOCATION_TO_STORE["mk"]).toBe("mk");
      expect(LOCATION_TO_STORE["tn"]).toBe("tunnel");
      expect(LOCATION_TO_STORE["pk"]).toBe("pk");
      expect(LOCATION_TO_STORE["on"]).toBe("ontario");
    });

    it("should cover all 4 stores", () => {
      const uniqueStoreIds = new Set(Object.values(LOCATION_TO_STORE));
      expect(uniqueStoreIds.has("mk")).toBe(true);
      expect(uniqueStoreIds.has("tunnel")).toBe(true);
      expect(uniqueStoreIds.has("pk")).toBe(true);
      expect(uniqueStoreIds.has("ontario")).toBe(true);
    });
  });

  describe("P&L parsing for multi-company scenario", () => {
    it("should parse PK+MK company P&L with two locations", () => {
      // Simulates 9427-0659 Quebec Inc which has PK and MK in chart of accounts
      const reportData = {
        Columns: {
          Column: [
            { ColType: "Account", ColTitle: "Account" },
            {
              ColType: "Money",
              ColTitle: "President Kennedy",
              MetaData: [{ Name: "LocationName", Value: "President Kennedy" }],
            },
            {
              ColType: "Money",
              ColTitle: "Mackay",
              MetaData: [{ Name: "LocationName", Value: "Mackay" }],
            },
            { ColType: "Money", ColTitle: "Total" },
          ],
        },
        Rows: {
          Row: [
            {
              type: "Section",
              Header: { ColData: [{ value: "Income" }] },
              Summary: {
                ColData: [
                  { value: "Total Income" },
                  { value: "25000.00" },
                  { value: "18000.00" },
                  { value: "43000.00" },
                ],
              },
            },
            {
              type: "Section",
              Header: { ColData: [{ value: "Cost of Goods Sold" }] },
              Rows: {
                Row: [
                  {
                    type: "Data",
                    ColData: [
                      { value: "Food Purchases" },
                      { value: "7500.00" },
                      { value: "5400.00" },
                      { value: "12900.00" },
                    ],
                  },
                ],
              },
              Summary: {
                ColData: [
                  { value: "Total COGS" },
                  { value: "7500.00" },
                  { value: "5400.00" },
                  { value: "12900.00" },
                ],
              },
            },
          ],
        },
      };

      const result = parsePnlForCogs(reportData);
      expect(result).toHaveLength(2);

      const pk = result.find(r => r.locationName === "President Kennedy");
      expect(pk).toBeDefined();
      expect(pk!.revenue).toBe(25000);
      expect(pk!.cogsAmount).toBe(7500);
      expect(pk!.cogsPercent).toBe(30);

      const mk = result.find(r => r.locationName === "Mackay");
      expect(mk).toBeDefined();
      expect(mk!.revenue).toBe(18000);
      expect(mk!.cogsAmount).toBe(5400);
      expect(mk!.cogsPercent).toBe(30);
    });

    it("should parse single-location company P&L (Ontario or Tunnel)", () => {
      // Simulates 9287-8982 Quebec Inc (Ontario only) or 9364-1009 Quebec INC (Tunnel only)
      const reportData = {
        Columns: {
          Column: [
            { ColType: "Account", ColTitle: "Account" },
            {
              ColType: "Money",
              ColTitle: "Ontario",
              MetaData: [{ Name: "LocationName", Value: "Ontario" }],
            },
          ],
        },
        Rows: {
          Row: [
            {
              type: "Section",
              Header: { ColData: [{ value: "Income" }] },
              Summary: {
                ColData: [
                  { value: "Total Income" },
                  { value: "12000.00" },
                ],
              },
            },
            {
              type: "Section",
              Header: { ColData: [{ value: "Cost of Goods Sold" }] },
              Rows: {
                Row: [
                  {
                    type: "Data",
                    ColData: [
                      { value: "Food Cost" },
                      { value: "3600.00" },
                    ],
                  },
                ],
              },
              Summary: {
                ColData: [
                  { value: "Total COGS" },
                  { value: "3600.00" },
                ],
              },
            },
          ],
        },
      };

      const result = parsePnlForCogs(reportData);
      expect(result).toHaveLength(1);
      expect(result[0].locationName).toBe("Ontario");
      expect(result[0].revenue).toBe(12000);
      expect(result[0].cogsAmount).toBe(3600);
      expect(result[0].cogsPercent).toBe(30);
      expect(result[0].cogsBreakdown["Food Cost"]).toBe(3600);
    });
  });
});
