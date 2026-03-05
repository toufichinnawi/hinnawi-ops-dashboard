// Design: "Golden Hour Operations" — Refined Editorial
// Labour Monitor: Per-store labour metrics, trend chart, comparison table
// Now uses real Excel labour data from SharePoint daily report
import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import { Users, DollarSign, Clock, Database, Upload, CheckCircle2, Loader2, FileSpreadsheet } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { DateFilter, getDefaultDateFilter, type DateFilterValue } from "@/components/DateFilter";
import { useFilteredCloverData } from "@/hooks/useFilteredCloverData";
import { useData } from "@/contexts/DataContext";
import { trpc } from "@/lib/trpc";
import { stores } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

function getStore(id: string) {
  return stores.find((s) => s.id === id)!;
}

function getBarColor(percent: number, target: number) {
  if (percent > target) return "#EF4444";
  if (percent > target - 2) return "#F59E0B";
  return "#10B981";
}

export default function Labour() {
  const { hasLiveData, hasCloverData } = useData();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fromDate = format(dateFilter.from, "yyyy-MM-dd");
  const toDate = format(dateFilter.to, "yyyy-MM-dd");

  // Fetch filtered data (includes Excel labour data)
  const {
    labourData: filteredLabour,
    isLoading: filterLoading,
    hasData: hasFilteredData,
    hasExcelData,
    noDataForPeriod,
  } = useFilteredCloverData(dateFilter);

  // Fallback to DataContext labour data — but NEVER fall back to demo data when no data for period
  const { labourData: contextLabour, labourTrend } = useData();
  const labourData = hasCloverData
    ? (noDataForPeriod
      ? stores.map(s => ({ store: s.id, revenue: 0, labourCost: 0, labourPercent: 0, target: s.labourTarget, employees: 0, hoursWorked: 0 }))
      : (filteredLabour ?? contextLabour))
    : contextLabour;

  // Excel sync meta
  const { data: syncMeta } = trpc.excelLabour.syncMeta.useQuery();

  // Excel upload mutation
  const uploadMutation = trpc.excelLabour.upload.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Excel Data Uploaded", {
          description: `${data.rowCount} rows imported (${data.dateRange?.from} to ${data.dateRange?.to})`,
        });
      } else {
        toast.error("Upload Failed", {
          description: data.errors.join("; "),
        });
      }
    },
    onError: (err) => {
      toast.error("Upload Error", { description: err.message });
    },
  });

  const utils = trpc.useUtils();

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Invalid File", { description: "Please upload an Excel file (.xlsx)" });
      return;
    }

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      await uploadMutation.mutateAsync({
        fileBase64: base64,
        fileName: file.name,
      });

      // Invalidate queries to refresh data
      utils.excelLabour.data.invalidate();
      utils.excelLabour.syncMeta.invalidate();
    } catch (err) {
      // Error handled by mutation
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [uploadMutation, utils]);

  const totalRevenue = labourData.reduce((s, d) => s + d.revenue, 0);
  const totalLabour = labourData.reduce((s, d) => s + d.labourCost, 0);
  const totalPercent = totalRevenue > 0 ? (totalLabour / totalRevenue) * 100 : 0;
  const totalEmployees = labourData.reduce((s, d) => s + d.employees, 0);
  const totalHours = labourData.reduce((s, d) => s + d.hoursWorked, 0);

  // Build daily labour trend from Excel data
  const { data: excelTrendData } = trpc.excelLabour.data.useQuery(
    { fromDate, toDate },
    { retry: 1 }
  );

  const dailyLabourTrend = (excelTrendData && excelTrendData.length > 0) ? (() => {
    // Group by date, compute per-store labour %
    const dateMap = new Map<string, { pk: number; mk: number; ontario: number; tunnel: number }>();
    for (const row of excelTrendData as any[]) {
      const existing = dateMap.get(row.date) ?? { pk: 0, mk: 0, ontario: 0, tunnel: 0 };
      (existing as any)[row.storeId] = row.labourPercent;
      dateMap.set(row.date, existing);
    }
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => {
        const d = new Date(date + "T12:00:00");
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return { period: label, ...data };
      });
  })() : null;

  // Determine max Y for the labour trend chart
  const trendData = dailyLabourTrend ?? labourTrend;
  const allTrendValues = trendData.flatMap(d => [
    (d as any).pk || 0, (d as any).mk || 0, (d as any).ontario || 0, (d as any).tunnel || 0
  ]);
  const maxTrendValue = Math.max(...allTrendValues, 35);
  const yDomainMax = Math.ceil(maxTrendValue / 5) * 5 + 5;

  // Determine data source label
  const dataSourceLabel = hasExcelData
    ? `From Excel daily report — ${dateFilter.label}`
    : hasCloverData
      ? `From Clover POS — ${dateFilter.label}`
      : hasLiveData
        ? "From uploaded MYR data"
        : "Demo data — upload Excel to see real numbers";

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">Labour Monitoring</p>
            <h2 className="text-2xl font-serif text-foreground mt-1">Labour Cost Analysis</h2>
            <p className="text-sm text-muted-foreground mt-1">{dataSourceLabel}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasExcelData && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">Excel Data</span>
              </span>
            )}
            {filterLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
        </motion.div>

        {/* Excel Upload Banner */}
        {!hasExcelData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/20"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-4 h-4 text-[#D4A853]" />
              <p className="text-sm text-foreground">
                <span className="font-medium">Upload your SharePoint daily report</span>{" "}
                <span className="text-muted-foreground">to see real labour costs for all stores</span>
              </p>
            </div>
            <label className="cursor-pointer">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <span className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                "bg-[#D4A853] text-white hover:bg-[#C49A48]",
                isUploading && "opacity-50 cursor-not-allowed"
              )}>
                {isUploading ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="w-3.5 h-3.5" /> Upload Excel</>
                )}
              </span>
            </label>
          </motion.div>
        )}

        {/* Sync Meta Info */}
        {syncMeta && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Last sync: {syncMeta.fileName} — {syncMeta.rowCount} rows — {syncMeta.dateRange}</span>
            <label className="cursor-pointer ml-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <span className="text-[#D4A853] hover:underline cursor-pointer">
                {isUploading ? "Uploading..." : "Re-upload"}
              </span>
            </label>
          </motion.div>
        )}

        {/* Summary KPIs */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Total Revenue", value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: "All stores" },
            { icon: DollarSign, label: "Labour Cost", value: `$${totalLabour.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: totalLabour > 0 ? `${totalPercent.toFixed(1)}% of revenue` : "No labour data" },
            { icon: Users, label: "Employees", value: totalEmployees.toString(), sub: "Across all stores" },
            { icon: Clock, label: "Hours Worked", value: totalHours.toLocaleString(), sub: "This period" },
          ].map((item) => (
            <div key={item.label} className="bg-card rounded-xl border border-border/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#D4A853]/10 flex items-center justify-center">
                  <item.icon className="w-3.5 h-3.5 text-[#D4A853]" />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</span>
              </div>
              <p className="text-2xl font-mono font-semibold text-foreground">{item.value}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{item.sub}</p>
            </div>
          ))}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Labour % by Store Bar Chart */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
            <h3 className="font-serif text-lg text-foreground mb-1">Labour % by Store</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {hasExcelData ? `From Excel — ${dateFilter.label}` : "Current period — per-store targets"}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={labourData} layout="vertical" barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, Math.max(35, ...labourData.map(d => d.labourPercent + 5))]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "#78716C" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="store"
                  tick={{ fontSize: 12, fill: "#78716C" }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  tickFormatter={(v) => getStore(v)?.shortName ?? v}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(1)}%`, "Labour %"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E7E5E4", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                />
                <Bar dataKey="labourPercent" radius={[0, 4, 4, 0]}>
                  {labourData.map((entry) => (
                    <Cell key={entry.store} fill={getBarColor(entry.labourPercent, entry.target)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Labour % Trend Line Chart */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
            <h3 className="font-serif text-lg text-foreground mb-1">Labour % Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {dailyLabourTrend ? `Daily from Excel — ${dateFilter.label}` : "Last 6 biweekly periods"}
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#78716C" }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, yDomainMax]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} width={45} />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(1)}%`]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E7E5E4", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                />
                <ReferenceLine y={30} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1} label={{ value: "30%", position: "right", fontSize: 10, fill: "#EF4444" }} />
                <Line type="monotone" dataKey="pk" name="PK" stroke="#D4A853" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="mk" name="MK" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ontario" name="Ontario" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tunnel" name="Tunnel" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
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
        </div>

        {/* Detailed Table */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="p-5 border-b border-border/60">
            <h3 className="font-serif text-lg text-foreground">Store Labour Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {hasExcelData
                ? `From Excel daily report — ${dateFilter.label}`
                : hasCloverData
                  ? `From Clover POS — ${dateFilter.label}`
                  : hasLiveData
                    ? "From uploaded MYR data"
                    : "Demo data"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Store</th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Revenue</th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Labour Cost</th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Labour %</th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Target</th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Employees</th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Hours</th>
                  <th className="text-center px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {labourData.map((row) => {
                  const store = getStore(row.store);
                  if (!store) return null;
                  const isOver = row.labourPercent > row.target;
                  const isClose = row.labourPercent > row.target - 2 && !isOver;
                  const hasLabour = row.labourCost > 0;
                  return (
                    <tr key={row.store} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: store.color }} />
                          <span className="font-medium">{store.name}</span>
                        </div>
                      </td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs">${row.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs">
                        {hasLabour ? `$${row.labourCost.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className={cn("text-right px-5 py-3.5 font-mono text-xs font-semibold",
                        !hasLabour ? "text-muted-foreground" : isOver ? "text-red-600" : isClose ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {hasLabour ? `${row.labourPercent.toFixed(1)}%` : "—"}
                      </td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs text-muted-foreground">{row.target}%</td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs">{row.employees || "—"}</td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs">{row.hoursWorked || "—"}</td>
                      <td className="text-center px-5 py-3.5">
                        {hasLabour ? (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                            isOver ? "bg-red-100 text-red-700" : isClose ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                          )}>
                            {isOver ? "Over" : isClose ? "At Risk" : "On Track"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">No data</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
