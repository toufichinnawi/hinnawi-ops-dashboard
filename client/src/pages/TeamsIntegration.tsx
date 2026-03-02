import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Plus, Trash2, TestTube2, CheckCircle2, XCircle,
  Bell, Settings2, History, Loader2, Send, AlertTriangle, Clock,
  Zap, ExternalLink, ChevronDown, ChevronUp, Pencil,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0, 0, 0.2, 1] as [number, number, number, number] } },
};

type Tab = "webhooks" | "rules" | "history" | "send";

const severityStyles: Record<string, string> = {
  critical: "bg-red-50 border-red-200 text-red-700",
  warning: "bg-amber-50 border-amber-200 text-amber-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
  success: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

const severityIcons: Record<string, React.ReactNode> = {
  critical: <XCircle className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  info: <Clock className="w-4 h-4" />,
  success: <CheckCircle2 className="w-4 h-4" />,
};

export default function TeamsIntegration() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("webhooks");

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A853]" />
        </div>
      </DashboardLayout>
    );
  }

  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <MessageSquare className="w-12 h-12 text-[#D4A853]" />
          <h2 className="text-xl font-serif text-foreground">Sign in Required</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            You need to sign in to manage Teams webhook integrations and alert rules.
          </p>
          <a
            href={getLoginUrl()}
            className="px-6 py-2.5 rounded-lg bg-[#D4A853] text-[#1C1210] text-sm font-medium hover:bg-[#C49A48] transition-colors"
          >
            Sign In
          </a>
        </div>
      </DashboardLayout>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "webhooks", label: "Webhooks", icon: <Settings2 className="w-4 h-4" /> },
    { id: "rules", label: "Alert Rules", icon: <Zap className="w-4 h-4" /> },
    { id: "history", label: "Alert History", icon: <History className="w-4 h-4" /> },
    { id: "send", label: "Send Alert", icon: <Send className="w-4 h-4" /> },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <MessageSquare className="w-6 h-6 text-[#D4A853]" />
            <h2 className="text-2xl font-serif text-foreground">Teams Integration</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-9">
            Connect your dashboard to Microsoft Teams to receive automated KPI alerts
          </p>
        </motion.div>

        {/* Setup Guide */}
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="bg-[#D4A853]/5 border border-[#D4A853]/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-[#D4A853]" />
            How to Get Your Webhook URL
          </h3>
          <ol className="text-sm text-muted-foreground space-y-1.5 ml-6 list-decimal">
            <li>Open Microsoft Teams and go to the channel where you want alerts</li>
            <li>Click <strong>Manage channel</strong> → <strong>Edit</strong> (or channel settings)</li>
            <li>Go to <strong>Connectors</strong> or create a <strong>Workflow</strong> using "Post to a channel when a webhook request is received"</li>
            <li>Copy the generated webhook URL and paste it below</li>
          </ol>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-card border border-border/60 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-[#D4A853]/15 text-[#D4A853]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "webhooks" && <WebhooksTab key="webhooks" />}
          {activeTab === "rules" && <AlertRulesTab key="rules" />}
          {activeTab === "history" && <AlertHistoryTab key="history" />}
          {activeTab === "send" && <SendAlertTab key="send" />}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

// ─── Webhooks Tab ────────────────────────────────────────────────

function WebhooksTab() {
  const { data: webhooks, isLoading, refetch } = trpc.webhooks.list.useQuery();
  const createMutation = trpc.webhooks.create.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.webhooks.delete.useMutation({ onSuccess: () => refetch() });
  const testMutation = trpc.webhooks.test.useMutation();

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [channel, setChannel] = useState("");
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; error?: string }>>({});

  const handleCreate = async () => {
    if (!name || !url) return;
    await createMutation.mutateAsync({ name, webhookUrl: url, channelName: channel || undefined });
    setName("");
    setUrl("");
    setChannel("");
    setShowForm(false);
  };

  const handleTest = async (id: number) => {
    const result = await testMutation.mutateAsync({ id });
    setTestResults((prev) => ({ ...prev, [id]: result }));
    refetch();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-foreground">Webhook Connections</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A853] text-[#1C1210] text-sm font-medium hover:bg-[#C49A48] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-border/60 rounded-xl p-5 space-y-4"
          >
            <h4 className="text-sm font-semibold text-foreground">New Webhook</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Operations Alerts"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Channel Name</label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="e.g. #operations-alerts"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Webhook URL *</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://prod-XX.westus.logic.azure.com/workflows/..."
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name || !url || createMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A853] text-[#1C1210] text-sm font-medium hover:bg-[#C49A48] disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Save Webhook
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhook list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-[#D4A853]" />
        </div>
      ) : !webhooks?.length ? (
        <div className="bg-card border border-border/60 rounded-xl p-12 text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No webhooks configured yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Add a webhook to start receiving Teams alerts</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className="bg-card border border-border/60 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{wh.name}</h4>
                    {wh.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium border border-gray-200">Disabled</span>
                    )}
                  </div>
                  {wh.channelName && (
                    <p className="text-xs text-muted-foreground mt-0.5">{wh.channelName}</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 font-mono mt-1 truncate max-w-md">
                    {wh.webhookUrl.substring(0, 60)}...
                  </p>
                  {wh.lastTestedAt && (
                    <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      Last tested: {new Date(wh.lastTestedAt).toLocaleString()} —{" "}
                      {wh.lastTestSuccess ? (
                        <span className="text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="w-3 h-3" /> Passed</span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-0.5"><XCircle className="w-3 h-3" /> Failed</span>
                      )}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleTest(wh.id)}
                    disabled={testMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D4A853]/30 text-[#D4A853] text-xs font-medium hover:bg-[#D4A853]/10 transition-colors"
                  >
                    {testMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube2 className="w-3 h-3" />}
                    Test
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate({ id: wh.id })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {testResults[wh.id] && (
                <div className={cn(
                  "mt-3 px-3 py-2 rounded-lg text-xs border",
                  testResults[wh.id].success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-red-50 border-red-200 text-red-700"
                )}>
                  {testResults[wh.id].success
                    ? "Test message sent successfully! Check your Teams channel."
                    : `Test failed: ${testResults[wh.id].error}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Alert Rules Tab ─────────────────────────────────────────────

function AlertRulesTab() {
  const { data: rules, isLoading, refetch } = trpc.alertRules.list.useQuery();
  const { data: webhooks } = trpc.webhooks.list.useQuery();
  const createMutation = trpc.alertRules.create.useMutation({ onSuccess: () => refetch() });
  const updateMutation = trpc.alertRules.update.useMutation({ onSuccess: () => refetch() });
  const deleteMutation = trpc.alertRules.delete.useMutation({ onSuccess: () => refetch() });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"labour_threshold" | "report_overdue" | "sales_drop" | "custom">("labour_threshold");
  const [webhookId, setWebhookId] = useState<number | "">("");
  const [threshold, setThreshold] = useState<string>("30");

  const handleCreate = async () => {
    if (!name || !webhookId) return;
    await createMutation.mutateAsync({
      name,
      type,
      webhookId: webhookId as number,
      threshold: threshold ? parseFloat(threshold) : undefined,
    });
    setName("");
    setType("labour_threshold");
    setWebhookId("");
    setThreshold("30");
    setShowForm(false);
  };

  const ruleTypeLabels: Record<string, string> = {
    labour_threshold: "Labour % Exceeds Threshold",
    report_overdue: "Report Overdue",
    sales_drop: "Sales Drop",
    custom: "Custom Alert",
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-foreground">Alert Rules</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={!webhooks?.length}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A853] text-[#1C1210] text-sm font-medium hover:bg-[#C49A48] disabled:opacity-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Rule
        </button>
      </div>

      {!webhooks?.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          You need to add at least one webhook before creating alert rules.
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-border/60 rounded-xl p-5 space-y-4"
          >
            <h4 className="text-sm font-semibold text-foreground">New Alert Rule</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Rule Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. High Labour Alert"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Alert Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
                >
                  <option value="labour_threshold">Labour % Exceeds Threshold</option>
                  <option value="report_overdue">Report Overdue</option>
                  <option value="sales_drop">Sales Drop</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Send To Webhook *</label>
                <select
                  value={webhookId}
                  onChange={(e) => setWebhookId(e.target.value ? parseInt(e.target.value) : "")}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
                >
                  <option value="">Select webhook...</option>
                  {webhooks?.map((wh) => (
                    <option key={wh.id} value={wh.id}>{wh.name} {wh.channelName ? `(${wh.channelName})` : ""}</option>
                  ))}
                </select>
              </div>
              {(type === "labour_threshold" || type === "sales_drop") && (
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">
                    Threshold {type === "labour_threshold" ? "(%)" : "(% drop)"}
                  </label>
                  <input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!name || !webhookId || createMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D4A853] text-[#1C1210] text-sm font-medium hover:bg-[#C49A48] disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                Create Rule
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rules list */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#D4A853]" /></div>
      ) : !rules?.length ? (
        <div className="bg-card border border-border/60 rounded-xl p-12 text-center">
          <Zap className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No alert rules configured</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Create rules to automate Teams notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-card border border-border/60 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-foreground">{rule.name}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-[#D4A853]/10 text-[#D4A853] text-[10px] font-medium border border-[#D4A853]/20">
                      {ruleTypeLabels[rule.type] || rule.type}
                    </span>
                    {rule.isActive ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">Active</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-medium border border-gray-200">Disabled</span>
                    )}
                  </div>
                  {rule.threshold && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Threshold: <span className="font-mono">{rule.threshold}%</span>
                    </p>
                  )}
                  {rule.lastTriggeredAt && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Last triggered: {new Date(rule.lastTriggeredAt).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                      rule.isActive
                        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                        : "border-gray-200 text-gray-500 hover:bg-gray-50"
                    )}
                  >
                    {rule.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate({ id: rule.id })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Alert History Tab ───────────────────────────────────────────

function AlertHistoryTab() {
  const { data: history, isLoading } = trpc.alertHistory.list.useQuery({ limit: 50 });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <h3 className="font-serif text-lg text-foreground">Alert History</h3>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#D4A853]" /></div>
      ) : !history?.length ? (
        <div className="bg-card border border-border/60 rounded-xl p-12 text-center">
          <History className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No alerts sent yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Alerts will appear here once they are triggered</p>
        </div>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <div key={entry.id} className={cn(
              "flex items-start gap-3 p-3 rounded-xl border text-sm",
              severityStyles[entry.severity]
            )}>
              <div className="mt-0.5 shrink-0">{severityIcons[entry.severity]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{entry.title}</p>
                  {entry.delivered ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-red-600 shrink-0" />
                  )}
                </div>
                <p className="text-xs opacity-80 mt-0.5">{entry.message}</p>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] opacity-60">
                  {entry.storeId && <span>Store: {entry.storeId}</span>}
                  <span>Type: {entry.alertType}</span>
                  <span>{new Date(entry.sentAt).toLocaleString()}</span>
                </div>
                {entry.errorMessage && (
                  <p className="text-[10px] text-red-600 mt-1">Error: {entry.errorMessage}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Send Alert Tab ──────────────────────────────────────────────

function SendAlertTab() {
  const { data: webhooks } = trpc.webhooks.list.useQuery();
  const sendMutation = trpc.alerts.send.useMutation();

  const [webhookId, setWebhookId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"critical" | "warning" | "info" | "success">("info");
  const [storeName, setStoreName] = useState("");
  const [sendResult, setSendResult] = useState<{ success: boolean; error?: string } | null>(null);

  const handleSend = async () => {
    if (!webhookId || !title || !message) return;
    setSendResult(null);
    const result = await sendMutation.mutateAsync({
      webhookId: webhookId as number,
      title,
      message,
      severity,
      storeName: storeName || undefined,
    });
    setSendResult(result);
    if (result.success) {
      setTitle("");
      setMessage("");
      setStoreName("");
    }
  };

  const activeWebhooks = webhooks?.filter((w) => w.isActive) ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      <h3 className="font-serif text-lg text-foreground">Send Manual Alert</h3>

      {!activeWebhooks.length ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          No active webhooks available. Add and activate a webhook first.
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Send To *</label>
              <select
                value={webhookId}
                onChange={(e) => setWebhookId(e.target.value ? parseInt(e.target.value) : "")}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
              >
                <option value="">Select webhook...</option>
                {activeWebhooks.map((wh) => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Alert title"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Store (optional)</label>
              <select
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
              >
                <option value="">All stores</option>
                <option value="President Kennedy">President Kennedy</option>
                <option value="Mackay">Mackay</option>
                <option value="Ontario">Ontario</option>
                <option value="Tunnel">Tunnel</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Message *</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe the alert..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-[#D4A853]/40"
            />
          </div>

          {sendResult && (
            <div className={cn(
              "px-4 py-3 rounded-lg text-sm border",
              sendResult.success
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            )}>
              {sendResult.success
                ? "Alert sent successfully to Teams!"
                : `Failed to send: ${sendResult.error}`}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSend}
              disabled={!webhookId || !title || !message || sendMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D4A853] text-[#1C1210] text-sm font-medium hover:bg-[#C49A48] disabled:opacity-50 transition-colors"
            >
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send to Teams
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
