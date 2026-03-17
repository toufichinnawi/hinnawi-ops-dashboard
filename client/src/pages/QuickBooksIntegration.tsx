import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Receipt, RefreshCw, CheckCircle2, XCircle, Link2, Unlink,
  DollarSign, Building2, Plus, Settings, ChevronDown, ChevronUp, AlertTriangle,
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

const STORE_OPTIONS = [
  { id: "pk", label: "President Kennedy" },
  { id: "mk", label: "Mackay" },
  { id: "tunnel", label: "Tunnel" },
  { id: "ontario", label: "Ontario" },
];

// Expected company-to-store mapping reference
const EXPECTED_MAPPINGS: { company: string; stores: string[]; description: string }[] = [
  { company: "9287-8982 Quebec Inc", stores: ["ontario"], description: "Ontario Store" },
  { company: "9364-1009 Quebec INC", stores: ["tunnel"], description: "Tunnel Store" },
  { company: "9427-0659 Quebec Inc", stores: ["pk", "mk"], description: "President Kennedy + Mackay" },
];

export default function QuickBooksIntegration() {
  const [activeTab, setActiveTab] = useState<"connections" | "cogs">("connections");
  const [syncStartDate, setSyncStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [syncEndDate, setSyncEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [expandedConnection, setExpandedConnection] = useState<number | null>(null);

  // Fetch all QBO connections
  const connectionsQuery = trpc.quickbooks.connections.useQuery();

  // Fetch all COGS data
  const cogsQuery = trpc.quickbooks.allCogs.useQuery();

  // Update store mapping mutation
  const updateStoreMappingMutation = trpc.quickbooks.updateStoreMapping.useMutation({
    onSuccess: () => {
      toast.success("Store mapping updated");
      connectionsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error("Failed to update mapping", { description: err.message });
    },
  });

  // Sync COGS mutation
  const syncCogsMutation = trpc.quickbooks.syncCogs.useMutation({
    onSuccess: (data: any) => {
      if (data.success) {
        toast.success("COGS Sync Complete", {
          description: `Synced ${data.totalLocationsSynced} locations across ${data.companies.length} companies`,
        });
      } else {
        toast.error("COGS Sync had errors", {
          description: data.companies.map((c: any) => c.error).filter(Boolean).join("; "),
        });
      }
      cogsQuery.refetch();
      connectionsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error("COGS Sync Failed", { description: err.message });
    },
  });

  // Disconnect mutation
  const disconnectMutation = trpc.quickbooks.disconnect.useMutation({
    onSuccess: () => {
      toast.success("QuickBooks Company Disconnected");
      connectionsQuery.refetch();
    },
    onError: (err: any) => {
      toast.error("Disconnect Failed", { description: err.message });
    },
  });

  const connections = connectionsQuery.data ?? [];
  const hasConnections = connections.length > 0;
  const connectedCount = connections.filter((c: any) => c.connected).length;

  // Sort COGS data
  const sortedCogs = useMemo(() => {
    const data = cogsQuery.data ?? [];
    return [...data].sort((a: any, b: any) => {
      const dateA = a.periodEnd ?? "";
      const dateB = b.periodEnd ?? "";
      return dateB.localeCompare(dateA);
    });
  }, [cogsQuery.data]);

  const handleConnect = () => {
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
              Connect 3 QuickBooks companies to pull COGS data for all 4 stores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              connectedCount === 3 ? "bg-green-100 text-green-700" :
              connectedCount > 0 ? "bg-amber-100 text-amber-700" :
              "bg-gray-100 text-gray-500"
            )}>
              {connectedCount}/3 Companies Connected
            </span>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
          {(["connections", "cogs"] as const).map((tab) => (
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
              {tab === "connections" ? "Connections" : "COGS Data"}
            </button>
          ))}
        </div>

        {/* Connections Tab */}
        {activeTab === "connections" && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            {/* Expected Companies Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Required QuickBooks Companies
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {EXPECTED_MAPPINGS.map((mapping) => {
                  const isConnected = connections.some((c: any) =>
                    c.companyName?.toLowerCase().includes(mapping.company.split(" ")[0].toLowerCase()) && c.connected
                  );
                  return (
                    <div key={mapping.company} className={cn(
                      "rounded-lg p-3 border",
                      isConnected ? "bg-green-50 border-green-200" : "bg-white border-blue-100"
                    )}>
                      <div className="flex items-center gap-2 mb-1">
                        {isConnected ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-gray-300 flex-shrink-0" />
                        )}
                        <span className="text-xs font-medium text-blue-900 truncate">{mapping.company}</span>
                      </div>
                      <p className="text-xs text-blue-600 ml-6">{mapping.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Connected Companies */}
            {connectionsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground p-6">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading connections...
              </div>
            ) : (
              <div className="space-y-4">
                {connections.map((conn: any) => (
                  <CompanyConnectionCard
                    key={conn.id}
                    connection={conn}
                    isExpanded={expandedConnection === conn.id}
                    onToggleExpand={() => setExpandedConnection(
                      expandedConnection === conn.id ? null : conn.id
                    )}
                    onDisconnect={() => disconnectMutation.mutate({ connectionId: conn.id })}
                    onUpdateMapping={(stores: string[]) => updateStoreMappingMutation.mutate({
                      connectionId: conn.id,
                      storeMapping: stores,
                    })}
                    isDisconnecting={disconnectMutation.isPending}
                    isUpdatingMapping={updateStoreMappingMutation.isPending}
                  />
                ))}

                {/* Connect Another Company Button */}
                <button
                  onClick={handleConnect}
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl border-2 border-dashed border-[#2CA01C]/30 text-[#2CA01C] hover:bg-[#2CA01C]/5 hover:border-[#2CA01C]/50 transition-all text-sm font-medium"
                >
                  <Plus className="w-5 h-5" />
                  {hasConnections ? "Connect Another QuickBooks Company" : "Connect to QuickBooks"}
                </button>

                {!hasConnections && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>How it works:</strong> Click "Connect to QuickBooks" to authorize
                      read-only access to a QuickBooks Online company. You'll need to connect all 3
                      companies separately. Each connection pulls Profit & Loss data by Location to
                      extract COGS for the mapped stores. Your credentials are never stored — we use
                      secure OAuth2 tokens that can be revoked at any time.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Sync Controls (when at least one connected) */}
            {hasConnections && (
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-2">Sync COGS Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Pull Profit & Loss data from all connected QuickBooks companies for the selected date range.
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
                    {syncCogsMutation.isPending ? "Syncing All Companies..." : `Sync All ${connectedCount} Companies`}
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

                {/* Sync results */}
                {syncCogsMutation.data && (
                  <div className="mt-4 space-y-2">
                    {(syncCogsMutation.data as any).companies?.map((result: any, i: number) => (
                      <div key={i} className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                        result.error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                      )}>
                        {result.error ? (
                          <XCircle className="w-4 h-4 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        )}
                        <span className="font-medium">{result.company}:</span>
                        {result.error ? (
                          <span>{result.error}</span>
                        ) : (
                          <span>{result.locationsSynced} locations synced</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* COGS Data Tab */}
        {activeTab === "cogs" && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            {!hasConnections ? (
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
                  No COGS data yet. Use the Connections tab to sync data from QuickBooks.
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
                      {sortedCogs.map((row: any, i: number) => (
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

// ─── Company Connection Card Component ───

interface ConnectionCardProps {
  connection: {
    id: number;
    connected: boolean;
    companyName: string | null;
    realmId: string;
    storeMapping: string[];
    lastSyncAt: Date | string | null;
    lastSyncSuccess: boolean | null;
    accessTokenExpired: boolean;
    refreshTokenExpired: boolean;
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDisconnect: () => void;
  onUpdateMapping: (stores: string[]) => void;
  isDisconnecting: boolean;
  isUpdatingMapping: boolean;
}

function CompanyConnectionCard({
  connection,
  isExpanded,
  onToggleExpand,
  onDisconnect,
  onUpdateMapping,
  isDisconnecting,
  isUpdatingMapping,
}: ConnectionCardProps) {
  const [editingMapping, setEditingMapping] = useState(false);
  const [selectedStores, setSelectedStores] = useState<string[]>(connection.storeMapping);

  const handleSaveMapping = () => {
    onUpdateMapping(selectedStores);
    setEditingMapping(false);
  };

  const storeLabels = connection.storeMapping
    .map(id => STORE_OPTIONS.find(s => s.id === id)?.label ?? id)
    .join(", ");

  return (
    <div className={cn(
      "bg-card border rounded-xl overflow-hidden transition-all",
      connection.connected ? "border-green-200" : "border-red-200",
    )}>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center",
            connection.connected ? "bg-green-100" : "bg-red-100"
          )}>
            {connection.connected ? (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-500" />
            )}
          </div>
          <div>
            <p className="font-medium text-sm">
              {connection.companyName ?? "QuickBooks Company"}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-muted-foreground font-mono">
                Realm: {connection.realmId}
              </span>
              {storeLabels && (
                <>
                  <span className="text-xs text-muted-foreground">|</span>
                  <span className="text-xs text-[#D4A853] font-medium">
                    {storeLabels}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {connection.refreshTokenExpired && (
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-medium">
              Token Expired
            </span>
          )}
          {connection.connected && !connection.refreshTokenExpired && (
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-600 text-xs font-medium">
              Active
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border p-4 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Company ID</p>
              <p className="text-sm font-mono truncate">{connection.realmId}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Last Sync</p>
              <p className="text-sm">
                {connection.lastSyncAt
                  ? new Date(connection.lastSyncAt as string).toLocaleString()
                  : "Never"}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Last Sync Status</p>
              <p className="text-sm flex items-center gap-1">
                {connection.lastSyncSuccess === true ? (
                  <><CheckCircle2 className="w-3 h-3 text-green-500" /> Success</>
                ) : connection.lastSyncSuccess === false ? (
                  <><XCircle className="w-3 h-3 text-red-500" /> Failed</>
                ) : (
                  "N/A"
                )}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Access Token</p>
              <p className="text-sm">
                {connection.accessTokenExpired ? (
                  <span className="text-amber-600">Expired (auto-refresh)</span>
                ) : (
                  <span className="text-green-600">Active</span>
                )}
              </p>
            </div>
          </div>

          {/* Store Mapping */}
          <div className="bg-muted/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Store Mapping
              </h4>
              {!editingMapping && (
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingMapping(true); setSelectedStores(connection.storeMapping); }}
                  className="text-xs text-[#D4A853] hover:underline"
                >
                  Edit
                </button>
              )}
            </div>

            {editingMapping ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Select which stores this QuickBooks company covers:
                </p>
                <div className="flex flex-wrap gap-2">
                  {STORE_OPTIONS.map((store) => (
                    <button
                      key={store.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStores(prev =>
                          prev.includes(store.id)
                            ? prev.filter(s => s !== store.id)
                            : [...prev, store.id]
                        );
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                        selectedStores.includes(store.id)
                          ? "bg-[#D4A853] text-[#1C1210] border-[#D4A853]"
                          : "bg-white text-muted-foreground border-border hover:border-[#D4A853]/50"
                      )}
                    >
                      {store.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSaveMapping(); }}
                    disabled={isUpdatingMapping}
                    className="px-3 py-1.5 rounded-md bg-[#D4A853] text-[#1C1210] text-xs font-medium hover:bg-[#c49a48] transition-colors"
                  >
                    {isUpdatingMapping ? "Saving..." : "Save Mapping"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingMapping(false); }}
                    className="px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connection.storeMapping.length > 0 ? (
                  connection.storeMapping.map(storeId => (
                    <span key={storeId} className="px-3 py-1 rounded-full bg-[#D4A853]/10 text-[#D4A853] text-xs font-medium border border-[#D4A853]/20">
                      {STORE_OPTIONS.find(s => s.id === storeId)?.label ?? storeId}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    No stores mapped — click Edit to assign stores
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onDisconnect(); }}
              disabled={isDisconnecting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
            >
              <Unlink className="w-4 h-4" />
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
            {connection.refreshTokenExpired && (
              <button
                onClick={(e) => { e.stopPropagation(); window.location.href = "/api/quickbooks/connect"; }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2CA01C] text-white hover:bg-[#248a17] transition-colors text-sm font-medium"
              >
                <Link2 className="w-4 h-4" />
                Reconnect
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
