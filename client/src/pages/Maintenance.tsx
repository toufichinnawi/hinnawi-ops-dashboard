// Design: "Golden Hour Operations" — Refined Editorial
// Maintenance: Equipment requests, status tracking
import { motion } from "framer-motion";
import { Wrench, AlertTriangle, CheckCircle2, Clock, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { stores } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  store: string;
  priority: "high" | "medium" | "low";
  status: "open" | "in-progress" | "resolved";
  reportedBy: string;
  reportedAt: string;
}

const maintenanceRequests: MaintenanceRequest[] = [
  {
    id: "1",
    title: "Espresso machine pressure issue",
    description: "Machine #2 showing inconsistent pressure readings. Shots pulling too fast.",
    store: "pk",
    priority: "high",
    status: "in-progress",
    reportedBy: "Maria Santos",
    reportedAt: "2026-03-01T14:30:00",
  },
  {
    id: "2",
    title: "Walk-in fridge temperature alarm",
    description: "Temperature spiked to 8°C overnight. Reset to 4°C but needs inspection.",
    store: "mk",
    priority: "high",
    status: "open",
    reportedBy: "Ahmed Hassan",
    reportedAt: "2026-03-02T06:15:00",
  },
  {
    id: "3",
    title: "Bagel slicer blade replacement",
    description: "Blade getting dull, not cutting cleanly. Needs replacement within the week.",
    store: "ontario",
    priority: "medium",
    status: "open",
    reportedBy: "Sophie Chen",
    reportedAt: "2026-02-28T10:00:00",
  },
  {
    id: "4",
    title: "POS terminal #3 screen flickering",
    description: "Intermittent screen flicker on terminal 3. Still functional but annoying.",
    store: "tunnel",
    priority: "low",
    status: "open",
    reportedBy: "James Wilson",
    reportedAt: "2026-02-27T16:00:00",
  },
  {
    id: "5",
    title: "Grease trap cleaning",
    description: "Scheduled quarterly grease trap cleaning completed.",
    store: "pk",
    priority: "medium",
    status: "resolved",
    reportedBy: "Maria Santos",
    reportedAt: "2026-02-25T09:00:00",
  },
  {
    id: "6",
    title: "HVAC filter replacement",
    description: "Air conditioning filters replaced in all zones.",
    store: "mk",
    priority: "low",
    status: "resolved",
    reportedBy: "Ahmed Hassan",
    reportedAt: "2026-02-24T11:00:00",
  },
];

const priorityConfig = {
  high: { color: "text-red-600", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
  medium: { color: "text-amber-600", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
  low: { color: "text-blue-600", bg: "bg-blue-50 border-blue-200", dot: "bg-blue-500" },
};

const statusConfig = {
  open: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100 text-amber-700" },
  "in-progress": { icon: Clock, color: "text-blue-600", bg: "bg-blue-100 text-blue-700" },
  resolved: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-100 text-emerald-700" },
};

function getStore(id: string) {
  return stores.find((s) => s.id === id)!;
}

export default function Maintenance() {
  const openCount = maintenanceRequests.filter((r) => r.status === "open").length;
  const inProgressCount = maintenanceRequests.filter((r) => r.status === "in-progress").length;
  const resolvedCount = maintenanceRequests.filter((r) => r.status === "resolved").length;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">Maintenance</p>
            <h2 className="text-2xl font-serif text-foreground mt-1">Equipment & Maintenance</h2>
            <p className="text-sm text-muted-foreground mt-1">Track and manage maintenance requests across all stores</p>
          </div>
          <button
            onClick={() => toast("Feature coming soon", { description: "New maintenance request form will be available in the next update." })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#1C1210] transition-colors"
            style={{ background: "#D4A853" }}
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </motion.div>

        {/* Summary */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-3 gap-4">
          {[
            { label: "Open", count: openCount, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
            { label: "In Progress", count: inProgressCount, icon: Clock, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            { label: "Resolved", count: resolvedCount, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
          ].map((item) => (
            <div key={item.label} className={cn("rounded-xl border p-5 flex items-center gap-4", item.bg)}>
              <item.icon className={cn("w-6 h-6", item.color)} />
              <div>
                <p className="text-2xl font-mono font-semibold text-foreground">{item.count}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{item.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Requests List */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
          {maintenanceRequests.map((req) => {
            const store = getStore(req.store);
            const priority = priorityConfig[req.priority];
            const status = statusConfig[req.status];
            const StatusIcon = status.icon;

            return (
              <div
                key={req.id}
                className="bg-card rounded-xl border border-border/60 p-5 hover:shadow-md hover:shadow-[#D4A853]/5 transition-shadow duration-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Wrench className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{req.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{req.description}</p>
                      <div className="flex items-center gap-3 mt-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="w-2 h-2 rounded-full" style={{ background: store.color }} />
                          {store.shortName}
                        </div>
                        <span className="text-xs text-muted-foreground">by {req.reportedBy}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(req.reportedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border", priority.bg)}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", priority.dot)} />
                      {req.priority}
                    </span>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium", status.bg)}>
                      <StatusIcon className="w-3 h-3" />
                      {req.status === "in-progress" ? "In Progress" : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
