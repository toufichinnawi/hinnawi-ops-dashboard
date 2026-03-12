import { describe, it, expect } from "vitest";
import {
  calcBagelCost,
  calcPastryCost,
  calcCKCost,
  getBagelUnitPrice,
  getPastryUnitPrice,
  getCKUnitPrice,
  BAGEL_UNIT_COST,
  BAGEL_BAG_COST,
  BAGEL_BAG_UNITS,
  BAGEL_DOZEN_COST,
  BAGEL_DOZEN_UNITS,
  PASTRY_PRICES,
  PASTRY_DEFAULT_PRICE,
  CK_PREP_PRICES,
} from "../shared/wastePricing";

describe("Waste Pricing — Bagels", () => {
  it("BAGEL_UNIT_COST is $0.50", () => {
    expect(BAGEL_UNIT_COST).toBe(0.50);
  });

  it("1 bag = 6 units → bag cost is $3.00", () => {
    expect(BAGEL_BAG_UNITS).toBe(6);
    expect(BAGEL_BAG_COST).toBe(0.50 * 6); // $3.00
  });

  it("1 dozen = 12 units → dozen cost is $6.00", () => {
    expect(BAGEL_DOZEN_UNITS).toBe(12);
    expect(BAGEL_DOZEN_COST).toBe(0.50 * 12); // $6.00
  });

  it("calculates bagel cost per unit", () => {
    expect(calcBagelCost(5, "unit")).toBe(5 * 0.50); // $2.50
  });

  it("calculates bagel cost per bag (1 bag = 6 units = $3.00)", () => {
    expect(calcBagelCost(1, "bag")).toBe(3.00);
    expect(calcBagelCost(2, "bag")).toBe(6.00);
    expect(calcBagelCost(5, "bag")).toBe(15.00);
  });

  it("calculates bagel cost per dozen (1 dozen = 12 units = $6.00)", () => {
    expect(calcBagelCost(1, "dozen")).toBe(6.00);
    expect(calcBagelCost(2, "dozen")).toBe(12.00);
  });

  it("bag cost is NOT the same as unit cost (bag = 6 units)", () => {
    // This is the key fix — previously bag was treated as 1 unit
    expect(calcBagelCost(1, "bag")).not.toBe(calcBagelCost(1, "unit"));
    expect(calcBagelCost(1, "bag")).toBe(calcBagelCost(6, "unit"));
  });

  it("returns 0 for zero or negative qty", () => {
    expect(calcBagelCost(0, "unit")).toBe(0);
    expect(calcBagelCost(-3, "dozen")).toBe(0);
    expect(calcBagelCost(0, "bag")).toBe(0);
  });

  it("getBagelUnitPrice returns correct prices for each qty type", () => {
    expect(getBagelUnitPrice("Sesame", "unit")).toBe(0.50);
    expect(getBagelUnitPrice("Sesame", "bag")).toBe(3.00);
    expect(getBagelUnitPrice("Sesame", "dozen")).toBe(6.00);
  });
});

describe("Waste Pricing — Pastries (updated from COSTING sheet)", () => {
  it("standard pastries have correct prices", () => {
    expect(calcPastryCost("Croissant", 1)).toBe(2.19);
    expect(calcPastryCost("Chocolatine", 1)).toBe(2.39);
    expect(calcPastryCost("Croissant aux Amandes", 1)).toBe(2.79);
  });

  it("in-house pastries have correct prices from COSTING sheet", () => {
    expect(PASTRY_PRICES["Banana Bread with Nuts"]).toBe(0.64);
    expect(PASTRY_PRICES["Chocolate Chips Cookie"]).toBe(0.96);
    expect(PASTRY_PRICES["Muffin a L'Erable"]).toBe(0.40);
    expect(PASTRY_PRICES["Muffin Bleuets"]).toBe(0.95);
    expect(PASTRY_PRICES["Muffin Pistaches"]).toBe(1.36);
    expect(PASTRY_PRICES["Muffin Chocolat"]).toBe(1.27);
    expect(PASTRY_PRICES["Yogurt Granola"]).toBe(1.77);
    expect(PASTRY_PRICES["Pudding"]).toBe(1.21);
  });

  it("missing items from COSTING sheet are priced at $0", () => {
    expect(PASTRY_PRICES["Fresh orange juice"]).toBe(0);
    expect(PASTRY_PRICES["Gateau aux Carottes"]).toBe(0);
    expect(PASTRY_PRICES["Granola bag"]).toBe(0);
    expect(PASTRY_PRICES["Bagel Chips Bags"]).toBe(0);
    expect(PASTRY_PRICES["Maple Pecan Bar"]).toBe(0);
  });

  it("default pastry price for unknown items is $0", () => {
    expect(PASTRY_DEFAULT_PRICE).toBe(0);
    expect(calcPastryCost("Unknown Pastry", 4)).toBe(0);
  });

  it("old misspelling fallback still works for existing reports", () => {
    expect(PASTRY_PRICES["Muffin a L'Erabe"]).toBe(0.40);
  });

  it("calculates pastry costs correctly", () => {
    expect(calcPastryCost("Banana Bread with Nuts", 3)).toBeCloseTo(3 * 0.64);
    expect(calcPastryCost("Muffin Pistaches", 2)).toBeCloseTo(2 * 1.36);
    expect(calcPastryCost("Yogurt Granola", 5)).toBeCloseTo(5 * 1.77);
  });

  it("returns 0 for zero or negative qty", () => {
    expect(calcPastryCost("Croissant", 0)).toBe(0);
    expect(calcPastryCost("Croissant", -1)).toBe(0);
  });

  it("getPastryUnitPrice returns correct prices", () => {
    expect(getPastryUnitPrice("Croissant")).toBe(2.19);
    expect(getPastryUnitPrice("Banana Bread with Nuts")).toBe(0.64);
    expect(getPastryUnitPrice("Unknown")).toBe(0);
  });
});

describe("Waste Pricing — CK Preps", () => {
  it("calculates CK item cost per unit", () => {
    expect(calcCKCost("Tomatoes", 5, "unit")).toBe(5 * 0.45);
    expect(calcCKCost("Avocado", 3, "unit")).toBe(3 * 1.40);
  });

  it("calculates CK item cost per container", () => {
    expect(calcCKCost("Tomatoes", 2, "container")).toBe(2 * 3.50);
    expect(calcCKCost("Smoke meat", 1, "container")).toBe(11.00);
  });

  it("returns 0 for unknown CK item", () => {
    expect(calcCKCost("Unknown Item", 5, "unit")).toBe(0);
  });

  it("returns 0 for zero or negative qty", () => {
    expect(calcCKCost("Tomatoes", 0, "unit")).toBe(0);
    expect(calcCKCost("Tomatoes", -2, "container")).toBe(0);
  });

  it("handles alternate spellings (Smoked Meat vs Smoke meat)", () => {
    expect(calcCKCost("Smoked Meat", 1, "unit")).toBe(1.80);
    expect(calcCKCost("Smoke meat", 1, "unit")).toBe(1.80);
  });

  it("handles alternate casing (Bacon Jam vs Bacon jam)", () => {
    expect(calcCKCost("Bacon Jam", 2, "unit")).toBe(2 * 0.60);
    expect(calcCKCost("Bacon jam", 2, "unit")).toBe(2 * 0.60);
  });

  it("getCKUnitPrice returns correct prices", () => {
    expect(getCKUnitPrice("Eggs", "unit")).toBe(0.45);
    expect(getCKUnitPrice("Eggs", "container")).toBe(4.50);
    expect(getCKUnitPrice("Unknown", "unit")).toBe(0);
  });

  it("all CK items have both unit and container costs", () => {
    for (const [name, prices] of Object.entries(CK_PREP_PRICES)) {
      expect(prices.unitCost, `${name} unitCost`).toBeGreaterThan(0);
      expect(prices.containerCost, `${name} containerCost`).toBeGreaterThan(0);
      expect(prices.containerCost, `${name} container > unit`).toBeGreaterThan(prices.unitCost);
    }
  });
});
