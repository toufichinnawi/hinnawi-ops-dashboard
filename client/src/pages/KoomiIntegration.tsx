import { useState } from "react";
import { motion } from "framer-motion";
import {
  Coffee, RefreshCw, CheckCircle2, XCircle, Store, Clock,
  Wifi, WifiOff, ArrowUpDown, Calendar, DollarSign, Users,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
};

const storeColors: Record<string, string> = {
  pk: "#D4A853",
  mk: "#3B82F6",
  tunnel: "#F97316",
};

const storeNames: Record<string, string> = {
  pk: "President Kennedy",
  mk: "Mackay",
  tunnel: "Cathcart (Tunnel)",
};

export default function KoomiIntegration() {
  const [activeTab, setActiveTab] = useState<"status" | "sales" | "labour">("status");
  const [sortField, setSortField] = useState<"date" | "store">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Fetch Koomi stores config
  const storesQuery = trpc.koomi.stores.useQuery();

  // Fetch all Koomi sales data
  const salesQuery = trpc.koomi.allSales.useQuery({ limit: 300 });

  // Test login mutation
  const testLoginMutation = trpc.koomi.testLogin.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Connection Successful", { description: data.message });
      } else {
        toast.error("Connection Failed", { description: data.message });
      }
    },
    onError: (err) => {
      toast.error("Connection Test Failed", { description: err.message });
    },
  });

  // Sync today mutation
  const syncTodayMutation = trpc.koomi.syncToday.useMutation({
    onSuccess: (data) => {
      toast.success("Sync Complete", {
        description: `Synced ${data.storesSynced} stores for ${data.date}`,
      });
      salesQuery.refetch();
    },
    onError: (err) => {
      toast.error("Sync Failed", { description: err.message });
    },
  });

  // Sync multiple days mutation
  const syncDaysMutation = trpc.koomi.syncDays.useMutation({
    onSuccess: (data) => {
      toast.success("Backfill Complete", {
        description: `Synced ${data.recordsSaved} records over ${data.daysBack} days`,
      });
      salesQuery.refetch();
    },
    onError: (err) => {
      toast.error("Backfill Failed", { description: err.message });
    },
  });

  const tabs = [
    { id: "status" as const, label: "Connection Status", icon: Wifi },
    { id: "sales" as const, label: "Sales Data", icon: DollarSign },
    { id: "labour" as const, label: "Labour Data", icon: Users },
  ];

  const salesRows = salesQuery.data ?? [];

  // Sort rows
  const sortedRows = [...salesRows].sort((a, b) => {
    if (sortField === "date") {
      const cmp = a.date.localeCompare(b.date);
      return sortDir === "desc" ? -cmp : cmp;
    }
    const cmp = a.storeId.localeCompare(b.storeId);
    return sortDir === "desc" ? -cmp : cmp;
  });

  const toggleSort = (field: "date" | "store") => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Compute summary stats
  const totalRecords = salesRows.length;
  const uniqueDates = new Set(salesRows.map(r => r.date)).size;
  const latestDate = salesRows.length > 0
    ? salesRows.reduce((latest, r) => r.date > latest ? r.date : latest, salesRows[0].date)
    : "—";
  const totalGross = salesRows.reduce((s, r) => s + r.grossSales, 0);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[#D4A853]/10 flex items-center justify-center">
              <Coffee className="w-5 h-5 text-[#D4A853]" />
            </div>
            <div>
              <h1 className="text-2xl font-serif text-foreground">Koomi POS Integration</h1>
              <p className="text-sm text-muted-foreground">
                Automated scraper for admin.koomi.com — syncs sales and labour data every 5 minutes
              </p>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border/60 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Records</p>
            <p className="text-2xl font-mono font-semibold">{totalRecords}</p>
          </div>
          <div className="bg-card rounded-xl border border-border/60 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Days Covered</p>
            <p className="text-2xl font-mono font-semibold">{uniqueDates}</p>
          </div>
          <div className="bg-card rounded-xl border border-border/60 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Latest Sync</p>
            <p className="text-2xl font-mono font-semibold text-sm">{latestDate}</p>
          </div>
          <div className="bg-card rounded-xl border border-border/60 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Gross Sales</p>
            <p className="text-2xl font-mono font-semibold">${Math.round(totalGross).toLocaleString()}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "status" && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            {/* Connection Status */}
            <div className="bg-card rounded-xl border border-border/60 p-6">
              <h3 className="font-serif text-lg mb-4">Connection Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/40">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Wifi className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">admin.koomi.com</p>
                      <p className="text-xs text-muted-foreground">Hinnawi Bros — Account #52</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" /> Connected
                    </span>
                    <button
                      onClick={() => testLoginMutation.mutate()}
                      disabled={testLoginMutation.isPending}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        "bg-muted hover:bg-muted/80 text-foreground",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <RefreshCw className={cn("w-3 h-3", testLoginMutation.isPending && "animate-spin")} />
                      {testLoginMutation.isPending ? "Testing..." : "Test Login"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Mapping */}
            <div className="bg-card rounded-xl border border-border/60 p-6">
              <h3 className="font-serif text-lg mb-4">Store Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(storesQuery.data ?? []).map(store => (
                  <div
                    key={store.id}
                    className="flex items-center gap-3 p-4 rounded-lg border border-border/40"
                    style={{ borderLeftColor: storeColors[store.id] || "#ccc", borderLeftWidth: 3 }}
                  >
                    <Store className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{store.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ID: {store.id} — Location: {store.koomiId}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Controls */}
            <div className="bg-card rounded-xl border border-border/60 p-6">
              <h3 className="font-serif text-lg mb-4">Sync Controls</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => syncTodayMutation.mutate()}
                  disabled={syncTodayMutation.isPending}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    "bg-[#D4A853] text-white hover:bg-[#C49A48]",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <RefreshCw className={cn("w-4 h-4", syncTodayMutation.isPending && "animate-spin")} />
                  {syncTodayMutation.isPending ? "Syncing..." : "Sync Today"}
                </button>
                <button
                  onClick={() => syncDaysMutation.mutate({ daysBack: 7 })}
                  disabled={syncDaysMutation.isPending}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    "bg-muted hover:bg-muted/80 text-foreground",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  {syncDaysMutation.isPending ? "Syncing..." : "Sync Last 7 Days"}
                </button>
                <button
                  onClick={() => syncDaysMutation.mutate({ daysBack: 30 })}
                  disabled={syncDaysMutation.isPending}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    "bg-muted hover:bg-muted/80 text-foreground",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  <Calendar className="w-4 h-4" />
                  {syncDaysMutation.isPending ? "Syncing..." : "Sync Last 30 Days"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Auto-sync runs every 5 minutes during business hours (7 AM – 8 PM EST), plus at 9 PM and midnight.
              </p>
            </div>
          </motion.div>
        )}

        {activeTab === "sales" && (
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-serif text-lg">Sales Data</h3>
                <p className="text-xs text-muted-foreground">{sortedRows.length} records</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      <th
                        className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => toggleSort("date")}
                      >
                        <span className="flex items-center gap-1">
                          Date <ArrowUpDown className="w-3 h-3" />
                        </span>
                      </th>
                      <th
                        className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => toggleSort("store")}
                      >
                        <span className="flex items-center gap-1">
                          Store <ArrowUpDown className="w-3 h-3" />
                        </span>
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross Sales</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Sales</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Diff</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.slice(0, 100).map((row) => (
                      <tr key={`${row.storeId}-${row.date}`} className="border-b border-border/20 hover:bg-muted/20">
                        <td className="px-4 py-3 font-mono text-xs">{row.date}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: storeColors[row.storeId] || "#999" }}
                            />
                            <span className="text-xs font-medium">{storeNames[row.storeId] || row.storeId}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          ${row.grossSales.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          ${row.netSales.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                          ${(row.grossSales - row.netSales).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sortedRows.length > 100 && (
                <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/40">
                  Showing 100 of {sortedRows.length} records
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === "labour" && (
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <h3 className="font-serif text-lg">Labour Data (from Koomi)</h3>
                <p className="text-xs text-muted-foreground">
                  Today's labour from Koomi — historical from Excel
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-muted/30">
                      <th
                        className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => toggleSort("date")}
                      >
                        <span className="flex items-center gap-1">
                          Date <ArrowUpDown className="w-3 h-3" />
                        </span>
                      </th>
                      <th
                        className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                        onClick={() => toggleSort("store")}
                      >
                        <span className="flex items-center gap-1">
                          Store <ArrowUpDown className="w-3 h-3" />
                        </span>
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Salaries</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Labour %</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRows.slice(0, 100).map((row) => {
                      const isHighLabour = row.labourPercent > 30;
                      return (
                        <tr key={`lab-${row.storeId}-${row.date}`} className="border-b border-border/20 hover:bg-muted/20">
                          <td className="px-4 py-3 font-mono text-xs">{row.date}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: storeColors[row.storeId] || "#999" }}
                              />
                              <span className="text-xs font-medium">{storeNames[row.storeId] || row.storeId}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs">
                            ${row.netSalaries.toFixed(2)}
                          </td>
                          <td className={cn(
                            "px-4 py-3 text-right font-mono text-xs font-medium",
                            isHighLabour ? "text-red-500" : "text-emerald-600"
                          )}>
                            {row.labourPercent}%
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                            ${row.netSales.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {sortedRows.length > 100 && (
                <div className="p-3 text-center text-xs text-muted-foreground border-t border-border/40">
                  Showing 100 of {sortedRows.length} records
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
