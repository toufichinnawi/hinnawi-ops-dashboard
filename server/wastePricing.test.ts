import { describe, it, expect } from "vitest";
import {
  calcBagelCost,
  calcPastryCost,
  calcCKCost,
  getBagelUnitPrice,
  getPastryUnitPrice,
  getCKUnitPrice,
  BAGEL_UNIT_COST,
  BAGEL_DOZEN_COST,
  PASTRY_PRICES,
  PASTRY_DEFAULT_PRICE,
  CK_PREP_PRICES,
} from "../shared/wastePricing";

describe("Waste Pricing — Bagels", () => {
  it("calculates bagel cost per unit", () => {
    expect(calcBagelCost(5, "unit")).toBe(5 * 0.50);
    expect(calcBagelCost(5, "bag")).toBe(5 * 0.50);
  });

  it("calculates bagel cost per dozen", () => {
    expect(calcBagelCost(2, "dozen")).toBe(2 * 6.00);
  });

  it("returns 0 for zero or negative qty", () => {
    expect(calcBagelCost(0, "unit")).toBe(0);
    expect(calcBagelCost(-3, "dozen")).toBe(0);
  });

  it("getBagelUnitPrice returns correct prices", () => {
    expect(getBagelUnitPrice("Sesame", "unit")).toBe(0.50);
    expect(getBagelUnitPrice("Sesame", "dozen")).toBe(6.00);
  });

  it("BAGEL_DOZEN_COST is 12x unit cost", () => {
    expect(BAGEL_DOZEN_COST).toBe(BAGEL_UNIT_COST * 12);
  });
});

describe("Waste Pricing — Pastries", () => {
  it("calculates known pastry costs", () => {
    expect(calcPastryCost("Croissant", 3)).toBe(3 * 2.19);
    expect(calcPastryCost("Chocolatine", 2)).toBe(2 * 2.39);
    expect(calcPastryCost("Croissant aux Amandes", 1)).toBe(2.79);
  });

  it("uses default price for unknown pastry", () => {
    expect(calcPastryCost("Unknown Pastry", 4)).toBe(4 * PASTRY_DEFAULT_PRICE);
  });

  it("returns 0 for zero or negative qty", () => {
    expect(calcPastryCost("Croissant", 0)).toBe(0);
    expect(calcPastryCost("Croissant", -1)).toBe(0);
  });

  it("getPastryUnitPrice returns correct prices", () => {
    expect(getPastryUnitPrice("Croissant")).toBe(2.19);
    expect(getPastryUnitPrice("Unknown")).toBe(PASTRY_DEFAULT_PRICE);
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
