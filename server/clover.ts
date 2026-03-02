/**
 * Clover POS Integration Service
 * Handles OAuth flow, data fetching, and sync for Hinnawi Bros stores
 */
import { ENV } from "./_core/env";

// Clover regional API base URLs
const CLOVER_REGIONS: Record<string, string> = {
  "north_america": "https://api.clover.com",
  "europe": "https://api.eu.clover.com",
  "latin_america": "https://api.la.clover.com",
};

const DEFAULT_REGION = "north_america";

function getBaseUrl(region?: string): string {
  return CLOVER_REGIONS[region || DEFAULT_REGION] || CLOVER_REGIONS[DEFAULT_REGION];
}

// ─── Types ──────────────────────────────────────────────────────────

export interface CloverPayment {
  id: string;
  amount: number;
  tipAmount: number;
  taxAmount: number;
  createdTime: number;
  result: string;
  employee?: { id: string; name?: string };
  order?: { id: string };
}

export interface CloverOrder {
  id: string;
  total: number;
  createdTime: number;
  state: string;
  lineItems?: { elements: Array<{ name: string; price: number; quantity?: number }> };
  employee?: { id: string; name?: string };
}

export interface CloverEmployee {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

export interface CloverShift {
  id: string;
  employee: { id: string; name?: string };
  inTime: number;
  outTime?: number;
}

export interface CloverMerchant {
  id: string;
  name: string;
  address?: {
    address1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

// ─── OAuth Helpers ──────────────────────────────────────────────────

export function getCloverAuthUrl(redirectUri: string): string {
  const appId = process.env.CLOVER_APP_ID;
  if (!appId) throw new Error("CLOVER_APP_ID not configured");

  const baseUrl = getBaseUrl();
  return `${baseUrl}/oauth/v2/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

export async function exchangeCloverCode(code: string): Promise<{ accessToken: string }> {
  const appId = process.env.CLOVER_APP_ID;
  const appSecret = process.env.CLOVER_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Clover credentials not configured");

  const baseUrl = getBaseUrl();
  const response = await fetch(`${baseUrl}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      code,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Clover token exchange failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  return { accessToken: data.access_token };
}

// ─── API Helpers ────────────────────────────────────────────────────

async function cloverGet<T>(merchantId: string, accessToken: string, path: string, params?: Record<string, string | string[]>, region?: string): Promise<T> {
  const baseUrl = getBaseUrl(region);
  const url = new URL(`/v3/merchants/${merchantId}${path}`, baseUrl);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        // Multiple values for the same key (e.g., multiple filter params)
        v.forEach(val => url.searchParams.append(k, val));
      } else {
        url.searchParams.set(k, v);
      }
    });
  }

  console.log(`[Clover API] GET ${url.toString().replace(accessToken, '***')}`);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      throw new Error(
        "Authentication failed. Please verify: (1) Your Merchant ID is correct — check the URL in your Clover Dashboard (clover.com/dashboard/m/YOUR_MERCHANT_ID). (2) Your API Token is correct — copy it again from Account & Setup → API Tokens. (3) The token has Read permissions for Employees, Merchant, Orders, and Payments."
      );
    }
    throw new Error(`Clover API error: ${response.status} ${text}`);
  }

  return response.json();
}

// ─── Data Fetching ──────────────────────────────────────────────────

export async function fetchMerchantInfo(merchantId: string, accessToken: string, region?: string): Promise<CloverMerchant> {
  return cloverGet<CloverMerchant>(merchantId, accessToken, "", { expand: "address" }, region);
}

export async function fetchPayments(
  merchantId: string,
  accessToken: string,
  startTime: number,
  endTime: number,
  limit = 500,
  region?: string
): Promise<CloverPayment[]> {
  const allPayments: CloverPayment[] = [];
  let offset = 0;

  while (true) {
    const data = await cloverGet<{ elements: CloverPayment[] }>(
      merchantId,
      accessToken,
      "/payments",
      {
        filter: [`createdTime>=${startTime}`, `createdTime<=${endTime}`],
        limit: String(limit),
        offset: String(offset),
        expand: "employee",
      },
      region
    );

    if (!data.elements || data.elements.length === 0) break;
    allPayments.push(...data.elements);
    if (data.elements.length < limit) break;
    offset += limit;
  }

  return allPayments;
}

export async function fetchOrders(
  merchantId: string,
  accessToken: string,
  startTime: number,
  endTime: number,
  limit = 500
): Promise<CloverOrder[]> {
  const allOrders: CloverOrder[] = [];
  let offset = 0;

  while (true) {
    const data = await cloverGet<{ elements: CloverOrder[] }>(
      merchantId,
      accessToken,
      "/orders",
      {
        filter: `createdTime>=${startTime}&createdTime<=${endTime}`,
        limit: String(limit),
        offset: String(offset),
        expand: "lineItems",
      }
    );

    if (!data.elements || data.elements.length === 0) break;
    allOrders.push(...data.elements);
    if (data.elements.length < limit) break;
    offset += limit;
  }

  return allOrders;
}

export async function fetchEmployees(merchantId: string, accessToken: string): Promise<CloverEmployee[]> {
  const data = await cloverGet<{ elements: CloverEmployee[] }>(merchantId, accessToken, "/employees");
  return data.elements || [];
}

export async function fetchShifts(
  merchantId: string,
  accessToken: string,
  startTime: number,
  endTime: number,
  region?: string
): Promise<CloverShift[]> {
  const allShifts: CloverShift[] = [];
  let offset = 0;

  while (true) {
    const data = await cloverGet<{ elements: CloverShift[] }>(
      merchantId,
      accessToken,
      "/shifts",
      {
        filter: [`in_time>=${startTime}`, `in_time<=${endTime}`],
        limit: "500",
        offset: String(offset),
        expand: "employee",
      },
      region
    );

    if (!data.elements || data.elements.length === 0) break;
    allShifts.push(...data.elements);
    if (data.elements.length < 500) break;
    offset += 500;
  }

  return allShifts;
}

// ─── Aggregation Helpers ────────────────────────────────────────────

export interface DailySalesAggregate {
  date: string;
  totalSales: number;
  totalTips: number;
  totalTax: number;
  orderCount: number;
  refundAmount: number;
  netSales: number;
}

export function aggregatePaymentsByDay(payments: CloverPayment[]): DailySalesAggregate[] {
  const dayMap = new Map<string, DailySalesAggregate>();

  for (const payment of payments) {
    if (payment.result !== "SUCCESS") continue;

    const date = new Date(payment.createdTime).toISOString().slice(0, 10);
    const existing = dayMap.get(date) || {
      date,
      totalSales: 0,
      totalTips: 0,
      totalTax: 0,
      orderCount: 0,
      refundAmount: 0,
      netSales: 0,
    };

    // Clover amounts are in cents
    const amount = payment.amount / 100;
    const tip = (payment.tipAmount || 0) / 100;
    const tax = (payment.taxAmount || 0) / 100;

    if (amount >= 0) {
      existing.totalSales += amount;
      existing.totalTips += tip;
      existing.totalTax += tax;
      existing.orderCount += 1;
      existing.netSales += amount - tax;
    } else {
      existing.refundAmount += Math.abs(amount);
      existing.netSales += amount; // negative
    }

    dayMap.set(date, existing);
  }

  return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface LabourAggregate {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  shiftCount: number;
}

export function aggregateShifts(shifts: CloverShift[]): LabourAggregate[] {
  const empMap = new Map<string, LabourAggregate>();

  for (const shift of shifts) {
    if (!shift.outTime) continue; // skip open shifts

    const hours = (shift.outTime - shift.inTime) / (1000 * 60 * 60);
    const empId = shift.employee.id;
    const existing = empMap.get(empId) || {
      employeeId: empId,
      employeeName: shift.employee.name || "Unknown",
      totalHours: 0,
      shiftCount: 0,
    };

    existing.totalHours += hours;
    existing.shiftCount += 1;
    empMap.set(empId, existing);
  }

  return Array.from(empMap.values());
}

// ─── Date Helpers ───────────────────────────────────────────────────

export function getDateRange(daysBack: number): { startTime: number; endTime: number } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);

  return {
    startTime: start.getTime(),
    endTime: end.getTime(),
  };
}
