// Hook: Fetch Clover + 7shifts + Excel labour data filtered by date range and compute KPIs/charts
import { useMemo } from "react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import type { DateFilterValue } from "@/components/DateFilter";
import {
  stores,
  type KPI,
  type WeeklySales,
  type LabourEntry,
  type DailyTraffic,
} from "@/lib/data";

// Map Clover merchant IDs to our store IDs
const merchantToStoreId: Record<string, string> = {
  JVGT8FGCVR9F1: "pk",
  CQP5TD9M5R691: "mk",
  KKA9JDAYW9ZY1: "tunnel",
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

interface SevenShiftsSalesRow {
  id: number;
  connectionId: number;
  locationId: number;
  date: string;
  totalSales: number;
  projectedSales: number;
  labourCost: number;
  projectedLabourCost: number;
  labourMinutes: number;
  overtimeMinutes: number;
  labourPercent: number;
  salesPerLabourHour: number;
  orderCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ExcelLabourRow {
  id: number;
  date: string;
  store: string;
  storeId: string;
  netSales: number;
  labourCost: number;
  labourPercent: number;
  notes: string | null;
  sourceRowId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Unified daily record for all stores
interface UnifiedDailyRecord {
  storeId: string;
  date: string;
  totalSales: number;
  orderCount: number;
  totalTips: number;
  labourCost: number;
  labourMinutes: number;
  overtimeMinutes: number;
  labourPercent: number;
  source: "clover" | "7shifts" | "excel";
}

export function useFilteredCloverData(dateFilter: DateFilterValue) {
  const fromDate = format(dateFilter.from, "yyyy-MM-dd");
  const toDate = format(dateFilter.to, "yyyy-MM-dd");

  // Fetch Clover sales data
  const { data: cloverData, isLoading: cloverLoading } = trpc.clover.salesData.useQuery(
    { fromDate, toDate },
    { retry: 1 }
  );

  // Fetch 7shifts sales data
  const { data: sevenShiftsData, isLoading: sevenShiftsLoading } = trpc.sevenShifts.salesData.useQuery(
    { fromDate, toDate },
    { retry: 1 }
  );

  // Fetch Excel labour data
  const { data: excelData, isLoading: excelLoading } = trpc.excelLabour.data.useQuery(
    { fromDate, toDate },
    { retry: 1 }
  );

  const isLoading = cloverLoading || sevenShiftsLoading || excelLoading;

  const cloverRows = (cloverData ?? []) as CloverSalesRow[];
  const sevenShiftsRows = (sevenShiftsData ?? []) as SevenShiftsSalesRow[];
  const excelRows = (excelData ?? []) as ExcelLabourRow[];

  // Build a lookup map of Excel labour data: storeId+date -> { labourCost, labourPercent, netSales }
  const excelLabourMap = useMemo(() => {
    const map = new Map<string, ExcelLabourRow>();
    for (const row of excelRows) {
      const key = `${row.storeId}:${row.date}`;
      map.set(key, row);
    }
    return map;
  }, [excelRows]);

  const hasExcelData = excelRows.length > 0;

  // Merge both data sources into unified records
  const unifiedRows = useMemo((): UnifiedDailyRecord[] => {
    const records: UnifiedDailyRecord[] = [];

    // Add Clover records, enriched with Excel labour data when available
    for (const row of cloverRows) {
      const storeId = merchantToStoreId[row.merchantId] || "pk";
      const excelKey = `${storeId}:${row.date}`;
      const excelRow = excelLabourMap.get(excelKey);

      records.push({
        storeId,
        date: row.date,
        totalSales: row.totalSales,
        orderCount: row.orderCount,
        totalTips: row.totalTips,
        // Use Excel labour data if available, otherwise 0
        labourCost: excelRow?.labourCost ?? 0,
        labourMinutes: 0,
        overtimeMinutes: 0,
        labourPercent: excelRow?.labourPercent ?? 0,
        source: excelRow ? "excel" : "clover",
      });
    }

    // Add 7shifts records (Ontario) — these have their own labour data
    for (const row of sevenShiftsRows) {
      records.push({
        storeId: "ontario",
        date: row.date,
        totalSales: row.totalSales,
        orderCount: row.orderCount,
        totalTips: 0,
        labourCost: row.labourCost,
        labourMinutes: row.labourMinutes,
        overtimeMinutes: row.overtimeMinutes,
        labourPercent: row.labourPercent,
        source: "7shifts",
      });
    }

    return records;
  }, [cloverRows, sevenShiftsRows, excelLabourMap]);

  const hasData = unifiedRows.length > 0;
  const hasCloverData = cloverRows.length > 0;
  const hasSevenShiftsData = sevenShiftsRows.length > 0;

  // True when both queries completed but returned no rows
  const noDataForPeriod = !isLoading
    && cloverData !== undefined
    && sevenShiftsData !== undefined
    && unifiedRows.length === 0;

  const kpis = useMemo((): KPI[] | null => {
    if (noDataForPeriod) {
      const periodLabel = dateFilter.label !== "Custom"
        ? dateFilter.label
        : dateFilter.mode === "single"
          ? format(dateFilter.from, "MMM d, yyyy")
          : `${format(dateFilter.from, "MMM d")} – ${format(dateFilter.to, "MMM d")}`;
      return [
        { title: "Total Revenue", value: 0, format: "currency", trend: 0, trendLabel: periodLabel, subtitle: "No data for this period" },
        { title: "Labour Cost", value: 0, format: "currency", trend: 0, trendLabel: "No data", subtitle: "—" },
        { title: "Labour %", value: 0, format: "percent", trend: 0, trendLabel: "No data", subtitle: "—" },
        { title: "Total Orders", value: 0, format: "number", trend: 0, trendLabel: periodLabel, subtitle: "No data for this period" },
      ];
    }
    if (!hasData) return null;

    const totalRevenue = unifiedRows.reduce((s, r) => s + r.totalSales, 0);
    const totalOrders = unifiedRows.reduce((s, r) => s + r.orderCount, 0);
    const totalTips = unifiedRows.reduce((s, r) => s + r.totalTips, 0);
    const totalLabourCost = unifiedRows.reduce((s, r) => s + r.labourCost, 0);
    const storeCount = new Set(unifiedRows.map(r => r.storeId)).size;
    const dayCount = new Set(unifiedRows.map(r => r.date)).size;
    const overallLabourPercent = totalRevenue > 0 ? (totalLabourCost / totalRevenue) * 100 : 0;
    const hasAnyLabour = totalLabourCost > 0;

    const sources: string[] = [];
    if (hasCloverData) sources.push("Clover");
    if (hasSevenShiftsData) sources.push("7shifts");
    if (hasExcelData) sources.push("Excel");
    const sourceLabel = sources.join(" + ");

    const labourSource = hasExcelData && hasSevenShiftsData
      ? "Excel + 7shifts"
      : hasExcelData ? "Excel" : hasSevenShiftsData ? "7shifts" : "—";

    const periodLabel = dateFilter.label !== "Custom"
      ? dateFilter.label
      : dateFilter.mode === "single"
        ? format(dateFilter.from, "MMM d, yyyy")
        : `${format(dateFilter.from, "MMM d")} – ${format(dateFilter.to, "MMM d")}`;

    return [
      {
        title: "Total Revenue",
        value: Math.round(totalRevenue),
        format: "currency",
        trend: 0,
        trendLabel: periodLabel,
        subtitle: `${storeCount} store${storeCount !== 1 ? "s" : ""} — ${dayCount} day${dayCount !== 1 ? "s" : ""}`,
      },
      {
        title: "Labour Cost",
        value: Math.round(totalLabourCost),
        format: "currency",
        trend: 0,
        trendLabel: hasAnyLabour ? `from ${labourSource}` : "No labour data",
        subtitle: hasAnyLabour ? `${overallLabourPercent.toFixed(1)}% of revenue` : "Upload Excel report",
      },
      {
        title: "Labour %",
        value: parseFloat(overallLabourPercent.toFixed(1)),
        format: "percent",
        trend: 0,
        trendLabel: hasAnyLabour ? `from ${labourSource}` : "No labour data",
        subtitle: hasAnyLabour ? `$${Math.round(totalLabourCost).toLocaleString()} / $${Math.round(totalRevenue).toLocaleString()}` : "Upload Excel report",
      },
      {
        title: "Total Orders",
        value: totalOrders,
        format: "number",
        trend: 0,
        trendLabel: periodLabel,
        subtitle: `Avg $${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0"} per order`,
      },
    ];
  }, [unifiedRows, hasData, hasCloverData, hasSevenShiftsData, hasExcelData, noDataForPeriod, dateFilter]);

  const weeklySales = useMemo((): WeeklySales[] | null => {
    if (!hasData) return null;

    const dateMap = new Map<string, { pk: number; mk: number; ontario: number; tunnel: number }>();
    for (const row of unifiedRows) {
      const existing = dateMap.get(row.date) ?? { pk: 0, mk: 0, ontario: 0, tunnel: 0 };
      existing[row.storeId as keyof typeof existing] = row.totalSales;
      dateMap.set(row.date, existing);
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const d = new Date(date + "T12:00:00");
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { week: label, ...data };
      });
  }, [unifiedRows, hasData]);

  const dailyTraffic = useMemo((): DailyTraffic[] | null => {
    if (!hasData) return null;

    const dayMap = new Map<string, { pk: number[]; mk: number[]; ontario: number[]; tunnel: number[] }>();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (const row of unifiedRows) {
      const d = new Date(row.date + "T12:00:00");
      const dayName = dayNames[d.getDay()];
      const existing = dayMap.get(dayName) ?? { pk: [], mk: [], ontario: [], tunnel: [] };
      (existing[row.storeId as keyof typeof existing] as number[]).push(row.orderCount);
      dayMap.set(dayName, existing);
    }

    const orderedDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return orderedDays
      .filter(day => dayMap.has(day))
      .map(day => {
        const data = dayMap.get(day)!;
        const avg = (arr: number[]) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        return { day, pk: avg(data.pk), mk: avg(data.mk), ontario: avg(data.ontario), tunnel: avg(data.tunnel) };
      });
  }, [unifiedRows, hasData]);

  const labourData = useMemo((): LabourEntry[] | null => {
    if (!hasData) return null;

    // Compute per-store revenue and labour from unified data
    const storeRevenue = new Map<string, number>();
    const storeLabourCost = new Map<string, number>();
    const storeLabourMinutes = new Map<string, number>();
    const storeHasRealLabour = new Map<string, boolean>();

    for (const row of unifiedRows) {
      storeRevenue.set(row.storeId, (storeRevenue.get(row.storeId) || 0) + row.totalSales);
      storeLabourCost.set(row.storeId, (storeLabourCost.get(row.storeId) || 0) + row.labourCost);
      storeLabourMinutes.set(row.storeId, (storeLabourMinutes.get(row.storeId) || 0) + row.labourMinutes);
      // Track whether this store has real labour data (from 7shifts or Excel)
      if (row.labourCost > 0 && (row.source === "7shifts" || row.source === "excel")) {
        storeHasRealLabour.set(row.storeId, true);
      }
    }

    return stores.map((store) => {
      const revenue = storeRevenue.get(store.id) || 0;
      const labourCost = storeLabourCost.get(store.id) || 0;
      const labourMinutes = storeLabourMinutes.get(store.id) || 0;
      const hasRealLabour = storeHasRealLabour.get(store.id) || false;

      // If we have real labour data (from 7shifts or Excel), use it
      if (hasRealLabour && labourCost > 0) {
        return {
          store: store.id,
          revenue: Math.round(revenue),
          labourCost: Math.round(labourCost),
          labourPercent: revenue > 0 ? parseFloat(((labourCost / revenue) * 100).toFixed(1)) : 0,
          target: store.labourTarget,
          employees: 0,
          hoursWorked: labourMinutes > 0 ? Math.round(labourMinutes / 60) : 0,
        };
      }

      // No real labour data — show revenue with 0% labour (no estimate)
      return {
        store: store.id,
        revenue: Math.round(revenue),
        labourCost: 0,
        labourPercent: 0,
        target: store.labourTarget,
        employees: 0,
        hoursWorked: 0,
      };
    });
  }, [unifiedRows, hasData]);

  return {
    isLoading,
    hasData,
    hasCloverData,
    hasSevenShiftsData,
    hasExcelData,
    noDataForPeriod,
    kpis,
    weeklySales,
    dailyTraffic,
    labourData,
    salesRows: cloverRows,
    sevenShiftsRows,
    excelRows,
    unifiedRows,
  };
}
