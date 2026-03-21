/**
 * Production Labour Service
 * Fetches labour data from 7shifts CK account by department (Central Kitchen, Bagel Factory, etc.)
 * Uses time_punches endpoint to compute actual hours and costs per department.
 */

const SEVEN_SHIFTS_BASE_URL = "https://api.7shifts.com/v2";
const API_VERSION = "2025-03-01";

// CK 7shifts account constants
export const CK_COMPANY_ID = 306595;
export const CK_LOCATION_ID = 377212;

// Department IDs
export const DEPARTMENTS = {
  CENTRAL_KITCHEN: { id: 569422, name: "Central Kitchen", shortName: "CK" },
  BAGEL_FACTORY: { id: 569423, name: "Bagel Factory", shortName: "BF" },
  CHALET: { id: 567077, name: "Chalet", shortName: "Chalet" },
  OFFICE: { id: 567078, name: "Office", shortName: "Office" },
} as const;

// All production departments (CK + BF) — excludes Chalet and Office
export const PRODUCTION_DEPT_IDS: number[] = [
  DEPARTMENTS.CENTRAL_KITCHEN.id,
  DEPARTMENTS.BAGEL_FACTORY.id,
];

// Role IDs within Central Kitchen that count as "Pastry Kitchen" and "Preps"
export const ROLE_IDS = {
  PASTRIES: 1892598,        // "Pastries" role in CK dept
  PASTRIES_PREPS: 2740299,  // "Pastries preps" role in CK dept
  PREPS: 1892599,           // "Preps" role in CK dept
} as const;

// Production Labour categories for the Overview KPI:
// 1. Bagel Factory = entire BF department
// 2. Pastry Kitchen = CK punches with role Pastries or Pastries preps
// 3. Preps = CK punches with role Preps
export const PRODUCTION_ROLE_IDS = [
  ROLE_IDS.PASTRIES,
  ROLE_IDS.PASTRIES_PREPS,
  ROLE_IDS.PREPS,
];

export interface TimePunch {
  id: number;
  company_id: number;
  user_id: number;
  role_id: number;
  location_id: number;
  department_id: number;
  hourly_wage: number; // in cents
  clocked_in: string;  // ISO 8601
  clocked_out: string | null;
  tips: number;
  approved: boolean;
  deleted: boolean;
  breaks: Array<{
    id: number;
    start: string;
    end: string | null;
    paid: boolean;
  }>;
}

export interface DepartmentLabour {
  departmentId: number;
  departmentName: string;
  shortName: string;
  employees: number;
  totalHours: number;
  labourCost: number; // in dollars
}

export interface ProductionLabourSummary {
  date: string;
  departments: DepartmentLabour[];
  totalEmployees: number;
  totalHours: number;
  totalLabourCost: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchTimePunches(
  accessToken: string,
  date: string, // YYYY-MM-DD
): Promise<TimePunch[]> {
  const allPunches: TimePunch[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const url = new URL(
      `${SEVEN_SHIFTS_BASE_URL}/company/${CK_COMPANY_ID}/time_punches`
    );
    url.searchParams.set("clocked_in[gte]", `${date}T00:00:00`);
    url.searchParams.set("clocked_in[lte]", `${date}T23:59:59`);
    url.searchParams.set("location_id", String(CK_LOCATION_ID));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

    console.log(`[ProductionLabour] GET ${url.pathname}${url.search}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
          "x-api-version": API_VERSION,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        if (response.status === 429) {
          console.log("[ProductionLabour] Rate limited, waiting 3s...");
          await delay(3000);
          continue;
        }
        throw new Error(`7shifts CK API error: ${response.status} ${text}`);
      }

      const json = await response.json();
      const punches = json.data || [];
      allPunches.push(...punches);

      // Check if there are more pages
      const cursor = json.meta?.cursor;
      if (!cursor?.next || punches.length < limit) {
        break;
      }
      offset += limit;
      await delay(300); // Rate limit
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return allPunches;
}

function computeHours(clockedIn: string, clockedOut: string | null): number {
  if (!clockedOut) return 0;
  const tIn = new Date(clockedIn).getTime();
  const tOut = new Date(clockedOut).getTime();
  return (tOut - tIn) / (1000 * 60 * 60);
}

function computeBreakHours(breaks: TimePunch["breaks"]): number {
  let total = 0;
  for (const b of breaks) {
    if (b.end && !b.paid) {
      const start = new Date(b.start).getTime();
      const end = new Date(b.end).getTime();
      total += (end - start) / (1000 * 60 * 60);
    }
  }
  return total;
}

export async function getProductionLabour(
  accessToken: string,
  date: string, // YYYY-MM-DD
): Promise<ProductionLabourSummary> {
  const punches = await fetchTimePunches(accessToken, date);

  // Group by department
  const deptMap = new Map<number, { employees: Set<number>; totalHours: number; labourCost: number }>();

  for (const punch of punches) {
    if (punch.deleted) continue;

    const deptId = punch.department_id;
    if (!deptMap.has(deptId)) {
      deptMap.set(deptId, { employees: new Set(), totalHours: 0, labourCost: 0 });
    }

    const dept = deptMap.get(deptId)!;
    dept.employees.add(punch.user_id);

    const grossHours = computeHours(punch.clocked_in, punch.clocked_out);
    const breakHours = computeBreakHours(punch.breaks);
    const netHours = Math.max(0, grossHours - breakHours);
    const cost = (punch.hourly_wage / 100) * netHours;

    dept.totalHours += netHours;
    dept.labourCost += cost;
  }

  // Build department summaries
  const allDepts = Object.values(DEPARTMENTS);
  const departments: DepartmentLabour[] = allDepts.map((dept) => {
    const data = deptMap.get(dept.id);
    return {
      departmentId: dept.id,
      departmentName: dept.name,
      shortName: dept.shortName,
      employees: data ? data.employees.size : 0,
      totalHours: data ? parseFloat(data.totalHours.toFixed(1)) : 0,
      labourCost: data ? parseFloat(data.labourCost.toFixed(2)) : 0,
    };
  });

  // Compute production totals (CK + BF only)
  const productionDepts = departments.filter((d) =>
    PRODUCTION_DEPT_IDS.includes(d.departmentId)
  );
  const totalEmployees = productionDepts.reduce((s, d) => s + d.employees, 0);
  const totalHours = parseFloat(
    productionDepts.reduce((s, d) => s + d.totalHours, 0).toFixed(1)
  );
  const totalLabourCost = parseFloat(
    productionDepts.reduce((s, d) => s + d.labourCost, 0).toFixed(2)
  );

  return {
    date,
    departments,
    totalEmployees,
    totalHours,
    totalLabourCost,
  };
}

/**
 * Get production labour for a date range (aggregated)
 */
export async function getProductionLabourRange(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<ProductionLabourSummary> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dailySummaries: ProductionLabourSummary[] = [];

  let current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    try {
      const summary = await getProductionLabour(accessToken, dateStr);
      dailySummaries.push(summary);
    } catch (err: any) {
      console.error(`[ProductionLabour] Failed for ${dateStr}: ${err.message}`);
    }
    await delay(300); // Rate limit between days
    current.setDate(current.getDate() + 1);
  }

  // Aggregate across all days
  const allDepts = Object.values(DEPARTMENTS);
  const aggregated: DepartmentLabour[] = allDepts.map((dept) => {
    const allEmployees = new Set<number>();
    let totalHours = 0;
    let labourCost = 0;

    for (const summary of dailySummaries) {
      const deptData = summary.departments.find(
        (d) => d.departmentId === dept.id
      );
      if (deptData) {
        totalHours += deptData.totalHours;
        labourCost += deptData.labourCost;
        // Note: we can't perfectly deduplicate employees across days from summaries
        // but the count is a reasonable approximation
      }
    }

    // For employee count, use the max single-day count as approximation
    let maxEmployees = 0;
    for (const summary of dailySummaries) {
      const deptData = summary.departments.find(
        (d) => d.departmentId === dept.id
      );
      if (deptData && deptData.employees > maxEmployees) {
        maxEmployees = deptData.employees;
      }
    }

    return {
      departmentId: dept.id,
      departmentName: dept.name,
      shortName: dept.shortName,
      employees: maxEmployees,
      totalHours: parseFloat(totalHours.toFixed(1)),
      labourCost: parseFloat(labourCost.toFixed(2)),
    };
  });

  const productionDepts = aggregated.filter((d) =>
    PRODUCTION_DEPT_IDS.includes(d.departmentId)
  );

  return {
    date: `${startDate} to ${endDate}`,
    departments: aggregated,
    totalEmployees: productionDepts.reduce((s, d) => s + d.employees, 0),
    totalHours: parseFloat(
      productionDepts.reduce((s, d) => s + d.totalHours, 0).toFixed(1)
    ),
    totalLabourCost: parseFloat(
      productionDepts.reduce((s, d) => s + d.labourCost, 0).toFixed(2)
    ),
  };
}

/**
 * Production Labour Cost for Overview KPI
 * Returns the combined labour cost for:
 *   - Bagel Factory (entire department)
 *   - Pastry Kitchen (CK roles: Pastries + Pastries preps)
 *   - Preps (CK role: Preps)
 */
export interface ProductionLabourCostBreakdown {
  bagelFactory: { hours: number; cost: number; employees: number };
  pastryKitchen: { hours: number; cost: number; employees: number };
  preps: { hours: number; cost: number; employees: number };
  totalCost: number;
  totalHours: number;
  totalEmployees: number;
}

export async function getProductionLabourCost(
  accessToken: string,
  date: string,
): Promise<ProductionLabourCostBreakdown> {
  const punches = await fetchTimePunches(accessToken, date);

  const bf = { employees: new Set<number>(), hours: 0, cost: 0 };
  const pk = { employees: new Set<number>(), hours: 0, cost: 0 };
  const preps = { employees: new Set<number>(), hours: 0, cost: 0 };

  for (const punch of punches) {
    if (punch.deleted) continue;

    const grossHours = computeHours(punch.clocked_in, punch.clocked_out);
    const breakHours = computeBreakHours(punch.breaks);
    const netHours = Math.max(0, grossHours - breakHours);
    const cost = (punch.hourly_wage / 100) * netHours;

    // Bagel Factory: entire department
    if (punch.department_id === DEPARTMENTS.BAGEL_FACTORY.id) {
      bf.employees.add(punch.user_id);
      bf.hours += netHours;
      bf.cost += cost;
    }
    // Central Kitchen roles
    else if (punch.department_id === DEPARTMENTS.CENTRAL_KITCHEN.id) {
      // Pastry Kitchen = Pastries + Pastries preps roles
      if (punch.role_id === ROLE_IDS.PASTRIES || punch.role_id === ROLE_IDS.PASTRIES_PREPS) {
        pk.employees.add(punch.user_id);
        pk.hours += netHours;
        pk.cost += cost;
      }
      // Preps role
      else if (punch.role_id === ROLE_IDS.PREPS) {
        preps.employees.add(punch.user_id);
        preps.hours += netHours;
        preps.cost += cost;
      }
    }
  }

  return {
    bagelFactory: {
      hours: parseFloat(bf.hours.toFixed(1)),
      cost: parseFloat(bf.cost.toFixed(2)),
      employees: bf.employees.size,
    },
    pastryKitchen: {
      hours: parseFloat(pk.hours.toFixed(1)),
      cost: parseFloat(pk.cost.toFixed(2)),
      employees: pk.employees.size,
    },
    preps: {
      hours: parseFloat(preps.hours.toFixed(1)),
      cost: parseFloat(preps.cost.toFixed(2)),
      employees: preps.employees.size,
    },
    totalCost: parseFloat((bf.cost + pk.cost + preps.cost).toFixed(2)),
    totalHours: parseFloat((bf.hours + pk.hours + preps.hours).toFixed(1)),
    totalEmployees: new Set([...bf.employees, ...pk.employees, ...preps.employees]).size,
  };
}

/**
 * Production Labour Cost for a date range (aggregated)
 */
export async function getProductionLabourCostRange(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<ProductionLabourCostBreakdown> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dailyResults: ProductionLabourCostBreakdown[] = [];

  let current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    try {
      const result = await getProductionLabourCost(accessToken, dateStr);
      dailyResults.push(result);
    } catch (err: any) {
      console.error(`[ProductionLabourCost] Failed for ${dateStr}: ${err.message}`);
    }
    await delay(300);
    current.setDate(current.getDate() + 1);
  }

  // Aggregate
  const totals = {
    bagelFactory: { hours: 0, cost: 0, employees: 0 },
    pastryKitchen: { hours: 0, cost: 0, employees: 0 },
    preps: { hours: 0, cost: 0, employees: 0 },
    totalCost: 0,
    totalHours: 0,
    totalEmployees: 0,
  };

  for (const r of dailyResults) {
    totals.bagelFactory.hours += r.bagelFactory.hours;
    totals.bagelFactory.cost += r.bagelFactory.cost;
    totals.bagelFactory.employees = Math.max(totals.bagelFactory.employees, r.bagelFactory.employees);
    totals.pastryKitchen.hours += r.pastryKitchen.hours;
    totals.pastryKitchen.cost += r.pastryKitchen.cost;
    totals.pastryKitchen.employees = Math.max(totals.pastryKitchen.employees, r.pastryKitchen.employees);
    totals.preps.hours += r.preps.hours;
    totals.preps.cost += r.preps.cost;
    totals.preps.employees = Math.max(totals.preps.employees, r.preps.employees);
    totals.totalCost += r.totalCost;
    totals.totalHours += r.totalHours;
    totals.totalEmployees = Math.max(totals.totalEmployees, r.totalEmployees);
  }

  // Round
  totals.bagelFactory.hours = parseFloat(totals.bagelFactory.hours.toFixed(1));
  totals.bagelFactory.cost = parseFloat(totals.bagelFactory.cost.toFixed(2));
  totals.pastryKitchen.hours = parseFloat(totals.pastryKitchen.hours.toFixed(1));
  totals.pastryKitchen.cost = parseFloat(totals.pastryKitchen.cost.toFixed(2));
  totals.preps.hours = parseFloat(totals.preps.hours.toFixed(1));
  totals.preps.cost = parseFloat(totals.preps.cost.toFixed(2));
  totals.totalCost = parseFloat(totals.totalCost.toFixed(2));
  totals.totalHours = parseFloat(totals.totalHours.toFixed(1));

  return totals;
}
