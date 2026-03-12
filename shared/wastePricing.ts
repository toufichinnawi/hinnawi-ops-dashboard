/**
 * Waste & Leftover Item Pricing (as of March 11, 2026)
 * Source: HINNAWIDASHBOARDANDPORTALNOTES.xlsx — "COSTING for WASTE" sheet
 *
 * Used to calculate waste cost ratios across all waste report forms.
 */

// ─── Bagels ─────────────────────────────────────────────────────
// All bagels have the same unit cost
export const BAGEL_UNIT_COST = 0.50;
// 1 bag = 6 units, 1 dozen = 12 units
export const BAGEL_BAG_UNITS = 6;
export const BAGEL_DOZEN_UNITS = 12;
export const BAGEL_BAG_COST = BAGEL_UNIT_COST * BAGEL_BAG_UNITS; // $3.00 per bag
export const BAGEL_DOZEN_COST = BAGEL_UNIT_COST * BAGEL_DOZEN_UNITS; // $6.00 per dozen

// ─── Pastries ───────────────────────────────────────────────────
// Per-unit cost
export const PASTRY_PRICES: Record<string, number> = {
  // Standard pastries
  "Croissant": 2.19,
  "Chocolatine": 2.39,
  "Croissant aux Amandes": 2.79, // Almond Croissant
  // In-house pastries (from COSTING sheet)
  "Banana Bread with Nuts": 0.64,
  "Chocolate Chips Cookie": 0.96,
  "Muffin a L'Erable": 0.40,
  "Muffin a L'Erabe": 0.40, // old misspelling fallback for existing reports
  "Muffin \u00e0 l'\u00c9rable": 0.40, // alternate spelling with accents
  "Muffin Bleuets": 0.95,
  "Muffin Pistaches": 1.36,
  "Muffin Chocolat": 1.27,
  "Yogurt Granola": 1.77,
  "Fresh orange juice": 0, // Missing from costing sheet
  "G\u00e2teau aux Carottes": 0, // Missing from costing sheet
  "Gateau aux Carottes": 0, // alternate spelling without accents
  "Granola bag": 0, // Missing from costing sheet
  "Bagel Chips Bags": 0, // Missing from costing sheet
  "Maple Pecan Bar": 0, // Missing from costing sheet
  "Pudding": 1.21,
};

// Default pastry price for items not explicitly listed
export const PASTRY_DEFAULT_PRICE = 0;

// ─── CK Preps ───────────────────────────────────────────────────
// Each CK item has a unit cost and a container cost
export interface CKPrepPrice {
  unitCost: number;
  containerCost: number;
}

export const CK_PREP_PRICES: Record<string, CKPrepPrice> = {
  "Tomatoes":      { unitCost: 0.45, containerCost: 3.50 },
  "Pepper":        { unitCost: 0.70, containerCost: 4.20 },
  "Onions":        { unitCost: 0.35, containerCost: 2.80 },
  "Cucumber":      { unitCost: 0.60, containerCost: 3.80 },
  "Lemon":         { unitCost: 0.55, containerCost: 3.20 },
  "Avocado":       { unitCost: 1.40, containerCost: 6.50 },
  "Mix Salad":     { unitCost: 0.50, containerCost: 4.00 },
  "Lettuce":       { unitCost: 0.45, containerCost: 3.60 },
  "Spring Mix":    { unitCost: 0.60, containerCost: 4.20 },
  "Tofu":          { unitCost: 0.80, containerCost: 5.20 },
  "Veggie Patty":  { unitCost: 1.20, containerCost: 7.00 },
  "Mozzarella":    { unitCost: 0.75, containerCost: 6.00 },
  "Cheddar":       { unitCost: 0.65, containerCost: 5.20 },
  "Eggs":          { unitCost: 0.45, containerCost: 4.50 },
  "Ham":           { unitCost: 0.90, containerCost: 7.50 },
  "Smoke meat":    { unitCost: 1.80, containerCost: 11.00 },
  "Smoked Meat":   { unitCost: 1.80, containerCost: 11.00 }, // alternate spelling
  "Bacon":         { unitCost: 1.10, containerCost: 8.00 },
  "Bacon jam":     { unitCost: 0.60, containerCost: 6.00 },
  "Bacon Jam":     { unitCost: 0.60, containerCost: 6.00 }, // alternate casing
  "Chicken":       { unitCost: 1.40, containerCost: 9.00 },
  "Cream Cheese":  { unitCost: 0.75, containerCost: 6.50 },
};

// ─── Cost Calculation Helpers ────────────────────────────────────

/**
 * Calculate the cost of a bagel waste/leftover entry.
 * @param qty - Number of items (bags, dozens, or individual units)
 * @param qtyType - "bag" (1 bag = 6 units), "dozen" (1 dozen = 12 units), or "unit" (1 unit)
 */
export function calcBagelCost(qty: number, qtyType: string): number {
  if (!qty || qty <= 0) return 0;
  if (qtyType === "dozen") return qty * BAGEL_DOZEN_COST;
  if (qtyType === "bag") return qty * BAGEL_BAG_COST;
  // "unit" — per individual bagel
  return qty * BAGEL_UNIT_COST;
}

/**
 * Calculate the cost of a pastry waste/leftover entry.
 * @param itemName - The pastry item name
 * @param qty - Number of units
 */
export function calcPastryCost(itemName: string, qty: number): number {
  if (!qty || qty <= 0) return 0;
  const price = PASTRY_PRICES[itemName] ?? PASTRY_DEFAULT_PRICE;
  return qty * price;
}

/**
 * Calculate the cost of a CK prep waste/leftover entry.
 * @param itemName - The CK item name
 * @param qty - Number of items
 * @param qtyType - "unit" or "container"
 */
export function calcCKCost(itemName: string, qty: number, qtyType: string): number {
  if (!qty || qty <= 0) return 0;
  const prices = CK_PREP_PRICES[itemName];
  if (!prices) return 0;
  return qtyType === "container" ? qty * prices.containerCost : qty * prices.unitCost;
}

/**
 * Get the unit price for display purposes.
 */
export function getBagelUnitPrice(_itemName: string, qtyType: string): number {
  if (qtyType === "dozen") return BAGEL_DOZEN_COST;
  if (qtyType === "bag") return BAGEL_BAG_COST;
  return BAGEL_UNIT_COST;
}

export function getPastryUnitPrice(itemName: string): number {
  return PASTRY_PRICES[itemName] ?? PASTRY_DEFAULT_PRICE;
}

export function getCKUnitPrice(itemName: string, qtyType: string): number {
  const prices = CK_PREP_PRICES[itemName];
  if (!prices) return 0;
  return qtyType === "container" ? prices.containerCost : prices.unitCost;
}
