// Design: "Golden Hour Operations" — Refined Editorial
// Overview page: Hero banner, Date filter, KPI cards, weekly sales chart, alerts, report status
import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, XCircle, ArrowRight, Database, Loader2,
} from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import KPICard from "@/components/KPICard";
import { DateFilter, getDefaultDateFilter, type DateFilterValue } from "@/components/DateFilter";
import { useData } from "@/contexts/DataContext";
import { useFilteredCloverData } from "@/hooks/useFilteredCloverData";
import { stores } from "@/lib/data";
import { cn } from "@/lib/utils";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as const } },
};

const alertIcons = {
  critical: <XCircle className="w-4 h-4 text-red-500" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  info: <Clock className="w-4 h-4 text-blue-500" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
};
const alertBg = {
  critical: "bg-red-50 border-red-200",
  warning: "bg-amber-50 border-amber-200",
  info: "bg-blue-50 border-blue-200",
  success: "bg-emerald-50 border-emerald-200",
};

function getStoreName(id: string) {
  return stores.find((s) => s.id === id)?.shortName ?? id;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">${(p.value / 1000).toFixed(1)}K</span>
        </div>
      ))}
    </div>
  );
};

export default function Home() {
  const { reportSubmissions, alerts, hasLiveData, hasCloverData } = useData();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultDateFilter);

  // Fetch filtered Clover data based on date selection
  const { kpis: filteredKpis, weeklySales: filteredSales, dailyTraffic: filteredTraffic, isLoading: filterLoading, hasData: hasFilteredData, noDataForPeriod } = useFilteredCloverData(dateFilter);

  // When Clover is connected, always use filtered data (even zeroed KPIs for empty periods)
  // Only fall back to DataContext when Clover is NOT connected
  const { kpis: contextKpis, weeklySales: contextSales, weeklyTraffic: contextTraffic } = useData();

  const kpis = hasCloverData ? (filteredKpis ?? contextKpis) : contextKpis;
  const weeklySales = hasCloverData ? (filteredSales ?? contextSales) : contextSales;
  const weeklyTraffic = hasCloverData ? (filteredTraffic ?? contextTraffic) : contextTraffic;

  const todayReports = reportSubmissions.filter((r) => r.type === "Daily Report");
  const status = {
    submitted: todayReports.filter((r) => r.status === "submitted").length,
    pending: todayReports.filter((r) => r.status === "pending").length,
    overdue: todayReports.filter((r) => r.status === "overdue").length,
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl overflow-hidden h-[180px]"
        >
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663391168179/i5zcri4CVdStBBckDWTaVK/hero-bakery-operations-aqkyHmyt9QQZHqFouLXDBx.webp"
            alt="Hinnawi Bros bakery"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1C1210]/85 via-[#1C1210]/60 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-center px-8">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[#D4A853] text-xs font-medium uppercase tracking-[0.2em]">
                Operations Dashboard
              </p>
              {hasCloverData && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Clover POS Live
                </span>
              )}
              {!hasCloverData && hasLiveData && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CSV Data
                </span>
              )}
              {!hasLiveData && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] font-medium">
                  Demo Data
                </span>
              )}
            </div>
            <h2 className="text-white text-2xl lg:text-3xl font-serif">
              Good morning, Hinnawi Bros
            </h2>
            <p className="text-white/70 text-sm mt-1.5 max-w-md">
              All 4 stores are open. Here is your operational snapshot for today.
            </p>
          </div>
        </motion.div>

        {/* Data Source Banner + Date Filter */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {hasCloverData && (
              <Link href="/clover">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-500/15 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Clover POS connected.</span>{" "}
                    <span className="text-muted-foreground">Showing live sales data from your stores →</span>
                  </p>
                </motion.div>
              </Link>
            )}
            {!hasLiveData && (
              <Link href="/clover">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#D4A853]/10 border border-[#D4A853]/20 cursor-pointer hover:bg-[#D4A853]/15 transition-colors"
                >
                  <Database className="w-4 h-4 text-[#D4A853]" />
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Currently showing demo data.</span>{" "}
                    <span className="text-muted-foreground">Connect your Clover POS or upload MYR CSV exports →</span>
                  </p>
                </motion.div>
              </Link>
            )}
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 shrink-0">
            {filterLoading && hasCloverData && (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
            <DateFilter value={dateFilter} onChange={setDateFilter} />
          </div>
        </div>

        {/* KPI Cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {kpis.map((kpi) => (
            <motion.div key={kpi.title} variants={fadeUp}>
              <KPICard kpi={kpi} invertTrend={kpi.title === "Labour %"} />
            </motion.div>
          ))}
        </motion.div>

        {/* Main content grid: Chart + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sales Chart */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="lg:col-span-2 bg-card rounded-xl border border-border/60 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-lg text-foreground">Sales by Store</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hasCloverData
                    ? `Live from Clover POS — ${dateFilter.label}`
                    : hasLiveData
                      ? "From uploaded MYR data"
                      : "Last 8 weeks — demo data"}
                </p>
              </div>
              <Link href="/stores">
                <span className="text-xs text-[#D4A853] hover:underline flex items-center gap-1 cursor-pointer">
                  View details <ArrowRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklySales} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "#78716C" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`}
                  tick={{ fontSize: 11, fill: "#78716C" }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
                <Bar dataKey="pk" name="PK" fill="#D4A853" radius={[3, 3, 0, 0]} />
                <Bar dataKey="mk" name="MK" fill="#3B82F6" radius={[3, 3, 0, 0]} />
                <Bar dataKey="ontario" name="Ontario" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="tunnel" name="Tunnel" fill="#F97316" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Right sidebar: Alerts + Report Status */}
          <div className="space-y-6">
            {/* Report Status Summary */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="bg-card rounded-xl border border-border/60 p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif text-base text-foreground">Today's Reports</h3>
                <Link href="/reports">
                  <span className="text-xs text-[#D4A853] hover:underline cursor-pointer">View all</span>
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <p className="text-2xl font-mono font-semibold text-emerald-700">{status.submitted}</p>
                  <p className="text-[10px] text-emerald-600 uppercase tracking-wider mt-0.5">Submitted</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-2xl font-mono font-semibold text-amber-700">{status.pending}</p>
                  <p className="text-[10px] text-amber-600 uppercase tracking-wider mt-0.5">Pending</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-2xl font-mono font-semibold text-red-700">{status.overdue}</p>
                  <p className="text-[10px] text-red-600 uppercase tracking-wider mt-0.5">Overdue</p>
                </div>
              </div>
            </motion.div>

            {/* Alerts */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="bg-card rounded-xl border border-border/60 p-5"
            >
              <h3 className="font-serif text-base text-foreground mb-3">Active Alerts</h3>
              <div className="space-y-2">
                {alerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className={cn(
                      "flex items-start gap-2.5 p-2.5 rounded-lg border text-xs",
                      alertBg[alert.type]
                    )}
                  >
                    <div className="mt-0.5 shrink-0">{alertIcons[alert.type]}</div>
                    <div>
                      <p className="text-foreground leading-relaxed">{alert.message}</p>
                      <p className="text-muted-foreground mt-1 text-[10px]">
                        {getStoreName(alert.store)} — {new Date(alert.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Weekly Traffic Pattern */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-card rounded-xl border border-border/60 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg text-foreground">Weekly Order Pattern</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {hasCloverData
                  ? `Average daily orders — ${dateFilter.label}`
                  : "Average daily orders by day of week"}
              </p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={weeklyTraffic}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "#78716C" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#78716C" }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #E7E5E4",
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
              <Area type="monotone" dataKey="pk" name="PK" stroke="#D4A853" fill="#D4A853" fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="mk" name="MK" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="ontario" name="Ontario" stroke="#10B981" fill="#10B981" fillOpacity={0.1} strokeWidth={2} />
              <Area type="monotone" dataKey="tunnel" name="Tunnel" stroke="#F97316" fill="#F97316" fillOpacity={0.1} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
