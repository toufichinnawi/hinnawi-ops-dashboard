/**
 * Who's Working Service
 * Fetches real-time clocked-in employees from 7shifts (CK + Retail) and KOOMI aggregate data.
 */

import { CK_COMPANY_ID, CK_LOCATION_ID, DEPARTMENTS, TimePunch } from "./productionLabour";
import { listSevenShiftsConnections } from "./db";
import { scrapeAllStores, getTodayEST } from "./koomi";
import { getKoomiSalesByDateRange } from "./db";

const SEVEN_SHIFTS_BASE_URL = "https://api.7shifts.com/v2";
const API_VERSION = "2025-03-01";

// ─── Types ──────────────────────────────────────────────────────────

export interface ActiveEmployee {
  userId: number;
  name: string;
  department: string;
  location: string;
  clockedIn: string; // ISO 8601
  hoursWorked: number;
  hourlyWage: number; // in dollars
}

export interface LocationStatus {
  name: string;
  shortName: string;
  source: "7shifts" | "koomi";
  employees: ActiveEmployee[];
  totalActive: number;
  aggregateLabourCost?: number; // for KOOMI stores (today's net salaries)
}

export interface WhosWorkingData {
  locations: LocationStatus[];
  totalActive: number;
  timestamp: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface SevenShiftsUser {
  id: number;
  first_name: string;
  last_name: string;
  type: string;
  department_ids: number[];
}

async function fetchUsers(
  companyId: number,
  locationId: number,
  accessToken: string
): Promise<SevenShiftsUser[]> {
  const url = new URL(`${SEVEN_SHIFTS_BASE_URL}/company/${companyId}/users`);
  url.searchParams.set("location_id", String(locationId));
  url.searchParams.set("limit", "200");
  url.searchParams.set("status", "active");

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
      console.error(`[WhosWorking] Failed to fetch users: ${response.status}`);
      return [];
    }

    const json = await response.json();
    return json.data || [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchTodayPunches(
  companyId: number,
  locationId: number,
  accessToken: string
): Promise<TimePunch[]> {
  const today = getTodayEST();
  const allPunches: TimePunch[] = [];
  let offset = 0;
  const limit = 500;

  while (true) {
    const url = new URL(`${SEVEN_SHIFTS_BASE_URL}/company/${companyId}/time_punches`);
    url.searchParams.set("clocked_in[gte]", `${today}T00:00:00`);
    url.searchParams.set("clocked_in[lte]", `${today}T23:59:59`);
    url.searchParams.set("location_id", String(locationId));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(offset));

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
        if (response.status === 429) {
          await delay(3000);
          continue;
        }
        console.error(`[WhosWorking] time_punches error: ${response.status}`);
        break;
      }

      const json = await response.json();
      const punches = json.data || [];
      allPunches.push(...punches);

      if (punches.length < limit) break;
      offset += limit;
      await delay(300);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return allPunches;
}

// ─── Main Function ──────────────────────────────────────────────────

export async function getWhosWorking(): Promise<WhosWorkingData> {
  const locations: LocationStatus[] = [];
  const ckToken = process.env.SEVEN_SHIFTS_CK_ACCESS_TOKEN;

  // ─── 7Shifts CK Account (BF, CK, Office) ───────────────────────
  if (ckToken) {
    try {
      const [users, punches] = await Promise.all([
        fetchUsers(CK_COMPANY_ID, CK_LOCATION_ID, ckToken),
        fetchTodayPunches(CK_COMPANY_ID, CK_LOCATION_ID, ckToken),
      ]);

      // Build user name map
      const userMap: Record<number, string> = {};
      for (const u of users) {
        userMap[u.id] = `${u.first_name} ${u.last_name}`;
      }

      // Filter to currently clocked-in (no clocked_out) and not deleted
      const activePunches = punches.filter(p => !p.deleted && !p.clocked_out);

      // Group by department
      const deptGroups: Record<number, ActiveEmployee[]> = {};
      const now = Date.now();

      for (const punch of activePunches) {
        const deptId = punch.department_id;
        if (!deptGroups[deptId]) deptGroups[deptId] = [];

        const clockedInTime = new Date(punch.clocked_in).getTime();
        const hoursWorked = Math.max(0, (now - clockedInTime) / 3600000);

        // Subtract unpaid break time if currently on break
        let breakHours = 0;
        for (const b of punch.breaks || []) {
          if (!b.paid) {
            if (b.end) {
              breakHours += (new Date(b.end).getTime() - new Date(b.start).getTime()) / 3600000;
            } else {
              // Currently on break
              breakHours += (now - new Date(b.start).getTime()) / 3600000;
            }
          }
        }

        const allDepts = Object.values(DEPARTMENTS);
        const deptInfo = allDepts.find(d => d.id === deptId);
        deptGroups[deptId].push({
          userId: punch.user_id,
          name: userMap[punch.user_id] || `Employee #${punch.user_id}`,
          department: deptInfo?.name || `Dept ${deptId}`,
          location: deptInfo?.name || "CK",
          clockedIn: punch.clocked_in,
          hoursWorked: Math.max(0, hoursWorked - breakHours),
          hourlyWage: punch.hourly_wage / 100,
        });
      }

      // Create location entries for BF, CK, Office
      const ckDepts = [
        { id: DEPARTMENTS.BAGEL_FACTORY.id, name: DEPARTMENTS.BAGEL_FACTORY.name, shortName: DEPARTMENTS.BAGEL_FACTORY.shortName, displayName: "Bagel Factory" },
        { id: DEPARTMENTS.CENTRAL_KITCHEN.id, name: DEPARTMENTS.CENTRAL_KITCHEN.name, shortName: DEPARTMENTS.CENTRAL_KITCHEN.shortName, displayName: "Central Kitchen" },
        { id: DEPARTMENTS.OFFICE.id, name: DEPARTMENTS.OFFICE.name, shortName: DEPARTMENTS.OFFICE.shortName, displayName: "Office" },
      ];

      for (const dept of ckDepts) {
        const employees = deptGroups[dept.id] || [];
        locations.push({
          name: dept.displayName,
          shortName: dept.shortName as string,
          source: "7shifts",
          employees,
          totalActive: employees.length,
        });
      }
    } catch (err: any) {
      console.error(`[WhosWorking] CK 7shifts error: ${err.message}`);
      // Add empty entries so UI still shows the locations
      locations.push(
        { name: "Bagel Factory", shortName: "BF", source: "7shifts", employees: [], totalActive: 0 },
        { name: "Central Kitchen", shortName: "CK", source: "7shifts", employees: [], totalActive: 0 },
        { name: "Office", shortName: "Office", source: "7shifts", employees: [], totalActive: 0 },
      );
    }
  } else {
    locations.push(
      { name: "Bagel Factory", shortName: "BF", source: "7shifts", employees: [], totalActive: 0 },
      { name: "Central Kitchen", shortName: "CK", source: "7shifts", employees: [], totalActive: 0 },
      { name: "Office", shortName: "Office", source: "7shifts", employees: [], totalActive: 0 },
    );
  }

  // ─── 7Shifts Retail (Ontario) ───────────────────────────────────
  try {
    const connections = await listSevenShiftsConnections();
    const ontarioConn = connections.find(c => c.isActive && c.storeName.toLowerCase().includes("ontario"));

    if (ontarioConn) {
      const [users, punches] = await Promise.all([
        fetchUsers(ontarioConn.companyId, ontarioConn.locationId, ontarioConn.accessToken),
        fetchTodayPunches(ontarioConn.companyId, ontarioConn.locationId, ontarioConn.accessToken),
      ]);

      const userMap: Record<number, string> = {};
      for (const u of users) {
        userMap[u.id] = `${u.first_name} ${u.last_name}`;
      }

      const activePunches = punches.filter(p => !p.deleted && !p.clocked_out);
      const now = Date.now();
      const employees: ActiveEmployee[] = [];

      for (const punch of activePunches) {
        const clockedInTime = new Date(punch.clocked_in).getTime();
        const hoursWorked = Math.max(0, (now - clockedInTime) / 3600000);

        let breakHours = 0;
        for (const b of punch.breaks || []) {
          if (!b.paid) {
            if (b.end) {
              breakHours += (new Date(b.end).getTime() - new Date(b.start).getTime()) / 3600000;
            } else {
              breakHours += (now - new Date(b.start).getTime()) / 3600000;
            }
          }
        }

        employees.push({
          userId: punch.user_id,
          name: userMap[punch.user_id] || `Employee #${punch.user_id}`,
          department: "Ontario Store",
          location: "Ontario",
          clockedIn: punch.clocked_in,
          hoursWorked: Math.max(0, hoursWorked - breakHours),
          hourlyWage: punch.hourly_wage / 100,
        });
      }

      locations.push({
        name: "Ontario Store",
        shortName: "Ontario",
        source: "7shifts",
        employees,
        totalActive: employees.length,
      });
    } else {
      locations.push({
        name: "Ontario Store",
        shortName: "Ontario",
        source: "7shifts",
        employees: [],
        totalActive: 0,
      });
    }
  } catch (err: any) {
    console.error(`[WhosWorking] Ontario 7shifts error: ${err.message}`);
    locations.push({
      name: "Ontario Store",
      shortName: "Ontario",
      source: "7shifts",
      employees: [],
      totalActive: 0,
    });
  }

  // ─── KOOMI Stores (PK, Mackay, Tunnel) ─────────────────────────
  // KOOMI only provides aggregate labour cost, not individual employees
  const today = getTodayEST();
  const koomiStores = [
    { name: "Pres Kennedy Store", shortName: "PK", storeId: "pk" },
    { name: "Mackay Store", shortName: "Mackay", storeId: "mk" },
    { name: "Tunnel Store", shortName: "Tunnel", storeId: "tunnel" },
  ];

  try {
    // Try to get today's KOOMI data from DB first
    const koomiData = await getKoomiSalesByDateRange(today, today);

    for (const store of koomiStores) {
      const storeData = koomiData.find(d => d.storeId === store.storeId);
      locations.push({
        name: store.name,
        shortName: store.shortName,
        source: "koomi",
        employees: [],
        totalActive: 0,
        aggregateLabourCost: storeData?.netSalaries ?? undefined,
      });
    }
  } catch (err: any) {
    console.error(`[WhosWorking] KOOMI error: ${err.message}`);
    for (const store of koomiStores) {
      locations.push({
        name: store.name,
        shortName: store.shortName,
        source: "koomi",
        employees: [],
        totalActive: 0,
      });
    }
  }

  const totalActive = locations.reduce((sum, loc) => sum + loc.totalActive, 0);

  return {
    locations,
    totalActive,
    timestamp: new Date().toISOString(),
  };
}
