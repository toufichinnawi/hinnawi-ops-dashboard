// Design: "Golden Hour Operations" — Refined Editorial
// Labour Monitor: Per-store labour metrics, trend chart, comparison table
import { motion } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from "recharts";
import { Users, DollarSign, Clock, Target } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { labourData, labourTrend, stores } from "@/lib/data";
import { cn } from "@/lib/utils";

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
  const totalRevenue = labourData.reduce((s, d) => s + d.revenue, 0);
  const totalLabour = labourData.reduce((s, d) => s + d.labourCost, 0);
  const totalPercent = (totalLabour / totalRevenue) * 100;
  const totalEmployees = labourData.reduce((s, d) => s + d.employees, 0);
  const totalHours = labourData.reduce((s, d) => s + d.hoursWorked, 0);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">Labour Monitoring</p>
          <h2 className="text-2xl font-serif text-foreground mt-1">Labour Cost Analysis</h2>
          <p className="text-sm text-muted-foreground mt-1">Current biweekly period — all 4 locations</p>
        </motion.div>

        {/* Summary KPIs */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: DollarSign, label: "Total Revenue", value: `$${(totalRevenue / 1000).toFixed(1)}K`, sub: "All stores" },
            { icon: DollarSign, label: "Labour Cost", value: `$${(totalLabour / 1000).toFixed(1)}K`, sub: `${totalPercent.toFixed(1)}% of revenue` },
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
            <p className="text-xs text-muted-foreground mb-4">Current period — target: 30%</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={labourData} layout="vertical" barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 35]}
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
                  tickFormatter={(v) => getStore(v).shortName}
                />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(1)}%`, "Labour %"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E7E5E4", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                />
                <ReferenceLine x={30} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: "Target 30%", position: "top", fontSize: 10, fill: "#EF4444" }} />
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
            <p className="text-xs text-muted-foreground mb-4">Last 6 biweekly periods</p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={labourTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#78716C" }} tickLine={false} axisLine={false} />
                <YAxis domain={[25, 33]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: "#78716C" }} tickLine={false} axisLine={false} width={45} />
                <Tooltip
                  formatter={(v: number) => [`${v.toFixed(1)}%`]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E7E5E4", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}
                />
                <ReferenceLine y={30} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1} />
                <Line type="monotone" dataKey="pk" name="PK" stroke="#D4A853" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="mk" name="MK" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ontario" name="Ontario" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="tunnel" name="Tunnel" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Detailed Table */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="p-5 border-b border-border/60">
            <h3 className="font-serif text-lg text-foreground">Store Labour Breakdown</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Current biweekly period details</p>
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
                  const isOver = row.labourPercent > row.target;
                  const isClose = row.labourPercent > row.target - 2 && !isOver;
                  return (
                    <tr key={row.store} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: store.color }} />
                          <span className="font-medium">{store.name}</span>
                        </div>
                      </td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs">${row.revenue.toLocaleString()}</td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs">${row.labourCost.toLocaleString()}</td>
                      <td className={cn("text-right px-5 py-3.5 font-mono text-xs font-semibold", isOver ? "text-red-600" : isClose ? "text-amber-600" : "text-emerald-600")}>
                        {row.labourPercent.toFixed(1)}%
                      </td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs text-muted-foreground">{row.target}%</td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs">{row.employees}</td>
                      <td className="text-right px-5 py-3.5 font-mono text-xs">{row.hoursWorked}</td>
                      <td className="text-center px-5 py-3.5">
                        <span className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                          isOver ? "bg-red-100 text-red-700" : isClose ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        )}>
                          {isOver ? "Over" : isClose ? "At Risk" : "On Track"}
                        </span>
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
