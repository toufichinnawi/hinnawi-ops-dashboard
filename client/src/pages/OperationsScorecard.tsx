// Operations Scorecard — Per-store scores from completed checklists
// Day Score, Weekly Score, date range filter, alerts for missed audits
import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import { CalendarIcon, ChevronDown, Check, AlertTriangle, ShieldAlert, Minus, X, CheckCircle2, Clock, CircleAlert } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { stores } from "@/lib/data";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { ALL_CHECKLISTS, type ChecklistType } from "@/lib/positionChecklists";
import type { DateRange } from "react-day-picker";
import { Trash2, Package } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────

type FilterMode = "single" | "range" | "week";

interface FilterValue {
  mode: FilterMode;
  from: Date;
  to: Date;
  label: string;
}

// ─── Normalize report types from old human-readable to slug format ──
const REPORT_TYPE_NORMALIZE: Record<string, string> = {
  "Manager Checklist": "manager-checklist",
  "Operations Manager Checklist (Weekly Audit)": "ops-manager-checklist",
  "Ops. Mgr Weekly Audit": "ops-manager-checklist",
  "Weekly Store Audit": "ops-manager-checklist",
  "Deep Cleaning": "weekly-deep-cleaning",
  "Weekly Deep Cleaning": "weekly-deep-cleaning",
  "Assistant Manager Checklist": "assistant-manager-checklist",
  "Store Manager Checklist": "store-manager-checklist",
  "Store Evaluation Checklist": "store-manager-checklist",
  "Leftovers & Waste Report": "waste-report",
  "Leftovers & Waste": "waste-report",
  "Equipment & Maintenance": "equipment-maintenance",
  "Equipment Maintenance": "equipment-maintenance",
  "Weekly Scorecard": "weekly-scorecard",
  "Training Evaluation": "training-evaluation",
  "Bagel Orders": "bagel-orders",
  "Performance Evaluation": "performance-evaluation",
};

const LOCATION_NORMALIZE: Record<string, string> = {
  "President Kennedy": "PK", "president kennedy": "PK", "pk": "PK",
  "Mackay": "MK", "mackay": "MK", "mk": "MK",
  "Ontario": "ON", "ontario": "ON", "on": "ON",
  "Tunnel": "TN", "tunnel": "TN", "tn": "TN",
};

function normalizeReport(r: { reportType: string; location: string; [key: string]: unknown }) {
  return {
    ...r,
    reportType: REPORT_TYPE_NORMALIZE[r.reportType] || r.reportType,
    location: LOCATION_NORMALIZE[r.location] || r.location,
  };
}

// Report types that have numeric scores (out of 5)
const SCORED_TYPES = ["manager-checklist", "ops-manager-checklist", "performance-evaluation", "store-manager-checklist", "assistant-manager-checklist"];
const WEEKLY_AUDIT_TYPE = "ops-manager-checklist";

// Store codes used in submissions
const STORE_CODES = ["PK", "MK", "ON", "TN"] as const;

// ─── Checklist role mapping ─────────────────────────────────────
// Which checklists belong to Store Manager vs Ops Manager

const STORE_MANAGER_CHECKLISTS: ChecklistType[] = [
  "manager-checklist",
  "weekly-scorecard",
  "store-manager-checklist",
  "weekly-deep-cleaning",
  "waste-report",
  "equipment-maintenance",
  "training-evaluation",
  "bagel-orders",
];

const OPS_MANAGER_CHECKLISTS: ChecklistType[] = [
  "ops-manager-checklist",
  "performance-evaluation",
];

// All expected checklists for a store
const ALL_EXPECTED_CHECKLISTS: ChecklistType[] = [
  ...STORE_MANAGER_CHECKLISTS,
  ...OPS_MANAGER_CHECKLISTS,
];

function getStoreInfo(code: string) {
  const s = stores.find((s) => s.shortName === code || s.id === code.toLowerCase());
  return s || { shortName: code, name: code, color: "#888" };
}

// ─── Score Helpers ───────────────────────────────────────────────

function parseScore(totalScore: string | null): number | null {
  if (!totalScore) return null;
  const n = parseFloat(totalScore);
  return isNaN(n) ? null : n;
}

function getScoreColor(score: number, max: number = 5): string {
  const pct = score / max;
  if (pct >= 0.8) return "text-emerald-600";
  if (pct >= 0.6) return "text-amber-600";
  return "text-red-600";
}

function getScoreRingColor(score: number, max: number = 5): string {
  const pct = score / max;
  if (pct >= 0.8) return "#10B981";
  if (pct >= 0.6) return "#F59E0B";
  return "#EF4444";
}

function getChecklistLabel(reportType: string): string {
  const info = ALL_CHECKLISTS[reportType as ChecklistType];
  return info?.label || reportType;
}

function getChecklistIcon(reportType: string): string {
  const info = ALL_CHECKLISTS[reportType as ChecklistType];
  return info?.icon || "📋";
}

// ─── Score Ring SVG ──────────────────────────────────────────────

function ScoreRing({ score, max = 5, size = 80 }: { score: number; max?: number; size?: number }) {
  const pct = Math.min(score / max, 1);
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = getScoreRingColor(score, max);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={4} className="text-border/40" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-mono font-bold" style={{ color }}>{score.toFixed(1)}</span>
      </div>
    </div>
  );
}

// ─── Date Filter (enhanced with Week mode) ───────────────────────

const today = startOfDay(new Date());
const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday
const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 }); // Sunday
const lastWeekStart = subDays(thisWeekStart, 7);
const lastWeekEnd = subDays(thisWeekStart, 1);

const PRESETS = [
  { label: "Today", getValue: (): FilterValue => ({ mode: "single", from: today, to: endOfDay(today), label: "Today" }) },
  { label: "Yesterday", getValue: (): FilterValue => { const d = subDays(today, 1); return { mode: "single", from: startOfDay(d), to: endOfDay(d), label: "Yesterday" }; } },
  { label: "This Week", getValue: (): FilterValue => ({ mode: "week", from: thisWeekStart, to: endOfDay(thisWeekEnd > today ? today : thisWeekEnd), label: "This Week" }) },
  { label: "Last Week", getValue: (): FilterValue => ({ mode: "week", from: lastWeekStart, to: endOfDay(lastWeekEnd), label: "Last Week" }) },
  { label: "Last 7 Days", getValue: (): FilterValue => ({ mode: "range", from: startOfDay(subDays(today, 6)), to: endOfDay(today), label: "Last 7 Days" }) },
  { label: "Last 30 Days", getValue: (): FilterValue => ({ mode: "range", from: startOfDay(subDays(today, 29)), to: endOfDay(today), label: "Last 30 Days" }) },
];

function ScorecardDateFilter({ value, onChange }: { value: FilterValue; onChange: (v: FilterValue) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<FilterMode>(value.mode);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value.from);
  const [stagedRange, setStagedRange] = useState<DateRange | undefined>({ from: value.from, to: value.to });

  const displayText = useMemo(() => {
    if (value.label && value.label !== "Custom") return value.label;
    if (value.mode === "single") return format(value.from, "MMM d, yyyy");
    if (value.mode === "week") return `Week of ${format(value.from, "MMM d")}`;
    return `${format(value.from, "MMM d")} – ${format(value.to, "MMM d, yyyy")}`;
  }, [value]);

  const rangeComplete = !!(stagedRange?.from && stagedRange?.to);

  function handlePreset(preset: (typeof PRESETS)[number]) {
    const val = preset.getValue();
    onChange(val);
    setMode(val.mode);
    setOpen(false);
  }

  function handleSingleSelect(date: Date | undefined) {
    if (!date) return;
    setSelectedDate(date);
    onChange({
      mode: "single",
      from: startOfDay(date),
      to: endOfDay(date),
      label: isSameDay(date, today) ? "Today" : isSameDay(date, subDays(today, 1)) ? "Yesterday" : format(date, "MMM d, yyyy"),
    });
    setOpen(false);
  }

  function handleWeekSelect(date: Date | undefined) {
    if (!date) return;
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    const we = endOfWeek(date, { weekStartsOn: 1 });
    onChange({
      mode: "week",
      from: ws,
      to: endOfDay(we > today ? today : we),
      label: `Week of ${format(ws, "MMM d")}`,
    });
    setOpen(false);
  }

  function handleApplyRange() {
    if (!stagedRange?.from || !stagedRange?.to) return;
    onChange({
      mode: "range",
      from: startOfDay(stagedRange.from),
      to: endOfDay(stagedRange.to),
      label: "Custom",
    });
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 px-3 gap-2 text-sm font-normal bg-card border-border/60 hover:bg-accent/50">
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{displayText}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" sideOffset={8}>
        <div className="flex">
          <div className="border-r border-border p-2 space-y-0.5 min-w-[140px]">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1.5 font-medium">Quick Select</p>
            {PRESETS.map((preset) => (
              <button key={preset.label} onClick={() => handlePreset(preset)}
                className={cn("w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                  value.label === preset.label ? "bg-[#D4A853]/10 text-[#D4A853] font-medium" : "text-foreground hover:bg-accent"
                )}
              >{preset.label}</button>
            ))}
            <div className="border-t border-border my-2" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1.5 font-medium">Mode</p>
            {(["single", "week", "range"] as FilterMode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={cn("w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors capitalize",
                  mode === m ? "bg-[#D4A853]/10 text-[#D4A853] font-medium" : "text-foreground hover:bg-accent"
                )}
              >{m === "single" ? "Single Day" : m === "week" ? "Week (Mon–Sun)" : "Date Range"}</button>
            ))}
          </div>
          <div className="p-2">
            {mode === "single" ? (
              <Calendar mode="single" selected={selectedDate} onSelect={handleSingleSelect} disabled={{ after: new Date() }} defaultMonth={selectedDate} />
            ) : mode === "week" ? (
              <Calendar mode="single" selected={value.from} onSelect={handleWeekSelect} disabled={{ after: new Date() }} defaultMonth={value.from} />
            ) : (
              <>
                <Calendar mode="range" selected={stagedRange} onSelect={setStagedRange} disabled={{ after: new Date() }} defaultMonth={stagedRange?.from} numberOfMonths={1} />
                <div className="border-t border-border mt-1 pt-2 px-1 space-y-2">
                  <p className="text-xs text-muted-foreground text-center">
                    {!stagedRange?.from ? "Select start date" : !stagedRange?.to ? `${format(stagedRange.from, "MMM d")} → Select end date` : `${format(stagedRange.from, "MMM d")} – ${format(stagedRange.to, "MMM d, yyyy")}`}
                  </p>
                  <Button size="sm" onClick={handleApplyRange} disabled={!rangeComplete}
                    className={cn("w-full gap-1.5", rangeComplete ? "bg-[#D4A853] hover:bg-[#C49A48] text-white" : "")}
                  ><Check className="w-3.5 h-3.5" />Apply Filter</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Drill-Down Dialog ──────────────────────────────────────────

interface DrillDownProps {
  open: boolean;
  onClose: () => void;
  storeCode: string;
  storeName: string;
  storeColor: string;
  avgScore: number | null;
  reports: Array<{
    id: number;
    reportType: string;
    location: string;
    reportDate: string;
    totalScore: string | null;
    status: string;
    data: unknown;
    createdAt: Date;
  }>;
  filterLabel: string;
}

function DrillDownDialog({ open, onClose, storeCode, storeName, storeColor, avgScore, reports, filterLabel }: DrillDownProps) {
  // Separate reports by role
  const storeManagerReports = reports.filter((r) =>
    STORE_MANAGER_CHECKLISTS.includes(r.reportType as ChecklistType)
  );
  const opsManagerReports = reports.filter((r) =>
    OPS_MANAGER_CHECKLISTS.includes(r.reportType as ChecklistType)
  );

  // Find unfinished checklists
  const completedTypes = new Set(reports.map((r) => r.reportType));
  const unfinishedChecklists = ALL_EXPECTED_CHECKLISTS.filter(
    (type) => !completedTypes.has(type)
  );

  // Extract submitter name from report data
  function getSubmitter(report: { data: unknown }): string {
    const d = report.data as Record<string, unknown> | null;
    if (!d) return "Unknown";
    return (d.submittedBy as string) || (d.managerName as string) || (d.submitterName as string) || "Unknown";
  }

  function ReportRow({ report }: { report: typeof reports[number] }) {
    const score = parseScore(report.totalScore);
    return (
      <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg hover:bg-muted/30 transition-colors">
        <span className="text-lg shrink-0">{getChecklistIcon(report.reportType)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{getChecklistLabel(report.reportType)}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(report.createdAt), "MMM d, h:mm a")} · {getSubmitter(report)}
          </p>
        </div>
        {score !== null ? (
          <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold",
            score >= 4 ? "bg-emerald-100 text-emerald-700" :
            score >= 3 ? "bg-amber-100 text-amber-700" :
            "bg-red-100 text-red-700"
          )}>
            <CheckCircle2 className="w-3 h-3" />
            {score.toFixed(1)}/5
          </div>
        ) : (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
            <CheckCircle2 className="w-3 h-3" />
            Done
          </div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border/40 px-6 pt-6 pb-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: storeColor }}>
                {storeCode}
              </div>
              <div>
                <DialogTitle className="text-lg font-serif">{storeName}</DialogTitle>
                <DialogDescription className="text-xs">
                  Checklist breakdown · {filterLabel}
                </DialogDescription>
              </div>
              {avgScore !== null && (
                <div className="ml-auto">
                  <ScoreRing score={avgScore} size={56} />
                </div>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* ─── Store Manager Section ─────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-[#D4A853]/15 flex items-center justify-center">
                <span className="text-xs">📋</span>
              </div>
              <h4 className="text-sm font-semibold text-foreground">Store Manager</h4>
              <span className="text-xs text-muted-foreground ml-auto">
                {storeManagerReports.length} completed
              </span>
            </div>
            {storeManagerReports.length > 0 ? (
              <div className="space-y-0.5 rounded-xl border border-border/40 bg-card overflow-hidden p-1">
                {storeManagerReports.map((r) => (
                  <ReportRow key={r.id} report={r} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center">
                <Clock className="w-5 h-5 text-muted-foreground/50 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No store manager checklists submitted</p>
              </div>
            )}
          </div>

          {/* ─── Ops Manager Section ──────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-blue-500/15 flex items-center justify-center">
                <span className="text-xs">🔍</span>
              </div>
              <h4 className="text-sm font-semibold text-foreground">Operations Manager</h4>
              <span className="text-xs text-muted-foreground ml-auto">
                {opsManagerReports.length} completed
              </span>
            </div>
            {opsManagerReports.length > 0 ? (
              <div className="space-y-0.5 rounded-xl border border-border/40 bg-card overflow-hidden p-1">
                {opsManagerReports.map((r) => (
                  <ReportRow key={r.id} report={r} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-center">
                <Clock className="w-5 h-5 text-muted-foreground/50 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">No ops manager checklists submitted</p>
              </div>
            )}
          </div>

          {/* ─── Unfinished / Missing Checklists ─────────────── */}
          {unfinishedChecklists.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-red-500/15 flex items-center justify-center">
                  <CircleAlert className="w-3.5 h-3.5 text-red-500" />
                </div>
                <h4 className="text-sm font-semibold text-red-600">Unfinished Checklists</h4>
                <span className="text-xs font-bold text-red-500 ml-auto">
                  {unfinishedChecklists.length} missing
                </span>
              </div>
              <div className="space-y-1 rounded-xl border border-red-200 bg-red-50/50 overflow-hidden p-2">
                {unfinishedChecklists.map((type) => {
                  const isOps = OPS_MANAGER_CHECKLISTS.includes(type);
                  return (
                    <div key={type} className="flex items-center gap-3 py-2 px-3 rounded-lg">
                      <span className="text-lg shrink-0">{getChecklistIcon(type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-700">{getChecklistLabel(type)}</p>
                        <p className="text-xs text-red-500/70">
                          {isOps ? "Ops Manager" : "Store Manager"} · Not submitted
                        </p>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-600 text-xs font-bold">
                        <CircleAlert className="w-3 h-3" />
                        Missing
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function OperationsScorecard() {
  const [filter, setFilter] = useState<FilterValue>(PRESETS[2].getValue()); // This Week
  const [drillDownStore, setDrillDownStore] = useState<string | null>(null);

  const fromStr = format(filter.from, "yyyy-MM-dd");
  const toStr = format(filter.to, "yyyy-MM-dd");

  const { data: reports, isLoading } = trpc.scorecard.getData.useQuery({ fromDate: fromStr, toDate: toStr });

  // ─── Normalize reports to handle old data formats ──────────────
  const normalizedReports = useMemo(() => {
    if (!reports) return [];
    return reports.map((r) => normalizeReport(r as any)) as typeof reports;
  }, [reports]);

  // ─── Compute scores per store ──────────────────────────────────

  const storeScores = useMemo(() => {
    if (!normalizedReports.length) return [];

    return STORE_CODES.map((code) => {
      const storeInfo = getStoreInfo(code);
      const storeReports = normalizedReports.filter(
        (r) => r.location === code
      );

      // Filter to scored report types only
      const scored = storeReports.filter((r) => SCORED_TYPES.includes(r.reportType) && r.totalScore);

      const scores = scored.map((r) => parseScore(r.totalScore)).filter((s): s is number => s !== null);
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

      // Count by type
      const managerChecklists = storeReports.filter((r) => r.reportType === "manager-checklist").length;
      const weeklyAudits = storeReports.filter((r) => r.reportType === WEEKLY_AUDIT_TYPE).length;
      const totalSubmissions = storeReports.length;

      // Check if weekly audit was done this period
      const hasWeeklyAudit = weeklyAudits > 0;

      // Waste reports for this store
      const wasteReports = storeReports.filter((r) => r.reportType === "waste-report");

      return {
        code,
        storeInfo,
        avgScore,
        scores,
        managerChecklists,
        weeklyAudits,
        totalSubmissions,
        hasWeeklyAudit,
        storeReports,
        wasteReports,
      };
    });
  }, [normalizedReports]);

  // ─── Waste Metrics ────────────────────────────────────────────

  const wasteMetrics = useMemo(() => {
    return storeScores.map((s) => {
      const wasteReports = s.wasteReports;
      let totalItems = 0;
      let totalWasteEntries = 0;
      let totalLeftoverEntries = 0;
      const categoryBreakdown: Record<string, { waste: number; leftover: number }> = {};

      wasteReports.forEach((r: any) => {
        const data = r.data as any;
        if (!data) return;
        const sections = ["bagels", "pastries", "ckItems"];
        sections.forEach((section) => {
          const items = data[section];
          if (!Array.isArray(items)) return;
          items.forEach((item: any) => {
            totalItems++;
            const cat = section === "ckItems" ? "CK Items" : section.charAt(0).toUpperCase() + section.slice(1);
            if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { waste: 0, leftover: 0 };
            if (item.waste) { totalWasteEntries++; categoryBreakdown[cat].waste++; }
            if (item.leftover) { totalLeftoverEntries++; categoryBreakdown[cat].leftover++; }
          });
        });
      });

      return {
        code: s.code,
        storeInfo: s.storeInfo,
        reportCount: wasteReports.length,
        totalItems,
        totalWasteEntries,
        totalLeftoverEntries,
        categoryBreakdown,
      };
    });
  }, [storeScores]);

  // ─── Alerts ────────────────────────────────────────────────────

  const alerts = useMemo(() => {
    const alertList: { store: string; storeColor: string; message: string; severity: "critical" | "warning" }[] = [];

    storeScores.forEach((s) => {
      // Missing weekly audit alert
      if (!s.hasWeeklyAudit && (filter.mode === "week" || (filter.mode === "range" && filter.label !== "Today" && filter.label !== "Yesterday"))) {
        alertList.push({
          store: s.code,
          storeColor: s.storeInfo.color,
          message: "Operations Manager has NOT completed the Weekly Store Audit",
          severity: "critical",
        });
      }

      // Low score alert
      if (s.avgScore !== null && s.avgScore < 3) {
        alertList.push({
          store: s.code,
          storeColor: s.storeInfo.color,
          message: `Average score is critically low: ${s.avgScore.toFixed(1)}/5`,
          severity: "critical",
        });
      } else if (s.avgScore !== null && s.avgScore < 4) {
        alertList.push({
          store: s.code,
          storeColor: s.storeInfo.color,
          message: `Average score needs improvement: ${s.avgScore.toFixed(1)}/5`,
          severity: "warning",
        });
      }

      // No submissions at all
      if (s.totalSubmissions === 0 && filter.mode !== "single") {
        alertList.push({
          store: s.code,
          storeColor: s.storeInfo.color,
          message: "No checklists submitted during this period",
          severity: "warning",
        });
      }

      // High waste alerts
      const wm = wasteMetrics.find((w) => w.code === s.code);
      if (wm && wm.totalWasteEntries > 15) {
        alertList.push({
          store: s.code,
          storeColor: s.storeInfo.color,
          message: `High waste reported: ${wm.totalWasteEntries} waste entries across ${wm.reportCount} report(s)`,
          severity: "critical",
        });
      } else if (wm && wm.totalWasteEntries > 8) {
        alertList.push({
          store: s.code,
          storeColor: s.storeInfo.color,
          message: `Elevated waste: ${wm.totalWasteEntries} waste entries across ${wm.reportCount} report(s)`,
          severity: "warning",
        });
      }

      // No waste report submitted
      if (wm && wm.reportCount === 0 && filter.mode !== "single") {
        alertList.push({
          store: s.code,
          storeColor: s.storeInfo.color,
          message: "No Leftovers & Waste report submitted during this period",
          severity: "warning",
        });
      }
    });

    return alertList;
  }, [storeScores, filter, wasteMetrics]);

  // ─── Daily breakdown for the period ────────────────────────────

  const dailyBreakdown = useMemo(() => {
    if (!normalizedReports.length || filter.mode === "single") return null;

    const days = eachDayOfInterval({ start: filter.from, end: filter.to > today ? today : filter.to });

    return days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayReports = normalizedReports.filter((r) => r.reportDate === dayStr);

      const byStore = STORE_CODES.map((code) => {
        const storeDay = dayReports.filter(
          (r) => r.location === code
        );
        const scored = storeDay.filter((r) => SCORED_TYPES.includes(r.reportType) && r.totalScore);
        const scores = scored.map((r) => parseScore(r.totalScore)).filter((s): s is number => s !== null);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        return { code, avg, count: storeDay.length };
      });

      return { date: day, dateStr: dayStr, byStore };
    });
  }, [normalizedReports, filter]);

  // ─── Drill-down data ───────────────────────────────────────────

  const drillDownData = useMemo(() => {
    if (!drillDownStore || !normalizedReports.length) return null;
    const s = storeScores.find((ss) => ss.code === drillDownStore);
    if (!s) return null;
    return s;
  }, [drillDownStore, storeScores, normalizedReports]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">Operations Scorecard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Store performance scores from completed checklists
            </p>
          </div>
          <ScorecardDateFilter value={filter} onChange={setFilter} />
        </div>

        {/* Tabs: Scores | Alerts */}
        <Tabs defaultValue="scores" className="space-y-4">
          <TabsList className="bg-card border border-border/60">
            <TabsTrigger value="scores" className="data-[state=active]:bg-[#D4A853]/10 data-[state=active]:text-[#D4A853]">
              Scores
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-red-500/10 data-[state=active]:text-red-600 gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Alerts
              {alerts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white">
                  {alerts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ─── Scores Tab ─────────────────────────────────────── */}
          <TabsContent value="scores" className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {STORE_CODES.map((c) => (
                  <div key={c} className="rounded-xl border border-border/60 bg-card p-6 animate-pulse">
                    <div className="h-4 bg-muted rounded w-20 mb-4" />
                    <div className="h-20 bg-muted rounded-full w-20 mx-auto mb-4" />
                    <div className="h-3 bg-muted rounded w-32 mx-auto" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Store Score Cards — now clickable */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {storeScores.map((s) => (
                    <div
                      key={s.code}
                      onClick={() => setDrillDownStore(s.code)}
                      className={cn(
                        "relative overflow-hidden rounded-xl border bg-card p-5 transition-all duration-300 hover:shadow-lg cursor-pointer group",
                        s.avgScore !== null && s.avgScore < 3 ? "border-red-300 hover:shadow-red-500/10" : "border-border/60 hover:shadow-[#D4A853]/5"
                      )}
                    >
                      {/* Top accent */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] transition-all group-hover:h-[4px]" style={{ backgroundColor: s.storeInfo.color }} />

                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: s.storeInfo.color }}>{s.code}</p>
                          <p className="text-xs text-muted-foreground">{s.storeInfo.name}</p>
                        </div>
                        {filter.mode !== "single" && (
                          s.hasWeeklyAudit ? (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              Audited
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-medium">
                              <ShieldAlert className="w-3 h-3" />
                              No Audit
                            </span>
                          )
                        )}
                      </div>

                      <div className="flex justify-center mb-3">
                        {s.avgScore !== null ? (
                          <ScoreRing score={s.avgScore} />
                        ) : (
                          <div className="w-20 h-20 rounded-full border-4 border-dashed border-border/40 flex items-center justify-center">
                            <Minus className="w-5 h-5 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>

                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          {s.avgScore !== null ? (
                            <span className={getScoreColor(s.avgScore)}>
                              {s.avgScore >= 4 ? "Good" : s.avgScore >= 3 ? "Needs Improvement" : "Critical"}
                            </span>
                          ) : (
                            "No scored checklists"
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1 group-hover:text-[#D4A853] transition-colors">
                          Click to view details
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/40 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-mono font-semibold">{s.totalSubmissions}</p>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-mono font-semibold">{s.managerChecklists}</p>
                          <p className="text-[10px] text-muted-foreground">Daily</p>
                        </div>
                        <div>
                          <p className={cn("text-lg font-mono font-semibold", s.weeklyAudits === 0 && filter.mode !== "single" ? "text-red-500" : "")}>
                            {s.weeklyAudits}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Audits</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Daily Breakdown Table (for range/week modes) */}
                {dailyBreakdown && dailyBreakdown.length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/40">
                      <h3 className="font-serif text-lg">Daily Score Breakdown</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Average checklist scores per store per day</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/40 bg-muted/30">
                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                            {STORE_CODES.map((code) => {
                              const info = getStoreInfo(code);
                              return (
                                <th key={code} className="text-center px-4 py-3 font-medium" style={{ color: info.color }}>
                                  {code}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {dailyBreakdown.map((day) => (
                            <tr key={day.dateStr} className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3 text-muted-foreground">
                                <span className="font-medium text-foreground">{format(day.date, "EEE")}</span>
                                <span className="ml-1.5">{format(day.date, "MMM d")}</span>
                              </td>
                              {day.byStore.map((s) => (
                                <td key={s.code} className="text-center px-4 py-3">
                                  {s.avg !== null ? (
                                    <span className={cn("font-mono font-semibold", getScoreColor(s.avg))}>
                                      {s.avg.toFixed(1)}
                                    </span>
                                  ) : s.count > 0 ? (
                                    <span className="text-muted-foreground text-xs">N/S</span>
                                  ) : (
                                    <span className="text-muted-foreground/40">—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ─── Leftovers & Waste Section ────────────────── */}
                <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg">Leftovers & Waste</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Waste and leftover tracking across all stores</p>
                    </div>
                  </div>

                  {wasteMetrics.some((w) => w.reportCount > 0) ? (
                    <div className="p-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {wasteMetrics.map((wm) => (
                          <div key={wm.code} className="rounded-xl border border-border/40 bg-card p-4 relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ backgroundColor: wm.storeInfo.color }} />
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm font-semibold" style={{ color: wm.storeInfo.color }}>{wm.code}</p>
                                <p className="text-[10px] text-muted-foreground">{wm.reportCount} report{wm.reportCount !== 1 ? "s" : ""}</p>
                              </div>
                              {wm.totalWasteEntries > 15 ? (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  High
                                </span>
                              ) : wm.totalWasteEntries > 8 ? (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[10px] font-medium">
                                  <AlertTriangle className="w-3 h-3" />
                                  Elevated
                                </span>
                              ) : wm.reportCount > 0 ? (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-medium">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Normal
                                </span>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="text-center p-2 rounded-lg bg-orange-50 border border-orange-200/50">
                                <p className="text-lg font-mono font-bold text-orange-600">{wm.totalWasteEntries}</p>
                                <p className="text-[10px] text-orange-600/70">Waste Items</p>
                              </div>
                              <div className="text-center p-2 rounded-lg bg-blue-50 border border-blue-200/50">
                                <p className="text-lg font-mono font-bold text-blue-600">{wm.totalLeftoverEntries}</p>
                                <p className="text-[10px] text-blue-600/70">Leftovers</p>
                              </div>
                            </div>

                            {Object.keys(wm.categoryBreakdown).length > 0 && (
                              <div className="space-y-1.5">
                                {Object.entries(wm.categoryBreakdown).map(([cat, data]) => (
                                  <div key={cat} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground flex items-center gap-1.5">
                                      <Package className="w-3 h-3" />
                                      {cat}
                                    </span>
                                    <div className="flex gap-2">
                                      {data.waste > 0 && (
                                        <span className="text-orange-600 font-medium">{data.waste}W</span>
                                      )}
                                      {data.leftover > 0 && (
                                        <span className="text-blue-600 font-medium">{data.leftover}L</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <div className="w-12 h-12 rounded-full bg-muted/50 border border-border/40 flex items-center justify-center mx-auto mb-3">
                        <Trash2 className="w-5 h-5 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">No waste reports submitted during this period</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Waste reports will appear here once staff submit them</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ─── Alerts Tab ────────────────────────────────────────── */}
          <TabsContent value="alerts" className="space-y-4">
            {alerts.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-card p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="font-serif text-lg mb-1">All Clear</h3>
                <p className="text-sm text-muted-foreground">No alerts for the selected period. All stores are on track.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <ShieldAlert className="w-5 h-5 text-red-500" />
                  <h3 className="font-serif text-lg text-red-600">
                    {alerts.length} Alert{alerts.length !== 1 ? "s" : ""} Detected
                  </h3>
                </div>

                {alerts.map((alert, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl border p-4 flex items-start gap-3",
                      alert.severity === "critical" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                      alert.severity === "critical" ? "bg-red-100" : "bg-amber-100"
                    )}>
                      {alert.severity === "critical" ? (
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: alert.storeColor }}
                        >
                          {alert.store}
                        </span>
                        <span className={cn(
                          "text-xs font-semibold uppercase tracking-wider",
                          alert.severity === "critical" ? "text-red-600" : "text-amber-600"
                        )}>
                          {alert.severity === "critical" ? "⚠ CRITICAL" : "⚠ WARNING"}
                        </span>
                      </div>
                      <p className={cn(
                        "text-sm font-medium",
                        alert.severity === "critical" ? "text-red-800" : "text-amber-800"
                      )}>
                        {alert.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Drill-Down Dialog ──────────────────────────────────── */}
      {drillDownData && (
        <DrillDownDialog
          open={!!drillDownStore}
          onClose={() => setDrillDownStore(null)}
          storeCode={drillDownData.code}
          storeName={drillDownData.storeInfo.name}
          storeColor={drillDownData.storeInfo.color}
          avgScore={drillDownData.avgScore}
          reports={drillDownData.storeReports}
          filterLabel={filter.label !== "Custom" ? filter.label : `${format(filter.from, "MMM d")} – ${format(filter.to, "MMM d")}`}
        />
      )}
    </DashboardLayout>
  );
}
