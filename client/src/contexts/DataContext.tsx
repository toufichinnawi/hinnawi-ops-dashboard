// DataContext: Global state for uploaded MYR data + Clover API data
// Priority: Clover API data > CSV uploads > demo data
import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import type { ParseResult } from "@/lib/csv-parser";
import { trpc } from "@/lib/trpc";
import {
  overviewKPIs as demoKPIs,
  weeklySales as demoWeeklySales,
  labourData as demoLabourData,
  labourTrend as demoLabourTrend,
  weeklyTraffic as demoTraffic,
  hourlySales as demoHourlySales,
  reportSubmissions as demoReports,
  alerts as demoAlerts,
  stores,
  type KPI,
  type WeeklySales,
  type LabourEntry,
  type DailyTraffic,
  type HourlySales,
  type ReportSubmission,
  type Alert,
} from "@/lib/data";

const STORAGE_KEY = "hinnawi-ops-uploads";

export interface UploadedData {
  uploads: ParseResult[];
  lastUpdated: string | null;
}

interface DataContextValue {
  // Raw uploads
  uploads: ParseResult[];
  addUpload: (result: ParseResult) => void;
  removeUpload: (fileName: string) => void;
  clearAllUploads: () => void;
  lastUpdated: string | null;
  hasLiveData: boolean;
  hasCloverData: boolean;
  hasKoomiData: boolean;
  hasExcelData: boolean;

  // Computed dashboard data (merges live + demo fallback)
  kpis: KPI[];
  weeklySales: WeeklySales[];
  labourData: LabourEntry[];
  labourTrend: typeof demoLabourTrend;
  weeklyTraffic: DailyTraffic[];
  hourlySales: HourlySales[];
  reportSubmissions: ReportSubmission[];
  alerts: Alert[];
}

const DataContext = createContext<DataContextValue | null>(null);

function loadFromStorage(): UploadedData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { uploads: [], lastUpdated: null };
}

function saveToStorage(data: UploadedData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

// ─── Clover Data Helpers ──────────────────────────────────────────

// Map Clover merchant IDs to our store IDs
const merchantToStoreId: Record<string, string> = {
  JVGT8FGCVR9F1: "pk",       // President Kennedy
  CQP5TD9M5R691: "mk",       // Mackay
  KKA9JDAYW9ZY1: "tunnel",   // Tunnel (Cathcart)
};

interface CloverSalesRow {
  id: number;
  connectionId: number;
  merchantId: string;
  date: string;
  totalSales: number;
  totalTips: number;
  totalTax: number;
  orderCount: number;
  refundAmount: number;
  netSales: number;
  createdAt: Date;
  updatedAt: Date;
}

function computeCloverKPIs(salesData: CloverSalesRow[]): KPI[] | null {
  if (!salesData || salesData.length === 0) return null;

  // Get the last 7 days of data
  const sortedDates = Array.from(new Set(salesData.map(s => s.date))).sort().reverse();
  const recentDates = sortedDates.slice(0, 7);
  const olderDates = sortedDates.slice(7, 14);

  const recentSales = salesData.filter(s => recentDates.includes(s.date));
  const olderSales = salesData.filter(s => olderDates.includes(s.date));

  const totalRevenue = recentSales.reduce((s, r) => s + r.totalSales, 0);
  const totalOrders = recentSales.reduce((s, r) => s + r.orderCount, 0);
  const totalTips = recentSales.reduce((s, r) => s + r.totalTips, 0);

  const prevRevenue = olderSales.reduce((s, r) => s + r.totalSales, 0);
  const prevOrders = olderSales.reduce((s, r) => s + r.orderCount, 0);

  const revenueTrend = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
  const ordersTrend = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;

  // Count unique stores with data
  const storeCount = new Set(recentSales.map(s => s.merchantId)).size;

  return [
    {
      title: "Total Revenue",
      value: Math.round(totalRevenue),
      format: "currency",
      trend: parseFloat(revenueTrend.toFixed(1)),
      trendLabel: "vs prior period",
      subtitle: `${storeCount} store${storeCount !== 1 ? "s" : ""} — last 7 days`,
    },
    {
      title: "Total Tips",
      value: Math.round(totalTips),
      format: "currency",
      trend: 0,
      trendLabel: "from Clover POS",
      subtitle: totalRevenue > 0 ? `${((totalTips / totalRevenue) * 100).toFixed(1)}% of revenue` : "",
    },
    {
      title: "Avg Ticket",
      value: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
      format: "currency",
      trend: 0,
      trendLabel: "from Clover POS",
      subtitle: `${totalOrders.toLocaleString()} orders`,
    },
    {
      title: "Total Orders",
      value: totalOrders,
      format: "number",
      trend: parseFloat(ordersTrend.toFixed(1)),
      trendLabel: "vs prior period",
      subtitle: `Avg $${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0"} per order`,
    },
  ];
}

function computeCloverWeeklySales(salesData: CloverSalesRow[]): WeeklySales[] | null {
  if (!salesData || salesData.length === 0) return null;

  // Group by date, with each store as a column
  const dateMap = new Map<string, { pk: number; mk: number; ontario: number; tunnel: number }>();

  for (const row of salesData) {
    const storeId = merchantToStoreId[row.merchantId] || "pk";
    const existing = dateMap.get(row.date) ?? { pk: 0, mk: 0, ontario: 0, tunnel: 0 };
    existing[storeId as keyof typeof existing] = row.totalSales;
    dateMap.set(row.date, existing);
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => {
      // Format date nicely
      const d = new Date(date + "T12:00:00");
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { week: label, ...data };
    });
}

function computeCloverDailyTraffic(salesData: CloverSalesRow[]): DailyTraffic[] | null {
  if (!salesData || salesData.length === 0) return null;

  // Group by day of week
  const dayMap = new Map<string, { pk: number[]; mk: number[]; ontario: number[]; tunnel: number[] }>();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const row of salesData) {
    const storeId = merchantToStoreId[row.merchantId] || "pk";
    const d = new Date(row.date + "T12:00:00");
    const dayName = dayNames[d.getDay()];
    const existing = dayMap.get(dayName) ?? { pk: [], mk: [], ontario: [], tunnel: [] };
    (existing[storeId as keyof typeof existing] as number[]).push(row.orderCount);
    dayMap.set(dayName, existing);
  }

  // Return in Mon-Sun order with averages
  const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return orderedDays
    .filter(day => dayMap.has(day))
    .map(day => {
      const data = dayMap.get(day)!;
      const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      return {
        day,
        pk: avg(data.pk),
        mk: avg(data.mk),
        ontario: avg(data.ontario),
        tunnel: avg(data.tunnel),
      };
    });
}

function computeCloverLabourData(salesData: CloverSalesRow[]): LabourEntry[] | null {
  if (!salesData || salesData.length === 0) return null;

  // Get last 7 days of data per store
  const sortedDates = Array.from(new Set(salesData.map(s => s.date))).sort().reverse();
  const recentDates = sortedDates.slice(0, 7);
  const recentSales = salesData.filter(s => recentDates.includes(s.date));

  // Group by store
  const storeRevenue = new Map<string, number>();
  for (const row of recentSales) {
    const storeId = merchantToStoreId[row.merchantId] || "pk";
    storeRevenue.set(storeId, (storeRevenue.get(storeId) || 0) + row.totalSales);
  }

  return stores.map((store) => {
    const revenue = storeRevenue.get(store.id) || 0;
    // We don't have labour data from Clover (shifts returned 0), so use demo labour %
    const demoEntry = demoLabourData.find(d => d.store === store.id);
    const labourPercent = demoEntry?.labourPercent ?? 28;
    const labourCost = revenue * (labourPercent / 100);

    return {
      store: store.id,
      revenue: Math.round(revenue),
      labourCost: Math.round(labourCost),
      labourPercent,
      target: 30,
      employees: demoEntry?.employees ?? 0,
      hoursWorked: demoEntry?.hoursWorked ?? 0,
    };
  });
}

// ─── CSV Data Helpers ──────────────────────────────────────────

function computeKPIs(uploads: ParseResult[]): KPI[] | null {
  const netReports = uploads.filter((u) => u.type === "net" && u.net);
  const labourReports = uploads.filter((u) => u.type === "labour" && u.labour);

  if (netReports.length === 0) return null;

  const totalRevenue = netReports.reduce((s, u) => s + (u.net?.totalSales ?? 0), 0);
  const totalOrders = netReports.reduce((s, u) => s + (u.net?.totalOrders ?? 0), 0);
  const totalLabourCost = labourReports.reduce((s, u) => s + (u.labour?.totalCost ?? 0), 0);
  const labourPercent = totalRevenue > 0 ? (totalLabourCost / totalRevenue) * 100 : 0;

  return [
    {
      title: "Total Revenue",
      value: Math.round(totalRevenue),
      format: "currency",
      trend: 0,
      trendLabel: "from MYR data",
      subtitle: `${netReports.length} store(s) uploaded`,
    },
    {
      title: "Labour Cost",
      value: Math.round(totalLabourCost),
      format: "currency",
      trend: 0,
      trendLabel: "from MYR data",
      subtitle: labourPercent > 0 ? `${labourPercent.toFixed(1)}% of revenue` : "Upload labour data",
    },
    {
      title: "Labour %",
      value: parseFloat(labourPercent.toFixed(1)),
      format: "percent",
      trend: 0,
      trendLabel: "from MYR data",
      subtitle: "Target: 30%",
    },
    {
      title: "Total Orders",
      value: totalOrders,
      format: "number",
      trend: 0,
      trendLabel: "from MYR data",
      subtitle: totalOrders > 0 ? `Avg $${(totalRevenue / totalOrders).toFixed(2)} per order` : "",
    },
  ];
}

function computeWeeklySales(uploads: ParseResult[]): WeeklySales[] | null {
  const netReports = uploads.filter((u) => u.type === "net" && u.net && u.net.dailyBreakdown.length > 0);
  if (netReports.length === 0) return null;

  const dateMap = new Map<string, { pk: number; mk: number; ontario: number; tunnel: number }>();

  for (const upload of netReports) {
    const storeId = stores.find((s) =>
      s.name.toLowerCase().includes(upload.storeName.toLowerCase()) ||
      s.shortName.toLowerCase() === upload.storeName.toLowerCase()
    )?.id ?? "pk";

    for (const day of upload.net!.dailyBreakdown) {
      const existing = dateMap.get(day.date) ?? { pk: 0, mk: 0, ontario: 0, tunnel: 0 };
      existing[storeId as keyof typeof existing] = day.sales;
      dateMap.set(day.date, existing);
    }
  }

  return Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({ week: date, ...data }));
}

function computeLabourData(uploads: ParseResult[]): LabourEntry[] | null {
  const labourReports = uploads.filter((u) => u.type === "labour" && u.labour);
  const netReports = uploads.filter((u) => u.type === "net" && u.net);

  if (labourReports.length === 0 && netReports.length === 0) return null;

  return stores.map((store) => {
    const labourUpload = labourReports.find((u) =>
      u.storeName.toLowerCase().includes(store.name.toLowerCase()) ||
      u.storeName.toLowerCase() === store.shortName.toLowerCase() ||
      u.storeName.toLowerCase() === store.id
    );
    const netUpload = netReports.find((u) =>
      u.storeName.toLowerCase().includes(store.name.toLowerCase()) ||
      u.storeName.toLowerCase() === store.shortName.toLowerCase() ||
      u.storeName.toLowerCase() === store.id
    );

    const revenue = netUpload?.net?.totalSales ?? demoLabourData.find((d) => d.store === store.id)?.revenue ?? 0;
    const labourCost = labourUpload?.labour?.totalCost ?? demoLabourData.find((d) => d.store === store.id)?.labourCost ?? 0;
    const employees = labourUpload?.labour?.employees.length ?? demoLabourData.find((d) => d.store === store.id)?.employees ?? 0;
    const hoursWorked = labourUpload?.labour?.totalHours ?? demoLabourData.find((d) => d.store === store.id)?.hoursWorked ?? 0;

    return {
      store: store.id,
      revenue,
      labourCost,
      labourPercent: revenue > 0 ? parseFloat(((labourCost / revenue) * 100).toFixed(1)) : 0,
      target: 30,
      employees,
      hoursWorked,
    };
  });
}

// ─── Provider ──────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UploadedData>(loadFromStorage);

  // Fetch Clover data from API
  const { data: cloverSalesData } = trpc.clover.salesData.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    retry: 1,
  });

  // Fetch 7shifts data from API
  const { data: sevenShiftsSalesData } = trpc.sevenShifts.salesData.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  // Fetch Koomi data from API
  const { data: koomiSalesData } = trpc.koomi.salesByDateRange.useQuery(
    { fromDate: '2026-02-01', toDate: '2099-12-31' },
    { refetchInterval: 5 * 60 * 1000, retry: 1 }
  );

  // Fetch Excel labour data from API (all available data)
  const { data: excelLabourData } = trpc.excelLabour.data.useQuery(undefined, {
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });
  const hasExcelData = (excelLabourData?.length ?? 0) > 0;

  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  const addUpload = useCallback((result: ParseResult) => {
    setData((prev) => ({
      uploads: [...prev.uploads.filter((u) => u.fileName !== result.fileName), result],
      lastUpdated: new Date().toISOString(),
    }));
  }, []);

  const removeUpload = useCallback((fileName: string) => {
    setData((prev) => ({
      uploads: prev.uploads.filter((u) => u.fileName !== fileName),
      lastUpdated: prev.uploads.length > 1 ? new Date().toISOString() : null,
    }));
  }, []);

  const clearAllUploads = useCallback(() => {
    setData({ uploads: [], lastUpdated: null });
  }, []);

  const hasCSVData = data.uploads.length > 0;
  const hasCloverData = (cloverSalesData?.length ?? 0) > 0;
  const hasKoomiData = (koomiSalesData?.length ?? 0) > 0;
  const hasSevenShiftsData = (sevenShiftsSalesData?.length ?? 0) > 0;
  const hasLiveData = hasCloverData || hasKoomiData || hasSevenShiftsData || hasCSVData || hasExcelData;

  // Compute merged data — Clover+7shifts data takes priority over CSV, CSV over demo
  const kpis = useMemo(() => {
    if (hasCloverData || hasSevenShiftsData) {
      // Merge Clover + 7shifts KPIs
      const cloverKpis = hasCloverData ? computeCloverKPIs(cloverSalesData as CloverSalesRow[]) : null;
      if (!hasSevenShiftsData) return cloverKpis ?? demoKPIs;

      // Combine: add Ontario revenue/orders from 7shifts
      const ssRows = sevenShiftsSalesData as any[];
      const sortedDates = Array.from(new Set(ssRows.map((s: any) => s.date))).sort().reverse();
      const recentDates = sortedDates.slice(0, 7);
      const recentSS = ssRows.filter((s: any) => recentDates.includes(s.date));
      const ssRevenue = recentSS.reduce((s: number, r: any) => s + r.totalSales, 0);
      const ssOrders = recentSS.reduce((s: number, r: any) => s + r.orderCount, 0);

      if (cloverKpis) {
        // Add 7shifts revenue/orders to existing Clover KPIs
        const totalRev = cloverKpis[0].value + Math.round(ssRevenue);
        const totalOrd = cloverKpis[3].value + ssOrders;
        const storeCount = new Set([...((cloverSalesData as CloverSalesRow[]) || []).filter(s => recentDates.includes(s.date)).map(s => s.merchantId)]).size + 1;

        // Compute total labour cost from Excel + 7shifts
        const ssLabourCost = recentSS.reduce((s: number, r: any) => s + r.labourCost, 0);
        let excelLabourCost = 0;
        if (hasExcelData) {
          const exRows = excelLabourData as any[];
          const exDates = Array.from(new Set(exRows.map((r: any) => r.date))).sort().reverse();
          const recentExDates = exDates.slice(0, 7);
          excelLabourCost = exRows.filter((r: any) => recentExDates.includes(r.date)).reduce((s: number, r: any) => s + r.labourCost, 0);
        }
        const totalLabour = Math.round(ssLabourCost + excelLabourCost);
        const labourPct = totalRev > 0 ? (totalLabour / totalRev) * 100 : 0;
        const hasLabour = totalLabour > 0;
        const labourSrc = hasExcelData && hasSevenShiftsData ? "Excel + 7shifts" : hasExcelData ? "Excel" : hasSevenShiftsData ? "7shifts" : "—";

        return [
          { ...cloverKpis[0], value: totalRev, subtitle: `${storeCount} stores — last 7 days` },
          { title: "Labour Cost", value: totalLabour, format: "currency" as const, trend: 0, trendLabel: hasLabour ? `from ${labourSrc}` : "No labour data", subtitle: hasLabour ? `${labourPct.toFixed(1)}% of revenue` : "Upload Excel report" },
          { title: "Labour %", value: parseFloat(labourPct.toFixed(1)), format: "percent" as const, trend: 0, trendLabel: hasLabour ? `from ${labourSrc}` : "No labour data", subtitle: hasLabour ? `$${totalLabour.toLocaleString()} / $${totalRev.toLocaleString()}` : "Upload Excel report" },
          { ...cloverKpis[3], value: totalOrd, subtitle: `Avg $${totalOrd > 0 ? (totalRev / totalOrd).toFixed(2) : "0"} per order` },
        ];
      }

      // Only 7shifts data
      return [
        { title: "Total Revenue", value: Math.round(ssRevenue), format: "currency" as const, trend: 0, trendLabel: "from 7shifts", subtitle: "1 store — last 7 days" },
        { title: "Labour Cost", value: Math.round(recentSS.reduce((s: number, r: any) => s + r.labourCost, 0)), format: "currency" as const, trend: 0, trendLabel: "from 7shifts", subtitle: "Ontario" },
        { title: "Avg Ticket", value: ssOrders > 0 ? parseFloat((ssRevenue / ssOrders).toFixed(2)) : 0, format: "currency" as const, trend: 0, trendLabel: "from 7shifts", subtitle: `${ssOrders} orders` },
        { title: "Total Orders", value: ssOrders, format: "number" as const, trend: 0, trendLabel: "from 7shifts", subtitle: `Avg $${ssOrders > 0 ? (ssRevenue / ssOrders).toFixed(2) : "0"} per order` },
      ];
    }
    return computeKPIs(data.uploads) ?? demoKPIs;
  }, [hasCloverData, hasSevenShiftsData, hasExcelData, cloverSalesData, sevenShiftsSalesData, excelLabourData, data.uploads]);

  const weeklySales = useMemo(() => {
    const cloverWeekly = hasCloverData ? computeCloverWeeklySales(cloverSalesData as CloverSalesRow[]) : null;
    if (!hasCloverData && !hasSevenShiftsData) return computeWeeklySales(data.uploads) ?? demoWeeklySales;

    // Start with Clover data or empty
    const dateMap = new Map<string, { pk: number; mk: number; ontario: number; tunnel: number }>();
    if (cloverWeekly) {
      for (const entry of cloverWeekly) {
        dateMap.set(entry.week, { pk: entry.pk, mk: entry.mk, ontario: entry.ontario, tunnel: entry.tunnel });
      }
    }

    // Add 7shifts Ontario data
    if (hasSevenShiftsData) {
      for (const row of sevenShiftsSalesData as any[]) {
        const d = new Date(row.date + "T12:00:00");
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const existing = dateMap.get(label) ?? { pk: 0, mk: 0, ontario: 0, tunnel: 0 };
        existing.ontario = row.totalSales;
        dateMap.set(label, existing);
      }
    }

    if (dateMap.size === 0) return demoWeeklySales;
    return Array.from(dateMap.entries()).map(([week, data]) => ({ week, ...data }));
  }, [hasCloverData, hasSevenShiftsData, cloverSalesData, sevenShiftsSalesData, data.uploads]);

  const labourData = useMemo(() => {
    if (hasCloverData || hasSevenShiftsData) {
      const cloverLabour = hasCloverData ? computeCloverLabourData(cloverSalesData as CloverSalesRow[]) : null;
      const result = cloverLabour ?? demoLabourData.map(d => ({ ...d }));

      // Update Ontario with real 7shifts labour data
      if (hasSevenShiftsData) {
        const ssRows = sevenShiftsSalesData as any[];
        const sortedDates = Array.from(new Set(ssRows.map((s: any) => s.date))).sort().reverse();
        const recentDates = sortedDates.slice(0, 7);
        const recentSS = ssRows.filter((s: any) => recentDates.includes(s.date));
        const ssRevenue = recentSS.reduce((s: number, r: any) => s + r.totalSales, 0);
        const ssLabourCost = recentSS.reduce((s: number, r: any) => s + r.labourCost, 0);
        const ssLabourMinutes = recentSS.reduce((s: number, r: any) => s + r.labourMinutes, 0);

        const ontarioIdx = result.findIndex(r => r.store === "ontario");
        if (ontarioIdx >= 0) {
          result[ontarioIdx] = {
            store: "ontario",
            revenue: Math.round(ssRevenue),
            labourCost: Math.round(ssLabourCost),
            labourPercent: ssRevenue > 0 ? parseFloat(((ssLabourCost / ssRevenue) * 100).toFixed(1)) : 0,
            target: 30,
            employees: 0,
            hoursWorked: Math.round(ssLabourMinutes / 60),
          };
        }
      }

      // Overlay Excel labour data on top of Clover revenue data
      if (hasExcelData) {
        const excelRows = excelLabourData as any[];
        // Get the most recent 7 days of Excel data
        const excelDates = Array.from(new Set(excelRows.map((r: any) => r.date))).sort().reverse();
        const recentExcelDates = excelDates.slice(0, 7);
        const recentExcel = excelRows.filter((r: any) => recentExcelDates.includes(r.date));

        // Group by storeId
        const storeLabour = new Map<string, { labourCost: number; netSales: number }>();
        for (const row of recentExcel) {
          const existing = storeLabour.get(row.storeId) ?? { labourCost: 0, netSales: 0 };
          existing.labourCost += row.labourCost;
          existing.netSales += row.netSales;
          storeLabour.set(row.storeId, existing);
        }

        // Update each store's labour data from Excel
        for (const [storeId, excelAgg] of Array.from(storeLabour)) {
          const idx = result.findIndex(r => r.store === storeId);
          if (idx >= 0) {
            const revenue = result[idx].revenue || Math.round(excelAgg.netSales);
            result[idx] = {
              ...result[idx],
              labourCost: Math.round(excelAgg.labourCost),
              labourPercent: revenue > 0 ? parseFloat(((excelAgg.labourCost / revenue) * 100).toFixed(1)) : 0,
            };
          }
        }
      }

      return result;
    }
    return computeLabourData(data.uploads) ?? demoLabourData;
  }, [hasCloverData, hasSevenShiftsData, hasExcelData, cloverSalesData, sevenShiftsSalesData, excelLabourData, data.uploads]);

  const weeklyTraffic = useMemo(() => {
    const cloverTraffic = hasCloverData ? computeCloverDailyTraffic(cloverSalesData as CloverSalesRow[]) : null;
    if (!hasCloverData && !hasSevenShiftsData) return demoTraffic;

    // Start with Clover traffic or empty
    const dayMap = new Map<string, { pk: number; mk: number; ontario: number; tunnel: number }>();
    if (cloverTraffic) {
      for (const entry of cloverTraffic) {
        dayMap.set(entry.day, { pk: entry.pk, mk: entry.mk, ontario: entry.ontario, tunnel: entry.tunnel });
      }
    }

    // Add 7shifts Ontario traffic
    if (hasSevenShiftsData) {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayOrders = new Map<string, number[]>();
      for (const row of sevenShiftsSalesData as any[]) {
        const d = new Date(row.date + "T12:00:00");
        const dayName = dayNames[d.getDay()];
        const arr = dayOrders.get(dayName) ?? [];
        arr.push(row.orderCount);
        dayOrders.set(dayName, arr);
      }
      for (const [day, orders] of Array.from(dayOrders)) {
        const avg = Math.round(orders.reduce((a: number, b: number) => a + b, 0) / orders.length);
        const existing = dayMap.get(day) ?? { pk: 0, mk: 0, ontario: 0, tunnel: 0 };
        existing.ontario = avg;
        dayMap.set(day, existing);
      }
    }

    if (dayMap.size === 0) return demoTraffic;
    const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return orderedDays
      .filter(day => dayMap.has(day))
      .map(day => ({ day, ...dayMap.get(day)! }));
  }, [hasCloverData, hasSevenShiftsData, cloverSalesData, sevenShiftsSalesData]);

  const value: DataContextValue = {
    uploads: data.uploads,
    addUpload,
    removeUpload,
    clearAllUploads,
    lastUpdated: data.lastUpdated,
    hasLiveData,
    hasCloverData,
    hasKoomiData,
    hasExcelData,
    kpis,
    weeklySales,
    labourData,
    labourTrend: demoLabourTrend,
    weeklyTraffic,
    hourlySales: demoHourlySales,
    reportSubmissions: demoReports,
    alerts: demoAlerts,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
