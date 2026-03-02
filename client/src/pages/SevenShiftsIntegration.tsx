import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock, Plus, RefreshCw, Trash2, CheckCircle2, XCircle,
  Store, Zap, AlertTriangle, Wifi, WifiOff, DollarSign, Users,
  Building2, MapPin,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
};

export default function SevenShiftsIntegration() {
  const [activeTab, setActiveTab] = useState<"connections" | "sales">("connections");
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ id: number; name: string } | null>(null);
  const [storeName, setStoreName] = useState("");
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncAllLoading, setSyncAllLoading] = useState(false);

  const connections = trpc.sevenShifts.connections.useQuery();
  const salesData = trpc.sevenShifts.salesData.useQuery();
  const companies = trpc.sevenShifts.companies.useQuery(undefined, { enabled: showAddForm });
  const locations = trpc.sevenShifts.locations.useQuery(
    { companyId: selectedCompanyId! },
    { enabled: !!selectedCompanyId }
  );

  const connectMutation = trpc.sevenShifts.connect.useMutation({
    onSuccess: () => {
      connections.refetch();
      setShowAddForm(false);
      setSelectedCompanyId(null);
      setSelectedLocation(null);
      setStoreName("");
    },
  });

  const disconnectMutation = trpc.sevenShifts.disconnect.useMutation({
    onSuccess: () => connections.refetch(),
  });

  const syncStoreMutation = trpc.sevenShifts.syncStore.useMutation({
    onSuccess: () => {
      connections.refetch();
      salesData.refetch();
      setSyncingId(null);
    },
    onError: () => setSyncingId(null),
  });

  const syncAllMutation = trpc.sevenShifts.syncAll.useMutation({
    onSuccess: () => {
      connections.refetch();
      salesData.refetch();
      setSyncAllLoading(false);
    },
    onError: () => setSyncAllLoading(false),
  });

  const tabs = [
    { id: "connections" as const, label: "Store Connections", icon: Store },
    { id: "sales" as const, label: "Sales & Labour Data", icon: DollarSign },
  ];

  const handleConnect = () => {
    if (!selectedLocation || !selectedCompanyId || !storeName) return;
    const company = companies.data?.find(c => c.id === selectedCompanyId);
    connectMutation.mutate({
      storeName,
      companyId: selectedCompanyId,
      companyName: company?.name || "",
      locationId: selectedLocation.id,
      locationName: selectedLocation.name,
    });
  };

  const handleSync = (connectionId: number) => {
    setSyncingId(connectionId);
    syncStoreMutation.mutate({ connectionId });
  };

  const handleSyncAll = () => {
    setSyncAllLoading(true);
    syncAllMutation.mutate({});
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-6 h-6 text-[#D4A853]" />
            <h1 className="text-2xl font-serif text-foreground">7shifts Integration</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Connect your 7shifts locations to pull live sales and labour data — including Lightspeed Ontario
          </p>
        </motion.div>

        {/* Info Banner */}
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="bg-[#D4A853]/5 border border-[#D4A853]/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#D4A853] mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-2">How 7shifts Integration Works</h3>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Your 7shifts access token is already configured</li>
                <li>Click <strong>"Connect Location"</strong> to select a company and location</li>
                <li>Click <strong>"Sync"</strong> to pull 60 days of sales and labour data</li>
                <li>Ontario (Lightspeed) data will appear alongside your Clover stores on the dashboard</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                7shifts provides both <strong>sales and labour data</strong> in one sync — including labour cost, overtime, and labour %.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.id
                  ? "border-[#D4A853] text-[#D4A853]"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Connections Tab */}
        {activeTab === "connections" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-serif text-foreground">Store Connections</h2>
              <div className="flex gap-2">
                {(connections.data?.length ?? 0) > 0 && (
                  <button
                    onClick={handleSyncAll}
                    disabled={syncAllLoading}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn("w-4 h-4", syncAllLoading && "animate-spin")} />
                    Sync All
                  </button>
                )}
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-[#1C1210] transition-colors"
                  style={{ background: "#D4A853" }}
                >
                  <Plus className="w-4 h-4" />
                  Connect Location
                </button>
              </div>
            </div>

            {/* Add Connection Form */}
            {showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-foreground text-sm">Connect a 7shifts Location</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Company Select */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Company</label>
                    {companies.isLoading ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Loading companies...</div>
                    ) : (
                      <select
                        value={selectedCompanyId ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const numVal = Number(val) || null;
                          console.log('[7shifts UI] Company selected:', val, 'parsed:', numVal);
                          setSelectedCompanyId(numVal);
                          setSelectedLocation(null);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/30"
                      >
                        <option value="">Select a company</option>
                        {companies.data?.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Location Select */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Location</label>
                    {!selectedCompanyId ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground border border-border rounded-lg bg-muted/30">Select a company first</div>
                    ) : locations.isLoading ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">Loading locations...</div>
                    ) : (
                      <select
                        value={selectedLocation?.id ?? ""}
                        onChange={(e) => {
                          const loc = locations.data?.find(l => l.id === Number(e.target.value));
                          setSelectedLocation(loc ? { id: loc.id, name: loc.name } : null);
                          if (loc && !storeName) setStoreName(loc.name);
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/30"
                      >
                        <option value="">Select a location</option>
                        {locations.data?.map((l) => (
                          <option key={l.id} value={l.id}>{l.name} — {l.city}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Store Name */}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Display Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Hinnawi - Ontario"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/30"
                    />
                  </div>
                </div>

                {connectMutation.error && (
                  <div className="flex items-center gap-2 text-sm text-red-500">
                    <AlertTriangle className="w-4 h-4" />
                    {connectMutation.error.message}
                  </div>
                )}

                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowAddForm(false); setSelectedCompanyId(null); setSelectedLocation(null); setStoreName(""); }}
                    className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={connectMutation.isPending || !selectedLocation || !storeName}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-[#1C1210] transition-colors disabled:opacity-50"
                    style={{ background: "#D4A853" }}
                  >
                    {connectMutation.isPending ? "Connecting..." : "Connect"}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Connection Cards */}
            {connections.isLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading connections...</div>
            ) : (connections.data?.length ?? 0) === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No 7shifts locations connected yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Connect Location" to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.data?.map((conn) => (
                  <motion.div key={conn.id} variants={fadeUp} initial="hidden" animate="show"
                    className="bg-card border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{conn.storeName}</h3>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{conn.locationName}</span>
                            <span className="text-muted-foreground/40">|</span>
                            <span>{conn.companyName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {conn.isActive ? (
                          <Wifi className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <WifiOff className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Sync Status */}
                    <div className="flex items-center gap-2 text-xs">
                      {conn.lastSyncAt ? (
                        <>
                          {conn.lastSyncSuccess ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span className="text-muted-foreground">
                            Last sync: {new Date(conn.lastSyncAt).toLocaleString()} —{" "}
                            <span className={conn.lastSyncSuccess ? "text-emerald-500" : "text-red-500"}>
                              {conn.lastSyncSuccess ? "Success" : "Failed"}
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Never synced — click Sync to pull data</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleSync(conn.id)}
                        disabled={syncingId === conn.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", syncingId === conn.id && "animate-spin")} />
                        {syncingId === conn.id ? "Syncing..." : "Sync"}
                      </button>
                      <button
                        onClick={() => disconnectMutation.mutate({ id: conn.id })}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sales & Labour Data Tab */}
        {activeTab === "sales" && (
          <div className="space-y-4">
            <h2 className="text-lg font-serif text-foreground">Sales & Labour Data</h2>
            {salesData.isLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading data...</div>
            ) : !salesData.data?.length ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <DollarSign className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No sales data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Connect a location and sync to see data here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">Sales</th>
                      <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">Projected</th>
                      <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">Labour Cost</th>
                      <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">Labour %</th>
                      <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">OT Mins</th>
                      <th className="text-right py-3 px-3 text-xs font-medium text-muted-foreground">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.data.map((row, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs">{row.date}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ${row.totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                          ${row.projectedSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          ${row.labourCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={cn(
                            "font-mono",
                            row.labourPercent > 0.35 ? "text-red-500" :
                            row.labourPercent > 0.25 ? "text-amber-500" : "text-emerald-500"
                          )}>
                            {(row.labourPercent * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {row.overtimeMinutes > 0 ? (
                            <span className="text-amber-500">{row.overtimeMinutes}</span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{row.orderCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
