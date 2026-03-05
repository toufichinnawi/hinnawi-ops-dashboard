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
