// Shareable "Checklists by Position" page
// Designed to be shared with managers, ops managers, and staff
// Clean, public-facing layout with position buttons and copy-link functionality
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  ExternalLink,
  ClipboardCheck,
  ArrowLeft,
  Link2,
  Shield,
  Briefcase,
  Store,
  UserCheck,
  Users,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  POSITION_CHECKLISTS,
  ALL_CHECKLISTS,
  type PositionConfig,
  type ChecklistType,
} from "@/lib/positionChecklists";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// ─── Position styling ───────────────────────────────────────────
const POSITION_STYLES: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string; border: string; gradient: string }
> = {
  "operations-manager": {
    icon: <Shield className="w-6 h-6" />,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    gradient: "from-indigo-500 to-indigo-600",
  },
  "store-manager": {
    icon: <Store className="w-6 h-6" />,
    color: "text-[#D4A853]",
    bg: "bg-[#D4A853]/5",
    border: "border-[#D4A853]/30",
    gradient: "from-[#D4A853] to-[#c49843]",
  },
  "assistant-manager": {
    icon: <UserCheck className="w-6 h-6" />,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
  },
  staff: {
    icon: <Users className="w-6 h-6" />,
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    gradient: "from-sky-500 to-sky-600",
  },
};

function getStyle(slug: string) {
  return (
    POSITION_STYLES[slug] || {
      icon: <ClipboardCheck className="w-6 h-6" />,
      color: "text-gray-700",
      bg: "bg-gray-50",
      border: "border-gray-200",
      gradient: "from-gray-500 to-gray-600",
    }
  );
}

// ─── Copy Link Button ───────────────────────────────────────────
function CopyLinkButton({
  url,
  label,
  variant = "small",
}: {
  url: string;
  label: string;
  variant?: "small" | "large";
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success(`Link copied for ${label}`);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "large") {
    return (
      <Button
        onClick={handleCopy}
        variant="outline"
        className={cn(
          "gap-2 transition-all",
          copied
            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
            : "border-border/60 hover:bg-accent/50"
        )}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" /> Copied!
          </>
        ) : (
          <>
            <Copy className="w-4 h-4" /> Copy Link
          </>
        )}
      </Button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
        copied
          ? "bg-emerald-100 text-emerald-700"
          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function ChecklistsByPosition() {
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const pageUrl = `${baseUrl}/checklists/positions`;

  const positions = useMemo(
    () =>
      Object.entries(POSITION_CHECKLISTS).map(([slug, config]) => ({
        ...config,
        slug,
        style: getStyle(slug),
        checklists: config.checklists.map((type) => ({
          ...ALL_CHECKLISTS[type],
          publicUrl: `${baseUrl}/public/${slug}`,
          dashboardUrl: `/checklists/${slug}`,
        })),
      })),
    [baseUrl]
  );

  const selectedPos = positions.find((p) => p.slug === selectedPosition);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1200px]">
        {/* Header with page-level copy link */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-[#D4A853]" />
              <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">
                Shareable Page
              </p>
            </div>
            <h1 className="text-2xl font-serif text-foreground">
              Checklists by Position
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select a position to view assigned checklists. Share this page or
              individual checklist links with your team.
            </p>
          </div>
          <CopyLinkButton url={pageUrl} label="this page" variant="large" />
        </motion.div>

        {/* Position Buttons Grid */}
        <AnimatePresence mode="wait">
          {!selectedPosition ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {positions.map((pos, i) => (
                <motion.button
                  key={pos.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setSelectedPosition(pos.slug)}
                  className={cn(
                    "relative overflow-hidden rounded-xl border p-6 text-left transition-all duration-300 hover:shadow-lg group",
                    pos.style.bg,
                    pos.style.border
                  )}
                >
                  {/* Gradient accent top */}
                  <div
                    className={cn(
                      "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r",
                      pos.style.gradient
                    )}
                  />

                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        pos.style.bg,
                        pos.style.color
                      )}
                    >
                      {pos.style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={cn("text-lg font-semibold", pos.style.color)}>
                        {pos.label}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {pos.checklists.length} checklist
                        {pos.checklists.length !== 1 ? "s" : ""} assigned
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {pos.checklists.map((cl) => (
                          <span
                            key={cl.type}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 text-xs text-muted-foreground border border-border/40"
                          >
                            <span>{cl.icon}</span>
                            {cl.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Back button + position header */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPosition(null)}
                  className="gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Button>
                {selectedPos && (
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center",
                        selectedPos.style.bg,
                        selectedPos.style.color
                      )}
                    >
                      {selectedPos.style.icon}
                    </div>
                    <h2 className={cn("text-xl font-serif", selectedPos.style.color)}>
                      {selectedPos.label}
                    </h2>
                  </div>
                )}
              </div>

              {/* Checklist cards */}
              {selectedPos && (
                <div className="space-y-3">
                  {selectedPos.checklists.map((cl, i) => (
                    <motion.div
                      key={cl.type}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="rounded-xl border border-border/60 bg-card p-5 flex items-center gap-4 hover:shadow-md transition-shadow"
                    >
                      <span className="text-2xl shrink-0">{cl.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground">
                          {cl.label}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {cl.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <CopyLinkButton
                          url={cl.publicUrl}
                          label={cl.label}
                        />
                        <a
                          href={cl.publicUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          title="Open public link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* How to share */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-5 mt-6">
                <h4 className="font-medium text-sm text-foreground mb-2">
                  How to Share
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Click <strong>Copy</strong> next to any checklist to copy its
                  public link. Send it via WhatsApp, email, or Teams. The team
                  member will select their store, enter the 4-digit PIN (default:
                  1234), and fill out the checklist. Submissions appear
                  automatically on the Operations Scorecard and Reports page.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
