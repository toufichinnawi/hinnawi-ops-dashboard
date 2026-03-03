// "Hinnawi Portal" — admin view
// Shows a single shareable portal link + position overview
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Copy,
  Check,
  Link2,
  Shield,
  Store,
  UserCheck,
  Users,
  Lock,
  ExternalLink,
  ClipboardCheck,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  POSITION_CHECKLISTS,
  ALL_CHECKLISTS,
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
    icon: <Shield className="w-5 h-5" />,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    gradient: "from-indigo-500 to-indigo-600",
  },
  "store-manager": {
    icon: <Store className="w-5 h-5" />,
    color: "text-[#D4A853]",
    bg: "bg-[#D4A853]/5",
    border: "border-[#D4A853]/30",
    gradient: "from-[#D4A853] to-[#c49843]",
  },
  "assistant-manager": {
    icon: <UserCheck className="w-5 h-5" />,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
  },
  staff: {
    icon: <Users className="w-5 h-5" />,
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    gradient: "from-sky-500 to-sky-600",
  },
};

function getStyle(slug: string) {
  return (
    POSITION_STYLES[slug] || {
      icon: <ClipboardCheck className="w-5 h-5" />,
      color: "text-gray-700",
      bg: "bg-gray-50",
      border: "border-gray-200",
      gradient: "from-gray-500 to-gray-600",
    }
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function ChecklistsByPosition() {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const portalUrl = `${baseUrl}/portal`;

  const positions = useMemo(
    () =>
      Object.entries(POSITION_CHECKLISTS).map(([slug, config]) => ({
        ...config,
        slug,
        style: getStyle(slug),
        checklists: config.checklists.map((type) => ALL_CHECKLISTS[type]),
      })),
    []
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(portalUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = portalUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success("Portal link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1200px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="w-4 h-4 text-[#D4A853]" />
            <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">
              Team Portal
            </p>
          </div>
          <h1 className="text-2xl font-serif text-foreground">
            Hinnawi Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-lg">
            Share this single link with your entire team. They will select their
            position, enter their PIN, and choose their store to access their
            designated checklists.
          </p>
        </motion.div>

        {/* Copy Link Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border-2 border-[#D4A853]/30 bg-gradient-to-r from-[#D4A853]/5 to-transparent p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#D4A853]/15 flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-[#D4A853]" />
                </div>
                <h3 className="font-semibold text-foreground">Portal Link</h3>
              </div>
              <p className="text-sm text-muted-foreground break-all font-mono bg-background/60 rounded-lg px-3 py-2 border border-border/40">
                {portalUrl}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Send this link via WhatsApp, email, or Teams. Works on mobile and desktop.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end shrink-0">
              <Button
                onClick={handleCopy}
                size="lg"
                className={cn(
                  "gap-2 transition-all min-w-[180px]",
                  copied
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-[#D4A853] hover:bg-[#c49843] text-white"
                )}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" /> Link Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy Portal Link
                  </>
                )}
              </Button>
              <a
                href="/portal"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[#D4A853] transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Open in new tab
              </a>
            </div>
          </div>
        </motion.div>

        {/* Position Overview */}
        <div>
          <h2 className="text-lg font-serif text-foreground mb-1">Position Access Overview</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Each position sees only their assigned checklists after entering their PIN.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {positions.map((pos, i) => (
              <motion.div
                key={pos.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-5",
                  pos.style.bg,
                  pos.style.border
                )}
              >
                <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", pos.style.gradient)} />

                <div className="flex items-start gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", pos.style.bg, pos.style.color)}>
                    {pos.style.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={cn("text-base font-semibold", pos.style.color)}>
                      {pos.label}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Lock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {pos.slug === "staff" ? "Open access (no PIN)" : "PIN-secured"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Assigned checklists */}
                <div className="mt-3 pt-3 border-t border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">
                    Assigned Checklists ({pos.checklists.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
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
              </motion.div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
          <h4 className="font-medium text-sm text-foreground mb-3">How It Works</h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { step: "1", title: "Open Link", desc: "Team member opens the shared portal link" },
              { step: "2", title: "Select Position", desc: "Choose their role from 4 options" },
              { step: "3", title: "Enter PIN & Store", desc: "Enter position PIN and select their store" },
              { step: "4", title: "Access Checklists", desc: "View and complete assigned checklists" },
            ].map((s) => (
              <div key={s.step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#D4A853]/15 text-[#D4A853] flex items-center justify-center text-xs font-bold shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
