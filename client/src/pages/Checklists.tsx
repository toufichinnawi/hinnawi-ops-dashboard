// Design: "Golden Hour Operations" — Refined Editorial
// Checklists management: share links for each position, view recent submissions
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  ExternalLink,
  ClipboardCheck,
  Users,
  ChevronRight,
  Shield,
  Eye,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { POSITION_CHECKLISTS, ALL_CHECKLISTS } from "@/lib/positionChecklists";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const positionIcons: Record<string, string> = {
  "operational-manager": "🏢",
  "store-manager": "🏪",
  "assistant-manager": "📋",
  "shift-lead": "⏰",
  cashier: "💰",
  barista: "☕",
  cook: "👨‍🍳",
};

function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(`Link copied for ${label}`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success(`Link copied for ${label}`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
        copied
          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
          : "bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20 hover:bg-[#D4A853]/20"
      )}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          Copy Link
        </>
      )}
    </button>
  );
}

export default function Checklists() {
  const [expandedPosition, setExpandedPosition] = useState<string | null>(null);
  const [, navigate] = useLocation();

  // Get recent report submissions from the database
  const { data: recentReports } = trpc.reports.allReports.useQuery(undefined, {
    retry: false,
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const positions = useMemo(
    () =>
      Object.entries(POSITION_CHECKLISTS).map(([posSlug, config]) => ({
        ...config,
        url: `${baseUrl}/public/${posSlug}`,
        icon: positionIcons[posSlug] || "📋",
        checklistDetails: config.checklists.map((type) => ALL_CHECKLISTS[type]),
      })),
    [baseUrl]
  );

  const totalChecklists = positions.reduce(
    (sum, p) => sum + p.checklists.length,
    0
  );

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">
            Operations
          </p>
          <h2 className="text-2xl font-serif text-foreground mt-1">
            Checklists & Reports
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Share checklist links with your team. Each position has a unique URL
            with PIN-protected access.
          </p>
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <div className="rounded-xl border border-border/60 bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#D4A853]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[#D4A853]" />
            </div>
            <div>
              <p className="text-3xl font-mono font-semibold text-foreground">
                {positions.length}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Positions
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#D4A853]/10 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-[#D4A853]" />
            </div>
            <div>
              <p className="text-3xl font-mono font-semibold text-foreground">
                {totalChecklists}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Total Checklists
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#D4A853]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#D4A853]" />
            </div>
            <div>
              <p className="text-3xl font-mono font-semibold text-foreground">
                1234
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">
                Default PIN
              </p>
            </div>
          </div>
        </motion.div>

        {/* Position Cards */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-foreground">
              Position Checklists
            </h3>
            <p className="text-xs text-muted-foreground">
              Default PIN for all stores: <strong>1234</strong>
            </p>
          </div>

          {positions.map((position) => {
            const isExpanded = expandedPosition === position.slug;
            return (
              <motion.div
                key={position.slug}
                variants={fadeUp}
                className="bg-card rounded-xl border border-border/60 overflow-hidden"
              >
                <div
                  className="p-5 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() =>
                    setExpandedPosition(isExpanded ? null : position.slug)
                  }
                >
                  <span className="text-2xl">{position.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground">
                      {position.label}
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      {position.checklists.length} checklist
                      {position.checklists.length !== 1 ? "s" : ""} assigned
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/checklists/${position.slug}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#D4A853] text-white hover:bg-[#c49843] transition-all duration-200"
                    title="Open checklist in dashboard"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Open
                  </button>
                  <CopyLinkButton url={position.url} label={position.label} />
                  <a
                    href={position.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                    title="Open public link in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 text-muted-foreground transition-transform duration-200",
                      isExpanded && "rotate-90"
                    )}
                  />
                </div>

                {isExpanded && (
                  <div className="border-t border-border/40 px-5 py-4 bg-muted/20">
                    <div className="space-y-2">
                      {position.checklistDetails.map((checklist) => (
                        <div
                          key={checklist.type}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg bg-background"
                        >
                          <span className="text-lg">{checklist.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              {checklist.label}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {checklist.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/40">
                      <p className="text-xs text-muted-foreground font-mono break-all">
                        {position.url}
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* Recent Submissions */}
        {recentReports && recentReports.length > 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="bg-card rounded-xl border border-border/60 overflow-hidden"
          >
            <div className="p-5 border-b border-border/60">
              <h3 className="font-serif text-lg text-foreground">
                Recent Submissions
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest checklist submissions from your team
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Report
                    </th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Store
                    </th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Score
                    </th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Date
                    </th>
                    <th className="text-left px-5 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentReports.slice(0, 20).map((report: any) => (
                    <tr
                      key={report.id}
                      className="border-t border-border/40 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3.5 font-medium">
                        {report.reportType}
                      </td>
                      <td className="px-5 py-3.5">{report.location}</td>
                      <td className="px-5 py-3.5">
                        {report.totalScore ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#D4A853]/10 text-[#D4A853] border border-[#D4A853]/20">
                            {report.totalScore}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                        {report.reportDate}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">
                        {report.createdAt
                          ? new Date(report.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Instructions */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="bg-card rounded-xl border border-border/60 p-5"
        >
          <h3 className="font-serif text-lg text-foreground mb-3">
            How It Works
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#D4A853]/10 flex items-center justify-center text-[#D4A853] font-bold text-sm">
                1
              </div>
              <p className="text-sm font-medium">Copy & Share</p>
              <p className="text-xs text-muted-foreground">
                Click "Copy Link" for a position and send it to the team member
                via WhatsApp, email, or Teams.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#D4A853]/10 flex items-center justify-center text-[#D4A853] font-bold text-sm">
                2
              </div>
              <p className="text-sm font-medium">PIN Verification</p>
              <p className="text-xs text-muted-foreground">
                The team member selects their store and enters the 4-digit PIN
                (default: 1234) to access their checklists.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#D4A853]/10 flex items-center justify-center text-[#D4A853] font-bold text-sm">
                3
              </div>
              <p className="text-sm font-medium">Fill & Submit</p>
              <p className="text-xs text-muted-foreground">
                They complete the checklist and submit. Results appear here and
                can be sent to Teams.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
