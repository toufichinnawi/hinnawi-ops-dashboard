import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildDailySalesLabourCard,
  sendDailySalesLabourReport,
  buildHighLabourAlert,
  buildLabourAlert,
  type StoreReport,
} from "./teams";

describe("Daily Sales & Labour Report", () => {
  const sampleStores: StoreReport[] = [
    { storeName: "Cathcart (Tunnel)", netSales: 902.98, labourPercent: 15.66, labourTarget: 24 },
    { storeName: "Ontario", netSales: 317.73, labourPercent: 44.59, labourTarget: 28 },
    { storeName: "Mackay", netSales: 1257.94, labourPercent: 21.31, labourTarget: 23 },
    { storeName: "President Kennedy", netSales: 1887.0, labourPercent: 26.07, labourTarget: 18 },
  ];

  it("should build an Adaptive Card with correct structure", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", sampleStores);

    expect(card).toHaveProperty("type", "message");
    expect(card).toHaveProperty("attachments");
    expect(card.attachments).toHaveLength(1);
    expect(card.attachments[0].contentType).toBe("application/vnd.microsoft.card.adaptive");
    expect(card.attachments[0].content.type).toBe("AdaptiveCard");
    expect(card.attachments[0].content.version).toBe("1.4");
  });

  it("should include the date in the card body", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", sampleStores);
    const body = card.attachments[0].content.body;

    const dateBlock = body.find((b: any) => b.text === "March 05, 2026");
    expect(dateBlock).toBeDefined();
    expect(dateBlock.weight).toBe("Bolder");
  });

  it("should include a FactSet for each store", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", sampleStores);
    const body = card.attachments[0].content.body;

    const factSets = body.filter((b: any) => b.type === "FactSet");
    // 4 stores + 1 total summary = 5 FactSets
    expect(factSets.length).toBe(5);
  });

  it("should format net sales with full precision (not abbreviated)", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", sampleStores);
    const body = card.attachments[0].content.body;

    const factSets = body.filter((b: any) => b.type === "FactSet");
    // First store: Tunnel
    const tunnelFacts = factSets[0].facts;
    const salesFact = tunnelFacts.find((f: any) => f.title === "Net Sales");
    expect(salesFact.value).toBe("$902.98");
  });

  it("should show warning emoji for stores over labour target", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", sampleStores);
    const body = card.attachments[0].content.body;

    const factSets = body.filter((b: any) => b.type === "FactSet");
    // Ontario (44.59% > 28% target) should have warning emoji
    const ontarioFacts = factSets[1].facts;
    const labourFact = ontarioFacts.find((f: any) => f.title === "Labour%");
    expect(labourFact.value).toContain("44.59%");
    expect(labourFact.value).toContain("\u26A0\uFE0F");
  });

  it("should NOT show warning emoji for stores under labour target", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", sampleStores);
    const body = card.attachments[0].content.body;

    const factSets = body.filter((b: any) => b.type === "FactSet");
    // Tunnel (15.66% < 24% target) should NOT have warning emoji
    const tunnelFacts = factSets[0].facts;
    const labourFact = tunnelFacts.find((f: any) => f.title === "Labour%");
    expect(labourFact.value).toBe("15.66%");
    expect(labourFact.value).not.toContain("\u26A0\uFE0F");
  });

  it("should include total summary with correct totals", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", sampleStores);
    const body = card.attachments[0].content.body;

    const factSets = body.filter((b: any) => b.type === "FactSet");
    const totalFacts = factSets[factSets.length - 1].facts;

    const totalSalesFact = totalFacts.find((f: any) => f.title === "Total Net Sales");
    expect(totalSalesFact).toBeDefined();
    // 902.98 + 317.73 + 1257.94 + 1887.00 = 4365.65
    expect(totalSalesFact.value).toBe("$4,365.65");

    const avgLabourFact = totalFacts.find((f: any) => f.title === "Avg Labour%");
    expect(avgLabourFact).toBeDefined();
    // (15.66 + 44.59 + 21.31 + 26.07) / 4 = 26.9075
    expect(avgLabourFact.value).toBe("26.91%");
  });

  it("should include Hinnawi Bros footer", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", sampleStores);
    const body = card.attachments[0].content.body;

    const footer = body.find((b: any) => b.text === "Hinnawi Bros Operations Dashboard");
    expect(footer).toBeDefined();
    expect(footer.isSubtle).toBe(true);
  });

  it("should handle empty stores array", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", []);
    expect(card).toBeDefined();
    expect(card.attachments[0].content.body).toBeDefined();
  });

  it("should handle single store", () => {
    const card = buildDailySalesLabourCard("March 05, 2026", [sampleStores[0]]);
    const body = card.attachments[0].content.body;
    const factSets = body.filter((b: any) => b.type === "FactSet");
    // 1 store + 1 total = 2
    expect(factSets.length).toBe(2);
  });
});

describe("High Labour Alert", () => {
  it("should build a warning alert when labour is slightly over target", () => {
    const alert = buildHighLabourAlert("Mackay", 25.5, 23, 1257.94, "2026-03-05");

    expect(alert.title).toContain("Mackay");
    expect(alert.severity).toBe("warning");
    expect(alert.message).toContain("2.5%");
    expect(alert.message).toContain("above");
    expect(alert.currentValue).toContain("25.50%");
    expect(alert.currentValue).toContain("23%");
  });

  it("should build a critical alert when labour is way over target (>10% above)", () => {
    const alert = buildHighLabourAlert("Ontario", 44.59, 28, 317.73, "2026-03-05");

    expect(alert.severity).toBe("critical");
    expect(alert.message).toContain("16.6%");
  });

  it("should include net sales in the threshold field", () => {
    const alert = buildHighLabourAlert("PK", 26.07, 18, 1887.0, "2026-03-05");

    expect(alert.threshold).toContain("$1,887.00");
  });

  it("should use the existing buildLabourAlert for simple alerts", () => {
    const alert = buildLabourAlert("Tunnel", 28.0, 24);

    expect(alert.title).toBe("Labour Cost Alert");
    expect(alert.severity).toBe("warning"); // 28 - 24 = 4, under the +5 critical threshold
    expect(alert.currentValue).toBe("28.0%");
    expect(alert.threshold).toBe("24%");
  });

  it("should mark as critical when >5% over threshold in buildLabourAlert", () => {
    const alert = buildLabourAlert("Ontario", 44.59, 28);
    expect(alert.severity).toBe("critical");
  });
});
