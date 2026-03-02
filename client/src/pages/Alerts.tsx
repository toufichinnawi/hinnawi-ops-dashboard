// Design: "Golden Hour Operations" — Refined Editorial
// Alerts: Centralized alert feed with filtering
import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, XCircle, Bell, Filter } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { stores, teamsChannels } from "@/lib/data";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const alertConfig = {
  critical: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", badge: "bg-red-100 text-red-700" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700" },
  info: { icon: Clock, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-700" },
  success: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
};

function getStore(id: string) {
  return stores.find((s) => s.id === id)!;
}

export default function Alerts() {
  const { alerts } = useData();
  const [filterType, setFilterType] = useState<string>("all");

  const filtered = filterType === "all" ? alerts : alerts.filter((a) => a.type === filterType);

  const counts = {
    critical: alerts.filter((a) => a.type === "critical").length,
    warning: alerts.filter((a) => a.type === "warning").length,
    info: alerts.filter((a) => a.type === "info").length,
    success: alerts.filter((a) => a.type === "success").length,
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">Notifications</p>
          <h2 className="text-2xl font-serif text-foreground mt-1">Alerts & Notifications</h2>
          <p className="text-sm text-muted-foreground mt-1">Operational alerts and Teams channel activity</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Alert Type Summary */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-4 gap-3">
              {(["critical", "warning", "info", "success"] as const).map((type) => {
                const config = alertConfig[type];
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(filterType === type ? "all" : type)}
                    className={cn(
                      "rounded-xl border p-4 text-center transition-all",
                      filterType === type ? "ring-2 ring-[#D4A853] shadow-md" : "",
                      config.bg
                    )}
                  >
                    <Icon className={cn("w-5 h-5 mx-auto", config.color)} />
                    <p className="text-xl font-mono font-semibold text-foreground mt-1">{counts[type]}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5 capitalize">{type}</p>
                  </button>
                );
              })}
            </motion.div>

            {/* Alert List */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-lg text-foreground">
                  {filterType === "all" ? "All Alerts" : `${filterType.charAt(0).toUpperCase() + filterType.slice(1)} Alerts`}
                </h3>
                {filterType !== "all" && (
                  <button onClick={() => setFilterType("all")} className="text-xs text-[#D4A853] hover:underline">
                    Show all
                  </button>
                )}
              </div>

              {filtered.map((alert, i) => {
                const config = alertConfig[alert.type];
                const Icon = config.icon;
                const store = getStore(alert.store);

                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn("rounded-xl border p-4 flex items-start gap-3", config.bg)}
                  >
                    <div className="mt-0.5 shrink-0">
                      <Icon className={cn("w-5 h-5", config.color)} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground leading-relaxed">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <div className="w-2 h-2 rounded-full" style={{ background: store.color }} />
                          {store.name}
                        </div>
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(alert.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    <span className={cn("shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize", config.badge)}>
                      {alert.type}
                    </span>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* Teams Channels Sidebar */}
          <div className="space-y-6">
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#464EB8]/10 flex items-center justify-center">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#464EB8">
                    <path d="M19.35 8.04C19.66 7.59 19.84 7.06 19.84 6.5C19.84 5.12 18.72 4 17.34 4C16.5 4 15.76 4.42 15.31 5.05C14.79 4.72 14.17 4.53 13.5 4.53C11.57 4.53 10 6.1 10 8.03V8.06C7.24 8.56 5.14 11 5.14 13.95C5.14 17.28 7.86 20 11.19 20H17.81C20.12 20 22 18.12 22 15.81C22 13.8 20.58 12.12 18.69 11.72C19.15 11.08 19.42 10.3 19.42 9.47C19.42 8.95 19.31 8.46 19.11 8.01L19.35 8.04Z" />
                  </svg>
                </div>
                <h3 className="font-serif text-base text-foreground">Teams Channels</h3>
              </div>
              <div className="space-y-1.5">
                {teamsChannels.map((channel) => (
                  <div
                    key={channel.name}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        channel.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"
                      )} />
                      <span className="text-xs text-foreground">{channel.name}</span>
                    </div>
                    {channel.messages > 0 && (
                      <span className="text-[10px] font-mono font-medium bg-[#D4A853]/15 text-[#D4A853] px-1.5 py-0.5 rounded-full">
                        {channel.messages}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Sync Status */}
            <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
              <h3 className="font-serif text-base text-foreground mb-3">Sync Status</h3>
              <div className="space-y-3">
                {[
                  { label: "MYR POS → Teams", status: "active", lastSync: "10:30 AM" },
                  { label: "MS Forms → Teams", status: "active", lastSync: "10:28 AM" },
                  { label: "Power Automate", status: "active", lastSync: "10:25 AM" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs text-foreground">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground">{item.lastSync}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
