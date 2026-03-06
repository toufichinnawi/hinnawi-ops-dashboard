// DirectChecklist — Opens a specific checklist form directly from the sidebar
// No position selection, no checklist list — just the form with a store dropdown
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { ALL_CHECKLISTS, type ChecklistType } from "@/lib/positionChecklists";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Check, Link as LinkIcon, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

// Re-use the DashboardChecklistForm from ChecklistViewer
import ChecklistViewer from "./ChecklistViewer";

// We need to import the form component directly, so let's create a wrapper
// that renders the form for a given checklist type

import { useState, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stores } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { CheckCircle2, Send, DollarSign, Users2, MessageSquare, Utensils } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ─── Checklist Data Definitions (same as ChecklistViewer) ───

const OPS_TASKS = [
  { en: "Outside and entrance", fr: "Extérieur et entrée" },
  { en: "Sign outside", fr: "Enseigne extérieure" },
  { en: "Front display", fr: "Vitrine avant" },
  { en: "Pastries table", fr: "Table des pâtisseries" },
  { en: "Carpets", fr: "Tapis" },
  { en: "Floor", fr: "Plancher" },
  { en: "Coffee bags display", fr: "Présentoir de sacs de café" },
  { en: "Drink fridge", fr: "Réfrigérateur à boissons" },
  { en: "Lights", fr: "Éclairage" },
  { en: "Music", fr: "Musique" },
  { en: "Windows", fr: "Fenêtres" },
  { en: "Bathroom", fr: "Salle de bain" },
  { en: "Temperature in the cafe", fr: "Température dans le café" },
  { en: "Tables and benches clean", fr: "Tables et bancs propres" },
  { en: "Quality of bagel", fr: "Qualité du bagel" },
  { en: "Quality of vegetables", fr: "Qualité des légumes" },
  { en: "Quality of cream cheese", fr: "Qualité du fromage à la crème" },
  { en: "Quality of coffee", fr: "Qualité du café" },
  { en: "Service speed", fr: "Rapidité du service" },
  { en: "Greeting and friendliness", fr: "Accueil et amabilité" },
];

const AUDIT_SECTIONS = [
  {
    title: "Exterior & Entrance",
    items: ["Signage visible & clean", "Entrance swept & inviting", "Outdoor seating tidy", "Windows streak-free"],
  },
  {
    title: "Display & Merchandising",
    items: ["Pastry case fully stocked", "Price tags accurate", "Coffee bags neatly arranged", "Seasonal promos displayed"],
  },
  {
    title: "Bathroom & Cleanliness",
    items: ["Bathroom spotless", "Soap & paper stocked", "Floors mopped", "Trash emptied"],
  },
  {
    title: "Equipment",
    items: ["Espresso machine clean", "Grinder calibrated", "Fridge temps logged", "Oven functioning"],
  },
  {
    title: "Product Quality",
    items: ["Bagels fresh & warm", "Cream cheese portioned", "Coffee taste-tested", "Pastries within sell-by"],
  },
  {
    title: "Service & Staff",
    items: ["Staff in uniform", "Greeting within 10s", "Order accuracy checked", "Upselling observed"],
  },
];

const SECTION_TASKS = {
  morning: ["Open registers & count float", "Brew first batch of coffee", "Stock pastry case", "Check fridge temps", "Wipe tables & counters", "Unlock doors & flip sign"],
  afternoon: ["Restock bagels & pastries", "Clean espresso machine", "Wipe down tables", "Check supply levels", "Empty trash if full", "Prep for evening rush"],
  closing: ["Lock doors & flip sign", "Clean all equipment", "Mop floors", "Count registers", "Set alarm", "Final walkthrough"],
};

const DEEP_CLEANING = [
  "Clean behind espresso machine", "Descale espresso machine", "Deep clean grinder", "Scrub fridge interior",
  "Clean oven interior", "Degrease range hood", "Wash floor mats", "Clean light fixtures",
  "Wipe all shelving", "Sanitize prep surfaces", "Clean ice machine", "Wash windows (inside)",
];

const EQUIP_DAILY = [
  { equipment: "Grill", task: "Clean surface & grease tray" },
  { equipment: "Grill", task: "Check temperature" },
  { equipment: "Espresso Machine", task: "Backflush (water)" },
  { equipment: "Espresso Machine", task: "Clean steam wand" },
  { equipment: "Espresso Machine", task: "Empty drip tray" },
  { equipment: "Filter Coffee", task: "Clean brew basket & spray head" },
  { equipment: "Espresso Grinder", task: "Brush grind chamber" },
  { equipment: "Drinks Fridge", task: "Temp 2-4 C & clean glass" },
  { equipment: "Dishwasher", task: "Clean filter & check rinse aid" },
  { equipment: "Ice Machine", task: "Check ice quality" },
  { equipment: "POS System", task: "Clean screen" },
  { equipment: "Security Cameras", task: "Confirm recording" },
  { equipment: "Fire Extinguisher", task: "Visible & accessible" },
];
const EQUIP_WEEKLY = [
  { equipment: "Grill", task: "Deep clean & degrease" },
  { equipment: "Espresso Machine", task: "Backflush with detergent & soak portafilters" },
  { equipment: "Grinder", task: "Deep clean burrs" },
  { equipment: "Ice Machine", task: "Sanitize interior" },
  { equipment: "Dishwasher", task: "Run cleaning cycle" },
];
const EQUIP_MONTHLY = [
  { equipment: "Espresso Machine", task: "Inspect gaskets & pressure" },
  { equipment: "Water Filtration", task: "Replace filter if required" },
  { equipment: "Refrigeration", task: "Clean condenser coils" },
  { equipment: "HVAC / Hood", task: "Replace or clean filters" },
];

const BAGEL_TYPES = [
  "Plain", "Sesame", "Poppy", "Everything", "Cinnamon Raisin", "Whole Wheat",
  "Multigrain", "Blueberry", "Jalapeño", "Onion", "Garlic", "Salt",
];

const TRAINING_AREAS = [
  { title: "Customer Service", items: ["Greeting customers promptly and warmly", "Taking orders accurately", "Handling complaints professionally", "Upselling and suggestive selling", "Speed of service"] },
  { title: "Food Preparation", items: ["Bagel preparation and toasting", "Sandwich assembly and presentation", "Coffee preparation (espresso, filter)", "Pastry handling and display", "Food safety and hygiene practices"] },
  { title: "Operations", items: ["Opening/closing procedures", "Cash handling and POS operation", "Inventory awareness", "Cleaning and sanitation", "Equipment operation and care"] },
  { title: "Teamwork & Attitude", items: ["Cooperation with team members", "Willingness to learn", "Following instructions", "Punctuality and reliability", "Professional appearance and demeanor"] },
];

const EVAL_CRITERIA = [
  { key: "a", title: "Quality of Work", description: "Measures accuracy, thoroughness, and neatness of work performed." },
  { key: "b", title: "Productivity", description: "Measures the quantity and efficiency of work produced." },
  { key: "c", title: "Job Knowledge", description: "Measures employee's knowledge of duties and skills required." },
  { key: "d", title: "Reliability/Dependability", description: "Does the employee follow through on assigned tasks?" },
  { key: "e", title: "Attendance/Punctuality", description: "Reports for work on time, provides advance notice of absence." },
  { key: "f", title: "Initiative", description: "Demonstrates initiative and resourcefulness." },
  { key: "g", title: "Communication", description: "Effectiveness in listening and expressing ideas." },
  { key: "h", title: "Teamwork", description: "Gets along with fellow employees and shows cooperative spirit." },
  { key: "i", title: "Decision Making", description: "Understanding problems and making timely decisions." },
  { key: "j", title: "Customer Service", description: "Demonstrates commitment to excellent customer service." },
];

// ─── Store Dropdown Component ───

function StoreDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Store Location</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm",
          !value && "text-muted-foreground"
        )}
      >
        <option value="">Select a store...</option>
        {stores.map((s) => (
          <option key={s.id} value={s.id}>{s.shortName}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Mapping from sidebar slug to checklist type ───

const SLUG_TO_CHECKLIST: Record<string, ChecklistType> = {
  "operations": "manager-checklist",
  "weekly-audit": "ops-manager-checklist",
  "weekly-scorecard": "weekly-scorecard",
  "performance": "performance-evaluation",
  "waste": "waste-report",
  "equipment": "equipment-maintenance",
  "training": "training-evaluation",
  "bagel-orders": "bagel-orders",
};

const SLUG_TO_LABEL: Record<string, string> = {
  "operations": "Store Mgr Daily Checklist",
  "weekly-audit": "Ops. Mgr Weekly Audit",
  "weekly-scorecard": "Weekly Scorecard",
  "performance": "Performance Evaluation",
  "waste": "Leftovers & Waste",
  "equipment": "Equipment & Maintenance",
  "training": "Training Evaluation",
  "bagel-orders": "Bagel Orders",
};

// ─── Form Components ───

function ManagerChecklistForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [managerName, setManagerName] = useState("");
  const [dateOfSubmission, setDateOfSubmission] = useState(() => new Date().toISOString().split("T")[0]);
  const defaultWeekMgr = useMemo(() => getDefaultWeekRange(), []);
  const [weekStart, setWeekStart] = useState(defaultWeekMgr.start);
  const [weekEnd, setWeekEnd] = useState(defaultWeekMgr.end);
  const [tasks, setTasks] = useState(() => OPS_TASKS.map(() => ({ rating: 0, isNA: false, comment: "" })));
  const [comments, setComments] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const ratedTasks = tasks.filter((t) => !t.isNA && t.rating > 0);
  const avg = ratedTasks.length > 0 ? (ratedTasks.reduce((s, t) => s + t.rating, 0) / ratedTasks.length).toFixed(2) : "0.00";

  const handleSubmit = () => {
    if (!managerName.trim() || !selectedStore) { toast.error("Please fill in your name and select a store"); return; }
    if (ratedTasks.length === 0) { toast.error("Please rate at least one item"); return; }
    const payload = {
      reportType: "manager-checklist", location: selectedStore, submitterName: managerName, reportDate: weekStart,
      data: { dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd, tasks: OPS_TASKS.map((t, i) => ({ task: t.en, taskFr: t.fr, rating: tasks[i].rating, isNA: tasks[i].isNA, comment: tasks[i].comment })), comments, averageScore: avg },
      totalScore: avg,
    };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Checklist submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
      <h3 className="text-xl font-serif">Submitted Successfully</h3>
      <p className="text-muted-foreground">Store Mgr Daily Checklist for {currentStoreName} — Average: {avg}/5</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Your Name</Label><Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Enter your name" /></div>
        <div className="space-y-1.5"><Label>Date of Submission</Label><Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Start Date *</Label><Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>End Date *</Label><Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} /></div>
        </div>
      </CardContent></Card>
      <div className="flex items-center gap-2">
        <span className="text-lg font-serif font-semibold border border-[#D4A853] text-[#D4A853] rounded-md px-4 py-2">Average: {avg} / 5</span>
      </div>
      <div className="space-y-3">
        {OPS_TASKS.map((task, i) => (
          <Card key={i} className={tasks[i].isNA ? "opacity-50" : ""}>
            <CardContent className="pt-4 pb-4 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className={`font-medium ${tasks[i].isNA ? "line-through text-muted-foreground" : ""}`}>{task.en}</p>
                  <p className="text-sm text-muted-foreground">{task.fr}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={tasks[i].isNA} onCheckedChange={(c) => setTasks((p) => p.map((t, j) => j === i ? { ...t, isNA: !!c, rating: c ? 0 : t.rating } : t))} />
                  <span className="text-xs text-muted-foreground">N/A</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <StarRating value={tasks[i].rating} onChange={(v) => setTasks((p) => p.map((t, j) => j === i ? { ...t, rating: v } : t))} disabled={tasks[i].isNA} />
                <Input placeholder="Comment..." value={tasks[i].comment} onChange={(e) => setTasks((p) => p.map((t, j) => j === i ? { ...t, comment: e.target.value } : t))} className="flex-1" disabled={tasks[i].isNA} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card><CardContent className="pt-6 space-y-3">
        <Label>Final Comments</Label>
        <Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="General comments..." rows={3} />
      </CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Checklist</Button></div>
    </div>
  );
}

function WeeklyAuditForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [auditorName, setAuditorName] = useState("");
  const [dateOfSubmission, setDateOfSubmission] = useState(() => new Date().toISOString().split("T")[0]);
  const defaultWeekAudit = useMemo(() => getDefaultWeekRange(), []);
  const [weekStart, setWeekStart] = useState(defaultWeekAudit.start);
  const [weekEnd, setWeekEnd] = useState(defaultWeekAudit.end);
  const [ratings, setRatings] = useState<Record<string, Record<number, number>>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!auditorName.trim() || !selectedStore) { toast.error("Please fill in your name and select a store"); return; }
    // Compute average score across all sections
    const allRatings = Object.values(ratings).flatMap(section => Object.values(section));
    const avg = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
    const payload = { reportType: "ops-manager-checklist", location: selectedStore, submitterName: auditorName, reportDate: weekStart, data: { dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd, ratings, notes }, totalScore: avg.toFixed(2) };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Audit submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
      <h3 className="text-xl font-serif">Audit Submitted</h3>
      <p className="text-muted-foreground">Ops. Mgr Weekly Audit for {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Auditor Name</Label><Input value={auditorName} onChange={(e) => setAuditorName(e.target.value)} placeholder="Enter your name" /></div>
        <div className="space-y-1.5"><Label>Date of Submission</Label><Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Start Date *</Label><Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>End Date *</Label><Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} /></div>
        </div>
      </CardContent></Card>
      {AUDIT_SECTIONS.map((section) => (
        <Card key={section.title}><CardContent className="pt-6 space-y-4">
          <h3 className="font-serif text-lg">{section.title}</h3>
          {section.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <p className="text-sm">{item}</p>
              <StarRating value={ratings[section.title]?.[i] || 0} onChange={(v) => setRatings((prev) => ({ ...prev, [section.title]: { ...prev[section.title], [i]: v } }))} />
            </div>
          ))}
        </CardContent></Card>
      ))}
      <Card><CardContent className="pt-6 space-y-3"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Audit</Button></div>
    </div>
  );
}

// ─── Scorecard Section (DirectChecklist version) ───

interface ScorecardSectionData {
  thisWeekGoal: string;
  thisWeekActual: string;
  lastWeekActual: string;
  lastMonthActual: string;
  howContribute: string;
}

function initScorecardSection(): ScorecardSectionData {
  return { thisWeekGoal: "", thisWeekActual: "", lastWeekActual: "", lastMonthActual: "", howContribute: "" };
}

interface DigitalSectionData {
  googleReviews: string;
  howContribute: string;
}

function ScorecardSectionCard({
  title, icon: Icon, color, unit, goalLabel, data, onChange,
}: {
  title: string; icon: React.ElementType; color: string; unit: "%" | "$" | "" | "stars";
  goalLabel?: string; data: ScorecardSectionData; onChange: (d: ScorecardSectionData) => void;
}) {
  const update = (field: keyof ScorecardSectionData, value: string) => onChange({ ...data, [field]: value });
  const goal = parseFloat(data.thisWeekGoal);
  const actual = parseFloat(data.thisWeekActual);
  const hasComparison = !isNaN(goal) && !isNaN(actual) && goal > 0;
  const lowerIsBetter = title === "Labour" || title === "Food Cost";
  const isOnTarget = hasComparison ? (lowerIsBetter ? actual <= goal : actual >= goal) : null;
  const variance = hasComparison ? (unit === "%" ? (actual - goal).toFixed(1) : (actual - goal).toFixed(2)) : null;
  const prefix = unit === "$" ? "$" : "";
  const suffix = unit === "%" ? "%" : unit === "stars" ? " \u2605" : "";

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-3" style={{ background: color }}>
        <Icon className="w-5 h-5 text-white" />
        <h3 className="font-serif text-lg font-semibold text-white">{title}</h3>
        {isOnTarget !== null && (
          <div className={cn("ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            isOnTarget ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
          )}>
            {isOnTarget ? "On Target" : "Off Target"}
          </div>
        )}
      </div>
      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{goalLabel || "Goal"}</Label>
            <div className="relative">
              {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
              <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.thisWeekGoal} onChange={(e) => update("thisWeekGoal", e.target.value)} placeholder="0" className={cn("h-10 text-sm font-mono", unit === "$" && "pl-7")} />
              {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Week</Label>
            <div className="relative">
              {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
              <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.thisWeekActual} onChange={(e) => update("thisWeekActual", e.target.value)} placeholder="0" className={cn("h-10 text-sm font-mono", unit === "$" && "pl-7")} />
              {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variance</Label>
            <div className={cn("h-10 rounded-md border flex items-center justify-center text-sm font-mono font-medium",
              isOnTarget === null ? "border-border/60 text-muted-foreground bg-muted/30" :
              isOnTarget ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-700 bg-red-50"
            )}>
              {variance !== null ? <span>{parseFloat(variance) > 0 ? "+" : ""}{prefix}{variance}{suffix}</span> : <span className="text-muted-foreground">\u2014</span>}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Week</Label>
            <div className="relative">
              {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
              <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.lastWeekActual} onChange={(e) => update("lastWeekActual", e.target.value)} placeholder="0" className={cn("h-9 text-sm font-mono bg-muted/20", unit === "$" && "pl-7")} />
              {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Month</Label>
            <div className="relative">
              {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
              <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.lastMonthActual} onChange={(e) => update("lastMonthActual", e.target.value)} placeholder="0" className={cn("h-9 text-sm font-mono bg-muted/20", unit === "$" && "pl-7")} />
              {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How Do I Contribute?</Label>
          <Textarea value={data.howContribute} onChange={(e) => update("howContribute", e.target.value)} placeholder="Describe specific actions you take to impact this area..." rows={3} className="text-sm resize-none" />
        </div>
      </CardContent>
    </Card>
  );
}

function getDefaultWeekRange(): { start: string; end: string } {
  const now = new Date(); now.setHours(0,0,0,0);
  const day = now.getDay();
  const thisMon = new Date(now);
  thisMon.setDate(now.getDate() - ((day + 6) % 7));
  const prevMon = new Date(thisMon); prevMon.setDate(thisMon.getDate() - 7);
  const prevSun = new Date(prevMon); prevSun.setDate(prevMon.getDate() + 6);
  const iso = (dt: Date) => dt.toISOString().split("T")[0];
  return { start: iso(prevMon), end: iso(prevSun) };
}

function WeeklyScorecardForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [managerName, setManagerName] = useState("");
  const [dateEntered, setDateEntered] = useState(() => new Date().toISOString().split("T")[0]);
  const defaultWeek = useMemo(() => getDefaultWeekRange(), []);
  const [weekStart, setWeekStart] = useState(defaultWeek.start);
  const [weekEnd, setWeekEnd] = useState(defaultWeek.end);
  const weekOfLabel = useMemo(() => {
    const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return weekStart && weekEnd ? `${fmt(weekStart)} - ${fmt(weekEnd)}` : "";
  }, [weekStart, weekEnd]);
  const [sales, setSales] = useState<ScorecardSectionData>(initScorecardSection());
  const [labour, setLabour] = useState<ScorecardSectionData>(initScorecardSection());
  const [digital, setDigital] = useState<DigitalSectionData>({ googleReviews: "", howContribute: "" });
  const [food, setFood] = useState<ScorecardSectionData>(initScorecardSection());
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!managerName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const payload = {
      reportType: "weekly-scorecard", location: selectedStore, submitterName: managerName, reportDate: weekStart,
      data: { dateEntered, weekOf: weekOfLabel, weekOfStart: weekStart, weekOfEnd: weekEnd, sales, labour, digital, food },
    };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Scorecard submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Scorecard Submitted</h3>
      <p className="text-muted-foreground">Weekly Scorecard for {currentStoreName}</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => { setSales(initScorecardSection()); setLabour(initScorecardSection()); setDigital({ googleReviews: "", howContribute: "" }); setFood(initScorecardSection()); setManagerName(""); setSubmitted(false); }} variant="outline">New Report</Button>
        <Button onClick={onBack} variant="outline">Back</Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Enter your name" /></div>
          <div className="space-y-1.5"><Label>Date Completed</Label><Input type="date" value={dateEntered} onChange={(e) => setDateEntered(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Week Of — Start *</Label><Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Week Of — End *</Label><Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} /></div>
        </div>
      </CardContent></Card>

      <ScorecardSectionCard title="Sales" icon={DollarSign} color="#D4A853" unit="$" goalLabel="Weekly Goal" data={sales} onChange={setSales} />
      <ScorecardSectionCard title="Labour" icon={Users2} color="#3B82F6" unit="%" goalLabel="Target %" data={labour} onChange={setLabour} />

      {/* Digital Section */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-3" style={{ background: "#6366F1" }}>
          <MessageSquare className="w-5 h-5 text-white" />
          <h3 className="font-serif text-lg font-semibold text-white">Digital</h3>
        </div>
        <CardContent className="pt-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Google Reviews (Last Week)</Label>
            <Textarea value={digital.googleReviews} onChange={(e) => setDigital({ ...digital, googleReviews: e.target.value })} placeholder="Paste or summarize recent Google reviews..." rows={3} className="text-sm resize-none" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How Do I Contribute?</Label>
            <Textarea value={digital.howContribute} onChange={(e) => setDigital({ ...digital, howContribute: e.target.value })} placeholder="Describe how you encourage reviews, respond to feedback..." rows={3} className="text-sm resize-none" />
          </div>
        </CardContent>
      </Card>

      <ScorecardSectionCard title="Food Cost" icon={Utensils} color="#F97316" unit="%" goalLabel="Target %" data={food} onChange={setFood} />

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSubmit} className="flex-1 bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]"><CheckCircle2 className="w-4 h-4 mr-2" />Submit Scorecard</Button>
      </div>
    </div>
  );
}

function PerformanceEvaluationForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [evaluatorName, setEvaluatorName] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [employeeName, setEmployeeName] = useState("");
  const [employeePosition, setEmployeePosition] = useState("");
  const [ratings, setRatings] = useState(() => EVAL_CRITERIA.map(() => ({ rating: 0, comment: "" })));
  const [overallComments, setOverallComments] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const rated = ratings.filter((r) => r.rating > 0);
  const avg = rated.length > 0 ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(2) : "0.00";

  const handleSubmit = () => {
    if (!evaluatorName.trim() || !employeeName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const payload = {
      reportType: "performance-evaluation", location: selectedStore, submitterName: evaluatorName, reportDate,
      data: { employeeName, employeePosition, criteria: EVAL_CRITERIA.map((c, i) => ({ ...c, ...ratings[i] })), overallComments },
      totalScore: avg,
    };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Evaluation submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Evaluation Submitted</h3>
      <p className="text-muted-foreground">Performance Evaluation for {employeeName} at {currentStoreName} — Average: {avg}/5</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Your Name (Evaluator)</Label><Input value={evaluatorName} onChange={(e) => setEvaluatorName(e.target.value)} placeholder="Your name" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Employee Name</Label><Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Employee name" /></div>
          <div className="space-y-1.5"><Label>Employee Position</Label><Input value={employeePosition} onChange={(e) => setEmployeePosition(e.target.value)} placeholder="Position" /></div>
        </div>
        <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></div>
      </CardContent></Card>
      <div className="flex items-center gap-2">
        <span className="text-lg font-serif font-semibold border border-[#D4A853] text-[#D4A853] rounded-md px-4 py-2">Average: {avg} / 5</span>
      </div>
      {EVAL_CRITERIA.map((criterion, i) => (
        <Card key={criterion.key}>
          <CardContent className="pt-4 pb-4 space-y-2">
            <p className="font-medium">{criterion.title}</p>
            <p className="text-xs text-muted-foreground">{criterion.description}</p>
            <div className="flex items-center gap-3">
              <StarRating value={ratings[i].rating} onChange={(v) => setRatings((p) => p.map((r, j) => j === i ? { ...r, rating: v } : r))} />
              <Input placeholder="Comment..." value={ratings[i].comment} onChange={(e) => setRatings((p) => p.map((r, j) => j === i ? { ...r, comment: e.target.value } : r))} className="flex-1 h-8" />
            </div>
          </CardContent>
        </Card>
      ))}
      <Card><CardContent className="pt-6 space-y-3"><Label>Overall Comments</Label><Textarea value={overallComments} onChange={(e) => setOverallComments(e.target.value)} placeholder="Overall assessment and recommendations..." rows={3} /></CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Evaluation</Button></div>
    </div>
  );
}

// ─── Waste Item Data ───

const WASTE_BAGELS = [
  "Sesame Bagel", "Everything Bagel", "Plain Bagel", "Poppy Seeds Bagel", "Multigrain Bagel",
  "Cheese Bagel", "Rosemary Bagel", "Cinnamon Sugar Bagel", "Cinnamon Raisin Bagel",
  "Blueberry Bagel", "Coconut Bagel",
];
const WASTE_PASTRIES = [
  "Banana Bread with Nuts", "Croissant", "Croissant aux Amandes", "Chocolatine",
  "Chocolate Chips Cookie", "Muffin a L'Erabe", "Muffin Bleuets", "Muffin Pistaches",
  "Muffin Chocolat", "Yogurt Granola", "Fresh orange juice", "Gateau aux Carottes",
  "Granola bag", "Bagel Chips Bags", "Maple Pecan Bar", "Pudding",
];
const WASTE_CK_ITEMS = [
  "Tomatoes", "Pepper", "Onions", "Cucumber", "Lemon", "Avocado",
  "Mix Salad", "Lettuce", "Spring Mix", "Tofu", "Veggie Patty",
  "Mozzarella", "Cheddar", "Eggs", "Ham", "Smoke meat",
  "Bacon", "Bacon jam", "Chicken", "Cream Cheese",
];

const QTY_TYPES_BAGEL = ["bag", "unit", "dozen"];
const QTY_TYPES_PASTRY = ["unit"];
const QTY_TYPES_CK = ["unit", "container"];

interface WasteItemRow {
  enabled: boolean;
  leftover: string;
  leftoverQty: string;
  waste: string;
  wasteQty: string;
  comment: string;
}

function initRows(items: string[], defaultQty = "bag"): Record<string, WasteItemRow> {
  const rows: Record<string, WasteItemRow> = {};
  items.forEach((item) => {
    rows[item] = { enabled: true, leftover: "", leftoverQty: defaultQty, waste: "", wasteQty: defaultQty, comment: "" };
  });
  return rows;
}

function WasteItemTable({ title, items, rows, onChange, qtyTypes }: {
  title: string;
  items: string[];
  rows: Record<string, WasteItemRow>;
  onChange: (rows: Record<string, WasteItemRow>) => void;
  qtyTypes: string[];
}) {
  const updateRow = (item: string, field: keyof WasteItemRow, value: string | boolean) => {
    onChange({ ...rows, [item]: { ...rows[item], [field]: value } });
  };

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <h3 className="font-serif text-lg mb-4">{title}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-[180px]">Item</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[70px]">Leftover</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[90px]">Qty Type</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[70px]">Waste</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[90px]">Qty Type</th>
                <th className="text-left py-2 pl-2 font-medium text-muted-foreground">Comment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const row = rows[item];
                if (!row) return null;
                return (
                  <tr key={item} className={cn("border-b border-border/30 last:border-0", !row.enabled && "opacity-40")}>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateRow(item, "enabled", !row.enabled)}
                          className={cn(
                            "w-8 h-5 rounded-full transition-colors relative flex-shrink-0",
                            row.enabled ? "bg-[#D4A853]" : "bg-muted"
                          )}
                        >
                          <span className={cn(
                            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                            row.enabled ? "translate-x-3.5" : "translate-x-0.5"
                          )} />
                        </button>
                        <span className="text-sm font-medium truncate">{item}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number" min="0" step="0.1"
                        value={row.leftover}
                        onChange={(e) => updateRow(item, "leftover", e.target.value)}
                        disabled={!row.enabled}
                        className="h-8 w-[65px] text-sm"
                        placeholder=""
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.leftoverQty}
                        onChange={(e) => updateRow(item, "leftoverQty", e.target.value)}
                        disabled={!row.enabled}
                        className="h-8 w-[80px] text-sm rounded-md border border-border bg-background px-1.5"
                      >
                        {qtyTypes.map((q: string) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number" min="0" step="0.1"
                        value={row.waste}
                        onChange={(e) => updateRow(item, "waste", e.target.value)}
                        disabled={!row.enabled}
                        className="h-8 w-[65px] text-sm"
                        placeholder=""
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.wasteQty}
                        onChange={(e) => updateRow(item, "wasteQty", e.target.value)}
                        disabled={!row.enabled}
                        className="h-8 w-[80px] text-sm rounded-md border border-border bg-background px-1.5"
                      >
                        {qtyTypes.map((q: string) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pl-2">
                      <Input
                        value={row.comment}
                        onChange={(e) => updateRow(item, "comment", e.target.value)}
                        disabled={!row.enabled}
                        className="h-8 text-sm"
                        placeholder="..."
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function WasteReportForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bagelRows, setBagelRows] = useState<Record<string, WasteItemRow>>(() => initRows(WASTE_BAGELS, "bag"));
  const [pastryRows, setPastryRows] = useState<Record<string, WasteItemRow>>(() => initRows(WASTE_PASTRIES, "unit"));
  const [ckRows, setCkRows] = useState<Record<string, WasteItemRow>>(() => initRows(WASTE_CK_ITEMS, "unit"));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const collectData = () => {
    const collect = (rows: Record<string, WasteItemRow>) =>
      Object.entries(rows)
        .filter(([, r]) => r.enabled && (r.leftover || r.waste))
        .map(([item, r]) => ({
          item,
          leftover: r.leftover ? `${r.leftover} ${r.leftoverQty}` : "",
          waste: r.waste ? `${r.waste} ${r.wasteQty}` : "",
          comment: r.comment,
        }));
    return {
      bagels: collect(bagelRows),
      pastries: collect(pastryRows),
      ckItems: collect(ckRows),
    };
  };

  const handleSubmit = async () => {
    if (!selectedStore) { toast.error("Please select a store"); return; }
    setSubmitting(true);
    try {
      const data = collectData();
      const payload = {
        submitterName: "Store Staff",
        reportType: "waste-report",
        location: selectedStore,
        reportDate,
        data,
      };
      const res = await fetch("/api/public/submit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Submit failed");
      setSubmitted(true);
      toast.success("Waste report submitted!");
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedStore) { toast.error("Please select a store"); return; }
    const data = collectData();
    const storeName = stores.find(s => s.id === selectedStore)?.name || selectedStore;
    const lines: string[] = [`Leftovers & Waste Report`, `Date: ${reportDate}`, `Location: ${storeName}`, ""];
    const formatSection = (title: string, items: { item: string; leftover: string; waste: string; comment: string }[]) => {
      if (items.length === 0) return;
      lines.push(`--- ${title} ---`);
      items.forEach((i) => {
        const parts = [i.item];
        if (i.leftover) parts.push(`Leftover: ${i.leftover}`);
        if (i.waste) parts.push(`Waste: ${i.waste}`);
        if (i.comment) parts.push(`Note: ${i.comment}`);
        lines.push(parts.join(" | "));
      });
      lines.push("");
    };
    formatSection("Bagels", data.bagels);
    formatSection("Pastries", data.pastries);
    formatSection("CK Items", data.ckItems);
    const body = lines.join("\n");
    const subject = `Leftovers & Waste - ${storeName} - ${reportDate}`;
    try {
      const res = await fetch("/api/trpc/reports.sendWasteEmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { subject, body } }),
      });
      if (!res.ok) throw new Error();
      toast.success("Report sent by email!");
    } catch {
      // Fallback: open mailto
      const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailto, "_blank");
      toast.info("Opening email client...");
    }
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
      <h3 className="text-xl font-serif">Report Submitted</h3>
      <p className="text-muted-foreground">Leftovers & Waste for {currentStoreName} on {reportDate}</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => { setBagelRows(initRows(WASTE_BAGELS, "bag")); setPastryRows(initRows(WASTE_PASTRIES, "unit")); setCkRows(initRows(WASTE_CK_ITEMS, "unit")); setSubmitted(false); }} variant="outline">New Report</Button>
        <Button onClick={onBack} variant="outline">Back</Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      {/* Header row: Date + Location */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date</Label>
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="h-9" />
            </div>
            <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
          </div>
        </CardContent>
      </Card>

      {/* Bagels */}
      <WasteItemTable title="Bagels" items={WASTE_BAGELS} rows={bagelRows} onChange={setBagelRows} qtyTypes={QTY_TYPES_BAGEL} />

      {/* Pastries */}
      <WasteItemTable title="Pastries" items={WASTE_PASTRIES} rows={pastryRows} onChange={setPastryRows} qtyTypes={QTY_TYPES_PASTRY} />

      {/* CK Items */}
      <WasteItemTable title="CK Items" items={WASTE_CK_ITEMS} rows={ckRows} onChange={setCkRows} qtyTypes={QTY_TYPES_CK} />

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48] h-11"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {submitting ? "Submitting..." : "Submit Report"}
        </Button>
        <Button
          onClick={handleSendEmail}
          variant="outline"
          className="h-11"
        >
          <Send className="w-4 h-4 mr-2" />
          Send by Email
        </Button>
      </div>
    </div>
  );
}

function EquipmentMaintenanceForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [techName, setTechName] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [daily, setDaily] = useState(() => EQUIP_DAILY.map(() => ({ checked: false, initial: "" })));
  const [weekly, setWeekly] = useState(() => EQUIP_WEEKLY.map(() => ({ checked: false, initial: "" })));
  const [monthly, setMonthly] = useState(() => EQUIP_MONTHLY.map(() => ({ checked: false, initial: "" })));
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!techName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const total = daily.length + weekly.length + monthly.length;
    const checked = [...daily, ...weekly, ...monthly].filter((i) => i.checked).length;
    const payload = {
      reportType: "equipment-maintenance", location: selectedStore, submitterName: techName, reportDate,
      data: { daily: EQUIP_DAILY.map((e, i) => ({ ...e, ...daily[i] })), weekly: EQUIP_WEEKLY.map((e, i) => ({ ...e, ...weekly[i] })), monthly: EQUIP_MONTHLY.map((e, i) => ({ ...e, ...monthly[i] })) },
      totalScore: `${checked}/${total}`,
    };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Maintenance checklist submitted!");
  };

  const renderEquipSection = (sectionTitle: string, items: { equipment: string; task: string }[], data: { checked: boolean; initial: string }[], setData: React.Dispatch<React.SetStateAction<{ checked: boolean; initial: string }[]>>) => (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <h3 className="font-serif text-lg">{sectionTitle}</h3>
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <Checkbox checked={data[i].checked} onCheckedChange={(c) => setData((p) => p.map((d, j) => j === i ? { ...d, checked: !!c } : d))} />
            <div className="flex-1">
              <span className="text-sm font-medium">{item.equipment}</span>
              <span className="text-sm text-muted-foreground"> — {item.task}</span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Submitted</h3>
      <p className="text-muted-foreground">Equipment & Maintenance for {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Your Name</Label><Input value={techName} onChange={(e) => setTechName(e.target.value)} placeholder="Enter your name" /></div>
        <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></div>
      </CardContent></Card>
      {renderEquipSection("Daily Checks", EQUIP_DAILY, daily, setDaily)}
      {renderEquipSection("Weekly Checks", EQUIP_WEEKLY, weekly, setWeekly)}
      {renderEquipSection("Monthly Checks", EQUIP_MONTHLY, monthly, setMonthly)}
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Checklist</Button></div>
    </div>
  );
}

function TrainingEvaluationForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [trainerName, setTrainerName] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [traineeName, setTraineeName] = useState("");
  const [ratings, setRatings] = useState(() => TRAINING_AREAS.map((a) => a.items.map(() => ({ rating: 0, comment: "" }))));
  const [overallComments, setOverallComments] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const allRatings = ratings.flat().filter((r) => r.rating > 0);
  const avg = allRatings.length > 0 ? (allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length).toFixed(2) : "0.00";

  const handleSubmit = () => {
    if (!trainerName.trim() || !traineeName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const payload = {
      reportType: "training-evaluation", location: selectedStore, submitterName: trainerName, reportDate,
      data: { traineeName, areas: TRAINING_AREAS.map((a, ai) => ({ title: a.title, items: a.items.map((item, ii) => ({ item, ...ratings[ai][ii] })) })), overallComments },
      totalScore: avg,
    };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Training evaluation submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Submitted</h3>
      <p className="text-muted-foreground">Training Evaluation for {traineeName} at {currentStoreName} — Average: {avg}/5</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Your Name (Evaluator)</Label><Input value={trainerName} onChange={(e) => setTrainerName(e.target.value)} placeholder="Your name" /></div>
        <div className="space-y-1.5"><Label>Trainee Name</Label><Input value={traineeName} onChange={(e) => setTraineeName(e.target.value)} placeholder="Trainee name" /></div>
        <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} /></div>
      </CardContent></Card>
      <div className="flex items-center gap-2">
        <span className="text-lg font-serif font-semibold border border-[#D4A853] text-[#D4A853] rounded-md px-4 py-2">Average: {avg} / 5</span>
      </div>
      {TRAINING_AREAS.map((area, ai) => (
        <Card key={ai}>
          <CardContent className="pt-6 space-y-3">
            <h3 className="font-serif text-lg">{area.title}</h3>
            {area.items.map((item, ii) => (
              <div key={ii} className="space-y-2">
                <p className="text-sm">{item}</p>
                <div className="flex items-center gap-3">
                  <StarRating value={ratings[ai][ii].rating} onChange={(v) => setRatings((p) => p.map((a, aj) => aj === ai ? a.map((r, rj) => rj === ii ? { ...r, rating: v } : r) : a))} />
                  <Input placeholder="Comment..." value={ratings[ai][ii].comment} onChange={(e) => setRatings((p) => p.map((a, aj) => aj === ai ? a.map((r, rj) => rj === ii ? { ...r, comment: e.target.value } : r) : a))} className="flex-1 h-8" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Card><CardContent className="pt-6 space-y-3"><Label>Overall Comments</Label><Textarea value={overallComments} onChange={(e) => setOverallComments(e.target.value)} placeholder="Overall assessment..." rows={3} /></CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Evaluation</Button></div>
    </div>
  );
}

function BagelOrdersForm({ onBack }: { onBack: () => void }) {
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [ordererName, setOrdererName] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [orders, setOrders] = useState(() => BAGEL_TYPES.map(() => DAYS.map(() => "")));
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!ordererName.trim() || !selectedStore || !orderDate) { toast.error("Please fill required fields"); return; }
    const payload = {
      reportType: "bagel-orders", location: selectedStore, submitterName: ordererName, reportDate: orderDate,
      data: { orders: BAGEL_TYPES.map((type, i) => ({ type, quantities: Object.fromEntries(DAYS.map((d, j) => [d, orders[i][j]])) })) },
    };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Bagel order submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Order Submitted</h3>
      <p className="text-muted-foreground">Bagel Order for {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Your Name</Label><Input value={ordererName} onChange={(e) => setOrdererName(e.target.value)} placeholder="Enter your name" /></div>
        <div className="space-y-1.5"><Label>Week Starting</Label><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-serif text-lg">Order Quantities by Day</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-2 font-medium">Type</th>
                {DAYS.map((d) => <th key={d} className="text-center py-2 px-1 font-medium text-xs">{d.slice(0, 3)}</th>)}
              </tr>
            </thead>
            <tbody>
              {BAGEL_TYPES.map((type, ti) => (
                <tr key={type} className="border-b">
                  <td className="py-1 pr-2 text-sm">{type}</td>
                  {DAYS.map((_, di) => (
                    <td key={di} className="py-1 px-1">
                      <Input type="number" min="0" placeholder="0" value={orders[ti][di]} onChange={(e) => setOrders((p) => p.map((r, ri) => ri === ti ? r.map((c, ci) => ci === di ? e.target.value : c) : r))} className="h-7 w-12 text-center text-xs" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Order</Button></div>
    </div>
  );
}

// ─── Copy Link Helper ───

function CopyChecklistLink({ slug, label }: { slug: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const url = `${baseUrl}/checklists/${slug}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(`Link copied for ${label}`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

// ─── Main Component ───

export default function DirectChecklist() {
  const params = useParams<{ type: string }>();
  const [, navigate] = useLocation();
  const slug = params.type || "";
  const checklistType = SLUG_TO_CHECKLIST[slug];
  const label = SLUG_TO_LABEL[slug] || "Checklist";

  if (!checklistType) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center mx-auto">
              <span className="text-2xl text-white">!</span>
            </div>
            <h2 className="text-xl font-bold">Checklist Not Found</h2>
            <p className="text-muted-foreground">
              The checklist type <code>{slug}</code> does not exist.
            </p>
            <Button onClick={() => navigate("/")} variant="outline">
              Back to Dashboard
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const formMap: Record<string, React.ReactNode> = {
    "operations": <ManagerChecklistForm onBack={() => navigate("/")} />,
    "weekly-audit": <WeeklyAuditForm onBack={() => navigate("/")} />,
    "weekly-scorecard": <WeeklyScorecardForm onBack={() => navigate("/")} />,
    "performance": <PerformanceEvaluationForm onBack={() => navigate("/")} />,
    "waste": <WasteReportForm onBack={() => navigate("/")} />,
    "equipment": <EquipmentMaintenanceForm onBack={() => navigate("/")} />,
    "training": <TrainingEvaluationForm onBack={() => navigate("/")} />,
    "bagel-orders": <BagelOrdersForm onBack={() => navigate("/")} />,
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[900px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">
              Reports & Checklists
            </p>
            <h2 className="text-2xl font-serif text-foreground">
              {label}
            </h2>
          </div>
          <CopyChecklistLink slug={slug} label={label} />
        </div>

        {formMap[slug]}
      </div>
    </DashboardLayout>
  );
}
