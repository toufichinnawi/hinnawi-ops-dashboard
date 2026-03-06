/**
 * ReportDetailRenderer — Renders submitted report data in proper template format
 * instead of raw JSON. Each checklist type gets its own formatted view.
 * Notes/comments are shown at the top for management visibility.
 */
import { Star, CheckCircle2, XCircle, Minus, AlertTriangle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PhotoGallery } from "@/components/PhotoUpload";

// ─── Star Rating Display ─────────────────────────────────────────
function Stars({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating}/{max}</span>
    </div>
  );
}

// ─── Notes/Comments Banner (shown at top) ────────────────────────
function NotesBanner({ notes, label = "Notes / Comments" }: { notes: string; label?: string }) {
  if (!notes?.trim()) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
      <div className="flex items-start gap-2">
        <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{notes}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Weekly Date Fields Banner ──────────────────────────────────
function WeeklyDateBanner({ data }: { data: any }) {
  const dateOfSubmission = data.dateOfSubmission || data.dateCompleted || "";
  const weekOfStart = data.weekOfStart || data.weekStart || "";
  const weekOfEnd = data.weekOfEnd || data.weekEnd || "";
  if (!dateOfSubmission && !weekOfStart) return null;
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="grid grid-cols-3 gap-3 text-sm">
        {dateOfSubmission && (
          <div>
            <p className="text-xs text-blue-600 font-medium">Date of Submission</p>
            <p className="font-medium text-blue-900">{dateOfSubmission}</p>
          </div>
        )}
        {weekOfStart && (
          <div>
            <p className="text-xs text-blue-600 font-medium">Start Date</p>
            <p className="font-medium text-blue-900">{weekOfStart}</p>
          </div>
        )}
        {weekOfEnd && (
          <div>
            <p className="text-xs text-blue-600 font-medium">End Date</p>
            <p className="font-medium text-blue-900">{weekOfEnd}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Check/X icon ────────────────────────────────────────────────
function CheckIcon({ checked }: { checked: boolean }) {
  return checked
    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    : <XCircle className="w-4 h-4 text-gray-300" />;
}

// ─── Manager Checklist ───────────────────────────────────────────
function ManagerChecklistDetail({ data }: { data: any }) {
  const tasks = data.tasks || [];
  const comments = data.comments || data.finalComments || "";
  const avgScore = data.averageScore || "";

  return (
    <div className="space-y-3">
      <WeeklyDateBanner data={data} />
      <NotesBanner notes={comments} label="Manager Comments" />
      {avgScore && (
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-sm px-3 py-1 border-amber-400 text-amber-600">
            Average Score: {avgScore} / 5
          </Badge>
        </div>
      )}
      <div className="space-y-2">
        {tasks.map((task: any, i: number) => (
          <div key={i} className={`p-3 rounded-lg border ${task.isNA ? "bg-muted/30 opacity-60" : "bg-card"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.isNA ? "line-through text-muted-foreground" : ""}`}>
                  {task.task || task.en || task.label || `Task ${i + 1}`}
                </p>
                {task.taskFr && (
                  <p className="text-xs text-muted-foreground">{task.taskFr}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {task.isNA ? (
                  <Badge variant="secondary" className="text-xs">N/A</Badge>
                ) : (
                  <Stars rating={task.rating || 0} />
                )}
              </div>
            </div>
            {task.comment && (
              <p className="text-xs text-muted-foreground mt-1.5 pl-0.5 italic">"{task.comment}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section-based Checklists (Ops Manager Audit, Deep Cleaning, etc.) ──
function SectionChecklistDetail({ data }: { data: any }) {
  // Handle both formats: { sections: [...] } and { ratings: {...}, notes: string }
  const sections = data.sections;
  const notes = data.notes || data.comments || "";

  if (sections && Array.isArray(sections)) {
    // New format with sections array
    return (
      <div className="space-y-3">
        <WeeklyDateBanner data={data} />
        <NotesBanner notes={notes} label="Auditor Notes" />
        {sections.map((section: any, si: number) => (
          <div key={si}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{section.title}</p>
            <div className="space-y-1.5">
              {(section.items || []).map((item: any, ii: number) => (
                <div key={ii} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                  <p className="text-sm">{item.item || item.label || `Item ${ii + 1}`}</p>
                  <div className="flex items-center gap-2">
                    {item.rating !== undefined ? (
                      <Stars rating={item.rating} />
                    ) : item.checked !== undefined ? (
                      <CheckIcon checked={item.checked} />
                    ) : null}
                    {item.comment && (
                      <span className="text-xs text-muted-foreground italic max-w-[200px] truncate">"{item.comment}"</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {data.photos && data.photos[section.title] && (
              <div className="mt-2">
                <PhotoGallery photos={data.photos[section.title]} label={`${section.title} Photos`} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Old format with ratings object and notes string
  if (data.ratings && typeof data.ratings === "object") {
    return (
      <div className="space-y-3">
        <NotesBanner notes={notes} label="Auditor Notes" />
        {Object.entries(data.ratings).map(([sectionKey, sectionRatings]: [string, any]) => (
          <div key={sectionKey}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {sectionKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
            </p>
            <div className="space-y-1.5">
              {Object.entries(sectionRatings).map(([itemKey, rating]: [string, any]) => (
                <div key={itemKey} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                  <p className="text-sm">{itemKey}</p>
                  <Stars rating={typeof rating === "number" ? rating : 0} />
                </div>
              ))}
            </div>
            {data.photos && data.photos[sectionKey] && (
              <div className="mt-2">
                <PhotoGallery photos={data.photos[sectionKey]} label={`${sectionKey} Photos`} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return <GenericDetail data={data} />;
}

// ─── Weekly Scorecard ────────────────────────────────────────────
function WeeklyScorecardDetail({ data }: { data: any }) {
  const weekOf = data.weekOf || "";
  const dateEntered = data.dateEntered || "";

  const renderSection = (title: string, section: any) => {
    if (!section) return null;
    const goal = section.thisWeekGoal || "";
    const actual = section.thisWeekActual || "";
    const lastWeek = section.lastWeekActual || "";
    const lastMonth = section.lastMonthActual || "";
    const contribute = section.howContribute || "";

    const goalNum = parseFloat(goal);
    const actualNum = parseFloat(actual);
    const isOnTarget = !isNaN(goalNum) && !isNaN(actualNum) && actualNum >= goalNum;

    return (
      <div className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{title}</p>
          {!isNaN(goalNum) && !isNaN(actualNum) && (
            <Badge variant={isOnTarget ? "default" : "destructive"} className="text-xs">
              {isOnTarget ? "On Target" : "Below Target"}
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-muted/50 rounded p-2">
            <p className="text-muted-foreground">Goal</p>
            <p className="font-mono font-semibold text-sm">{goal || "—"}</p>
          </div>
          <div className="bg-muted/50 rounded p-2">
            <p className="text-muted-foreground">Actual</p>
            <p className="font-mono font-semibold text-sm">{actual || "—"}</p>
          </div>
          {lastWeek && (
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">Last Week</p>
              <p className="font-mono text-sm">{lastWeek}</p>
            </div>
          )}
          {lastMonth && (
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">Last Month</p>
              <p className="font-mono text-sm">{lastMonth}</p>
            </div>
          )}
        </div>
        {contribute && (
          <div className="bg-blue-50 border border-blue-100 rounded p-2">
            <p className="text-xs text-blue-700 font-medium mb-0.5">How Do I Contribute?</p>
            <p className="text-xs text-blue-900">{contribute}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {weekOf && (
        <div className="flex items-center gap-4 text-sm mb-2">
          <span className="text-muted-foreground">Week Of:</span>
          <span className="font-medium">{weekOf}</span>
          {dateEntered && (
            <>
              <span className="text-muted-foreground">Date Entered:</span>
              <span className="font-medium">{dateEntered}</span>
            </>
          )}
        </div>
      )}
      {renderSection("Sales ($)", data.sales)}
      {renderSection("Labour (%)", data.labour)}
      {data.digital && (
        <div className="border rounded-lg p-3 space-y-2">
          <p className="text-sm font-semibold">Digital / Reviews</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-muted/50 rounded p-2">
              <p className="text-muted-foreground">Google Reviews</p>
              <p className="font-mono font-semibold text-sm">{data.digital.googleReviews || "—"}</p>
            </div>
          </div>
          {data.digital.howContribute && (
            <div className="bg-blue-50 border border-blue-100 rounded p-2">
              <p className="text-xs text-blue-700 font-medium mb-0.5">How Do I Contribute?</p>
              <p className="text-xs text-blue-900">{data.digital.howContribute}</p>
            </div>
          )}
        </div>
      )}
      {renderSection("Food Cost (%)", data.food)}
    </div>
  );
}

// ─── Waste Report ────────────────────────────────────────────────
function WasteReportDetail({ data }: { data: any }) {
  const renderWasteSection = (title: string, items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return null;
    const hasData = items.some((item) => item.leftover || item.waste);
    if (!hasData) return null;

    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium text-xs">Item</th>
                <th className="text-center p-2 font-medium text-xs">Leftover</th>
                <th className="text-center p-2 font-medium text-xs">Waste</th>
                <th className="text-left p-2 font-medium text-xs">Comment</th>
              </tr>
            </thead>
            <tbody>
              {items.filter((item) => item.leftover || item.waste).map((item: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="p-2 text-sm">{item.item || item.name || `Item ${i + 1}`}</td>
                  <td className="p-2 text-center font-mono">{item.leftover || "—"}</td>
                  <td className="p-2 text-center font-mono">{item.waste || "—"}</td>
                  <td className="p-2 text-xs text-muted-foreground italic">{item.comment || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderWasteSection("Bagels", data.bagels)}
      {renderWasteSection("Pastry", data.pastries)}
      {renderWasteSection("CK Items", data.ckItems)}
    </div>
  );
}

// ─── Equipment Maintenance ───────────────────────────────────────
function EquipmentMaintenanceDetail({ data }: { data: any }) {
  const renderEquipSection = (title: string, items: any[]) => {
    if (!items || !Array.isArray(items) || items.length === 0) return null;
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{title}</p>
        <div className="space-y-1.5">
          {items.map((item: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{item.equipment || item.label || `Item ${i + 1}`}</p>
                {item.task && <p className="text-xs text-muted-foreground">{item.task}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <CheckIcon checked={item.checked} />
                {item.initial && (
                  <Badge variant="outline" className="text-xs">{item.initial}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {renderEquipSection("Daily", data.daily)}
      {renderEquipSection("Weekly", data.weekly)}
      {renderEquipSection("Monthly", data.monthly)}
    </div>
  );
}

// ─── Training Evaluation ─────────────────────────────────────────
function TrainingEvaluationDetail({ data }: { data: any }) {
  const traineeName = data.traineeName || "";
  const overallComments = data.overallComments || "";
  const areas = data.areas || [];

  return (
    <div className="space-y-3">
      <NotesBanner notes={overallComments} label="Overall Comments" />
      {traineeName && (
        <div className="flex items-center gap-2 text-sm mb-2">
          <span className="text-muted-foreground">Trainee:</span>
          <span className="font-medium">{traineeName}</span>
        </div>
      )}
      {areas.map((area: any, ai: number) => (
        <div key={ai}>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{area.title}</p>
          <div className="space-y-1.5">
            {(area.items || []).map((item: any, ii: number) => (
              <div key={ii} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                <p className="text-sm flex-1">{item.item || item.label || `Item ${ii + 1}`}</p>
                <div className="flex items-center gap-2">
                  <Stars rating={item.rating || 0} />
                  {item.comment && (
                    <span className="text-xs text-muted-foreground italic max-w-[150px] truncate">"{item.comment}"</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Bagel Orders ────────────────────────────────────────────────
function BagelOrdersDetail({ data }: { data: any }) {
  const orders = data.orders || [];
  if (orders.length === 0) return <GenericDetail data={data} />;

  // Detect format: new format has "quantity" per item, old format has "quantities" (day-based)
  const isNewFormat = orders[0]?.quantity !== undefined;
  const globalUnit = data.unit || "dozen"; // legacy: global unit
  const orderForDate = data.orderForDate;
  // New format: each order has its own unit field
  const hasPerItemUnits = orders.some((o: any) => o.unit);

  if (isNewFormat) {
    // New per-date format with dozen quantities
    return (
      <div className="space-y-3">
        {orderForDate && (
          <div className="text-sm">
            <span className="text-muted-foreground">Order for: </span>
            <span className="font-medium">{new Date(orderForDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        )}
        {!hasPerItemUnits && <p className="text-sm text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">All quantities are in {globalUnit}s (12 units per dozen)</p>}
        <div className="border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium text-xs">Bagel Type</th>
                <th className="text-center p-2 font-medium text-xs">Qty</th>
                <th className="text-center p-2 font-medium text-xs">Unit</th>
              </tr>
            </thead>
            <tbody>
              {orders.filter((o: any) => o.quantity && o.quantity !== "0").map((order: any, i: number) => (
                <tr key={i} className="border-t">
                  <td className="p-2 text-sm font-medium">{order.type}</td>
                  <td className="p-2 text-center font-mono text-sm font-semibold">{order.quantity}</td>
                  <td className="p-2 text-center text-xs text-muted-foreground">{order.unit ? (order.unit === "dozen" ? "doz." : "pcs") : (globalUnit === "dozen" ? "doz." : "pcs")}</td>
                </tr>
              ))}
              {orders.filter((o: any) => o.quantity && o.quantity !== "0").length === 0 && (
                <tr className="border-t"><td colSpan={3} className="p-3 text-center text-muted-foreground text-sm">No items ordered</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Legacy weekly format with day-based quantities
  const days = orders[0]?.quantities ? Object.keys(orders[0].quantities) : [];

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 font-medium text-xs sticky left-0 bg-muted/50">Bagel Type</th>
              {days.map((day) => (
                <th key={day} className="text-center p-2 font-medium text-xs whitespace-nowrap">
                  {day.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order: any, i: number) => (
              <tr key={i} className="border-t">
                <td className="p-2 text-sm font-medium sticky left-0 bg-card">{order.type}</td>
                {days.map((day) => (
                  <td key={day} className="p-2 text-center font-mono text-sm">
                    {order.quantities[day] || "\u2014"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Performance Evaluation ──────────────────────────────────────
function PerformanceEvaluationDetail({ data }: { data: any }) {
  const employeeName = data.employeeName || "";
  const employeePosition = data.employeePosition || "";
  const overallComments = data.overallComments || "";
  const criteria = data.criteria || [];

  return (
    <div className="space-y-3">
      <NotesBanner notes={overallComments} label="Overall Comments" />
      <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
        {employeeName && (
          <div>
            <span className="text-muted-foreground">Employee: </span>
            <span className="font-medium">{employeeName}</span>
          </div>
        )}
        {employeePosition && (
          <div>
            <span className="text-muted-foreground">Position: </span>
            <span className="font-medium">{employeePosition}</span>
          </div>
        )}
      </div>
      <div className="space-y-2">
        {criteria.map((c: any, i: number) => (
          <div key={i} className="p-3 rounded-lg border bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{c.title || `Criterion ${i + 1}`}</p>
                {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
              </div>
              <Stars rating={c.rating || 0} />
            </div>
            {c.comment && (
              <p className="text-xs text-muted-foreground mt-1.5 italic">"{c.comment}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Generic Fallback ────────────────────────────────────────────
function GenericDetail({ data }: { data: any }) {
  if (!data || typeof data !== "object") return null;

  // Extract comments/notes first
  const commentKeys = ["comments", "notes", "overallComments", "finalComments"];
  const commentEntries = Object.entries(data).filter(([k]) => commentKeys.includes(k) && data[k]);
  const otherEntries = Object.entries(data).filter(
    ([k]) => !commentKeys.includes(k) && k !== "submitterName" && k !== "submittedVia"
  );

  return (
    <div className="space-y-3">
      {commentEntries.map(([key, value]) => (
        <NotesBanner key={key} notes={String(value)} label={key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} />
      ))}
      {otherEntries.map(([key, value]) => {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          return (
            <div key={key} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
              <p className="text-sm text-muted-foreground">{key}</p>
              <p className="text-sm font-medium">{String(value)}</p>
            </div>
          );
        }
        if (Array.isArray(value)) {
          return (
            <div key={key}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{key}</p>
              <div className="space-y-1.5">
                {value.map((item: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg border bg-card text-sm">
                    {typeof item === "object" ? (
                      <div className="space-y-1">
                        {Object.entries(item).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between">
                            <span className="text-muted-foreground text-xs">{k}</span>
                            <span className="text-sm font-medium">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>{String(item)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        }
        if (typeof value === "object" && value !== null) {
          return (
            <div key={key}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
              </p>
              <div className="p-3 rounded-lg border bg-card space-y-1">
                {Object.entries(value).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{k}</span>
                    <span className="text-sm font-medium">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

// ─── Submitted Via Badge ─────────────────────────────────────────
function SubmittedViaBadge({ data }: { data: any }) {
  const via = data?.submittedVia;
  if (!via) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-t mt-3 pt-3">
      <p className="text-xs text-muted-foreground">Submitted Via</p>
      <Badge variant="outline" className="text-xs">{via}</Badge>
    </div>
  );
}

// ─── Main Export ─────────────────────────────────────────────────
// Normalize report type to handle both slug and human-readable formats
const REPORT_TYPE_NORMALIZE: Record<string, string> = {
  "Manager Checklist": "manager-checklist",
  "Operations Manager Checklist (Weekly Audit)": "ops-manager-checklist",
  "Ops. Mgr Weekly Audit": "ops-manager-checklist",
  "Weekly Store Audit": "ops-manager-checklist",
  "Assistant Manager Checklist": "assistant-manager-checklist",
  "Leftovers & Waste Report": "waste-report",
  "Leftovers & Waste": "waste-report",
  "Equipment & Maintenance": "equipment-maintenance",
  "Equipment Maintenance": "equipment-maintenance",
  "Weekly Scorecard": "weekly-scorecard",
  "Training Evaluation": "training-evaluation",
  "Bagel Orders": "bagel-orders",
  "Performance Evaluation": "performance-evaluation",
};

function normalizeType(reportType: string): string {
  return REPORT_TYPE_NORMALIZE[reportType] || reportType;
}

export function ReportDetailRenderer({ reportType, data }: { reportType: string; data: any }) {
  if (!data) return <p className="text-sm text-muted-foreground">No detailed data available</p>;

  const payload = typeof data === "string" ? (() => { try { return JSON.parse(data); } catch { return null; } })() : data;
  if (!payload) return <p className="text-sm text-muted-foreground">No detailed data available</p>;

  const type = normalizeType(reportType);

  const renderer = (() => {
    switch (type) {
      case "manager-checklist":
        return <ManagerChecklistDetail data={payload} />;
      case "ops-manager-checklist":
      case "assistant-manager-checklist":
        return <SectionChecklistDetail data={payload} />;
      case "weekly-scorecard":
        return <WeeklyScorecardDetail data={payload} />;
      case "waste-report":
        return <WasteReportDetail data={payload} />;
      case "equipment-maintenance":
        return <EquipmentMaintenanceDetail data={payload} />;
      case "training-evaluation":
        return <TrainingEvaluationDetail data={payload} />;
      case "bagel-orders":
        return <BagelOrdersDetail data={payload} />;
      case "performance-evaluation":
        return <PerformanceEvaluationDetail data={payload} />;
      default:
        return <GenericDetail data={payload} />;
    }
  })();

  return (
    <div className="space-y-3 border-t pt-3">
      {renderer}
      <SubmittedViaBadge data={payload} />
    </div>
  );
}
