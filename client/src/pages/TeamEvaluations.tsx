/**
 * Team Evaluations Report — Dedicated page for Training & Performance Evaluations
 * Shows all evaluations with employee-focused filters, score tracking, and trend analysis.
 */
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  GraduationCap,
  Star,
  Search,
  Users,
  TrendingUp,
  Calendar,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  FileText,
  Filter,
  X,
  BarChart3,
} from "lucide-react";
import { ReportDetailRenderer } from "@/components/ReportDetailRenderer";
import { stores } from "@/lib/data";
import { cn } from "@/lib/utils";

// ─── Constants ──────────────────────────────────────────────────
const STORE_OPTIONS = [
  { code: "PK", name: "President Kennedy" },
  { code: "MK", name: "Mackay" },
  { code: "ON", name: "Ontario" },
  { code: "TN", name: "Tunnel" },
];

const EVAL_TYPES = [
  { value: "all", label: "All Evaluations" },
  { value: "training-evaluation", label: "Training Evaluation" },
  { value: "performance-evaluation", label: "Performance Evaluation" },
  { value: "Manager Evaluation", label: "Manager Evaluation" },
];

const DATE_PRESETS = [
  { label: "All Time", days: null },
  { label: "Last 7 Days", days: 7 },
  { label: "Last 30 Days", days: 30 },
  { label: "Last 90 Days", days: 90 },
];

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

// Extract employee name from report data
function getEmployeeName(report: any): string {
  const data =
    typeof report.data === "string"
      ? JSON.parse(report.data)
      : report.data;
  return data?.traineeName || data?.employeeName || "Unknown";
}

// Extract evaluator name from report data
function getEvaluatorName(report: any): string {
  const data =
    typeof report.data === "string"
      ? JSON.parse(report.data)
      : report.data;
  return data?.submitterName || "Unknown";
}

// Get evaluation type label
function getEvalTypeLabel(reportType: string): string {
  if (reportType === "training-evaluation") return "Training";
  if (reportType === "performance-evaluation") return "Performance";
  if (reportType === "Manager Evaluation") return "Manager";
  return reportType;
}

function getEvalTypeColor(reportType: string): string {
  if (reportType === "training-evaluation")
    return "bg-blue-100 text-blue-700 border-blue-200";
  if (reportType === "performance-evaluation")
    return "bg-purple-100 text-purple-700 border-purple-200";
  if (reportType === "Manager Evaluation")
    return "bg-indigo-100 text-indigo-700 border-indigo-200";
  return "bg-gray-100 text-gray-700";
}

// ─── Employee Summary Card ──────────────────────────────────────
function EmployeeSummaryCard({
  name,
  evaluations,
  onClick,
}: {
  name: string;
  evaluations: any[];
  onClick: () => void;
}) {
  const trainingEvals = evaluations.filter(
    (e) => e.reportType === "training-evaluation"
  );
  const perfEvals = evaluations.filter(
    (e) => e.reportType === "performance-evaluation"
  );
  const mgrEvals = evaluations.filter(
    (e) => e.reportType === "Manager Evaluation"
  );

  const allScores = evaluations
    .map((e) => parseFloat(e.totalScore || "0"))
    .filter((s) => s > 0);
  const avgScore =
    allScores.length > 0
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
      : "N/A";

  const latestEval = evaluations.sort(
    (a, b) =>
      new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()
  )[0];
  const latestDate = latestEval
    ? format(new Date(latestEval.reportDate + "T12:00:00"), "MMM d, yyyy")
    : "N/A";

  const storesSet = new Set(evaluations.map((e) => e.location));

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-all hover:border-[#D4A853]/40"
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4A853] to-[#B8922E] flex items-center justify-center text-white font-semibold text-sm">
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-sm">{name}</h3>
              <p className="text-xs text-muted-foreground">
                {evaluations.length} evaluation
                {evaluations.length !== 1 ? "s" : ""} · Last:{" "}
                {latestDate}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-mono">
              {avgScore !== "N/A" ? `${avgScore}` : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Avg Score
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {trainingEvals.length > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"
            >
              🎓 {trainingEvals.length} Training
            </Badge>
          )}
          {perfEvals.length > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] bg-purple-50 text-purple-700 border-purple-200"
            >
              ⭐ {perfEvals.length} Performance
            </Badge>
          )}
          {mgrEvals.length > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200"
            >
              🛡️ {mgrEvals.length} Manager
            </Badge>
          )}
          {Array.from(storesSet).map((store) => (
            <Badge
              key={store}
              variant="outline"
              className="text-[10px]"
              style={{
                borderColor: getStoreColor(store),
                color: getStoreColor(store),
              }}
            >
              {store}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Reusable Content Component (used in Portal too) ────────────
export function TeamEvaluationsContent({ storeFilter: externalStoreFilter }: { storeFilter?: string }) {
  const { data: allReports = [], isLoading } =
    trpc.reports.allReports.useQuery();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [storeFilter, setStoreFilter] = useState(externalStoreFilter || "all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [datePreset, setDatePreset] = useState(0); // index into DATE_PRESETS
  const [viewMode, setViewMode] = useState<"employees" | "list">(
    "employees"
  );

  // Detail dialog
  const [selectedReport, setSelectedReport] = useState<any | null>(
    null
  );
  const [expandedEmployee, setExpandedEmployee] = useState<
    string | null
  >(null);

  // Filter to only evaluation reports
  const evaluationReports = useMemo(() => {
    return allReports.filter(
      (r: any) =>
        r.reportType === "training-evaluation" ||
        r.reportType === "performance-evaluation" ||
        r.reportType === "Manager Evaluation"
    );
  }, [allReports]);

  // Apply filters
  const filteredReports = useMemo(() => {
    let filtered = [...evaluationReports];

    // Store filter
    if (storeFilter !== "all") {
      filtered = filtered.filter(
        (r: any) => r.location === storeFilter
      );
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(
        (r: any) => r.reportType === typeFilter
      );
    }

    // Date filter
    const preset = DATE_PRESETS[datePreset];
    if (preset.days !== null) {
      const cutoff = startOfDay(subDays(new Date(), preset.days));
      filtered = filtered.filter(
        (r: any) => new Date(r.reportDate + "T12:00:00") >= cutoff
      );
    }

    // Search filter (employee name or evaluator name)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r: any) => {
        const empName = getEmployeeName(r).toLowerCase();
        const evalName = getEvaluatorName(r).toLowerCase();
        const loc = getStoreName(r.location).toLowerCase();
        return (
          empName.includes(q) ||
          evalName.includes(q) ||
          loc.includes(q)
        );
      });
    }

    return filtered;
  }, [
    evaluationReports,
    storeFilter,
    typeFilter,
    datePreset,
    searchQuery,
  ]);

  // Group by employee
  const employeeGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredReports.forEach((r: any) => {
      const name = getEmployeeName(r);
      if (!groups[name]) groups[name] = [];
      groups[name].push(r);
    });
    // Sort by number of evaluations (most first)
    return Object.entries(groups).sort(
      (a, b) => b[1].length - a[1].length
    );
  }, [filteredReports]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredReports.length;
    const training = filteredReports.filter(
      (r: any) => r.reportType === "training-evaluation"
    ).length;
    const performance = filteredReports.filter(
      (r: any) => r.reportType === "performance-evaluation"
    ).length;
    const manager = filteredReports.filter(
      (r: any) => r.reportType === "Manager Evaluation"
    ).length;
    const uniqueEmployees = new Set(
      filteredReports.map((r: any) => getEmployeeName(r))
    ).size;
    const scores = filteredReports
      .map((r: any) => parseFloat(r.totalScore || "0"))
      .filter((s) => s > 0);
    const avgScore =
      scores.length > 0
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(
            2
          )
        : "N/A";

    // Store breakdown
    const storeScores: Record<string, number[]> = {};
    filteredReports.forEach((r: any) => {
      const score = parseFloat(r.totalScore || "0");
      if (score > 0) {
        if (!storeScores[r.location]) storeScores[r.location] = [];
        storeScores[r.location].push(score);
      }
    });
    const storeAvgs = Object.entries(storeScores).map(
      ([store, scores]) => ({
        store,
        avg: (
          scores.reduce((a, b) => a + b, 0) / scores.length
        ).toFixed(2),
        count: scores.length,
      })
    );

    return {
      total,
      training,
      performance,
      manager,
      uniqueEmployees,
      avgScore,
      storeAvgs,
    };
  }, [filteredReports]);

  const hasActiveFilters =
    storeFilter !== "all" ||
    typeFilter !== "all" ||
    datePreset !== 0 ||
    searchQuery.trim() !== "";

  return (
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-foreground flex items-center gap-2">
              <Users className="w-6 h-6 text-[#D4A853]" />
              Team Evaluations Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Training and Performance evaluations across all stores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "employees" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("employees")}
              className={
                viewMode === "employees"
                  ? "bg-[#D4A853] hover:bg-[#B8922E] text-white"
                  : ""
              }
            >
              <Users className="w-4 h-4 mr-1" />
              By Employee
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("list")}
              className={
                viewMode === "list"
                  ? "bg-[#D4A853] hover:bg-[#B8922E] text-white"
                  : ""
              }
            >
              <FileText className="w-4 h-4 mr-1" />
              All Reports
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold font-mono">
                {stats.total}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                Total Evaluations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold font-mono">
                {stats.uniqueEmployees}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                Employees Evaluated
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold font-mono text-[#D4A853]">
                {stats.avgScore}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                Avg Score / 5
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-center gap-3">
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-blue-600">
                    {stats.training}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase">
                    Training
                  </p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-purple-600">
                    {stats.performance}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase">
                    Performance
                  </p>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold font-mono text-indigo-600">
                    {stats.manager}
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase">
                    Manager
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Store Score Breakdown */}
        {stats.storeAvgs.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-muted-foreground font-medium">
              By Store:
            </span>
            {stats.storeAvgs.map(({ store, avg, count }) => (
              <Badge
                key={store}
                variant="outline"
                className="text-xs font-mono"
                style={{
                  borderColor: getStoreColor(store),
                  color: getStoreColor(store),
                }}
              >
                {store}: {avg}/5 ({count})
              </Badge>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employee or evaluator name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select
                value={storeFilter}
                onValueChange={setStoreFilter}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <MapPin className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {STORE_OPTIONS.map((s) => (
                    <SelectItem key={s.code} value={s.code}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}
              >
                <SelectTrigger className="w-[200px] h-9">
                  <Filter className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {EVAL_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                {DATE_PRESETS.map((preset, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-7 text-xs px-2.5",
                      datePreset === i &&
                        "bg-background shadow-sm font-medium"
                    )}
                    onClick={() => setDatePreset(i)}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => {
                    setSearchQuery("");
                    setStoreFilter("all");
                    setTypeFilter("all");
                    setDatePreset(0);
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-5 pb-4">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-muted-foreground">
                No evaluations found
              </h3>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {hasActiveFilters
                  ? "Try adjusting your filters"
                  : "Training and Performance evaluations will appear here once submitted"}
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "employees" ? (
          /* Employee View */
          <div className="space-y-3">
            {employeeGroups.map(([name, evals]) => (
              <div key={name}>
                <EmployeeSummaryCard
                  name={name}
                  evaluations={evals}
                  onClick={() =>
                    setExpandedEmployee(
                      expandedEmployee === name ? null : name
                    )
                  }
                />
                {expandedEmployee === name && (
                  <div className="ml-4 mt-2 space-y-2 border-l-2 border-[#D4A853]/30 pl-4">
                    {evals
                      .sort(
                        (a: any, b: any) =>
                          new Date(b.reportDate).getTime() -
                          new Date(a.reportDate).getTime()
                      )
                      .map((report: any) => (
                        <Card
                          key={report.id}
                          className="cursor-pointer hover:shadow-sm transition-all"
                          onClick={() => setSelectedReport(report)}
                        >
                          <CardContent className="py-3 px-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px]",
                                    getEvalTypeColor(
                                      report.reportType
                                    )
                                  )}
                                >
                                  {getEvalTypeLabel(
                                    report.reportType
                                  )}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(
                                    new Date(
                                      report.reportDate + "T12:00:00"
                                    ),
                                    "MMM d, yyyy"
                                  )}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                  style={{
                                    borderColor: getStoreColor(
                                      report.location
                                    ),
                                    color: getStoreColor(
                                      report.location
                                    ),
                                  }}
                                >
                                  {report.location}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  by {getEvaluatorName(report)}
                                </span>
                                {report.totalScore && (
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs border-[#D4A853] text-[#D4A853]"
                                  >
                                    {report.totalScore}/{report.reportType === "Manager Evaluation" ? "100" : "5"}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredReports
              .sort(
                (a: any, b: any) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((report: any) => (
                <Card
                  key={report.id}
                  className="cursor-pointer hover:shadow-sm transition-all"
                  onClick={() => setSelectedReport(report)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4A853]/20 to-[#D4A853]/10 flex items-center justify-center">
                          {report.reportType ===
                          "training-evaluation" ? (
                            <GraduationCap className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Star className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {getEmployeeName(report)}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                getEvalTypeColor(report.reportType)
                              )}
                            >
                              {getEvalTypeLabel(report.reportType)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {format(
                              new Date(
                                report.reportDate + "T12:00:00"
                              ),
                              "MMM d, yyyy"
                            )}{" "}
                            · {getStoreName(report.location)} · by{" "}
                            {getEvaluatorName(report)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            borderColor: getStoreColor(
                              report.location
                            ),
                            color: getStoreColor(report.location),
                          }}
                        >
                          {report.location}
                        </Badge>
                        {report.totalScore && (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs border-[#D4A853] text-[#D4A853]"
                          >
                            {report.totalScore}/{report.reportType === "Manager Evaluation" ? "100" : "5"}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Report Detail Dialog */}
        <Dialog
          open={!!selectedReport}
          onOpenChange={() => setSelectedReport(null)}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            {selectedReport && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedReport.reportType ===
                    "training-evaluation" ? (
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                    ) : (
                      <Star className="w-5 h-5 text-purple-600" />
                    )}
                    {getEvalTypeLabel(selectedReport.reportType)}{" "}
                    Evaluation — {getEmployeeName(selectedReport)}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: getStoreColor(
                        selectedReport.location
                      ),
                      color: getStoreColor(selectedReport.location),
                    }}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {getStoreName(selectedReport.location)}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {format(
                      new Date(
                        selectedReport.reportDate + "T12:00:00"
                      ),
                      "MMMM d, yyyy"
                    )}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <User className="w-3 h-3 mr-1" />
                    Evaluator: {getEvaluatorName(selectedReport)}
                  </Badge>
                  {selectedReport.totalScore && (
                    <Badge
                      variant="outline"
                      className="font-mono text-xs border-[#D4A853] text-[#D4A853]"
                    >
                      Score: {selectedReport.totalScore}/{selectedReport.reportType === "Manager Evaluation" ? "100" : "5"}
                    </Badge>
                  )}
                </div>
                <ReportDetailRenderer
                  reportType={selectedReport.reportType}
                  data={typeof selectedReport.data === 'string' ? JSON.parse(selectedReport.data) : selectedReport.data}
                />
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}

// ─── Main Page (wraps content in DashboardLayout) ───────────────
export default function TeamEvaluations() {
  return (
    <DashboardLayout>
      <TeamEvaluationsContent />
    </DashboardLayout>
  );
}
