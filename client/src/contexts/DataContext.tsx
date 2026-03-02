// DataContext: Global state for uploaded MYR data with localStorage persistence
// Falls back to demo data when no uploads exist
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { ParseResult } from "@/lib/csv-parser";
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

// Merge uploaded net reports into KPI data
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

// Merge uploaded net reports into weekly sales format
function computeWeeklySales(uploads: ParseResult[]): WeeklySales[] | null {
  const netReports = uploads.filter((u) => u.type === "net" && u.net && u.net.dailyBreakdown.length > 0);
  if (netReports.length === 0) return null;

  // Group daily data by date across stores
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

// Merge uploaded labour reports into labour data format
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

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UploadedData>(loadFromStorage);

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

  const hasLiveData = data.uploads.length > 0;

  // Compute merged data
  const kpis = computeKPIs(data.uploads) ?? demoKPIs;
  const weeklySales = computeWeeklySales(data.uploads) ?? demoWeeklySales;
  const labourData = computeLabourData(data.uploads) ?? demoLabourData;

  const value: DataContextValue = {
    uploads: data.uploads,
    addUpload,
    removeUpload,
    clearAllUploads,
    lastUpdated: data.lastUpdated,
    hasLiveData,
    kpis,
    weeklySales,
    labourData,
    labourTrend: demoLabourTrend,
    weeklyTraffic: demoTraffic,
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
