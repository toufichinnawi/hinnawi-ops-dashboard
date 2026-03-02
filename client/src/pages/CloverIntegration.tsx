import { useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Plus, RefreshCw, Trash2, CheckCircle2, XCircle,
  Store, Clock, Zap, AlertTriangle, Wifi, WifiOff, ArrowRight,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
};

export default function CloverIntegration() {
  const [activeTab, setActiveTab] = useState<"connections" | "sales" | "labour">("connections");
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ storeName: "", merchantId: "", accessToken: "" });
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncAllLoading, setSyncAllLoading] = useState(false);

  const connections = trpc.clover.connections.useQuery();
  const salesData = trpc.clover.salesData.useQuery();
  const shiftData = trpc.clover.shiftData.useQuery();

  const connectMutation = trpc.clover.connectManual.useMutation({
    onSuccess: () => {
      connections.refetch();
      setShowAddForm(false);
      setFormData({ storeName: "", merchantId: "", accessToken: "" });
    },
  });

  const disconnectMutation = trpc.clover.disconnect.useMutation({
    onSuccess: () => connections.refetch(),
  });

  const syncStoreMutation = trpc.clover.syncStore.useMutation({
    onSuccess: () => {
      connections.refetch();
      salesData.refetch();
      shiftData.refetch();
      setSyncingId(null);
    },
    onError: () => setSyncingId(null),
  });

  const syncAllMutation = trpc.clover.syncAll.useMutation({
    onSuccess: () => {
      connections.refetch();
      salesData.refetch();
      shiftData.refetch();
      setSyncAllLoading(false);
    },
    onError: () => setSyncAllLoading(false),
  });

  const tabs = [
    { id: "connections" as const, label: "Store Connections", icon: Store },
    { id: "sales" as const, label: "Sales Data", icon: CreditCard },
    { id: "labour" as const, label: "Labour Data", icon: Clock },
  ];

  const handleConnect = () => {
    if (!formData.storeName || !formData.merchantId || !formData.accessToken) return;
    connectMutation.mutate(formData);
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
            <CreditCard className="w-6 h-6 text-[#D4A853]" />
            <h1 className="text-2xl font-serif text-foreground">Clover POS Integration</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Connect your Clover POS devices to pull live sales and labour data from all 4 stores
          </p>
        </motion.div>

        {/* How to Connect Guide */}
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="bg-[#D4A853]/5 border border-[#D4A853]/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-[#D4A853] mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-2">How to Connect Your Clover Store</h3>
              <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
                <li>Log into your <strong>Clover Dashboard</strong> at <a href="https://www.clover.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-[#D4A853] underline">clover.com/dashboard</a></li>
                <li>Look at the URL — it contains your <strong>Merchant ID</strong> (13-character code like <code className="bg-muted px-1 rounded text-xs">ABC1234DEF567</code>)</li>
                <li>Go to <strong>Account & Setup → API Tokens</strong> to create or copy your API token</li>
                <li>Enter your store name, Merchant ID, and API token below</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Repeat for each of your 4 stores. Data will sync automatically once connected.
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
                  Connect Store
                </button>
              </div>
            </div>

            {/* Add Connection Form */}
            {showAddForm && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="bg-card border border-border rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-foreground text-sm">Connect a New Clover Store</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Store Name</label>
                    <input
                      type="text"
                      placeholder="e.g., Hinnawi - St-Laurent"
                      value={formData.storeName}
                      onChange={(e) => setFormData(d => ({ ...d, storeName: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Merchant ID</label>
                    <input
                      type="text"
                      placeholder="e.g., ABC1234DEF567"
                      value={formData.merchantId}
                      onChange={(e) => setFormData(d => ({ ...d, merchantId: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">API Token</label>
                    <input
                      type="password"
                      placeholder="Paste your API token"
                      value={formData.accessToken}
                      onChange={(e) => setFormData(d => ({ ...d, accessToken: e.target.value }))}
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
                    onClick={() => { setShowAddForm(false); setFormData({ storeName: "", merchantId: "", accessToken: "" }); }}
                    className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={connectMutation.isPending || !formData.storeName || !formData.merchantId || !formData.accessToken}
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
                <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No Clover stores connected yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Connect Store" to get started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {connections.data?.map((conn) => (
                  <motion.div key={conn.id} variants={fadeUp} initial="hidden" animate="show"
                    className="bg-card border border-border rounded-xl p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          conn.isActive ? "bg-emerald-500/10" : "bg-muted"
                        )}>
                          {conn.isActive ? <Wifi className="w-5 h-5 text-emerald-500" /> : <WifiOff className="w-5 h-5 text-muted-foreground" />}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-sm">{conn.storeName}</h3>
                          <p className="text-xs text-muted-foreground font-mono">{conn.merchantId}</p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider",
                        conn.isActive ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                      )}>
                        {conn.isActive ? "Connected" : "Disabled"}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Last sync: {conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never"}
                      </span>
                      {conn.lastSyncSuccess !== null && (
                        <span className="flex items-center gap-1">
                          {conn.lastSyncSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                          {conn.lastSyncSuccess ? "Success" : "Failed"}
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleSync(conn.id)}
                        disabled={syncingId === conn.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#D4A853]/10 text-[#D4A853] hover:bg-[#D4A853]/20 transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={cn("w-3 h-3", syncingId === conn.id && "animate-spin")} />
                        {syncingId === conn.id ? "Syncing..." : "Sync Now"}
                      </button>
                      <button
                        onClick={() => { if (confirm(`Disconnect ${conn.storeName}?`)) disconnectMutation.mutate({ id: conn.id }); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Disconnect
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sales Data Tab */}
        {activeTab === "sales" && (
          <div className="space-y-4">
            <h2 className="text-lg font-serif text-foreground">Sales Data from Clover</h2>
            {salesData.isLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading sales data...</div>
            ) : (salesData.data?.length ?? 0) === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <CreditCard className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No sales data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Connect a store and sync to see sales data</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Store</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Net Sales</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tips</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tax</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Orders</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Refunds</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.data?.map((row, i) => {
                        const conn = connections.data?.find(c => c.merchantId === row.merchantId);
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 font-mono text-xs">{row.date}</td>
                            <td className="px-4 py-2.5 text-foreground">{conn?.storeName || row.merchantId}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">${row.netSales.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">${row.totalTips.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">${row.totalTax.toFixed(2)}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{row.orderCount}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-red-400">${row.refundAmount.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Labour Data Tab */}
        {activeTab === "labour" && (
          <div className="space-y-4">
            <h2 className="text-lg font-serif text-foreground">Labour Data from Clover</h2>
            {shiftData.isLoading ? (
              <div className="text-center py-12 text-muted-foreground text-sm">Loading shift data...</div>
            ) : (shiftData.data?.length ?? 0) === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl">
                <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No shift data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Connect a store and sync to see labour data</p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Employee</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Store</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clock In</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Clock Out</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftData.data?.map((shift, i) => {
                        const conn = connections.data?.find(c => c.merchantId === shift.merchantId);
                        return (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-2.5 text-foreground font-medium">{shift.employeeName || "Unknown"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{conn?.storeName || shift.merchantId}</td>
                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                              {new Date(shift.inTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                              {shift.outTime
                                ? new Date(shift.outTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                                : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-foreground">
                              {shift.hoursWorked ? `${shift.hoursWorked.toFixed(1)}h` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
