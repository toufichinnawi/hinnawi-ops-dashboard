// Design: "Golden Hour Operations" — Refined Editorial
// Store Performance: Per-store cards with images, metrics, and comparison
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from "recharts";
import { MapPin, CheckCircle2, Database, Loader2, CalendarX } from "lucide-react";
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

  // COGS data from invoices
  const [cogsData, setCogsData] = useState<Record<string, { total: number; count: number; invoices: any[] }>>({});
  const [cogsLoading, setCogsLoading] = useState(false);

  useEffect(() => {
    const fetchCogs = async () => {
      setCogsLoading(true);
      try {
        const params = new URLSearchParams();
        if (dateFilter.from) params.set("fromDate", typeof dateFilter.from === 'string' ? dateFilter.from : new Date(dateFilter.from).toISOString().split('T')[0]);
        if (dateFilter.to) params.set("toDate", typeof dateFilter.to === 'string' ? dateFilter.to : new Date(dateFilter.to).toISOString().split('T')[0]);
        const res = await fetch(`/api/public/cogs-summary?${params}`);
        const data = await res.json();
        if (data.success) {
          setCogsData(data.byStore || {});
        }
      } catch (err) {
        console.error("Failed to fetch COGS data:", err);
      } finally {
        setCogsLoading(false);
      }
    };
    fetchCogs();
  }, [dateFilter]);

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

            const storeCogs = cogsData[store.id] || { total: 0, count: 0, invoices: [] };
            const cogsRate = labour.revenue > 0 ? (storeCogs.total / labour.revenue) * 100 : 0;

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

                {/* COGS & Sales Row */}
                <div className="px-4 pb-4 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">COGS</p>
                    <p className="text-lg font-mono font-semibold mt-0.5 text-blue-600">
                      {cogsLoading ? "..." : (storeCogs.total > 0 ? `$${storeCogs.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—")}
                    </p>
                    {storeCogs.count > 0 && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">{storeCogs.count} invoice{storeCogs.count !== 1 ? "s" : ""}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">COGS Rate</p>
                    <p className={cn("text-lg font-mono font-semibold mt-0.5", cogsRate > 40 ? "text-red-600" : cogsRate > 30 ? "text-amber-600" : "text-emerald-600")}>
                      {cogsRate > 0 ? `${cogsRate.toFixed(1)}%` : "—"}
                    </p>
                    {cogsRate > 0 && (
                      <p className="text-[9px] text-muted-foreground mt-0.5">COGS / Revenue</p>
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

        {/* ─── COGS Section ─── */}
        {!(hasCloverData && noDataForPeriod) && (() => {
          const storeList = storeFilter ? stores.filter(s => s.id === storeFilter) : stores;
          const hasAnyCogs = storeList.some(s => (cogsData[s.id]?.total ?? 0) > 0);
          const totalCogs = storeList.reduce((sum, s) => sum + (cogsData[s.id]?.total ?? 0), 0);
          const totalRevenue = storeList.reduce((sum, s) => sum + (getLabour(s.id).revenue ?? 0), 0);
          const overallCogsRate = totalRevenue > 0 ? (totalCogs / totalRevenue) * 100 : 0;
          const totalInvoices = storeList.reduce((sum, s) => sum + (cogsData[s.id]?.count ?? 0), 0);

          // Bar chart data: COGS by store
          const cogsBarData = storeList.map(s => {
            const cogs = cogsData[s.id]?.total ?? 0;
            const rev = getLabour(s.id).revenue ?? 0;
            const rate = rev > 0 ? (cogs / rev) * 100 : 0;
            return {
              store: s.shortName,
              storeId: s.id,
              cogs,
              revenue: rev,
              rate,
              color: s.color,
              invoiceCount: cogsData[s.id]?.count ?? 0,
            };
          });

          // COGS Rate comparison data
          const cogsRateData = storeList.map(s => {
            const cogs = cogsData[s.id]?.total ?? 0;
            const rev = getLabour(s.id).revenue ?? 0;
            const rate = rev > 0 ? (cogs / rev) * 100 : 0;
            return {
              store: s.shortName,
              rate: parseFloat(rate.toFixed(1)),
              target: 30, // default COGS target
              color: s.color,
            };
          });

          // Vendor breakdown across all stores
          const vendorMap: Record<string, { vendor: string; total: number; count: number }> = {};
          storeList.forEach(s => {
            const storeInvoices = cogsData[s.id]?.invoices ?? [];
            storeInvoices.forEach((inv: any) => {
              const vendor = inv.vendorName || "Unknown";
              if (!vendorMap[vendor]) vendorMap[vendor] = { vendor, total: 0, count: 0 };
              vendorMap[vendor].total += inv.total ?? 0;
              vendorMap[vendor].count += 1;
            });
          });
          const vendorBreakdown = Object.values(vendorMap).sort((a, b) => b.total - a.total);

          return (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-6">
              {/* COGS Section Header */}
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-blue-600 uppercase tracking-[0.2em] font-medium">Cost of Goods Sold</p>
                  <h3 className="text-xl font-serif text-foreground mt-1">COGS Analysis</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {hasAnyCogs
                      ? `${totalInvoices} invoice${totalInvoices !== 1 ? "s" : ""} — ${dateFilter.label}`
                      : `No invoices recorded for ${dateFilter.label}`}
                  </p>
                </div>
                {hasAnyCogs && (
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total COGS</p>
                      <p className="text-xl font-mono font-semibold text-blue-600">${totalCogs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overall Rate</p>
                      <p className={cn("text-xl font-mono font-semibold", overallCogsRate > 40 ? "text-red-600" : overallCogsRate > 30 ? "text-amber-600" : "text-emerald-600")}>
                        {overallCogsRate > 0 ? `${overallCogsRate.toFixed(1)}%` : "—"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* COGS Charts */}
              {hasAnyCogs ? (
                <div className={cn("grid gap-6", storeFilter ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2")}>
                  {/* COGS by Store Bar Chart */}
                  <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
                    <h4 className="font-serif text-lg text-foreground mb-1">COGS by Store</h4>
                    <p className="text-xs text-muted-foreground mb-4">Total cost of goods sold per location</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={cogsBarData} barSize={storeFilter ? 60 : 36}>
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
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">COGS:</span><span className="font-mono font-medium">${d.cogs.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Revenue:</span><span className="font-mono font-medium">${d.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">COGS Rate:</span><span className={cn("font-mono font-medium", d.rate > 40 ? "text-red-600" : d.rate > 30 ? "text-amber-600" : "text-emerald-600")}>{d.rate.toFixed(1)}%</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Invoices:</span><span className="font-mono font-medium">{d.invoiceCount}</span></div>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="cogs" radius={[6, 6, 0, 0]}>
                          {cogsBarData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-4 mt-2">
                      {storeList.map((s) => (
                        <div key={s.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                          {s.shortName}
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* COGS Rate Comparison */}
                  <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
                    <h4 className="font-serif text-lg text-foreground mb-1">COGS Rate by Store</h4>
                    <p className="text-xs text-muted-foreground mb-4">COGS as percentage of revenue — target: 30%</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={cogsRateData} barSize={storeFilter ? 60 : 36}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                        <XAxis dataKey="store" tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} />
                        <YAxis domain={[0, 'auto']} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} width={50} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="bg-white border border-border rounded-lg px-3 py-2 shadow-lg">
                                <p className="text-xs font-medium text-foreground mb-1">{d.store}</p>
                                <div className="space-y-0.5 text-xs">
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">COGS Rate:</span><span className={cn("font-mono font-medium", d.rate > 40 ? "text-red-600" : d.rate > 30 ? "text-amber-600" : "text-emerald-600")}>{d.rate}%</span></div>
                                  <div className="flex justify-between gap-4"><span className="text-muted-foreground">Target:</span><span className="font-mono font-medium text-blue-600">{d.target}%</span></div>
                                </div>
                              </div>
                            );
                          }}
                        />
                        <ReferenceLine y={30} stroke="#3B82F6" strokeDasharray="6 4" strokeWidth={2} label={{ value: "Target 30%", position: "right", fill: "#3B82F6", fontSize: 10 }} />
                        <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                          {cogsRateData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.rate > 40 ? "#DC2626" : entry.rate > 30 ? "#D97706" : "#059669"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {/* Target line legend */}
                    <div className="flex items-center justify-center gap-6 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-emerald-600" /> &lt;30% Good</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-amber-600" /> 30-40% Watch</div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-red-600" /> &gt;40% High</div>
                    </div>
                  </motion.div>
                </div>
              ) : (
                /* Empty state when no COGS data */
                <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>
                  </div>
                  <h4 className="font-serif text-lg text-foreground mb-1">No COGS Data Yet</h4>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Start capturing invoices through the portal to see COGS analysis here. Each invoice is recorded as Cost of Goods Sold.
                  </p>
                </motion.div>
              )}

              {/* Vendor Breakdown Table */}
              {vendorBreakdown.length > 0 && (
                <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
                  <h4 className="font-serif text-lg text-foreground mb-1">COGS by Vendor</h4>
                  <p className="text-xs text-muted-foreground mb-4">Spending breakdown by supplier — {dateFilter.label}</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/60">
                          <th className="text-left py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Vendor</th>
                          <th className="text-right py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Invoices</th>
                          <th className="text-right py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Total</th>
                          <th className="text-right py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">% of COGS</th>
                          <th className="text-left py-2 px-3 text-[10px] text-muted-foreground uppercase tracking-wider font-medium w-40">Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vendorBreakdown.slice(0, 10).map((v, idx) => {
                          const pct = totalCogs > 0 ? (v.total / totalCogs) * 100 : 0;
                          return (
                            <tr key={v.vendor} className={cn("border-b border-border/30", idx % 2 === 0 ? "bg-muted/20" : "")}>
                              <td className="py-2.5 px-3 font-medium text-foreground">{v.vendor}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{v.count}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-medium">${v.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">{pct.toFixed(1)}%</td>
                              <td className="py-2.5 px-3">
                                <div className="w-full bg-muted/40 rounded-full h-2">
                                  <div className="h-2 rounded-full bg-blue-500 transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {vendorBreakdown.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center mt-3">Showing top 10 of {vendorBreakdown.length} vendors</p>
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
