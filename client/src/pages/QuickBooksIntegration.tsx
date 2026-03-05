import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Receipt, RefreshCw, CheckCircle2, XCircle, Link2, Unlink,
  Calendar, DollarSign, TrendingDown, ArrowUpDown, ExternalLink,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
};

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function QuickBooksIntegration() {
  const [activeTab, setActiveTab] = useState<"status" | "cogs">("status");
  const [syncStartDate, setSyncStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First of current month
    return d.toISOString().split("T")[0];
  });
  const [syncEndDate, setSyncEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Fetch QBO connection status
  const statusQuery = trpc.quickbooks.status.useQuery();

  // Fetch all COGS data
  const cogsQuery = trpc.quickbooks.allCogs.useQuery();

  // Sync COGS mutation
  const syncCogsMutation = trpc.quickbooks.syncCogs.useMutation({
    onSuccess: (data) => {
      toast.success("COGS Sync Complete", {
        description: `Synced ${data.locationsSynced} locations`,
      });
      cogsQuery.refetch();
      statusQuery.refetch();
    },
    onError: (err) => {
      toast.error("COGS Sync Failed", { description: err.message });
    },
  });

  // Disconnect mutation
  const disconnectMutation = trpc.quickbooks.disconnect.useMutation({
    onSuccess: () => {
      toast.success("QuickBooks Disconnected");
      statusQuery.refetch();
    },
    onError: (err) => {
      toast.error("Disconnect Failed", { description: err.message });
    },
  });

  const status = statusQuery.data;
  const isConnected = status?.connected === true;

  // Sort COGS data
  const sortedCogs = useMemo(() => {
    const data = cogsQuery.data ?? [];
    return [...data].sort((a, b) => {
      const dateA = a.periodEnd ?? "";
      const dateB = b.periodEnd ?? "";
      return dateB.localeCompare(dateA);
    });
  }, [cogsQuery.data]);

  const handleConnect = () => {
    // Redirect to QBO OAuth flow
    window.location.href = "/api/quickbooks/connect";
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-2xl font-serif text-foreground flex items-center gap-3">
              <Receipt className="w-7 h-7 text-[#2CA01C]" />
              QuickBooks Online
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect to QuickBooks to pull Cost of Goods Sold (COGS) data by location
            </p>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
          {(["status", "cogs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeTab === tab
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab === "status" ? "Connection" : "COGS Data"}
            </button>
          ))}
        </div>

        {/* Connection Tab */}
        {activeTab === "status" && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            {/* Connection Status Card */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Connection Status</h3>

              {statusQuery.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Checking connection...
                </div>
              ) : isConnected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-700">Connected</p>
                      <p className="text-sm text-muted-foreground">
                        {status?.companyName ?? "QuickBooks Company"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Company ID</p>
                      <p className="text-sm font-mono">{status?.realmId}</p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Last Sync</p>
                      <p className="text-sm">
                        {status?.lastSyncAt
                          ? new Date(status.lastSyncAt).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Last Sync Status</p>
                      <p className="text-sm flex items-center gap-1">
                        {status?.lastSyncSuccess === true ? (
                          <><CheckCircle2 className="w-3 h-3 text-green-500" /> Success</>
                        ) : status?.lastSyncSuccess === false ? (
                          <><XCircle className="w-3 h-3 text-red-500" /> Failed</>
                        ) : (
                          "N/A"
                        )}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Access Token</p>
                      <p className="text-sm">
                        {status?.accessTokenExpired ? (
                          <span className="text-amber-600">Expired (will auto-refresh)</span>
                        ) : (
                          <span className="text-green-600">Active</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => disconnectMutation.mutate()}
                      disabled={disconnectMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                      <Unlink className="w-4 h-4" />
                      {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-muted-foreground">Not Connected</p>
                      <p className="text-sm text-muted-foreground">
                        Connect to QuickBooks to pull COGS data
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleConnect}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#2CA01C] text-white hover:bg-[#248a17] transition-colors text-sm font-medium shadow-sm"
                  >
                    <Link2 className="w-4 h-4" />
                    Connect to QuickBooks
                  </button>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-blue-800">
                      <strong>How it works:</strong> Click "Connect to QuickBooks" to authorize
                      read-only access to your QuickBooks Online account. We'll pull your Profit & Loss
                      report by Location to extract COGS data for each store. Your credentials are never
                      stored — we use secure OAuth2 tokens that can be revoked at any time.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Sync Controls (only when connected) */}
            {isConnected && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Sync COGS Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Pull Profit & Loss data from QuickBooks for the selected date range.
                  COGS will be extracted per location and stored in your dashboard.
                </p>

                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={syncStartDate}
                      onChange={(e) => setSyncStartDate(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">End Date</label>
                    <input
                      type="date"
                      value={syncEndDate}
                      onChange={(e) => setSyncEndDate(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
                    />
                  </div>
                  <button
                    onClick={() =>
                      syncCogsMutation.mutate({
                        startDate: syncStartDate,
                        endDate: syncEndDate,
                      })
                    }
                    disabled={syncCogsMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A853] text-[#1C1210] hover:bg-[#c49a48] transition-colors text-sm font-medium"
                  >
                    <RefreshCw className={cn("w-4 h-4", syncCogsMutation.isPending && "animate-spin")} />
                    {syncCogsMutation.isPending ? "Syncing..." : "Sync COGS"}
                  </button>
                </div>

                {/* Quick sync buttons */}
                <div className="flex gap-2 mt-3">
                  {[
                    { label: "This Month", days: 0 },
                    { label: "Last Month", days: -1 },
                    { label: "Last 3 Months", days: -3 },
                  ].map(({ label, days }) => (
                    <button
                      key={label}
                      onClick={() => {
                        const now = new Date();
                        let start: Date, end: Date;
                        if (days === 0) {
                          start = new Date(now.getFullYear(), now.getMonth(), 1);
                          end = now;
                        } else if (days === -1) {
                          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                          end = new Date(now.getFullYear(), now.getMonth(), 0);
                        } else {
                          start = new Date(now.getFullYear(), now.getMonth() + days, 1);
                          end = now;
                        }
                        setSyncStartDate(start.toISOString().split("T")[0]);
                        setSyncEndDate(end.toISOString().split("T")[0]);
                      }}
                      className="px-3 py-1.5 rounded-md bg-muted/50 text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* COGS Data Tab */}
        {activeTab === "cogs" && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            {!isConnected ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Connect to QuickBooks to view COGS data
                </p>
              </div>
            ) : sortedCogs.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-8 text-center">
                <DollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No COGS data yet. Use the Connection tab to sync data from QuickBooks.
                </p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold">COGS by Location & Period</h3>
                  <span className="text-xs text-muted-foreground">
                    {sortedCogs.length} records
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Store</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Period</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Revenue</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">COGS</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">COGS %</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Gross Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedCogs.map((row, i) => (
                        <tr
                          key={`${row.storeId}-${row.periodStart}-${i}`}
                          className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium">{row.storeName || row.storeId}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {row.periodStart} — {row.periodEnd}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            ${fmt(Number(row.revenue) || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-red-600">
                            ${fmt(Number(row.cogsAmount) || 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {(Number(row.cogsPercent) || 0).toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-green-600">
                            ${fmt(Number(row.grossProfit) || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
