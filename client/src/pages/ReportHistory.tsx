// Reports page — full filtering by store, date, position, checklist type
// Upgraded from simple Report History to a professional reports hub
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText,
  CalendarIcon,
  MapPin,
  User,
  Star,
  ChevronDown,
  Filter,
  X,
  Download,
  ClipboardCheck,
} from "lucide-react";
import {
  ALL_CHECKLISTS,
  POSITION_CHECKLISTS,
  type ChecklistType,
} from "@/lib/positionChecklists";
import { stores } from "@/lib/data";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

// ─── Constants ──────────────────────────────────────────────────
const STORE_OPTIONS = [
  { code: "PK", name: "President Kennedy" },
  { code: "MK", name: "Mackay" },
  { code: "ON", name: "Ontario" },
  { code: "TN", name: "Tunnel" },
];

const POSITION_OPTIONS = Object.entries(POSITION_CHECKLISTS).map(
  ([slug, config]) => ({
    slug,
    label: config.label,
    checklists: config.checklists,
  })
);

const CHECKLIST_OPTIONS = Object.entries(ALL_CHECKLISTS).map(
  ([type, info]) => ({
    type: type as ChecklistType,
    label: info.label,
    icon: info.icon,
  })
);

// Map checklist types to their position
function getPositionForChecklist(
  reportType: string
): string | null {
  for (const [, config] of Object.entries(POSITION_CHECKLISTS)) {
    if (
      config.checklists.includes(reportType as ChecklistType)
    ) {
      return config.label;
    }
  }
  return null;
}

// Normalize report type slugs to labels
function getChecklistLabel(reportType: string): string {
  const info = ALL_CHECKLISTS[reportType as ChecklistType];
  return info?.label || reportType;
}

function getChecklistIcon(reportType: string): string {
  const info = ALL_CHECKLISTS[reportType as ChecklistType];
  return info?.icon || "📋";
}

function getStoreName(code: string): string {
  const s = STORE_OPTIONS.find((s) => s.code === code);
  return s?.name || code;
}

function getStoreColor(code: string): string {
  const s = stores.find(
    (s) => s.shortName === code || s.id === code.toLowerCase()
  );
  return s?.color || "#888";
}

// ─── Date Filter ────────────────────────────────────────────────
type DateFilterValue = {
  from: Date | null;
  to: Date | null;
  label: string;
};

const today = startOfDay(new Date());

const DATE_PRESETS: {
  label: string;
  getValue: () => DateFilterValue;
}[] = [
  {
    label: "All Time",
    getValue: () => ({ from: null, to: null, label: "All Time" }),
  },
  {
    label: "Today",
    getValue: () => ({
      from: today,
      to: endOfDay(today),
      label: "Today",
    }),
  },
  {
    label: "Yesterday",
    getValue: () => {
      const d = subDays(today, 1);
      return {
        from: startOfDay(d),
        to: endOfDay(d),
        label: "Yesterday",
      };
    },
  },
  {
    label: "Last 7 Days",
    getValue: () => ({
      from: startOfDay(subDays(today, 6)),
      to: endOfDay(today),
      label: "Last 7 Days",
    }),
  },
  {
    label: "Last 30 Days",
    getValue: () => ({
      from: startOfDay(subDays(today, 29)),
      to: endOfDay(today),
      label: "Last 30 Days",
    }),
  },
];

function ReportsDateFilter({
  value,
  onChange,
}: {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stagedRange, setStagedRange] = useState<
    DateRange | undefined
  >(
    value.from && value.to
      ? { from: value.from, to: value.to }
      : undefined
  );

  const displayText = value.label || "All Time";
  const rangeComplete = !!(stagedRange?.from && stagedRange?.to);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 px-3 gap-2 text-sm font-normal bg-card border-border/60 hover:bg-accent/50"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span>{displayText}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground ml-auto" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="end"
        sideOffset={8}
      >
        <div className="flex">
          <div className="border-r border-border p-2 space-y-0.5 min-w-[130px]">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 py-1.5 font-medium">
              Quick Select
            </p>
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  onChange(preset.getValue());
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors",
                  value.label === preset.label
                    ? "bg-[#D4A853]/10 text-[#D4A853] font-medium"
                    : "text-foreground hover:bg-accent"
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-1 pb-2 font-medium">
              Custom Range
            </p>
            <Calendar
              mode="range"
              selected={stagedRange}
              onSelect={setStagedRange}
              numberOfMonths={1}
              disabled={{ after: new Date() }}
            />
            {rangeComplete && (
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    if (stagedRange?.from && stagedRange?.to) {
                      onChange({
                        from: startOfDay(stagedRange.from),
                        to: endOfDay(stagedRange.to),
                        label: `${format(stagedRange.from, "MMM d")} – ${format(stagedRange.to, "MMM d")}`,
                      });
                      setOpen(false);
                    }
                  }}
                  className="bg-[#D4A853] hover:bg-[#c49843] text-white"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Main Component ─────────────────────────────────────────────
export default function ReportHistory() {
  const [filterStore, setFilterStore] = useState<string>("all");
  const [filterPosition, setFilterPosition] =
    useState<string>("all");
  const [filterChecklist, setFilterChecklist] =
    useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    from: null,
    to: null,
    label: "All Time",
  });
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const { data: allReports = [], isLoading } =
    trpc.reports.allReports.useQuery();

  // Determine which checklist types belong to the selected position
  const positionChecklists = useMemo(() => {
    if (filterPosition === "all") return null;
    const pos = POSITION_OPTIONS.find(
      (p) => p.slug === filterPosition
    );
    return pos ? pos.checklists : null;
  }, [filterPosition]);

  // Filtered reports
  const reports = useMemo(() => {
    return allReports.filter((r: any) => {
      // Store filter
      if (filterStore !== "all" && r.location !== filterStore)
        return false;

      // Position filter (checks if report type belongs to position)
      if (positionChecklists) {
        if (
          !positionChecklists.includes(
            r.reportType as ChecklistType
          )
        )
          return false;
      }

      // Checklist type filter
      if (
        filterChecklist !== "all" &&
        r.reportType !== filterChecklist
      )
        return false;

      // Date filter
      if (dateFilter.from && r.reportDate) {
        const reportDate = new Date(r.reportDate + "T00:00:00");
        if (reportDate < dateFilter.from) return false;
        if (dateFilter.to && reportDate > dateFilter.to)
          return false;
      }

      return true;
    });
  }, [
    allReports,
    filterStore,
    positionChecklists,
    filterChecklist,
    dateFilter,
  ]);

  // Stats
  const stats = useMemo(() => {
    const byStore: Record<string, number> = {};
    const byType: Record<string, number> = {};
    reports.forEach((r: any) => {
      byStore[r.location] = (byStore[r.location] || 0) + 1;
      byType[r.reportType] = (byType[r.reportType] || 0) + 1;
    });
    return { byStore, byType, total: reports.length };
  }, [reports]);

  const hasActiveFilters =
    filterStore !== "all" ||
    filterPosition !== "all" ||
    filterChecklist !== "all" ||
    dateFilter.label !== "All Time";

  function clearFilters() {
    setFilterStore("all");
    setFilterPosition("all");
    setFilterChecklist("all");
    setDateFilter({ from: null, to: null, label: "All Time" });
  }

  function parsePayload(data: any) {
    if (!data) return null;
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        return null;
      }
    }
    return data;
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  }

  // Get submitter name from data JSON
  function getSubmitter(report: any): string {
    const payload = parsePayload(report.data);
    if (payload?.submitterName) return payload.submitterName;
    if (report.userName) return report.userName;
    return "—";
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground">
              Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              View all submitted checklists and reports with
              filtering
            </p>
          </div>
          <ReportsDateFilter
            value={dateFilter}
            onChange={setDateFilter}
          />
        </div>

        {/* Filter Bar */}
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Filters
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Store Filter */}
            <Select
              value={filterStore}
              onValueChange={setFilterStore}
            >
              <SelectTrigger className="w-[170px] h-9 bg-background border-border/60">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {STORE_OPTIONS.map((s) => (
                  <SelectItem key={s.code} value={s.code}>
                    {s.code} — {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Position Filter */}
            <Select
              value={filterPosition}
              onValueChange={(v) => {
                setFilterPosition(v);
                // Reset checklist filter when position changes
                setFilterChecklist("all");
              }}
            >
              <SelectTrigger className="w-[200px] h-9 bg-background border-border/60">
                <User className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />
                <SelectValue placeholder="All Positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Positions
                </SelectItem>
                {POSITION_OPTIONS.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Checklist Type Filter */}
            <Select
              value={filterChecklist}
              onValueChange={setFilterChecklist}
            >
              <SelectTrigger className="w-[220px] h-9 bg-background border-border/60">
                <ClipboardCheck className="w-3.5 h-3.5 text-muted-foreground mr-1.5" />
                <SelectValue placeholder="All Checklists" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All Checklists
                </SelectItem>
                {(positionChecklists
                  ? CHECKLIST_OPTIONS.filter((c) =>
                      positionChecklists.includes(c.type)
                    )
                  : CHECKLIST_OPTIONS
                ).map((c) => (
                  <SelectItem key={c.type} value={c.type}>
                    {c.icon} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Count */}
            <span className="text-sm text-muted-foreground ml-auto">
              {stats.total} report
              {stats.total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Reports Table */}
        {isLoading ? (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-muted/50 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : reports.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-card p-16 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="font-serif text-lg mb-1">
              No Reports Found
            </h3>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Try adjusting your filters to see more results."
                : "Submitted checklists and reports will appear here."}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-4"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Store
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Position
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Checklist
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Submitted By
                    </th>
                    <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Score
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Submitted
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report: any) => {
                    const position = getPositionForChecklist(
                      report.reportType
                    );
                    const storeColor = getStoreColor(
                      report.location
                    );
                    const submitter = getSubmitter(report);

                    return (
                      <tr
                        key={report.id}
                        onClick={() => setSelectedReport(report)}
                        className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                      >
                        {/* Store */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor: storeColor,
                              }}
                            />
                            <span className="font-semibold text-xs">
                              {report.location}
                            </span>
                            <span className="text-xs text-muted-foreground hidden lg:inline">
                              {getStoreName(report.location)}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 font-mono text-xs">
                          {report.reportDate || "—"}
                        </td>

                        {/* Position */}
                        <td className="px-4 py-3.5">
                          {position ? (
                            <span className="text-xs text-muted-foreground">
                              {position}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">
                              —
                            </span>
                          )}
                        </td>

                        {/* Checklist */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">
                              {getChecklistIcon(
                                report.reportType
                              )}
                            </span>
                            <span className="text-xs font-medium">
                              {getChecklistLabel(
                                report.reportType
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Submitted By */}
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {submitter}
                        </td>

                        {/* Score */}
                        <td className="px-4 py-3.5 text-center">
                          {report.totalScore ? (
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold",
                                parseFloat(report.totalScore) >=
                                  4
                                  ? "bg-emerald-100 text-emerald-700"
                                  : parseFloat(
                                        report.totalScore
                                      ) >= 3
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700"
                              )}
                            >
                              {report.totalScore}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/40">
                              —
                            </span>
                          )}
                        </td>

                        {/* Submitted timestamp */}
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                          {report.createdAt
                            ? new Date(
                                report.createdAt
                              ).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Detail Dialog */}
        <Dialog
          open={!!selectedReport}
          onOpenChange={(open) => {
            if (!open) setSelectedReport(null);
          }}
        >
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <span>
                      {getChecklistIcon(
                        selectedReport.reportType
                      )}
                    </span>
                    {getChecklistLabel(
                      selectedReport.reportType
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Store
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: getStoreColor(
                              selectedReport.location
                            ),
                          }}
                        />
                        <p className="font-medium">
                          {selectedReport.location} —{" "}
                          {getStoreName(
                            selectedReport.location
                          )}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Report Date
                      </p>
                      <p className="font-medium mt-0.5">
                        {selectedReport.reportDate || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Position
                      </p>
                      <p className="font-medium mt-0.5">
                        {getPositionForChecklist(
                          selectedReport.reportType
                        ) || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Submitted By
                      </p>
                      <p className="font-medium mt-0.5">
                        {getSubmitter(selectedReport)}
                      </p>
                    </div>
                    {selectedReport.totalScore && (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Score
                        </p>
                        <p className="font-bold text-lg mt-0.5">
                          {selectedReport.totalScore}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Submitted At
                      </p>
                      <p className="font-medium mt-0.5">
                        {selectedReport.createdAt
                          ? new Date(
                              selectedReport.createdAt
                            ).toLocaleString("en-CA")
                          : "—"}
                      </p>
                    </div>
                  </div>
                  {(() => {
                    const payload = parsePayload(
                      selectedReport.data
                    );
                    if (!payload)
                      return (
                        <p className="text-sm text-muted-foreground">
                          No detailed data available
                        </p>
                      );
                    return (
                      <div className="space-y-3 border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Details
                        </p>
                        {Object.entries(payload).map(
                          ([key, value]) => {
                            // Skip internal fields
                            if (key === "submitterName")
                              return null;
                            if (
                              key === "items" &&
                              Array.isArray(value)
                            ) {
                              return (
                                <div
                                  key={key}
                                  className="space-y-2"
                                >
                                  {(value as any[]).map(
                                    (item, i) => (
                                      <div
                                        key={i}
                                        className="p-3 bg-muted/50 rounded-lg"
                                      >
                                        <div className="flex items-center justify-between">
                                          <p className="text-sm font-medium">
                                            {item.label ||
                                              item.name ||
                                              `Item ${i + 1}`}
                                          </p>
                                          {item.rating !==
                                            undefined &&
                                            renderStars(
                                              item.rating
                                            )}
                                        </div>
                                        {item.notes && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {item.notes}
                                          </p>
                                        )}
                                      </div>
                                    )
                                  )}
                                </div>
                              );
                            }
                            if (
                              typeof value === "object" &&
                              value !== null
                            ) {
                              return (
                                <div
                                  key={key}
                                  className="p-3 bg-muted/50 rounded-lg"
                                >
                                  <p className="text-xs font-medium text-muted-foreground mb-1">
                                    {key}
                                  </p>
                                  <pre className="text-xs text-foreground whitespace-pre-wrap">
                                    {JSON.stringify(
                                      value,
                                      null,
                                      2
                                    )}
                                  </pre>
                                </div>
                              );
                            }
                            return (
                              <div
                                key={key}
                                className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                              >
                                <p className="text-sm text-muted-foreground">
                                  {key}
                                </p>
                                <p className="text-sm font-medium">
                                  {String(value)}
                                </p>
                              </div>
                            );
                          }
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
