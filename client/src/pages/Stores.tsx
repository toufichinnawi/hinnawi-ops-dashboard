// Design: "Golden Hour Operations" — Refined Editorial
// Store Performance: Per-store cards with images, metrics, and comparison
import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";
import { MapPin, CheckCircle2, Database, Loader2, CalendarX, Trash2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { DateFilter, getDefaultDateFilter, type DateFilterValue } from "@/components/DateFilter";
import { useData } from "@/contexts/DataContext";
import { useFilteredCloverData } from "@/hooks/useFilteredCloverData";
import { stores } from "@/lib/data";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

// Radar data: normalize metrics to 0-100 scale for comparison
const radarData = [
  { metric: "Revenue", pk: 100, mk: 82, ontario: 76, tunnel: 68 },
  { metric: "Orders", pk: 95, mk: 85, ontario: 72, tunnel: 78 },
  { metric: "Labour Eff.", pk: 95, mk: 70, ontario: 85, tunnel: 75 },
  { metric: "Report Rate", pk: 100, mk: 90, ontario: 60, tunnel: 70 },
  { metric: "Cleanliness", pk: 88, mk: 92, ontario: 78, tunnel: 85 },
];

// ─── Reusable Store Performance Content (used by admin page & portal) ───

interface StorePerformanceContentProps {
  /** If provided, only show this store (e.g. "pk") */
  storeFilter?: string;
}

export function StorePerformanceContent({ storeFilter }: StorePerformanceContentProps = {}) {
  const { hasLiveData, hasCloverData, hourlySales } = useData();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter);

  // Waste analysis data
  const wasteFromDate = useMemo(() => {
    if (dateFilter.from) return typeof dateFilter.from === 'string' ? dateFilter.from : new Date(dateFilter.from).toISOString().split('T')[0];
    return new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  }, [dateFilter.from]);
  const wasteToDate = useMemo(() => {
    if (dateFilter.to) return typeof dateFilter.to === 'string' ? dateFilter.to : new Date(dateFilter.to).toISOString().split('T')[0];
    return new Date().toISOString().split('T')[0];
  }, [dateFilter.to]);
  const { data: wasteData, isLoading: wasteLoading } = trpc.wasteAnalysis.byStore.useQuery(
    { fromDate: wasteFromDate, toDate: wasteToDate },
    { staleTime: 60_000 }
  );

  // Fetch filtered Clover data
  const {
    labourData: filteredLabour,
    weeklySales: filteredSales,
    isLoading: filterLoading,
    hasData: hasFilteredData,
    noDataForPeriod,
  } = useFilteredCloverData(dateFilter);

  // When Clover is connected, always use filtered data (even empty for no-data periods)
  const { labourData: contextLabour, weeklySales: contextSales } = useData();

  // When Clover is connected and we have filtered data, use it.
  // When noDataForPeriod is true, show empty state — NEVER fall back to demo/context data.
  const labourData = hasCloverData
    ? (noDataForPeriod ? stores.map(s => ({ store: s.id, revenue: 0, labourCost: 0, labourPercent: 0, target: s.labourTarget, employees: 0, hoursWorked: 0 })) : (filteredLabour ?? contextLabour))
    : contextLabour;
  const weeklySales = hasCloverData
    ? (noDataForPeriod ? [] : (filteredSales ?? contextSales))
    : contextSales;

  // Filter stores if storeFilter is provided
  const filteredStores = storeFilter ? stores.filter(s => s.id === storeFilter) : stores;

  function getLabour(storeId: string) {
    return labourData.find((d) => d.store === storeId) ?? { revenue: 0, labourCost: 0, labourPercent: 0, target: 30, employees: 0, hoursWorked: 0 };
  }

  function getLabourTarget(storeId: string) {
    return stores.find(s => s.id === storeId)?.labourTarget ?? 30;
  }

  // Compute dynamic radar data from filtered sales when Clover data is available
  const dynamicRadarData = hasCloverData && filteredLabour ? (() => {
    const maxRevenue = Math.max(...filteredLabour.map(l => l.revenue), 1);
    return radarData.map(item => {
      const updated = { ...item };
      for (const store of stores) {
        const labour = filteredLabour.find(l => l.store === store.id);
        if (labour && item.metric === "Revenue") {
          (updated as any)[store.id] = Math.round((labour.revenue / maxRevenue) * 100);
        }
      }
      return updated;
    });
  })() : radarData;

  return (
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header with Date Filter */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">Store Performance</p>
            <h2 className="text-2xl font-serif text-foreground mt-1">Location Overview</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {hasCloverData
                ? `From Clover POS — ${dateFilter.label}`
                : hasLiveData
                  ? "From uploaded MYR data"
                  : "Compare performance across all 4 locations — demo data"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {hasCloverData && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-700 font-medium">Clover POS</span>
              </span>
            )}
            {!hasCloverData && hasLiveData && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-700 font-medium">Live Data</span>
              </span>
            )}
            {filterLoading && hasCloverData && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
        </motion.div>

        {/* Data Source Banner */}
        {!hasLiveData && (
          <Link href="/clover">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/20 cursor-pointer hover:bg-[#D4A853]/15 transition-colors"
            >
              <Database className="w-4 h-4 text-[#D4A853]" />
              <p className="text-sm text-foreground">
                <span className="font-medium">Showing demo data.</span>{" "}
                <span className="text-muted-foreground">Connect your Clover POS to see real store performance →</span>
              </p>
            </motion.div>
          </Link>
        )}

        {/* No data for period banner */}
        {hasCloverData && noDataForPeriod && !filterLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200"
          >
            <CalendarX className="w-4 h-4 text-amber-600" />
            <p className="text-sm text-foreground">
              <span className="font-medium">No data for {dateFilter.label}.</span>{" "}
              <span className="text-muted-foreground">Clover POS data may not have synced yet for this date. Try selecting yesterday or a wider range.</span>
            </p>
          </motion.div>
        )}

        {/* Store Cards */}
        <motion.div variants={stagger} initial="hidden" animate="show" className={cn("grid gap-5", filteredStores.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
          {filteredStores.map((store) => {
            const labour = getLabour(store.id);
            const target = getLabourTarget(store.id);
            const isOver = labour.labourPercent > target;

            // Compute total sales for this store from filtered weekly sales
            const storeTotalSales = weeklySales
              ? weeklySales.reduce((sum, week) => sum + ((week as any)[store.id] ?? 0), 0)
              : 0;

            // Compute total orders from filtered data
            const storeOrders = hasCloverData && filteredLabour
              ? labour.revenue // Revenue is already computed from filtered data
              : 0;

            const storeWasteInfo = (wasteData?.byStore ?? []).find(w => w.storeId === store.id);
            const storeWasteCost = storeWasteInfo ? storeWasteInfo.wasteCost + storeWasteInfo.leftoverCost : 0;
            const wasteRate = labour.revenue > 0 ? (storeWasteCost / labour.revenue) * 100 : 0;

            return (
              <motion.div
                key={store.id}
                variants={fadeUp}
                className="bg-card rounded-xl border border-border/60 overflow-hidden hover:shadow-lg hover:shadow-[#D4A853]/5 transition-shadow duration-300"
              >
                {/* Store image header */}
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={store.image}
                    alt={store.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1C1210]/80 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: store.color }} />
                        <span className="text-white/70 text-[10px] uppercase tracking-widest">{store.shortName}</span>
                      </div>
                      <h3 className="text-white font-serif text-lg">{store.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {store.closedWeekends && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 text-[9px] font-medium">
                          Closed Weekends
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-white/70 text-xs">
                        <MapPin className="w-3 h-3" />
                        Montreal
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="p-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Revenue</p>
                    <p className="text-lg font-mono font-semibold mt-0.5">${labour.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Labour $</p>
                    <p className={cn("text-lg font-mono font-semibold mt-0.5", isOver ? "text-red-600" : "text-foreground")}>
                      ${labour.labourCost > 0 ? labour.labourCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—"}
                    </p>
                    {labour.labourCost > 0 && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">from Excel</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Labour %</p>
                    <p className={cn("text-lg font-mono font-semibold mt-0.5", isOver ? "text-red-600" : "text-emerald-600")}>
                      {labour.labourPercent > 0 ? labour.labourPercent.toFixed(1) + "%" : "—"}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Target: {target}%</p>
                  </div>
                </div>

                {/* Waste & Sales Row */}
                <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Waste Cost</p>
                    <p className="text-lg font-mono font-semibold mt-0.5 text-red-600">
                      {wasteLoading ? "..." : (storeWasteCost > 0 ? `$${storeWasteCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—")}
                    </p>
                    {storeWasteInfo && storeWasteInfo.reportCount > 0 && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">{storeWasteInfo.reportCount} report{storeWasteInfo.reportCount !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Waste Rate</p>
                    <p className={cn("text-lg font-mono font-semibold mt-0.5", wasteRate > 5 ? "text-red-600" : wasteRate > 3 ? "text-amber-600" : "text-emerald-600")}>
                      {wasteRate > 0 ? `${wasteRate.toFixed(1)}%` : "—"}
                    </p>
                    {wasteRate > 0 && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">Waste / Revenue</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Period Sales</p>
                    <p className="text-lg font-mono font-semibold mt-0.5">${storeTotalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Charts - only show when viewing all stores AND when there's real data */}
        {!storeFilter && !(hasCloverData && noDataForPeriod) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Comparison */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
              <h3 className="font-serif text-lg text-foreground mb-1">Store Comparison</h3>
              <p className="text-xs text-muted-foreground mb-4">Multi-dimensional performance radar</p>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={dynamicRadarData}>
                  <PolarGrid stroke="#E7E5E4" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#78716C" }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="PK" dataKey="pk" stroke="#D4A853" fill="#D4A853" fillOpacity={0.15} strokeWidth={2} />
                  <Radar name="MK" dataKey="mk" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} />
                  <Radar name="Ontario" dataKey="ontario" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} />
                  <Radar name="Tunnel" dataKey="tunnel" stroke="#F97316" fill="#F97316" fillOpacity={0.1} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-4 mt-2">
                {stores.map((s) => (
                  <div key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    {s.shortName}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Hourly Sales Pattern */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
              <h3 className="font-serif text-lg text-foreground mb-1">Hourly Sales Pattern</h3>
              <p className="text-xs text-muted-foreground mb-4">Average across all stores — today</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={hourlySales} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#78716C" }} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} width={50} />
                  <Tooltip
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Sales"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E7E5E4", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                  />
                  <Bar dataKey="sales" fill="#D4A853" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        {/* ─── Waste Report Analysis Section ─── */}
        {(() => {
          const storeList = storeFilter ? stores.filter(s => s.id === storeFilter) : stores;
          const storeWaste = wasteData?.byStore ?? [];
          const topItems = wasteData?.topWastedItems ?? [];
          const totalReports = wasteData?.totalReports ?? 0;

          // Filter to only relevant stores
          const filteredWaste = storeWaste.filter(sw => storeList.some(s => s.id === sw.storeId));
          const totalLeftoverCost = filteredWaste.reduce((sum, s) => sum + s.leftoverCost, 0);
          const totalWasteCost = filteredWaste.reduce((sum, s) => sum + s.wasteCost, 0);
          const totalCost = totalLeftoverCost + totalWasteCost;
          const hasAnyWaste = filteredWaste.length > 0 && totalCost > 0;

          // Revenue for waste-to-revenue ratio
          const totalRevenue = storeList.reduce((sum, s) => sum + (getLabour(s.id).revenue ?? 0), 0);
          const wasteToRevenueRate = totalRevenue > 0 ? (totalWasteCost / totalRevenue) * 100 : 0;

          // Bar chart: Waste Cost by Store
          const wasteBarData = storeList.map(s => {
            const sw = filteredWaste.find(w => w.storeId === s.id);
            return {
              store: s.shortName,
              storeId: s.id,
              leftover: sw?.leftoverCost ?? 0,
              waste: sw?.wasteCost ?? 0,
              total: (sw?.leftoverCost ?? 0) + (sw?.wasteCost ?? 0),
              reports: sw?.reportCount ?? 0,
              color: s.color,
            };
          });

          // Category breakdown: Bagels, Pastries, CK Items
          const categoryData = [
            {
              category: "Bagels",
              leftover: filteredWaste.reduce((sum, s) => sum + s.bagelLeftover, 0),
              waste: filteredWaste.reduce((sum, s) => sum + s.bagelWaste, 0),
              color: "#D4A853",
            },
            {
              category: "Pastries",
              leftover: filteredWaste.reduce((sum, s) => sum + s.pastryLeftover, 0),
              waste: filteredWaste.reduce((sum, s) => sum + s.pastryWaste, 0),
              color: "#8B5CF6",
            },
            {
              category: "CK Items",
              leftover: filteredWaste.reduce((sum, s) => sum + s.ckLeftover, 0),
              waste: filteredWaste.reduce((sum, s) => sum + s.ckWaste, 0),
              color: "#059669",
            },
          ].map(c => ({ ...c, total: c.leftover + c.waste }));

          if (wasteLoading) {
            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading waste analysis...</span>
              </motion.div>
            );
          }

          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
              {/* Section Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-red-600 uppercase tracking-[0.2em] font-medium">Waste & Leftovers</p>
                  <h3 className="text-xl font-serif text-foreground mt-1">Waste Report Analysis</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasAnyWaste
                      ? `${totalReports} report${totalReports !== 1 ? "s" : ""} — ${dateFilter.label}`
                      : `No waste reports for ${dateFilter.label}`}
                  </p>
                </div>
                {hasAnyWaste && (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Waste Cost</p>
                      <p className="text-xl font-mono font-semibold text-red-600">${totalWasteCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Leftover</p>
                      <p className="text-xl font-mono font-semibold text-amber-600">${totalLeftoverCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    {totalRevenue > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Waste/Revenue</p>
                        <p className={cn("text-xl font-mono font-semibold", wasteToRevenueRate > 5 ? "text-red-600" : wasteToRevenueRate > 3 ? "text-amber-600" : "text-emerald-600")}>
                          {wasteToRevenueRate.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Charts */}
              {hasAnyWaste ? (
                <div className={cn("grid gap-6", storeFilter ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                  {/* Waste Cost by Store */}
                  <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
                    <h4 className="font-serif text-lg text-foreground mb-1">Waste Cost by Store</h4>
                    <p className="text-xs text-muted-foreground mb-4">Leftover + waste cost per location</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={wasteBarData} barSize={storeFilter ? 60 : 36}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                        <XAxis dataKey="store" tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} width={70} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-xs font-medium text-foreground mb-1">{d.store}</p>
                                <div className="space-y-0.5 text-xs">
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Leftover:</span><span className="font-mono font-medium text-amber-600">${d.leftover.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Waste:</span><span className="font-mono font-medium text-red-600">${d.waste.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Total:</span><span className="font-mono font-semibold">${d.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Reports:</span><span className="font-mono font-medium">{d.reports}</span></div>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="leftover" stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} name="Leftover" />
                        <Bar dataKey="waste" stackId="a" fill="#DC2626" radius={[6, 6, 0, 0]} name="Waste" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-amber-600" /> Leftover</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-red-600" /> Waste</div>
                    </div>
                  </motion.div>

                  {/* Waste by Category */}
                  <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
                    <h4 className="font-serif text-lg text-foreground mb-1">Waste by Category</h4>
                    <p className="text-xs text-muted-foreground mb-4">Breakdown by Bagels, Pastries, and CK Items</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={categoryData} barSize={50}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                        <XAxis dataKey="category" tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} />
                        <YAxis tickFormatter={(v) => `$${v.toLocaleString()}`} tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} width={70} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-xs font-medium text-foreground mb-1">{d.category}</p>
                                <div className="space-y-0.5 text-xs">
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Leftover:</span><span className="font-mono font-medium text-amber-600">${d.leftover.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Waste:</span><span className="font-mono font-medium text-red-600">${d.waste.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Total:</span><span className="font-mono font-semibold">${d.total.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="leftover" stackId="a" fill="#D97706" radius={[0, 0, 0, 0]} name="Leftover" />
                        <Bar dataKey="waste" stackId="a" fill="#DC2626" radius={[6, 6, 0, 0]} name="Waste" />
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm" style={{ background: "#D4A853" }} /> Bagels</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm" style={{ background: "#8B5CF6" }} /> Pastries</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm" style={{ background: "#059669" }} /> CK Items</div>
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* Empty state */
                <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                    <Trash2 className="w-6 h-6 text-red-400" />
                  </div>
                  <h4 className="font-serif text-lg text-foreground mb-1">No Waste Data Yet</h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Submit Leftovers & Waste reports through the portal or admin dashboard to see waste analysis here.
                  </p>
                </motion.div>
              )}

              {/* Top Wasted Items Table */}
              {topItems.length > 0 && (
                <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
                  <h4 className="font-serif text-lg text-foreground mb-1">Top Wasted Items</h4>
                  <p className="text-xs text-muted-foreground mb-4">Highest waste cost items — {dateFilter.label}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="text-left py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Item</th>
                          <th className="text-left py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Category</th>
                          <th className="text-right py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Qty Wasted</th>
                          <th className="text-right py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Waste Cost</th>
                          <th className="text-right py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">% of Total</th>
                          <th className="text-left py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium w-40">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topItems.slice(0, 10).map((item, idx) => {
                          const pct = totalWasteCost > 0 ? (item.wasteCost / totalWasteCost) * 100 : 0;
                          const catColor = item.category === "Bagels" ? "bg-amber-100 text-amber-700" : item.category === "Pastries" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700";
                          return (
                            <tr key={`${item.name}-${item.category}`} className={cn("border-b border-border/30", idx % 2 === 0 ? "bg-muted/20" : "")}>
                              <td className="py-2.5 px-3 font-medium text-foreground">{item.name}</td>
                              <td className="py-2.5 px-3"><span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium", catColor)}>{item.category}</span></td>
                              <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{item.wasteQty}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium text-red-600">${item.wasteCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{pct.toFixed(1)}%</td>
                              <td className="py-2.5 px-3">
                                <div className="w-full bg-muted/40 rounded-full h-2">
                                  <div className="h-2 rounded-full bg-red-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {topItems.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center mt-3">Showing top 10 of {topItems.length} items</p>
                    )}
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })()}
      </div>
  );
}

// ─── Admin Page Wrapper ─────────────────────────────────────────

export default function Stores() {
  return (
    <DashboardLayout>
      <StorePerformanceContent />
    </DashboardLayout>
  );
}
