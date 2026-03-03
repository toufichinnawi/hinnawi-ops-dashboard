// DirectChecklist — Opens a specific checklist form directly from the sidebar
// No position selection, no checklist list — just the form with a store dropdown
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { ALL_CHECKLISTS, type ChecklistType } from "@/lib/positionChecklists";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

// Re-use the DashboardChecklistForm from ChecklistViewer
import ChecklistViewer from "./ChecklistViewer";

// We need to import the form component directly, so let's create a wrapper
// that renders the form for a given checklist type

import { useState } from "react";
import { stores } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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

const EQUIPMENT_SECTIONS = {
  daily: ["Espresso machine backflush", "Grinder purge", "Fridge temp check", "Sanitize prep area", "Clean blender"],
  weekly: ["Descale espresso machine", "Deep clean grinder burrs", "Defrost freezer", "Clean oven racks", "Check fire extinguisher"],
  monthly: ["Replace water filter", "Calibrate scale", "Inspect gas lines", "Service HVAC filter", "Test emergency lights"],
};

const BAGEL_TYPES = [
  "Plain", "Sesame", "Poppy", "Everything", "Cinnamon Raisin", "Whole Wheat",
  "Multigrain", "Blueberry", "Jalapeño", "Onion", "Garlic", "Salt",
];

const PERFORMANCE_CATEGORIES = [
  { name: "Customer Service", desc: "Greeting, friendliness, problem resolution" },
  { name: "Product Knowledge", desc: "Menu items, ingredients, preparation methods" },
  { name: "Speed & Efficiency", desc: "Order processing, multitasking, time management" },
  { name: "Teamwork", desc: "Collaboration, communication, supporting colleagues" },
  { name: "Cleanliness & Hygiene", desc: "Personal hygiene, workspace cleanliness, food safety" },
  { name: "Reliability", desc: "Punctuality, attendance, consistency" },
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
  "operations": "Operations Checklist",
  "weekly-audit": "Weekly Store Audit",
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
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!managerName.trim() || !selectedStore) { toast.error("Please fill in your name and select a store"); return; }
    const filled = Object.keys(ratings).length;
    if (filled < OPS_TASKS.length) { toast.error(`Please rate all ${OPS_TASKS.length} items`); return; }
    const avg = Object.values(ratings).reduce((a, b) => a + b, 0) / OPS_TASKS.length;
    const payload = { type: "manager-checklist", location: selectedStore, submittedBy: managerName, data: { ratings, notes, averageScore: avg.toFixed(2) } };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Checklist submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
      <h3 className="text-xl font-serif">Submitted Successfully</h3>
      <p className="text-muted-foreground">Operations Checklist for {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Your Name</Label><Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Enter your name" /></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-serif text-lg">Rate Each Area (1–5 Stars)</h3>
        {OPS_TASKS.map((task, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div><p className="text-sm font-medium">{task.en}</p><p className="text-xs text-muted-foreground">{task.fr}</p></div>
            <StarRating value={ratings[i] || 0} onChange={(v) => setRatings((prev) => ({ ...prev, [i]: v }))} />
          </div>
        ))}
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-3">
        <Label>Additional Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any observations..." rows={3} />
      </CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Checklist</Button></div>
    </div>
  );
}

function WeeklyAuditForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [auditorName, setAuditorName] = useState("");
  const [ratings, setRatings] = useState<Record<string, Record<number, number>>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!auditorName.trim() || !selectedStore) { toast.error("Please fill in your name and select a store"); return; }
    const payload = { type: "ops-manager-checklist", location: selectedStore, submittedBy: auditorName, data: { ratings, notes } };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Audit submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
      <h3 className="text-xl font-serif">Audit Submitted</h3>
      <p className="text-muted-foreground">Weekly Store Audit for {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Auditor Name</Label><Input value={auditorName} onChange={(e) => setAuditorName(e.target.value)} placeholder="Enter your name" /></div>
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

function WeeklyScorecardForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [managerName, setManagerName] = useState("");
  const [weekOf, setWeekOf] = useState("");
  const [totalSales, setTotalSales] = useState("");
  const [labourCost, setLabourCost] = useState("");
  const [foodCost, setFoodCost] = useState("");
  const [customerCount, setCustomerCount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!managerName.trim() || !selectedStore || !weekOf) { toast.error("Please fill required fields"); return; }
    const payload = { type: "weekly-scorecard", location: selectedStore, submittedBy: managerName, data: { weekOf, totalSales, labourCost, foodCost, customerCount, notes } };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Scorecard submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Scorecard Submitted</h3>
      <p className="text-muted-foreground">Weekly Scorecard for {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Manager Name</Label><Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Enter your name" /></div>
        <div className="space-y-1.5"><Label>Week Of</Label><Input type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} /></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-serif text-lg">Weekly Numbers</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Total Sales ($)</Label><Input type="number" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-1.5"><Label>Labour Cost ($)</Label><Input type="number" value={labourCost} onChange={(e) => setLabourCost(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-1.5"><Label>Food Cost ($)</Label><Input type="number" value={foodCost} onChange={(e) => setFoodCost(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-1.5"><Label>Customer Count</Label><Input type="number" value={customerCount} onChange={(e) => setCustomerCount(e.target.value)} placeholder="0" /></div>
        </div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-3"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Scorecard</Button></div>
    </div>
  );
}

function PerformanceEvaluationForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [evaluatorName, setEvaluatorName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!evaluatorName.trim() || !employeeName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const payload = { type: "performance-evaluation", location: selectedStore, submittedBy: evaluatorName, data: { employeeName, ratings, strengths, improvements } };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Evaluation submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Evaluation Submitted</h3>
      <p className="text-muted-foreground">Performance Evaluation for {employeeName} at {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Evaluator Name</Label><Input value={evaluatorName} onChange={(e) => setEvaluatorName(e.target.value)} placeholder="Your name" /></div>
        <div className="space-y-1.5"><Label>Employee Name</Label><Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Employee being evaluated" /></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-serif text-lg">Performance Categories</h3>
        {PERFORMANCE_CATEGORIES.map((cat, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <div><p className="text-sm font-medium">{cat.name}</p><p className="text-xs text-muted-foreground">{cat.desc}</p></div>
            <StarRating value={ratings[i] || 0} onChange={(v) => setRatings((prev) => ({ ...prev, [i]: v }))} />
          </div>
        ))}
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-1.5"><Label>Key Strengths</Label><Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} rows={3} /></div>
        <div className="space-y-1.5"><Label>Areas for Improvement</Label><Textarea value={improvements} onChange={(e) => setImprovements(e.target.value)} rows={3} /></div>
      </CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Evaluation</Button></div>
    </div>
  );
}

function WasteReportForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [reporterName, setReporterName] = useState("");
  const [bagelLeftovers, setBagelLeftovers] = useState("");
  const [pastryLeftovers, setPastryLeftovers] = useState("");
  const [ckLeftovers, setCkLeftovers] = useState("");
  const [wasteNotes, setWasteNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!reporterName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const payload = { type: "waste-report", location: selectedStore, submittedBy: reporterName, data: { bagelLeftovers, pastryLeftovers, ckLeftovers, wasteNotes } };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Waste report submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Report Submitted</h3>
      <p className="text-muted-foreground">Leftovers & Waste for {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Your Name</Label><Input value={reporterName} onChange={(e) => setReporterName(e.target.value)} placeholder="Enter your name" /></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-serif text-lg">Leftovers Count</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5"><Label>Bagels</Label><Input type="number" value={bagelLeftovers} onChange={(e) => setBagelLeftovers(e.target.value)} placeholder="0" /></div>
          <div className="space-y-1.5"><Label>Pastries</Label><Input type="number" value={pastryLeftovers} onChange={(e) => setPastryLeftovers(e.target.value)} placeholder="0" /></div>
          <div className="space-y-1.5"><Label>CK Items</Label><Input type="number" value={ckLeftovers} onChange={(e) => setCkLeftovers(e.target.value)} placeholder="0" /></div>
        </div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-3"><Label>Waste Notes</Label><Textarea value={wasteNotes} onChange={(e) => setWasteNotes(e.target.value)} rows={3} placeholder="Any waste details..." /></CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Report</Button></div>
    </div>
  );
}

function EquipmentMaintenanceForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [techName, setTechName] = useState("");
  const [checks, setChecks] = useState<Record<string, Record<number, boolean>>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!techName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const payload = { type: "equipment-maintenance", location: selectedStore, submittedBy: techName, data: { checks, notes } };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Maintenance checklist submitted!");
  };

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
      </CardContent></Card>
      {Object.entries(EQUIPMENT_SECTIONS).map(([period, items]) => (
        <Card key={period}><CardContent className="pt-6 space-y-3">
          <h3 className="font-serif text-lg capitalize">{period} Tasks</h3>
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Checkbox checked={checks[period]?.[i] || false} onCheckedChange={(v) => setChecks((prev) => ({ ...prev, [period]: { ...prev[period], [i]: !!v } }))} />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </CardContent></Card>
      ))}
      <Card><CardContent className="pt-6 space-y-3"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Checklist</Button></div>
    </div>
  );
}

function TrainingEvaluationForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [trainerName, setTrainerName] = useState("");
  const [traineeName, setTraineeName] = useState("");
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const areas = ["Product Knowledge", "Equipment Operation", "Customer Interaction", "Speed & Accuracy", "Hygiene & Safety", "Teamwork"];

  const handleSubmit = () => {
    if (!trainerName.trim() || !traineeName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const payload = { type: "training-evaluation", location: selectedStore, submittedBy: trainerName, data: { traineeName, ratings, notes } };
    fetch("/api/public/submit-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitted(true);
    toast.success("Training evaluation submitted!");
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Submitted</h3>
      <p className="text-muted-foreground">Training Evaluation for {traineeName} at {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Trainer Name</Label><Input value={trainerName} onChange={(e) => setTrainerName(e.target.value)} placeholder="Your name" /></div>
        <div className="space-y-1.5"><Label>Trainee Name</Label><Input value={traineeName} onChange={(e) => setTraineeName(e.target.value)} placeholder="Trainee name" /></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-serif text-lg">Training Areas</h3>
        {areas.map((area, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
            <p className="text-sm font-medium">{area}</p>
            <StarRating value={ratings[i] || 0} onChange={(v) => setRatings((prev) => ({ ...prev, [i]: v }))} />
          </div>
        ))}
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-3"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Evaluation</Button></div>
    </div>
  );
}

function BagelOrdersForm({ onBack }: { onBack: () => void }) {
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [ordererName, setOrdererName] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!ordererName.trim() || !selectedStore || !orderDate) { toast.error("Please fill required fields"); return; }
    const payload = { type: "bagel-orders", location: selectedStore, submittedBy: ordererName, data: { orderDate, quantities, notes } };
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
        <div className="space-y-1.5"><Label>Order Date</Label><Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} /></div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-serif text-lg">Bagel Quantities</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {BAGEL_TYPES.map((type, i) => (
            <div key={i} className="space-y-1.5">
              <Label className="text-xs">{type}</Label>
              <Input type="number" value={quantities[i] || ""} onChange={(e) => setQuantities((prev) => ({ ...prev, [i]: e.target.value }))} placeholder="0" className="h-9" />
            </div>
          ))}
        </div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-3"><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} /></CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">Submit Order</Button></div>
    </div>
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
        <div className="flex items-center gap-3 mb-6">
          <div>
            <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">
              Reports & Checklists
            </p>
            <h2 className="text-2xl font-serif text-foreground">
              {label}
            </h2>
          </div>
        </div>

        {formMap[slug]}
      </div>
    </DashboardLayout>
  );
}
