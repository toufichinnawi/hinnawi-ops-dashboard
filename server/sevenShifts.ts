/**
 * 7shifts Integration Service
 * Handles API communication for fetching sales & labour data
 */

const SEVEN_SHIFTS_BASE_URL = "https://api.7shifts.com/v2";
const API_VERSION = "2025-03-01";

// ─── Types ──────────────────────────────────────────────────────────

export interface SevenShiftsCompany {
  id: number;
  name: string;
  country: string;
  created: string;
}

export interface SevenShiftsLocation {
  id: number;
  company_id: number;
  name: string;
  country: string;
  state: string;
  city: string;
  formatted_address: string;
  timezone: string;
}

export interface SevenShiftsDailySalesLabor {
  location_id: number;
  date: string; // "2023-03-01"
  actual_sales: number; // in cents
  projected_sales: number; // in cents
  actual_labor_cost: number; // in cents
  projected_labor_cost: number; // in cents
  actual_labor_minutes: number;
  actual_ot_minutes: number;
  labor_percent: number; // 0.05 = 5%
  sales_per_labor_hour: number;
  actual_items: number;
  projected_items: number;
}

// ─── API Helpers ────────────────────────────────────────────────────

async function sevenShiftsGet<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${SEVEN_SHIFTS_BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  console.log(`[7shifts API] GET ${url.pathname}${url.search}`);

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
      if (response.status === 401) {
        throw new Error(
          "Authentication failed. Please verify your 7shifts Access Token is correct. " +
          "Generate a new one from Company Settings → Developer Tools."
        );
      }
      if (response.status === 403) {
        throw new Error(
          "Access forbidden. Your 7shifts plan may not include API access, " +
          "or the token doesn't have sufficient permissions."
        );
      }
      if (response.status === 429) {
        throw new Error("RATE_LIMITED");
      }
      throw new Error(`7shifts API error: ${response.status} ${text}`);
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sevenShiftsGetWithRetry<T>(
  path: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await sevenShiftsGet<T>(path, accessToken, params);
    } catch (err: any) {
      if (err.message === "RATE_LIMITED" && attempt < 2) {
        const waitMs = (attempt + 1) * 2000;
        console.log(`[7shifts API] Rate limited, waiting ${waitMs}ms before retry ${attempt + 1}...`);
        await delay(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

// ─── Data Fetching ──────────────────────────────────────────────────

export async function fetchCompanies(
  accessToken: string
): Promise<SevenShiftsCompany[]> {
  const data = await sevenShiftsGet<{ data: SevenShiftsCompany[] }>(
    "/companies",
    accessToken
  );
  return data.data || [];
}

export async function fetchLocations(
  companyId: number,
  accessToken: string
): Promise<SevenShiftsLocation[]> {
  const data = await sevenShiftsGet<{ data: SevenShiftsLocation[] }>(
    `/company/${companyId}/locations`,
    accessToken,
    { limit: "500" }
  );
  return data.data || [];
}

export async function fetchDailySalesAndLabor(
  companyId: number,
  locationId: number,
  accessToken: string,
  startDate: string, // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
): Promise<SevenShiftsDailySalesLabor[]> {
  // 7shifts may limit date ranges, so chunk into 30-day windows
  const allData: SevenShiftsDailySalesLabor[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  let chunkStart = new Date(start);
  while (chunkStart <= end) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setDate(chunkEnd.getDate() + 29); // 30-day window
    if (chunkEnd > end) chunkEnd.setTime(end.getTime());

    const fromStr = chunkStart.toISOString().slice(0, 10);
    const toStr = chunkEnd.toISOString().slice(0, 10);

    console.log(`[7shifts] Fetching sales & labor: ${fromStr} to ${toStr}`);

    try {
      const data = await sevenShiftsGetWithRetry<{ data: SevenShiftsDailySalesLabor[] }>(
        `/reports/daily_sales_and_labor`,
        accessToken,
        {
          company_id: String(companyId),
          location_id: String(locationId),
          start_date: fromStr,
          end_date: toStr,
        }
      );

      if (data.data) {
        allData.push(...data.data);
      }
    } catch (err: any) {
      console.error(`[7shifts] Failed to fetch ${fromStr} to ${toStr}: ${err.message}`);
      // Continue with other chunks even if one fails
    }

    await delay(300); // Rate limit between chunks
    chunkStart = new Date(chunkEnd);
    chunkStart.setDate(chunkStart.getDate() + 1);
  }

  return allData;
}

// ─── Date Helpers ───────────────────────────────────────────────────

export function getDateRangeStrings(daysBack: number): {
  startDate: string;
  endDate: string;
} {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}
