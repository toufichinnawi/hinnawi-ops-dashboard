// Hook: Fetch Clover sales data filtered by date range and compute KPIs/charts
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

export function useFilteredCloverData(dateFilter: DateFilterValue) {
  const fromDate = format(dateFilter.from, "yyyy-MM-dd");
  const toDate = format(dateFilter.to, "yyyy-MM-dd");

  const { data: salesData, isLoading } = trpc.clover.salesData.useQuery(
    { fromDate, toDate },
    {
      retry: 1,
    }
  );

  const rows = (salesData ?? []) as CloverSalesRow[];
  const hasData = rows.length > 0;
  // True when the query has completed but returned no rows for the selected period
  const noDataForPeriod = !isLoading && salesData !== undefined && rows.length === 0;

  const kpis = useMemo((): KPI[] | null => {
    // If query completed with no data, return zeroed KPIs (not null) so we don't fall back
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

    const totalRevenue = rows.reduce((s, r) => s + r.totalSales, 0);
    const totalOrders = rows.reduce((s, r) => s + r.orderCount, 0);
    const totalTips = rows.reduce((s, r) => s + r.totalTips, 0);
    const totalRefunds = rows.reduce((s, r) => s + r.refundAmount, 0);
    const storeCount = new Set(rows.map(r => r.merchantId)).size;
    const dayCount = new Set(rows.map(r => r.date)).size;

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
        trend: 0,
        trendLabel: periodLabel,
        subtitle: `Avg $${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : "0"} per order`,
      },
    ];
  }, [rows, hasData, noDataForPeriod, dateFilter]);

  const weeklySales = useMemo((): WeeklySales[] | null => {
    if (!hasData) return null;

    const dateMap = new Map<string, { pk: number; mk: number; ontario: number; tunnel: number }>();
    for (const row of rows) {
      const storeId = merchantToStoreId[row.merchantId] || "pk";
      const existing = dateMap.get(row.date) ?? { pk: 0, mk: 0, ontario: 0, tunnel: 0 };
      existing[storeId as keyof typeof existing] = row.totalSales;
      dateMap.set(row.date, existing);
    }

    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const d = new Date(date + "T12:00:00");
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { week: label, ...data };
      });
  }, [rows, hasData]);

  const dailyTraffic = useMemo((): DailyTraffic[] | null => {
    if (!hasData) return null;

    const dayMap = new Map<string, { pk: number[]; mk: number[]; ontario: number[]; tunnel: number[] }>();
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (const row of rows) {
      const storeId = merchantToStoreId[row.merchantId] || "pk";
      const d = new Date(row.date + "T12:00:00");
      const dayName = dayNames[d.getDay()];
      const existing = dayMap.get(dayName) ?? { pk: [], mk: [], ontario: [], tunnel: [] };
      (existing[storeId as keyof typeof existing] as number[]).push(row.orderCount);
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
  }, [rows, hasData]);

  const labourData = useMemo((): LabourEntry[] | null => {
    if (!hasData) return null;

    const storeRevenue = new Map<string, number>();
    for (const row of rows) {
      const storeId = merchantToStoreId[row.merchantId] || "pk";
      storeRevenue.set(storeId, (storeRevenue.get(storeId) || 0) + row.totalSales);
    }

    return stores.map((store) => {
      const revenue = storeRevenue.get(store.id) || 0;
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
  }, [rows, hasData]);

  return {
    isLoading,
    hasData,
    noDataForPeriod,
    kpis,
    weeklySales,
    dailyTraffic,
    labourData,
    salesRows: rows,
  };
}
