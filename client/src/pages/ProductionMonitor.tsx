// Production Monitor: Labour tracking for Bagel Factory, Pastry Kitchen, Central Kitchen
// Uses 7shifts CK account time punches for real labour data
import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { Users, DollarSign, Clock, Factory, Loader2, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { DateFilter, getDefaultDateFilter, type DateFilterValue } from "@/components/DateFilter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// Department display config
const DEPT_CONFIG: Record<string, { label: string; shortName: string; color: string; icon: string }> = {
  "Central Kitchen": { label: "Central Kitchen", shortName: "CK", color: "#3B82F6", icon: "CK" },
  "Bagel Factory": { label: "Bagel Factory", shortName: "BF", color: "#D4A853", icon: "BF" },
  "Chalet": { label: "Chalet", shortName: "CH", color: "#10B981", icon: "CH" },
  "Office": { label: "Office", shortName: "OF", color: "#8B5CF6", icon: "OF" },
};

// The three departments the user wants to track
const PRODUCTION_DEPTS = ["Bagel Factory", "Central Kitchen", "Pastry Kitchen"];

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatHours(hours: number): string {
  return hours.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

// ─── Reusable Production Monitor Content (used by admin page & portal) ───

interface ProductionMonitorContentProps {
  /** If true, defaults the date filter to "Today" instead of "Last 7 Days" */
  defaultToToday?: boolean;
}

export function ProductionMonitorContent({ defaultToToday }: ProductionMonitorContentProps = {}) {
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(() => {
    if (defaultToToday) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return { mode: "single", from: today, to: today, label: "Today" };
    }
    return getDefaultDateFilter();
  });

  const fromDate = format(dateFilter.from, "yyyy-MM-dd");
  const toDate = format(dateFilter.to, "yyyy-MM-dd");

  const isSingleDay = fromDate === toDate;

  // Fetch production labour data
  const { data: labourData, isLoading, error } = isSingleDay
    ? trpc.productionLabour.daily.useQuery(
        { date: fromDate },
        { retry: 1, refetchOnWindowFocus: false }
      )
    : trpc.productionLabour.range.useQuery(
        { fromDate, toDate },
        { retry: 1, refetchOnWindowFocus: false }
      );

  // Extract department data
  const departments = labourData?.departments ?? [];

  // Map the 7shifts departments to our display, and add Pastry Kitchen placeholder
  const displayDepts = PRODUCTION_DEPTS.map((deptName) => {
    if (deptName === "Pastry Kitchen") {
      // Pastry Kitchen is not in 7shifts — show as placeholder
      return {
        departmentName: "Pastry Kitchen",
        shortName: "PK",
        color: "#F97316",
        employees: 0,
        totalHours: 0,
        labourCost: 0,
        hasData: false,
      };
    }
    const found = departments.find((d) => d.departmentName === deptName);
    const config = DEPT_CONFIG[deptName];
    return {
      departmentName: deptName,
      shortName: config?.shortName ?? deptName.slice(0, 2),
      color: config?.color ?? "#6B7280",
      employees: found?.employees ?? 0,
      totalHours: found?.totalHours ?? 0,
      labourCost: found?.labourCost ?? 0,
      hasData: !!found && (found.employees > 0 || found.totalHours > 0),
    };
  });

  // Also include Chalet and Office if they have data (as "Other" departments)
  const otherDepts = departments
    .filter((d) => !["Bagel Factory", "Central Kitchen"].includes(d.departmentName))
    .filter((d) => d.employees > 0 || d.totalHours > 0)
    .map((d) => {
      const config = DEPT_CONFIG[d.departmentName];
      return {
        departmentName: d.departmentName,
        shortName: config?.shortName ?? d.departmentName.slice(0, 2),
        color: config?.color ?? "#6B7280",
        employees: d.employees,
        totalHours: d.totalHours,
        labourCost: d.labourCost,
        hasData: true,
      };
    });

  // Totals from all departments with data (including Chalet/Office)
  const allDepts = [...displayDepts.filter((d) => d.hasData), ...otherDepts];
  const totalLabourCost = allDepts.reduce((s, d) => s + d.labourCost, 0);
  const totalHours = allDepts.reduce((s, d) => s + d.totalHours, 0);
  const totalEmployees = allDepts.reduce((s, d) => s + d.employees, 0);

  // Chart data for bar chart (only departments with data)
  const barChartData = [...displayDepts, ...otherDepts]
    .filter((d) => d.hasData)
    .sort((a, b) => b.labourCost - a.labourCost);

  // Pie chart data for cost distribution
  const pieData = barChartData.map((d) => ({
    name: d.shortName,
    value: d.labourCost,
    fill: d.color,
  }));

  const hasAnyData = allDepts.length > 0;
  const isTokenMissing = error?.message?.includes("not configured");

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
      {/* Header */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">Production Monitoring</p>
          <h2 className="text-2xl font-serif text-foreground mt-1">Production Monitor</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {hasAnyData
              ? `Labour data from 7shifts — ${dateFilter.label}`
              : isLoading
                ? "Loading production labour data..."
                : "No labour data for selected period"}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isLoading && (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          )}
          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </div>
      </motion.div>

      {/* Token Warning */}
      {isTokenMissing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-medium">7shifts CK access token not configured.</span>{" "}
            Set the <code className="px-1 py-0.5 bg-amber-100 rounded text-xs">SEVEN_SHIFTS_CK_ACCESS_TOKEN</code> environment variable to enable production labour tracking.
          </p>
        </motion.div>
      )}

      {/* Summary KPIs */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, label: "Total Labour Cost", value: hasAnyData ? formatCurrency(totalLabourCost) : "—", sub: hasAnyData ? "All production departments" : "No data" },
          { icon: Clock, label: "Total Hours", value: hasAnyData ? formatHours(totalHours) : "—", sub: hasAnyData ? `${dateFilter.label}` : "No data" },
          { icon: Users, label: "Total Employees", value: hasAnyData ? totalEmployees.toString() : "—", sub: hasAnyData ? "Active workers" : "No data" },
          { icon: Factory, label: "Departments", value: allDepts.length.toString(), sub: `of ${PRODUCTION_DEPTS.length} tracked` },
        ].map((item) => (
          <div key={item.label} className="bg-card rounded-xl border border-border/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-[#D4A853]/10 flex items-center justify-center">
                <item.icon className="w-3.5 h-3.5 text-[#D4A853]" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{item.label}</span>
            </div>
            <p className="text-2xl font-mono font-semibold text-foreground">{item.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{item.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts Row */}
      {hasAnyData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Labour Cost by Department Bar Chart */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
            <h3 className="font-serif text-lg text-foreground mb-1">Labour Cost by Department</h3>
            <p className="text-xs text-muted-foreground mb-4">
              {dateFilter.label} — from 7shifts time punches
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barChartData} layout="vertical" barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" horizontal={false} />
                <XAxis
                  type="number"
                  tickFormatter={(v) => `$${v.toLocaleString()}`}
                  tick={{ fontSize: 11, fill: "#78716C" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  tick={{ fontSize: 12, fill: "#78716C" }}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), "Labour Cost"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E7E5E4", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                />
                <Bar dataKey="labourCost" radius={[0, 4, 4, 0]}>
                  {barChartData.map((entry) => (
                    <Cell key={entry.shortName} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Cost Distribution Pie Chart */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
            <h3 className="font-serif text-lg text-foreground mb-1">Cost Distribution</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Share of total production labour cost
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), "Cost"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E7E5E4", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      )}

      {/* Department Cards */}
      <motion.div variants={fadeUp} initial="hidden" animate="show">
        <h3 className="font-serif text-lg text-foreground mb-4">Department Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayDepts.map((dept) => (
            <div
              key={dept.departmentName}
              className="bg-card rounded-xl border border-border/60 p-5 relative overflow-hidden"
            >
              {/* Color accent bar */}
              <div className="absolute top-0 left-0 w-full h-1" style={{ background: dept.color }} />

              <div className="flex items-center gap-3 mb-4 mt-1">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style={{ background: dept.color }}
                >
                  {dept.shortName}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{dept.departmentName}</h4>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {dept.hasData ? "Active" : dept.departmentName === "Pastry Kitchen" ? "Not in 7shifts" : "No data"}
                  </p>
                </div>
              </div>

              {dept.hasData ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Labour Cost</span>
                    <span className="font-mono text-sm font-semibold text-foreground">{formatCurrency(dept.labourCost)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Hours Worked</span>
                    <span className="font-mono text-sm text-foreground">{formatHours(dept.totalHours)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Employees</span>
                    <span className="font-mono text-sm text-foreground">{dept.employees}</span>
                  </div>
                  {dept.totalHours > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-border/40">
                      <span className="text-xs text-muted-foreground">Avg $/Hour</span>
                      <span className="font-mono text-sm font-semibold text-[#D4A853]">
                        {formatCurrency(dept.labourCost / dept.totalHours)}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    {dept.departmentName === "Pastry Kitchen"
                      ? "Pastry Kitchen labour is not tracked in 7shifts yet. Data will appear here once configured."
                      : "No time punches recorded for this period."}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Other Departments (Chalet, Office) if they have data */}
      {otherDepts.length > 0 && (
        <motion.div variants={fadeUp} initial="hidden" animate="show">
          <h3 className="font-serif text-lg text-foreground mb-4">Other Departments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherDepts.map((dept) => (
              <div
                key={dept.departmentName}
                className="bg-card rounded-xl border border-border/60 p-5 relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1" style={{ background: dept.color }} />
                <div className="flex items-center gap-3 mb-4 mt-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: dept.color }}
                  >
                    {dept.shortName}
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{dept.departmentName}</h4>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground block">Cost</span>
                    <span className="font-mono text-sm font-semibold">{formatCurrency(dept.labourCost)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Hours</span>
                    <span className="font-mono text-sm">{formatHours(dept.totalHours)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Staff</span>
                    <span className="font-mono text-sm">{dept.employees}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Detailed Table */}
      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 overflow-hidden">
        <div className="p-5 border-b border-border/60">
          <h3 className="font-serif text-lg text-foreground">Production Labour Summary</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasAnyData ? `7shifts time punches — ${dateFilter.label}` : "No data for selected period"}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Department</th>
                <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Labour Cost</th>
                <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Hours Worked</th>
                <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Employees</th>
                <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Avg $/Hour</th>
                <th className="text-right px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">% of Total</th>
                <th className="text-center px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[...displayDepts, ...otherDepts].map((dept) => {
                const pctOfTotal = totalLabourCost > 0 ? (dept.labourCost / totalLabourCost) * 100 : 0;
                const avgRate = dept.totalHours > 0 ? dept.labourCost / dept.totalHours : 0;
                return (
                  <tr key={dept.departmentName} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: dept.color }} />
                        <span className="font-medium">{dept.departmentName}</span>
                      </div>
                    </td>
                    <td className="text-right px-5 py-3.5 font-mono text-xs">
                      {dept.hasData ? formatCurrency(dept.labourCost) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-right px-5 py-3.5 font-mono text-xs">
                      {dept.hasData ? formatHours(dept.totalHours) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-right px-5 py-3.5 font-mono text-xs">
                      {dept.hasData ? dept.employees : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-right px-5 py-3.5 font-mono text-xs">
                      {dept.hasData && avgRate > 0 ? formatCurrency(avgRate) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-right px-5 py-3.5 font-mono text-xs">
                      {dept.hasData ? `${pctOfTotal.toFixed(1)}%` : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="text-center px-5 py-3.5">
                      {dept.hasData ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                          {dept.departmentName === "Pastry Kitchen" ? "Pending" : "No Data"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {/* Totals row */}
              {hasAnyData && (
                <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                  <td className="px-5 py-3.5">
                    <span className="font-semibold text-foreground">Total</span>
                  </td>
                  <td className="text-right px-5 py-3.5 font-mono text-xs font-semibold">{formatCurrency(totalLabourCost)}</td>
                  <td className="text-right px-5 py-3.5 font-mono text-xs font-semibold">{formatHours(totalHours)}</td>
                  <td className="text-right px-5 py-3.5 font-mono text-xs font-semibold">{totalEmployees}</td>
                  <td className="text-right px-5 py-3.5 font-mono text-xs font-semibold">
                    {totalHours > 0 ? formatCurrency(totalLabourCost / totalHours) : "—"}
                  </td>
                  <td className="text-right px-5 py-3.5 font-mono text-xs font-semibold">100%</td>
                  <td className="text-center px-5 py-3.5"></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Default page wrapper (admin dashboard route) ───

export default function ProductionMonitor() {
  return (
    <DashboardLayout>
      <ProductionMonitorContent />
    </DashboardLayout>
  );
}
