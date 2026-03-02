// Hook: Fetch Clover + 7shifts sales data filtered by date range and compute KPIs/charts
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
  labourData as demoLabourData,
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
  source: "clover" | "7shifts";
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

  const isLoading = cloverLoading || sevenShiftsLoading;

  const cloverRows = (cloverData ?? []) as CloverSalesRow[];
  const sevenShiftsRows = (sevenShiftsData ?? []) as SevenShiftsSalesRow[];

  // Merge both data sources into unified records
  const unifiedRows = useMemo((): UnifiedDailyRecord[] => {
    const records: UnifiedDailyRecord[] = [];

    // Add Clover records
    for (const row of cloverRows) {
      const storeId = merchantToStoreId[row.merchantId] || "pk";
      records.push({
        storeId,
        date: row.date,
        totalSales: row.totalSales,
        orderCount: row.orderCount,
        totalTips: row.totalTips,
        labourCost: 0, // Clover doesn't have labour data
        labourMinutes: 0,
        overtimeMinutes: 0,
        labourPercent: 0,
        source: "clover",
      });
    }

    // Add 7shifts records (Ontario)
    for (const row of sevenShiftsRows) {
      records.push({
        storeId: "ontario",
        date: row.date,
        totalSales: row.totalSales,
        orderCount: row.orderCount,
        totalTips: 0, // 7shifts doesn't have tips data
        labourCost: row.labourCost,
        labourMinutes: row.labourMinutes,
        overtimeMinutes: row.overtimeMinutes,
        labourPercent: row.labourPercent,
        source: "7shifts",
      });
    }

    return records;
  }, [cloverRows, sevenShiftsRows]);

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
        { title: "Total Tips", value: 0, format: "currency", trend: 0, trendLabel: "No data", subtitle: "—" },
        { title: "Avg Ticket", value: 0, format: "currency", trend: 0, trendLabel: "No data", subtitle: "0 orders" },
        { title: "Total Orders", value: 0, format: "number", trend: 0, trendLabel: periodLabel, subtitle: "No data for this period" },
      ];
    }
    if (!hasData) return null;

    const totalRevenue = unifiedRows.reduce((s, r) => s + r.totalSales, 0);
    const totalOrders = unifiedRows.reduce((s, r) => s + r.orderCount, 0);
    const totalTips = unifiedRows.reduce((s, r) => s + r.totalTips, 0);
    const storeCount = new Set(unifiedRows.map(r => r.storeId)).size;
    const dayCount = new Set(unifiedRows.map(r => r.date)).size;

    const sources: string[] = [];
    if (hasCloverData) sources.push("Clover");
    if (hasSevenShiftsData) sources.push("7shifts");
    const sourceLabel = sources.join(" + ");

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
        title: "Total Tips",
        value: Math.round(totalTips),
        format: "currency",
        trend: 0,
        trendLabel: `from ${sourceLabel}`,
        subtitle: totalRevenue > 0 ? `${((totalTips / totalRevenue) * 100).toFixed(1)}% of revenue` : "",
      },
      {
        title: "Avg Ticket",
        value: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0,
        format: "currency",
        trend: 0,
        trendLabel: `from ${sourceLabel}`,
        subtitle: `${totalOrders.toLocaleString()} orders`,
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
  }, [unifiedRows, hasData, hasCloverData, hasSevenShiftsData, noDataForPeriod, dateFilter]);

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

    for (const row of unifiedRows) {
      storeRevenue.set(row.storeId, (storeRevenue.get(row.storeId) || 0) + row.totalSales);
      storeLabourCost.set(row.storeId, (storeLabourCost.get(row.storeId) || 0) + row.labourCost);
      storeLabourMinutes.set(row.storeId, (storeLabourMinutes.get(row.storeId) || 0) + row.labourMinutes);
    }

    return stores.map((store) => {
      const revenue = storeRevenue.get(store.id) || 0;
      const labourCost = storeLabourCost.get(store.id) || 0;
      const labourMinutes = storeLabourMinutes.get(store.id) || 0;

      // For Ontario (7shifts), we have real labour data
      if (store.id === "ontario" && labourCost > 0) {
        return {
          store: store.id,
          revenue: Math.round(revenue),
          labourCost: Math.round(labourCost),
          labourPercent: revenue > 0 ? parseFloat(((labourCost / revenue) * 100).toFixed(1)) : 0,
          target: 30,
          employees: 0, // 7shifts daily report doesn't include employee count
          hoursWorked: Math.round(labourMinutes / 60),
        };
      }

      // For Clover stores, use demo labour % (no real labour data from Clover)
      const demoEntry = demoLabourData.find(d => d.store === store.id);
      const labourPercent = demoEntry?.labourPercent ?? 28;
      const estimatedLabourCost = revenue * (labourPercent / 100);
      return {
        store: store.id,
        revenue: Math.round(revenue),
        labourCost: Math.round(estimatedLabourCost),
        labourPercent,
        target: 30,
        employees: demoEntry?.employees ?? 0,
        hoursWorked: demoEntry?.hoursWorked ?? 0,
      };
    });
  }, [unifiedRows, hasData]);

  return {
    isLoading,
    hasData,
    hasCloverData,
    hasSevenShiftsData,
    noDataForPeriod,
    kpis,
    weeklySales,
    dailyTraffic,
    labourData,
    salesRows: cloverRows,
    sevenShiftsRows,
    unifiedRows,
  };
}
