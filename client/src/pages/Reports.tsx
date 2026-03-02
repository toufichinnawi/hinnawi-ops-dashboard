// Design: "Golden Hour Operations" — Refined Editorial
// Report Tracker: Submission status matrix, timeline, filters
import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, XCircle, Filter } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { stores } from "@/lib/data";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const statusConfig = {
  submitted: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Submitted" },
  pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Pending" },
  overdue: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Overdue" },
};

function getStore(id: string) {
  return stores.find((s) => s.id === id)!;
}



export default function Reports() {
  const { reportSubmissions } = useData();
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = reportSubmissions.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    submitted: reportSubmissions.filter((r) => r.status === "submitted").length,
    pending: reportSubmissions.filter((r) => r.status === "pending").length,
    overdue: reportSubmissions.filter((r) => r.status === "overdue").length,
  };

  const reportTypes = Array.from(new Set(reportSubmissions.map((r: { type: string }) => r.type)));

  // Build matrix: reportType x store
  const matrix = reportTypes.map((type: string) => ({
    type,
    stores: stores.map((store) => {
      const entry = reportSubmissions.find((r) => r.type === type && r.store === store.id);
      return { store: store.id, status: entry?.status ?? "none", submittedBy: entry?.submittedBy ?? "" };
    }),
  }));

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">Report Tracking</p>
          <h2 className="text-2xl font-serif text-foreground mt-1">Report Submissions</h2>
          <p className="text-sm text-muted-foreground mt-1">Track all operational reports across your 4 stores</p>
        </motion.div>

        {/* Status Summary */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-3 gap-4">
          {(["submitted", "pending", "overdue"] as const).map((status) => {
            const config = statusConfig[status];
            const Icon = config.icon;
            return (
              <div key={status} className={cn("rounded-xl border p-5 flex items-center gap-4", config.bg)}>
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", status === "submitted" ? "bg-emerald-100" : status === "pending" ? "bg-amber-100" : "bg-red-100")}>
                  <Icon className={cn("w-5 h-5", config.color)} />
                </div>
                <div>
                  <p className="text-3xl font-mono font-semibold text-foreground">{counts[status]}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">{config.label}</p>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Submission Matrix */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="p-5 border-b border-border/60">
            <h3 className="font-serif text-lg text-foreground">Submission Matrix</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Report type vs. store — at a glance</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Report Type</th>
                  {stores.map((store) => (
                    <th key={store.id} className="text-center px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: store.color }} />
                        {store.shortName}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.type} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium">{row.type}</td>
                    {row.stores.map((cell) => {
                      const config = cell.status !== "none" ? statusConfig[cell.status as keyof typeof statusConfig] : null;
                      return (
                        <td key={cell.store} className="text-center px-5 py-3.5">
                          {config ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <config.icon className={cn("w-5 h-5", config.color)} />
                              <span className="text-[9px] text-muted-foreground">{cell.submittedBy.split(" ")[0]}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Detailed List with Filters */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="p-5 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg text-foreground">All Submissions</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{filtered.length} reports</p>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
              >
                <option value="all">All Types</option>
                {reportTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Report</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Store</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Submitted By</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Role</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Time</th>
                  <th className="text-center px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const store = getStore(r.store);
                  const config = statusConfig[r.status];
                  const Icon = config.icon;
                  return (
                    <tr key={r.id} className="border-t border-border/40 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium">{r.type}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ background: store.color }} />
                          {store.shortName}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{r.submittedBy}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{r.role}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="text-center px-5 py-3.5">
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", config.bg)}>
                          <Icon className={cn("w-3 h-3", config.color)} />
                          {config.label}
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
