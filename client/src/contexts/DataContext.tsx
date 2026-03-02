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
  const hasLiveData = hasCloverData || hasCSVData;

  // Compute merged data — Clover data takes priority over CSV, CSV over demo
  const kpis = useMemo(() => {
    if (hasCloverData) return computeCloverKPIs(cloverSalesData as CloverSalesRow[]) ?? demoKPIs;
    return computeKPIs(data.uploads) ?? demoKPIs;
  }, [hasCloverData, cloverSalesData, data.uploads]);

  const weeklySales = useMemo(() => {
    if (hasCloverData) return computeCloverWeeklySales(cloverSalesData as CloverSalesRow[]) ?? demoWeeklySales;
    return computeWeeklySales(data.uploads) ?? demoWeeklySales;
  }, [hasCloverData, cloverSalesData, data.uploads]);

  const labourData = useMemo(() => {
    if (hasCloverData) return computeCloverLabourData(cloverSalesData as CloverSalesRow[]) ?? demoLabourData;
    return computeLabourData(data.uploads) ?? demoLabourData;
  }, [hasCloverData, cloverSalesData, data.uploads]);

  const weeklyTraffic = useMemo(() => {
    if (hasCloverData) return computeCloverDailyTraffic(cloverSalesData as CloverSalesRow[]) ?? demoTraffic;
    return demoTraffic;
  }, [hasCloverData, cloverSalesData]);

  const value: DataContextValue = {
    uploads: data.uploads,
    addUpload,
    removeUpload,
    clearAllUploads,
    lastUpdated: data.lastUpdated,
    hasLiveData,
    hasCloverData,
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
