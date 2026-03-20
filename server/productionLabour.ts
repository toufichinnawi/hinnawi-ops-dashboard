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
