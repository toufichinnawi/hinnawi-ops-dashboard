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

import { useState, useMemo, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { stores } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { CheckCircle2, Send, DollarSign, Users2, MessageSquare, Utensils, AlertTriangle, Camera } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PhotoUpload, type UploadedPhoto } from "@/components/PhotoUpload";
import { calcBagelCost, calcPastryCost, calcCKCost } from "@shared/wastePricing";
import { useDuplicateReportCheck, updateReport } from "@/hooks/useDuplicateReportCheck";

// Edit mode props passed from main component
type EditProps = { editReportId?: number; editData?: any; editStore?: string };

// Edit mode banner shown at top of form when editing
function EditBanner({ reportId }: { reportId: number }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm mb-4">
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span>Editing report #{reportId} — changes will overwrite the existing submission.</span>
    </div>
  );
}

// Shared duplicate-check adapter — first tries overwrite:false, shows dialog on 409, then re-submits with overwrite:true
function useDuplicateCheck() {
  const { submitWithCheck, duplicateDialog } = useDuplicateReportCheck();
  async function submitWithDuplicateCheck(
    reportData: { submitterName: string; reportType: string; location: string; reportDate: string; data: any; totalScore?: string | null },
    onSuccess: () => void,
    onError: (msg: string) => void,
    setSubmitting: (v: boolean) => void,
  ) {
    await submitWithCheck(reportData, onSuccess, onError, setSubmitting);
  }
  return { submitWithDuplicateCheck, duplicateDialog };
}

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
  { en: "Pastries table full and remains all day", fr: "Table des pâtisseries pleine et maintenue toute la journée" },
  { en: "Quality of the cortado", fr: "Qualité du cortado" },
  { en: "Verify the espresso", fr: "Vérifier l'espresso" },
  { en: "Verify the filter coffee", fr: "Vérifier le café filtre" },
  { en: "Trap for flies", fr: "Piège à mouches" },
  { en: "Grease from ventilation system near the entrance", fr: "Graisse du système de ventilation près de l'entrée" },
  { en: "Verify espresso maintenance: blind filter, white cleaning product, once per week", fr: "Vérifier l'entretien de la machine à espresso" },
  { en: "Portafilter have rubber and beck and drip well and mesh clean", fr: "Le porte-filtre doit être en bon état" },
  { en: "AC maintenance", fr: "Entretien de la climatisation" },
  { en: "Fridge and freezer compressors get cleaned regularly", fr: "Nettoyage régulier des compresseurs" },
  { en: "Cutting board", fr: "Planche à découper" },
  { en: "Always someone at the cash", fr: "Toujours quelqu'un à la caisse" },
  { en: "Keep the line flowing", fr: "Maintenir la file fluide" },
  { en: "Always 2 employees on the cash when there are a few customers", fr: "Toujours 2 employés à la caisse" },
  { en: "All employees wearing shirt Hinnawi and hair net behind the counter", fr: "Tous les employés portent la chemise Hinnawi" },
  { en: "Kitchen staff wearing gloves in the kitchen", fr: "Le personnel de cuisine porte des gants" },
  { en: "All staff must wrap the sandwiches properly", fr: "Tout le personnel doit bien emballer les sandwichs" },
  { en: "Greet the client right away", fr: "Saluer le client immédiatement" },
  { en: "Price displayed for each item for sale", fr: "Prix affiché pour chaque article" },
  { en: "Overall energy of the team", fr: "Énergie générale de l'équipe" },
  { en: "Customer service", fr: "Service à la clientèle" },
  { en: "Cleanliness of the cafe", fr: "Propreté du café" },
  { en: "Deep cleaning", fr: "Nettoyage en profondeur" },
  { en: "Kitchen floor", fr: "Plancher de la cuisine" },
  { en: "Entrance steps", fr: "Marches d'entrée" },
];

const AUDIT_SECTIONS = [
  "Exterior",
  "Display",
  "Bathroom",
  "Equipment",
  "Product Quality",
  "Service Quality",
];

const SECTION_TASKS = {
  morning: ["Open registers & count float", "Brew first batch of coffee", "Stock pastry case", "Check fridge temps", "Wipe tables & counters", "Unlock doors & flip sign"],
  afternoon: ["Restock bagels & pastries", "Clean espresso machine", "Wipe down tables", "Check supply levels", "Empty trash if full", "Prep for evening rush"],
  closing: ["Lock doors & flip sign", "Clean all equipment", "Mop floors", "Count registers", "Set alarm", "Final walkthrough"],
};

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
  "Sesame Bagel", "Everything Bagel", "Plain Bagel", "Mini-Bagel Plain",
  "Poppy Seeds Bagel", "Multigrain Bagel", "Cheese Bagel", "Rosemary Bagel",
  "Cinnamon Sugar Bagel", "Cinnamon Raisin Bagel", "Blueberry Bagel", "Coconut Bagel",
];

const PASTRY_ITEMS = [
  "Banana Bread with Nuts", "Croissant", "Croissant aux Amandes", "Chocolatine",
  "Chocolate Chips Cookie", "Muffin a L'Erable", "Muffin Bleuets", "Muffin Pistaches",
  "Muffin Chocolat", "Yogurt Granola", "Fresh orange juice", "Gateau aux Carottes",
  "Granola bag", "Bagel Chips Bags", "Maple Pecan Bar", "Pudding",
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
  "pastry-orders": "pastry-orders",
  "deep-clean": "deep-clean",
};

const SLUG_TO_LABEL: Record<string, string> = {
  "operations": "Store Weekly Checklist",
  "weekly-audit": "Store Weekly Audit",
  "weekly-scorecard": "Weekly Scorecard",
  "performance": "Performance Evaluation",
  "waste": "Leftovers & Waste",
  "equipment": "Equipment & Maintenance",
  "training": "Training Evaluation",
  "bagel-orders": "Bagel Orders",
  "pastry-orders": "Pastry Orders",
  "deep-clean": "Weekly Deep Clean Checklist",
};

// ─── Form Components ───

function ManagerChecklistForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
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
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedStore(editStore);
    if (d.dateOfSubmission) setDateOfSubmission(d.dateOfSubmission);
    if (d.weekOfStart) setWeekStart(d.weekOfStart);
    if (d.weekOfEnd) setWeekEnd(d.weekOfEnd);
    if (d.comments) setComments(d.comments);
    if (d.managerName) setManagerName(d.managerName);
    if (d.submitterName) setManagerName(d.submitterName);
    if (d.tasks && Array.isArray(d.tasks)) {
      setTasks(OPS_TASKS.map((_, i) => ({
        rating: d.tasks[i]?.rating || 0,
        isNA: d.tasks[i]?.isNA || false,
        comment: d.tasks[i]?.comment || "",
      })));
    }
  }, [editData, editStore]);

  const ratedTasks = tasks.filter((t) => !t.isNA && t.rating > 0);
  const avg = ratedTasks.length > 0 ? (ratedTasks.reduce((s, t) => s + t.rating, 0) / ratedTasks.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!managerName.trim() || !selectedStore) { toast.error("Please fill in your name and select a store"); return; }
    if (ratedTasks.length === 0) { toast.error("Please rate at least one item"); return; }
    const reportData = { dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd, tasks: OPS_TASKS.map((t, i) => ({ task: t.en, taskFr: t.fr, rating: tasks[i].rating, isNA: tasks[i].isNA, comment: tasks[i].comment })), comments, averageScore: avg };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, totalScore: avg, status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      {
        reportType: "manager-checklist", location: selectedStore, submitterName: managerName, reportDate: dateOfSubmission,
        data: reportData,
        totalScore: avg,
      },
      () => { setSubmitted(true); toast.success("Checklist submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
      <h3 className="text-xl font-serif">Submitted Successfully</h3>
      <p className="text-muted-foreground">Store Weekly Checklist for {currentStoreName} — Average: {avg}/5</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {isEdit && <EditBanner reportId={editReportId!} />}
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Your Name</Label><Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Enter your name" /></div>
        <div className="space-y-1.5"><Label>Date of Submission</Label><Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} /></div>
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
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">{submitting ? "Submitting..." : isEdit ? "Update Checklist" : "Submit Checklist"}</Button></div>
      {duplicateDialog}
    </div>
  );
}

function WeeklyAuditForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [auditorName, setAuditorName] = useState("");
  const [dateOfSubmission, setDateOfSubmission] = useState(() => new Date().toISOString().split("T")[0]);

  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [sectionPhotos, setSectionPhotos] = useState<Record<string, UploadedPhoto[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
   const { submitWithDuplicateCheck, duplicateDialog: auditDuplicateDialog } = useDuplicateCheck();

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedStore(editStore);
    if (d.dateOfSubmission) setDateOfSubmission(d.dateOfSubmission);
    if (d.auditorName) setAuditorName(d.auditorName);
    if (d.submitterName) setAuditorName(d.submitterName);
    if (d.ratings) setRatings(d.ratings);
    if (d.sectionComments) setSectionComments(d.sectionComments);
    if (d.notes) setNotes(d.notes);
    if (d.sectionPhotos) setSectionPhotos(d.sectionPhotos);
  }, [editData, editStore]);

  const handleSubmit = async () => {
    if (!auditorName.trim() || !selectedStore) { toast.error("Please fill in your name and select a store"); return; }
    const allRatings = Object.values(ratings).filter(v => v > 0);
    const avg = allRatings.length > 0 ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0;
    const photoUrls: Record<string, string[]> = {};
    for (const [section, photos] of Object.entries(sectionPhotos)) {
      const urls = photos.filter(p => p.status === "success" && p.url).map(p => p.url);
      if (urls.length > 0) photoUrls[section] = urls;
    }
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId, { data: { dateOfSubmission, ratings, sectionComments, notes, sectionPhotos: photoUrls, averageScore: avg.toFixed(2) }, totalScore: avg.toFixed(2), status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      {
        reportType: "ops-manager-checklist", location: selectedStore, submitterName: auditorName, reportDate: dateOfSubmission,
        data: {
          dateOfSubmission,
          sections: AUDIT_SECTIONS.map(s => ({ title: s, rating: ratings[s] || 0, comment: sectionComments[s] || "", photos: photoUrls[s] || [] })),
          notes,
          averageScore: avg.toFixed(2),
        },
        totalScore: avg.toFixed(2),
      },
      () => { setSubmitted(true); toast.success("Audit submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
      <h3 className="text-xl font-serif">Audit Submitted</h3>
      <p className="text-muted-foreground">Store Weekly Audit for {currentStoreName}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {isEdit && <EditBanner reportId={editReportId!} />}
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Auditor Name</Label><Input value={auditorName} onChange={(e) => setAuditorName(e.target.value)} placeholder="Enter your name" /></div>
        <div className="space-y-1.5"><Label>Date of Submission</Label><Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} /></div>
      </CardContent></Card>
      {AUDIT_SECTIONS.map((section) => {
        const photos = sectionPhotos[section] || [];
        const photoCount = photos.filter(p => p.status === "success").length;
        return (
          <Card key={section}><CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-lg">{section}</h3>
              <StarRating value={ratings[section] || 0} onChange={(v) => setRatings(prev => ({ ...prev, [section]: v }))} />
            </div>
            <Textarea
              value={sectionComments[section] || ""}
              onChange={(e) => setSectionComments(prev => ({ ...prev, [section]: e.target.value }))}
              placeholder={`Comments about ${section.toLowerCase()}...`}
              rows={2}
            />
            <div>
              <button
                type="button"
                onClick={() => {
                  if (!sectionPhotos[section]) setSectionPhotos(prev => ({ ...prev, [section]: [] }));
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors mb-2",
                  photoCount > 0
                    ? "bg-[#D4A853]/15 text-[#D4A853] hover:bg-[#D4A853]/25"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Camera className="w-3.5 h-3.5" />
                {photoCount > 0 ? `${photoCount} photo${photoCount > 1 ? "s" : ""}` : "Attach Photo"}
              </button>
              {sectionPhotos[section] !== undefined && (
                <PhotoUpload
                  photos={photos}
                  onChange={(newPhotos) => setSectionPhotos(prev => ({ ...prev, [section]: newPhotos }))}
                  maxPhotos={5}
                  label={`${section} Photos`}
                />
              )}
            </div>
          </CardContent></Card>
        );
      })}
      <Card><CardContent className="pt-6 space-y-3"><Label>Additional Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="General notes..." rows={3} /></CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">{submitting ? "Submitting..." : isEdit ? "Update Audit" : "Submit Audit"}</Button></div>
      {auditDuplicateDialog}
    </div>
  );
}

// ─── Scorecard Section (DirectChecklist version) ───

interface ScorecardSectionData {
  thisWeekGoal: string;
  thisWeekActual: string;
  prevWeekGoal: string;
  prevWeekActual: string;
  howContribute: string;
}

interface FoodSectionData extends ScorecardSectionData {
  lastMonthGoal: string;
  lastMonthActual: string;
  wasteThisWeek: string;
}

function initScorecardSection(defaultGoal?: string): ScorecardSectionData {
  return { thisWeekGoal: defaultGoal || "", thisWeekActual: "", prevWeekGoal: defaultGoal || "", prevWeekActual: "", howContribute: "" };
}

function initFoodSection(): FoodSectionData {
  return { thisWeekGoal: "30", thisWeekActual: "", prevWeekGoal: "", prevWeekActual: "", lastMonthGoal: "30", lastMonthActual: "", wasteThisWeek: "", howContribute: "" };
}

interface DigitalSectionData {
  googleReviews: string;
  howContribute: string;
}

function ScorecardSectionCard({
  title, icon: Icon, color, unit, data, onChange, prevLabel,
}: {
  title: string; icon: React.ElementType; color: string; unit: "%" | "$";
  data: ScorecardSectionData; onChange: (d: ScorecardSectionData) => void; prevLabel?: string;
}) {
  const update = (field: keyof ScorecardSectionData, value: string) => onChange({ ...data, [field]: value });
  const goal = parseFloat(data.thisWeekGoal);
  const actual = parseFloat(data.thisWeekActual);
  const hasComparison = !isNaN(goal) && !isNaN(actual) && goal > 0;
  const lowerIsBetter = title === "Labour" || title.includes("Food");
  const isOnTarget = hasComparison ? (lowerIsBetter ? actual <= goal : actual >= goal) : null;

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
        {/* Table header */}
        <div className="grid grid-cols-3 gap-3">
          <div />
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Goal</Label>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Actual</Label>
        </div>
        {/* This Week */}
        <div className="grid grid-cols-3 gap-3 items-center">
          <Label className="text-sm font-medium">This Week (Mon-Sun)</Label>
          <div className="relative">
            {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
            <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.thisWeekGoal} onChange={(e) => update("thisWeekGoal", e.target.value)} placeholder="0" className={cn("h-10 text-sm font-mono", unit === "$" && "pl-7")} />
            {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
          </div>
          <div className="relative">
            {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
            <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.thisWeekActual} onChange={(e) => update("thisWeekActual", e.target.value)} placeholder="0" className={cn("h-10 text-sm font-mono", unit === "$" && "pl-7")} />
            {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
          </div>
        </div>
        {/* Previous Week */}
        <div className="grid grid-cols-3 gap-3 items-center">
          <Label className="text-sm font-medium">{prevLabel || "Previous Week (Mon-Sun)"}</Label>
          <div className="relative">
            {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
            <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.prevWeekGoal} onChange={(e) => update("prevWeekGoal", e.target.value)} placeholder="0" className={cn("h-9 text-sm font-mono bg-muted/20", unit === "$" && "pl-7")} />
            {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
          </div>
          <div className="relative">
            {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
            <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.prevWeekActual} onChange={(e) => update("prevWeekActual", e.target.value)} placeholder="0" className={cn("h-9 text-sm font-mono bg-muted/20", unit === "$" && "pl-7")} />
            {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
          </div>
        </div>
        {/* How Do I Contribute? */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-amber-700 uppercase tracking-wider">How Do I Contribute?</Label>
          <Textarea value={data.howContribute} onChange={(e) => update("howContribute", e.target.value)} placeholder="Describe specific actions you take to impact this area..." rows={3} className="text-sm resize-none" />
        </div>
      </CardContent>
    </Card>
  );
}

function FoodCostSectionCard({
  data, onChange,
}: {
  data: FoodSectionData; onChange: (d: FoodSectionData) => void;
}) {
  const update = (field: keyof FoodSectionData, value: string) => onChange({ ...data, [field]: value });
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-3" style={{ background: "#F97316" }}>
        <Utensils className="w-5 h-5 text-white" />
        <h3 className="font-serif text-lg font-semibold text-white">Food Cost / Purchases</h3>
      </div>
      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div />
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Goal</Label>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Actual</Label>
        </div>
        <div className="grid grid-cols-3 gap-3 items-center">
          <Label className="text-sm font-medium">This Week</Label>
          <div className="relative">
            <Input type="number" min="0" step="0.1" value={data.thisWeekGoal} onChange={(e) => update("thisWeekGoal", e.target.value)} placeholder="30" className="h-10 text-sm font-mono" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
          <div className="relative">
            <Input type="number" min="0" step="0.1" value={data.thisWeekActual} onChange={(e) => update("thisWeekActual", e.target.value)} placeholder="0" className="h-10 text-sm font-mono" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 items-center">
          <Label className="text-sm font-medium">Last Month</Label>
          <div className="relative">
            <Input type="number" min="0" step="0.1" value={data.lastMonthGoal} onChange={(e) => update("lastMonthGoal", e.target.value)} placeholder="30" className="h-9 text-sm font-mono bg-muted/20" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
          <div className="relative">
            <Input type="number" min="0" step="0.1" value={data.lastMonthActual} onChange={(e) => update("lastMonthActual", e.target.value)} placeholder="0" className="h-9 text-sm font-mono bg-muted/20" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 items-center">
          <Label className="text-sm font-medium">Waste (this week)</Label>
          <div />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="0.01" value={data.wasteThisWeek} onChange={(e) => update("wasteThisWeek", e.target.value)} placeholder="0.00" className="h-10 text-sm font-mono pl-7" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-amber-700 uppercase tracking-wider">How Do I Contribute?</Label>
          <Textarea value={data.howContribute} onChange={(e) => update("howContribute", e.target.value)} placeholder="Describe specific actions you take to reduce food costs and waste..." rows={3} className="text-sm resize-none" />
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

function WeeklyScorecardForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [managerName, setManagerName] = useState("");
  const [dateEntered, setDateEntered] = useState(() => new Date().toISOString().split("T")[0]);

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedStore(editStore);
    if (d.dateEntered) setDateEntered(d.dateEntered);
    if (d.managerName) setManagerName(d.managerName);
    if (d.submitterName) setManagerName(d.submitterName);
  }, [editData, editStore]);
  const defaultWeek = useMemo(() => getDefaultWeekRange(), []);
  const [weekStart, setWeekStart] = useState(defaultWeek.start);
  const [weekEnd, setWeekEnd] = useState(defaultWeek.end);
  const weekOfLabel = useMemo(() => {
    const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return weekStart && weekEnd ? `${fmt(weekStart)} - ${fmt(weekEnd)}` : "";
  }, [weekStart, weekEnd]);
  const [sales, setSales] = useState<ScorecardSectionData>(initScorecardSection());
  const [labour, setLabour] = useState<ScorecardSectionData>(initScorecardSection("18"));
  const [digital, setDigital] = useState<DigitalSectionData>({ googleReviews: "", howContribute: "" });
  const [food, setFood] = useState<FoodSectionData>(initFoodSection());
  const [generalNotes, setGeneralNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: scorecardDuplicateDialog } = useDuplicateCheck();

  const handleSubmit = async () => {
    if (!managerName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: { dateEntered, weekOf: weekOfLabel, weekOfStart: weekStart, weekOfEnd: weekEnd, sales, labour, digital, food, generalNotes }, status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      {
        reportType: "weekly-scorecard", location: selectedStore, submitterName: managerName, reportDate: weekStart,
        data: { dateEntered, weekOf: weekOfLabel, weekOfStart: weekStart, weekOfEnd: weekEnd, sales, labour, digital, food, generalNotes },
      },
      () => { setSubmitted(true); toast.success("Scorecard submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Scorecard Submitted</h3>
      <p className="text-muted-foreground">Weekly Scorecard for {currentStoreName}</p>
      <div className="flex gap-3 justify-center">
        <Button onClick={() => { setSales(initScorecardSection()); setLabour(initScorecardSection("18")); setDigital({ googleReviews: "", howContribute: "" }); setFood(initFoodSection()); setGeneralNotes(""); setManagerName(""); setSubmitted(false); }} variant="outline">New Report</Button>
        <Button onClick={onBack} variant="outline">Back</Button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-5">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5"><Label>Name *</Label>{isEdit && <EditBanner reportId={editReportId!} />}
      <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Enter your name" /></div>
          <div className="space-y-1.5"><Label>Date Completed</Label><Input type="date" value={dateEntered} onChange={(e) => setDateEntered(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Week Of — Start *</Label><Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Week Of — End *</Label><Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} /></div>
        </div>
      </CardContent></Card>

      <ScorecardSectionCard title="Sales" icon={DollarSign} color="#D4A853" unit="$" data={sales} onChange={setSales} />
      <ScorecardSectionCard title="Labour" icon={Users2} color="#3B82F6" unit="%" data={labour} onChange={setLabour} />

      {/* Food Cost / Purchases Section */}
      <FoodCostSectionCard data={food} onChange={setFood} />

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

      {/* General Notes */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-3" style={{ background: "#6B7280" }}>
          <MessageSquare className="w-5 h-5 text-white" />
          <h3 className="font-serif text-lg font-semibold text-white">Notes</h3>
        </div>
        <CardContent className="pt-5">
          <Textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} placeholder="Any additional notes, observations, or comments for this week..." rows={4} className="text-sm resize-none" />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]"><CheckCircle2 className="w-4 h-4 mr-2" />{submitting ? "Submitting..." : isEdit ? "Update Scorecard" : "Submit Scorecard"}</Button>
      </div>
      {scorecardDuplicateDialog}
    </div>
  );
}

function PerformanceEvaluationForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [evaluatorName, setEvaluatorName] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedStore(editStore);
    if (d.reportDate || d.dateOfSubmission) setReportDate(d.reportDate || d.dateOfSubmission);
    if (d.evaluatorName) setEvaluatorName(d.evaluatorName);
    if (d.submitterName) setEvaluatorName(d.submitterName);
  }, [editData, editStore]);
  const [employeeName, setEmployeeName] = useState("");
  const [employeePosition, setEmployeePosition] = useState("");
  const [ratings, setRatings] = useState(() => EVAL_CRITERIA.map(() => ({ rating: 0, comment: "" })));
  const [overallComments, setOverallComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: perfDuplicateDialog } = useDuplicateCheck();

  const rated = ratings.filter((r) => r.rating > 0);
  const avg = rated.length > 0 ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!evaluatorName.trim() || !employeeName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId, { data: { employeeName, employeePosition, criteria: EVAL_CRITERIA.map((c, i) => ({ ...c, ...ratings[i] })), overallComments }, totalScore: avg, status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      {
        reportType: "performance-evaluation", location: selectedStore, submitterName: evaluatorName, reportDate,
        data: { employeeName, employeePosition, criteria: EVAL_CRITERIA.map((c, i) => ({ ...c, ...ratings[i] })), overallComments },
        totalScore: avg,
      },
      () => { setSubmitted(true); toast.success("Evaluation submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
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
      {isEdit && <EditBanner reportId={editReportId!} />}
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
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">{submitting ? "Submitting..." : isEdit ? "Update Evaluation" : "Submit Evaluation"}</Button></div>
      {perfDuplicateDialog}
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
  "Chocolate Chips Cookie", "Muffin a L'Erable", "Muffin Bleuets", "Muffin Pistaches",
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

function WasteItemTable({ title, items, rows, onChange, qtyTypes, costFn }: {
  title: string;
  items: string[];
  rows: Record<string, WasteItemRow>;
  onChange: (rows: Record<string, WasteItemRow>) => void;
  qtyTypes: string[];
  costFn: (item: string, qty: number, qtyType: string) => number;
}) {
  const updateRow = (item: string, field: keyof WasteItemRow, value: string | boolean) => {
    onChange({ ...rows, [item]: { ...rows[item], [field]: value } });
  };

  // Calculate section totals
  let sectionLeftoverCost = 0;
  let sectionWasteCost = 0;
  items.forEach((item) => {
    const row = rows[item];
    if (!row || !row.enabled) return;
    const lQty = parseFloat(row.leftover) || 0;
    const wQty = parseFloat(row.waste) || 0;
    if (lQty > 0) sectionLeftoverCost += costFn(item, lQty, row.leftoverQty);
    if (wQty > 0) sectionWasteCost += costFn(item, wQty, row.wasteQty);
  });
  const sectionTotal = sectionLeftoverCost + sectionWasteCost;

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif text-lg">{title}</h3>
          {sectionTotal > 0 && (
            <span className="text-sm font-mono font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200/50">
              ${sectionTotal.toFixed(2)}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-[160px]">Item</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[65px]">Leftover</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[80px]">Qty Type</th>
                <th className="text-right py-2 px-1 font-medium text-blue-600 w-[55px]">L.Cost</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[65px]">Waste</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[80px]">Qty Type</th>
                <th className="text-right py-2 px-1 font-medium text-orange-600 w-[55px]">W.Cost</th>
                <th className="text-left py-2 pl-2 font-medium text-muted-foreground">Comment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const row = rows[item];
                if (!row) return null;
                const lQty = parseFloat(row.leftover) || 0;
                const wQty = parseFloat(row.waste) || 0;
                const leftoverCost = row.enabled && lQty > 0 ? costFn(item, lQty, row.leftoverQty) : 0;
                const wasteCost = row.enabled && wQty > 0 ? costFn(item, wQty, row.wasteQty) : 0;
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
                        className="h-8 w-[60px] text-sm"
                        placeholder=""
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.leftoverQty}
                        onChange={(e) => updateRow(item, "leftoverQty", e.target.value)}
                        disabled={!row.enabled}
                        className="h-8 w-[75px] text-sm rounded-md border border-border bg-background px-1.5"
                      >
                        {qtyTypes.map((q: string) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-1 text-right">
                      {leftoverCost > 0 ? (
                        <span className="text-xs font-mono text-blue-600">${leftoverCost.toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number" min="0" step="0.1"
                        value={row.waste}
                        onChange={(e) => updateRow(item, "waste", e.target.value)}
                        disabled={!row.enabled}
                        className="h-8 w-[60px] text-sm"
                        placeholder=""
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.wasteQty}
                        onChange={(e) => updateRow(item, "wasteQty", e.target.value)}
                        disabled={!row.enabled}
                        className="h-8 w-[75px] text-sm rounded-md border border-border bg-background px-1.5"
                      >
                        {qtyTypes.map((q: string) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </td>
                    <td className="py-2 px-1 text-right">
                      {wasteCost > 0 ? (
                        <span className="text-xs font-mono text-orange-600">${wasteCost.toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
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

function WasteReportForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitterName, setSubmitterName] = useState("");

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedStore(editStore);
    if (d.reportDate || d.dateOfSubmission) setReportDate(d.reportDate || d.dateOfSubmission);
    if (d.submitterName) setSubmitterName(d.submitterName);
  }, [editData, editStore]);
  const [bagelRows, setBagelRows] = useState<Record<string, WasteItemRow>>(() => initRows(WASTE_BAGELS, "bag"));
  const [pastryRows, setPastryRows] = useState<Record<string, WasteItemRow>>(() => initRows(WASTE_PASTRIES, "unit"));
  const [ckRows, setCkRows] = useState<Record<string, WasteItemRow>>(() => initRows(WASTE_CK_ITEMS, "unit"));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: wasteDuplicateDialog } = useDuplicateCheck();

  // Cost calculation helper
  const calcTotalCosts = () => {
    let leftoverTotal = 0;
    let wasteTotal = 0;
    // Bagels
    Object.entries(bagelRows).forEach(([, r]) => {
      if (!r.enabled) return;
      const lQ = parseFloat(r.leftover) || 0;
      const wQ = parseFloat(r.waste) || 0;
      if (lQ > 0) leftoverTotal += calcBagelCost(lQ, r.leftoverQty);
      if (wQ > 0) wasteTotal += calcBagelCost(wQ, r.wasteQty);
    });
    // Pastries
    Object.entries(pastryRows).forEach(([item, r]) => {
      if (!r.enabled) return;
      const lQ = parseFloat(r.leftover) || 0;
      const wQ = parseFloat(r.waste) || 0;
      if (lQ > 0) leftoverTotal += calcPastryCost(item, lQ);
      if (wQ > 0) wasteTotal += calcPastryCost(item, wQ);
    });
    // CK Items
    Object.entries(ckRows).forEach(([item, r]) => {
      if (!r.enabled) return;
      const lQ = parseFloat(r.leftover) || 0;
      const wQ = parseFloat(r.waste) || 0;
      if (lQ > 0) leftoverTotal += calcCKCost(item, lQ, r.leftoverQty);
      if (wQ > 0) wasteTotal += calcCKCost(item, wQ, r.wasteQty);
    });
    return { leftoverTotal, wasteTotal, grandTotal: leftoverTotal + wasteTotal };
  };

  const costs = calcTotalCosts();

  const collectData = () => {
    const collectBagels = (rows: Record<string, WasteItemRow>) =>
      Object.entries(rows)
        .filter(([, r]) => r.enabled && (r.leftover || r.waste))
        .map(([item, r]) => {
          const lQ = parseFloat(r.leftover) || 0;
          const wQ = parseFloat(r.waste) || 0;
          return {
            item,
            leftover: r.leftover ? `${r.leftover} ${r.leftoverQty}` : "",
            leftoverCost: lQ > 0 ? calcBagelCost(lQ, r.leftoverQty) : 0,
            waste: r.waste ? `${r.waste} ${r.wasteQty}` : "",
            wasteCost: wQ > 0 ? calcBagelCost(wQ, r.wasteQty) : 0,
            comment: r.comment,
          };
        });
    const collectPastries = (rows: Record<string, WasteItemRow>) =>
      Object.entries(rows)
        .filter(([, r]) => r.enabled && (r.leftover || r.waste))
        .map(([item, r]) => {
          const lQ = parseFloat(r.leftover) || 0;
          const wQ = parseFloat(r.waste) || 0;
          return {
            item,
            leftover: r.leftover ? `${r.leftover} ${r.leftoverQty}` : "",
            leftoverCost: lQ > 0 ? calcPastryCost(item, lQ) : 0,
            waste: r.waste ? `${r.waste} ${r.wasteQty}` : "",
            wasteCost: wQ > 0 ? calcPastryCost(item, wQ) : 0,
            comment: r.comment,
          };
        });
    const collectCK = (rows: Record<string, WasteItemRow>) =>
      Object.entries(rows)
        .filter(([, r]) => r.enabled && (r.leftover || r.waste))
        .map(([item, r]) => {
          const lQ = parseFloat(r.leftover) || 0;
          const wQ = parseFloat(r.waste) || 0;
          return {
            item,
            leftover: r.leftover ? `${r.leftover} ${r.leftoverQty}` : "",
            leftoverCost: lQ > 0 ? calcCKCost(item, lQ, r.leftoverQty) : 0,
            waste: r.waste ? `${r.waste} ${r.wasteQty}` : "",
            wasteCost: wQ > 0 ? calcCKCost(item, wQ, r.wasteQty) : 0,
            comment: r.comment,
          };
        });
    return {
      bagels: collectBagels(bagelRows),
      pastries: collectPastries(pastryRows),
      ckItems: collectCK(ckRows),
      costs: calcTotalCosts(),
    };
  };

  const handleSubmit = async () => {
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    const data = collectData();
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data, status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: submitterName.trim(),
        reportType: "waste-report",
        location: selectedStore,
        reportDate,
        data,
      },
      () => { setSubmitted(true); toast.success("Waste report submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
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
      {/* Header row: Date + Location */}{isEdit && <EditBanner reportId={editReportId!} />}
      
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Your Name *</Label>
              <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date</Label>
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="h-9" />
            </div>
            <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
          </div>
        </CardContent>
      </Card>

      {/* Bagels */}
      <WasteItemTable title="Bagels" items={WASTE_BAGELS} rows={bagelRows} onChange={setBagelRows} qtyTypes={QTY_TYPES_BAGEL} costFn={(_item, qty, qtyType) => calcBagelCost(qty, qtyType)} />

      {/* Pastries */}
      <WasteItemTable title="Pastries" items={WASTE_PASTRIES} rows={pastryRows} onChange={setPastryRows} qtyTypes={QTY_TYPES_PASTRY} costFn={(item, qty, _qtyType) => calcPastryCost(item, qty)} />

      {/* CK Items */}
      <WasteItemTable title="CK Items" items={WASTE_CK_ITEMS} rows={ckRows} onChange={setCkRows} qtyTypes={QTY_TYPES_CK} costFn={(item, qty, qtyType) => calcCKCost(item, qty, qtyType)} />

      {/* Total Cost Summary */}
      {costs.grandTotal > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-5 pb-4">
            <h3 className="font-serif text-lg mb-3 text-red-800">Waste & Leftover Cost Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-1">Leftover Cost</p>
                <p className="text-xl font-mono font-bold text-blue-700">${costs.leftoverTotal.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-xs text-orange-600 font-medium mb-1">Waste Cost</p>
                <p className="text-xl font-mono font-bold text-orange-700">${costs.wasteTotal.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 border border-red-300">
                <p className="text-xs text-red-600 font-medium mb-1">Total Cost</p>
                <p className="text-xl font-mono font-bold text-red-700">${costs.grandTotal.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48] h-11"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {submitting ? "Submitting..." : isEdit ? "Update Report" : "Submit Report"}
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
      {wasteDuplicateDialog}
    </div>
  );
}

function EquipmentMaintenanceForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [techName, setTechName] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedStore(editStore);
    if (d.reportDate || d.dateOfSubmission) setReportDate(d.reportDate || d.dateOfSubmission);
    if (d.techName) setTechName(d.techName);
    if (d.submitterName) setTechName(d.submitterName);
  }, [editData, editStore]);
  const [daily, setDaily] = useState(() => EQUIP_DAILY.map(() => ({ checked: false, initial: "" })));
  const [weekly, setWeekly] = useState(() => EQUIP_WEEKLY.map(() => ({ checked: false, initial: "" })));
  const [monthly, setMonthly] = useState(() => EQUIP_MONTHLY.map(() => ({ checked: false, initial: "" })));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: equipDuplicateDialog } = useDuplicateCheck();

  const handleSubmit = async () => {
    if (!techName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const total = daily.length + weekly.length + monthly.length;
    const checked = [...daily, ...weekly, ...monthly].filter((i) => i.checked).length;
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId, { data: { daily: EQUIP_DAILY.map((e, i) => ({ ...e, ...daily[i] })), weekly: EQUIP_WEEKLY.map((e, i) => ({ ...e, ...weekly[i] })), monthly: EQUIP_MONTHLY.map((e, i) => ({ ...e, ...monthly[i] })) }, totalScore: `${checked}/${total}`, status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      {
        reportType: "equipment-maintenance", location: selectedStore, submitterName: techName, reportDate,
        data: { daily: EQUIP_DAILY.map((e, i) => ({ ...e, ...daily[i] })), weekly: EQUIP_WEEKLY.map((e, i) => ({ ...e, ...weekly[i] })), monthly: EQUIP_MONTHLY.map((e, i) => ({ ...e, ...monthly[i] })) },
        totalScore: `${checked}/${total}`,
      },
      () => { setSubmitted(true); toast.success("Maintenance checklist submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
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
      {isEdit && <EditBanner reportId={editReportId!} />}
      {renderEquipSection("Daily Checks", EQUIP_DAILY, daily, setDaily)}
      {renderEquipSection("Weekly Checks", EQUIP_WEEKLY, weekly, setWeekly)}
      {renderEquipSection("Monthly Checks", EQUIP_MONTHLY, monthly, setMonthly)}
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">{submitting ? "Submitting..." : isEdit ? "Update Checklist" : "Submit Checklist"}</Button></div>
      {equipDuplicateDialog}
    </div>
  );
}

function TrainingEvaluationForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [trainerName, setTrainerName] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedStore(editStore);
    if (d.reportDate || d.dateOfSubmission) setReportDate(d.reportDate || d.dateOfSubmission);
    if (d.trainerName) setTrainerName(d.trainerName);
    if (d.submitterName) setTrainerName(d.submitterName);
  }, [editData, editStore]);
  const [traineeName, setTraineeName] = useState("");
  const [ratings, setRatings] = useState(() => TRAINING_AREAS.map((a) => a.items.map(() => ({ rating: 0, comment: "" }))));
  const [overallComments, setOverallComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: trainingDuplicateDialog } = useDuplicateCheck();

  const allRatings = ratings.flat().filter((r) => r.rating > 0);
  const avg = allRatings.length > 0 ? (allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!trainerName.trim() || !traineeName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId, { data: { traineeName, areas: TRAINING_AREAS.map((a, ai) => ({ title: a.title, items: a.items.map((item, ii) => ({ item, ...ratings[ai][ii] })) })), overallComments }, totalScore: avg, status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      {
        reportType: "training-evaluation", location: selectedStore, submitterName: trainerName, reportDate,
        data: { traineeName, areas: TRAINING_AREAS.map((a, ai) => ({ title: a.title, items: a.items.map((item, ii) => ({ item, ...ratings[ai][ii] })) })), overallComments },
        totalScore: avg,
      },
      () => { setSubmitted(true); toast.success("Training evaluation submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
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
      {isEdit && <EditBanner reportId={editReportId!} />}
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
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">{submitting ? "Submitting..." : isEdit ? "Update Evaluation" : "Submit Evaluation"}</Button></div>
      {trainingDuplicateDialog}
    </div>
  );
}
function BagelOrdersForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
  // Admin can select any location including Sales
  const [selectedLocation, setSelectedLocation] = useState("sales");

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedLocation(editStore);
    if (d.location) setSelectedLocation(d.location);
  }, [editData, editStore]);
  const isSales = selectedLocation === "sales";
  const [ordererName, setOrdererName] = useState("");
  const [clientName, setClientName] = useState("");
  const [orderForDate, setOrderForDate] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(BAGEL_TYPES.map(t => [t, ""])));
  const [itemUnits, setItemUnits] = useState<Record<string, "dozen" | "unit" | "box">>(() => Object.fromEntries(BAGEL_TYPES.map(t => [t, "dozen"])));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: bagelDuplicateDialog } = useDuplicateCheck();

  const locationLabel = isSales ? "Sales" : (stores.find(s => s.shortName === selectedLocation)?.name || selectedLocation);

  const buildPayload = () => ({
    reportType: "bagel-orders", location: isSales ? "sales" : selectedLocation, submitterName: ordererName, reportDate: orderForDate,
    data: {
      orderForDate,
      ...(isSales ? { clientName: clientName.trim() } : {}),
      orders: BAGEL_TYPES.map(type => ({ type, quantity: quantities[type] || "0", unit: itemUnits[type] || "dozen" })),
    },
  });

  const handleSubmit = async () => {
    if (!selectedLocation) { toast.error("Please select a location"); return; }
    if (!ordererName.trim()) { toast.error("Please enter your name"); return; }
    if (isSales && !clientName.trim()) { toast.error("Please enter the client name"); return; }
    if (!orderForDate) { toast.error("Please select the order date"); return; }
    if (isEdit) {
      setSubmitting(true);
      try {
        const payload = buildPayload();
        await updateReport(editReportId!, { data: payload.data, status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      buildPayload(),
      () => { setSubmitted(true); toast.success(`Bagel order submitted for ${locationLabel}${isSales ? ` — ${clientName}` : ""}!`); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Order Submitted</h3>
      <p className="text-muted-foreground">Bagel Order for {locationLabel}{isSales ? ` — ${clientName}` : ""}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Location Selector — Sales + all stores */}{isEdit && <EditBanner reportId={editReportId!} />}
      
      <Card><CardContent className="pt-6">
        <Label className="text-sm font-medium">Location</Label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
          <button
            type="button"
            onClick={() => setSelectedLocation("sales")}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 text-left",
              selectedLocation === "sales"
                ? "border-purple-500 bg-purple-50 text-purple-700"
                : "border-border/60 bg-background hover:border-purple-400 text-muted-foreground hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Sales</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Client Orders</p>
          </button>
          {stores.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => setSelectedLocation(store.shortName)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 text-left",
                selectedLocation === store.shortName
                  ? "border-[#D4A853] bg-[#D4A853]/10 text-[#D4A853]"
                  : "border-border/60 bg-background hover:border-[#D4A853]/40 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: store.color }} />
                <span>{store.shortName}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{store.name}</p>
            </button>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        {isSales && (
          <div className="space-y-1.5"><Label>Client Name <span className="text-red-500">*</span></Label><Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name" /></div>
        )}
        <div className="space-y-1.5"><Label>Your Name <span className="text-red-500">*</span></Label><Input value={ordererName} onChange={(e) => setOrdererName(e.target.value)} placeholder="Enter your name" /></div>
        <div className="space-y-1.5"><Label>Order for Date <span className="text-red-500">*</span></Label><Input type="date" value={orderForDate} onChange={(e) => setOrderForDate(e.target.value)} /></div>

      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="font-serif text-lg">Order Quantities</h3>
          <p className="text-sm text-amber-600 font-medium mt-1 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">Select dozen or unit per item.{isSales ? " Box option available for Sales orders." : ""} Default is dozen (12 units per dozen).</p>
        </div>
        <div className="space-y-2">
          {BAGEL_TYPES.map((type) => (
            <div key={type} className="flex items-center justify-between gap-4 py-1.5 border-b last:border-0">
              <span className="text-sm">{type}</span>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="0.5" placeholder="0" value={quantities[type]} onChange={(e) => setQuantities(prev => ({ ...prev, [type]: e.target.value }))} className="h-8 w-20 text-center text-sm" />
                <select value={itemUnits[type]} onChange={(e) => setItemUnits(prev => ({ ...prev, [type]: e.target.value as "dozen" | "unit" | "box" }))} className={cn("h-8 rounded-md border border-border bg-background px-1 text-xs", isSales ? "w-[4.5rem]" : "w-16")}>
                  <option value="dozen">doz.</option>
                  <option value="unit">pcs</option>
                  {isSales && <option value="box">box</option>}
                </select>
              </div>
            </div>
          ))}
        </div>
      </CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting} className="bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">{submitting ? "Submitting..." : isEdit ? "Update Order" : "Submit Order"}</Button></div>
      {bagelDuplicateDialog}
    </div>
  );
}

// ─── Pastry Orders Form (Admin) ───

function PastryOrdersForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
  const [selectedLocation, setSelectedLocation] = useState(stores[0]?.shortName || "");

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedLocation(editStore);
    if (d.location) setSelectedLocation(d.location);
  }, [editData, editStore]);
  const [ordererName, setOrdererName] = useState("");
  const [orderForDate, setOrderForDate] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(PASTRY_ITEMS.map(t => [t, ""])));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: pastryDuplicateDialog } = useDuplicateCheck();

  const locationLabel = stores.find(s => s.shortName === selectedLocation)?.name || selectedLocation;

  const buildPayload = () => ({
    reportType: "pastry-orders", location: selectedLocation, submitterName: ordererName, reportDate: orderForDate,
    data: {
      orderForDate,
      orders: PASTRY_ITEMS.map(type => ({ type, quantity: quantities[type] || "0", unit: "unit" })),
    },
  });

  const handleSubmit = async () => {
    if (!selectedLocation) { toast.error("Please select a location"); return; }
    if (!ordererName.trim()) { toast.error("Please enter your name"); return; }
    if (!orderForDate) { toast.error("Please select the order date"); return; }
    if (isEdit) {
      setSubmitting(true);
      try {
        const payload = buildPayload();
        await updateReport(editReportId!, { data: payload.data, status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      buildPayload(),
      () => { setSubmitted(true); toast.success(`Pastry order submitted for ${locationLabel}!`); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /><h3 className="text-xl font-serif">Order Submitted</h3>
      <p className="text-muted-foreground">Pastry Order for {locationLabel}</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Location Selector — stores only (no Sales for pastry) */}{isEdit && <EditBanner reportId={editReportId!} />}
      
      <Card><CardContent className="pt-6">
        <Label className="text-sm font-medium">Location</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {stores.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => setSelectedLocation(store.shortName)}
              className={cn(
                "px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 text-left",
                selectedLocation === store.shortName
                  ? "border-rose-500 bg-rose-50 text-rose-700"
                  : "border-border/60 bg-background hover:border-rose-400 text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: store.color }} />
                <span>{store.shortName}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{store.name}</p>
            </button>
          ))}
        </div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-1.5"><Label>Your Name <span className="text-red-500">*</span></Label><Input value={ordererName} onChange={(e) => setOrdererName(e.target.value)} placeholder="Enter your name" /></div>
        <div className="space-y-1.5"><Label>Order for Date <span className="text-red-500">*</span></Label><Input type="date" value={orderForDate} onChange={(e) => setOrderForDate(e.target.value)} /></div>
      </CardContent></Card>

      <Card><CardContent className="pt-6 space-y-4">
        <div>
          <h3 className="font-serif text-lg">Pastry Quantities</h3>
          <p className="text-sm text-rose-600 font-medium mt-1 bg-rose-50 border border-rose-200 rounded-md px-3 py-1.5">Enter the quantity for each pastry item (in units).</p>
        </div>
        <div className="space-y-2">
          {PASTRY_ITEMS.map((type) => (
            <div key={type} className="flex items-center justify-between gap-4 py-1.5 border-b last:border-0">
              <span className="text-sm">{type}</span>
              <div className="flex items-center gap-2">
                <Input type="number" min="0" step="1" placeholder="0" value={quantities[type]} onChange={(e) => setQuantities(prev => ({ ...prev, [type]: e.target.value }))} className="h-8 w-20 text-center text-sm" />
                <span className="text-xs text-muted-foreground w-10">unit</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent></Card>
      <div className="flex gap-3"><Button variant="outline" onClick={onBack}>Cancel</Button><Button onClick={handleSubmit} disabled={submitting} className="bg-rose-500 text-white hover:bg-rose-600">{submitting ? "Submitting..." : isEdit ? "Update Order" : "Submit Order"}</Button></div>
      {pastryDuplicateDialog}
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

// ─── Deep Clean Checklist Data ───

const DEEP_CLEAN_SECTIONS = [
  {
    title: "1. Outside and Entrance",
    description: "The exterior sets the first impression for clients. Ensure the entrance is inviting, clean, and safe.",
    items: [
      "Sweep and clean the floor outside the main entrance.",
      "Clean all window frames, from both inside and outside.",
      "Clean all exterior signs (Monthly deep clean).",
    ],
  },
  {
    title: "2. Front Display & Pastry Section",
    description: "The display area must be cleaned to showcase products effectively and maintain food safety standards.",
    items: [
      "Clean and sanitize the entire front display and pastry section.",
      "Ensure pastry glass is completely clean and transparent.",
    ],
  },
  {
    title: "3. Cafe & Sitting Area",
    description: "The dining area must provide a comfortable, spotless environment for guests.",
    items: [
      "Clean the legs of tables and the edges of all benches.",
      "Check that tables do not have any sticky stains or spots.",
      "Verify walls are clean and free of spots or splashes.",
      "Deep clean all tiles and edges of the walls, ensuring no stains or dust remain.",
      "Move benches to vacuum behind them and clean the floor underneath.",
      "Move bench cushions to clean and vacuum inside the seating structures.",
    ],
  },
  {
    title: "4. Espresso & Filter Coffee Machines",
    description: "Proper maintenance of coffee equipment is crucial for beverage quality and machine longevity.",
    items: [
      "Espresso: Backflush with cleaner, then backflush thoroughly with water.",
      "Espresso: Clean drip tray, grate, and wipe the machine exterior. Descale if applicable.",
      "Filter: Descale internal system and clean the thermos with designated cleaning product.",
    ],
  },
  {
    title: "5. Kitchen & Food Prep Areas",
    description: "The kitchen requires the most rigorous deep cleaning to adhere to health and safety regulations.",
    items: [
      "Clean under and behind the big cutting board located on the fridge.",
      "Deep clean the grill, including the surrounding wall, underneath, grease container, and all sides.",
      "Clean the hood, the top of the hood, and ensure filters are clean.",
      "Clean the interior shelves and handles of all fridges and freezers. Ensure they are organized.",
      "Clean floors, especially under all kitchen equipment.",
    ],
  },
  {
    title: "6. Dishwasher & Ice Machine",
    description: "Sanitation equipment must be kept clean to function effectively.",
    items: [
      "Dishwasher: Drain machine, shut down, open/clean filters, clean door edges (inside/out).",
      "Dishwasher: Start machine again, let it wash itself, and drain one more time.",
      "Ice Machine: Clean the filter (shut down, empty, then clean).",
      "Ice Machine: Clean and sanitize interior, especially the ice deflector to prevent mold.",
    ],
  },
  {
    title: "7. Bathroom",
    description: "Restrooms must be meticulously maintained to ensure customer comfort and hygiene.",
    items: [
      "Deep clean and thoroughly disinfect the entire bathroom.",
    ],
  },
  {
    title: "8. General Maintenance",
    description: "Miscellaneous tasks and specific back-of-house areas that require weekly attention.",
    items: [
      "General: Clean garbage cans (interior/exterior) and sanitize frequently. Empty trash bins.",
      "General: Scrub and clean mop bucket regularly; empty dirty water.",
      "General: Clean TV screens, the wall behind them, and the music display box.",
      "General: Clean the cabinets shelves, under the sink, under the equipments.",
    ],
  },
];

function DeepCleanForm({ onBack, editReportId, editData, editStore }: { onBack: () => void } & EditProps) {
  const isEdit = !!editReportId;
  const [selectedStore, setSelectedStore] = useState("");
  const currentStoreName = stores.find(s => s.id === selectedStore)?.shortName || "";
  const [managerName, setManagerName] = useState("");
  const [dateOfSubmission, setDateOfSubmission] = useState(() => new Date().toISOString().split("T")[0]);
  const [overallComments, setOverallComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: deepCleanDuplicateDialog } = useDuplicateCheck();

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = editData;
    if (editStore) setSelectedStore(editStore);
    if (d.dateOfSubmission) setDateOfSubmission(d.dateOfSubmission);
    if (d.managerName) setManagerName(d.managerName);
    if (d.submitterName) setManagerName(d.submitterName);
    if (d.overallComments) setOverallComments(d.overallComments);
  }, [editData, editStore]);

  type DeepCleanItemState = { rating: number; na: boolean; comment: string };
  const initItems = (): Record<string, DeepCleanItemState[]> => {
    const result: Record<string, DeepCleanItemState[]> = {};
    DEEP_CLEAN_SECTIONS.forEach((s) => {
      result[s.title] = s.items.map(() => ({ rating: 0, na: false, comment: "" }));
    });
    return result;
  };
  const [items, setItems] = useState<Record<string, DeepCleanItemState[]>>(initItems);

  const updateItem = (sectionTitle: string, itemIdx: number, update: Partial<DeepCleanItemState>) => {
    setItems((prev) => ({
      ...prev,
      [sectionTitle]: prev[sectionTitle].map((item, i) =>
        i === itemIdx ? { ...item, ...update } : item
      ),
    }));
  };

  const allRatings = Object.values(items).flat().filter((item) => !item.na && item.rating > 0);
  const avg = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b.rating, 0) / allRatings.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!managerName.trim() || !selectedStore) { toast.error("Please fill required fields"); return; }
    const deepCleanData = {
      dateOfSubmission,
      sections: DEEP_CLEAN_SECTIONS.map((s) => ({
        title: s.title,
        items: s.items.map((itemText, idx) => ({
          task: itemText,
          rating: items[s.title]?.[idx]?.rating || 0,
          na: items[s.title]?.[idx]?.na || false,
          comment: items[s.title]?.[idx]?.comment || "",
        })),
      })),
      overallComments,
      averageScore: avg,
    };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: deepCleanData, totalScore: avg, status: "submitted" });
        setSubmitted(true); toast.success("Report updated!");
      } catch { toast.error("Failed to update report"); }
      finally { setSubmitting(false); }
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: managerName.trim(),
        reportType: "Weekly Deep Clean Checklist",
        location: selectedStore,
        reportDate: dateOfSubmission,
        data: {
          ...deepCleanData,
          submittedVia: "Admin Dashboard",
          submitterName: managerName.trim(),
        },
        totalScore: avg,
      },
      () => { setSubmitted(true); toast.success("Weekly Deep Clean Checklist submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 space-y-4">
      <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
      <h3 className="text-xl font-serif">Deep Clean Checklist Submitted</h3>
      <p className="text-muted-foreground">Weekly Deep Clean for {currentStoreName} — Average: {avg}/5</p>
      <Button onClick={onBack} variant="outline">Back</Button>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <Card><CardContent className="pt-6 space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="space-y-1.5"><Label>Manager Name *</Label><Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Your name" /></div>
        <div className="space-y-1.5"><Label>Date of Verification</Label><Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} /></div>
      </CardContent></Card>
      {isEdit && <EditBanner reportId={editReportId!} />}
      <div className="flex items-center gap-2">
        <span className="text-lg font-serif font-semibold border border-[#D4A853] text-[#D4A853] rounded-md px-4 py-2">Average: {avg} / 5</span>
      </div>

      {DEEP_CLEAN_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div>
              <p className="font-medium text-sm">{section.title}</p>
              <p className="text-xs text-muted-foreground">{section.description}</p>
            </div>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_120px_40px_1fr] gap-2 text-xs text-muted-foreground font-medium px-1">
              <span>Task</span>
              <span className="text-center">Rating (1-5)</span>
              <span className="text-center">N/A</span>
              <span>Comments</span>
            </div>
            {section.items.map((itemText, idx) => {
              const itemState = items[section.title]?.[idx] || { rating: 0, na: false, comment: "" };
              return (
                <div key={idx} className="border rounded-lg p-3 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_120px_40px_1fr] sm:gap-2 sm:items-center">
                  <p className="text-sm">{itemText}</p>
                  <div className="flex justify-center">
                    <StarRating value={itemState.na ? 0 : itemState.rating} onChange={(v) => updateItem(section.title, idx, { rating: v, na: false })} size="sm" />
                  </div>
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => updateItem(section.title, idx, { na: !itemState.na, rating: itemState.na ? itemState.rating : 0 })}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-xs font-medium border transition-colors",
                        itemState.na
                          ? "bg-gray-200 border-gray-400 text-gray-700"
                          : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                      )}
                    >
                      N/A
                    </button>
                  </div>
                  <Input placeholder="Comment..." value={itemState.comment} onChange={(e) => updateItem(section.title, idx, { comment: e.target.value })} className="h-8 text-sm" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Card><CardContent className="pt-6"><Label>Overall Comments / Areas for Improvement</Label><Textarea value={overallComments} onChange={(e) => setOverallComments(e.target.value)} placeholder="Overall assessment, areas for improvement, follow-up actions..." rows={4} /></CardContent></Card>

      <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#D4A853] hover:bg-[#c49843] text-white">
        {submitting ? "Submitting..." : isEdit ? "Update Checklist" : "Submit Checklist"}
      </Button>
      {deepCleanDuplicateDialog}
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

  // Edit mode: read editId from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const editIdParam = searchParams.get("editId");
  const editId = editIdParam ? parseInt(editIdParam, 10) : undefined;

  const [editReport, setEditReport] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(!!editId);

  useEffect(() => {
    if (!editId) return;
    setEditLoading(true);
    fetch(`/api/public/reports`)
      .then(r => r.json())
      .then((reports: any[]) => {
        const found = reports.find((r: any) => r.id === editId);
        if (found) {
          setEditReport(found);
        } else {
          toast.error("Report not found");
        }
      })
      .catch(() => toast.error("Failed to load report for editing"))
      .finally(() => setEditLoading(false));
  }, [editId]);

  const editProps: EditProps = editReport ? {
    editReportId: editReport.id,
    editData: typeof editReport.data === "string" ? JSON.parse(editReport.data) : editReport.data,
    editStore: editReport.location,
  } : {};

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

  const goBack = () => editId ? navigate("/reports/history") : navigate("/");

  const formMap: Record<string, React.ReactNode> = {
    "operations": <ManagerChecklistForm onBack={goBack} {...editProps} />,
    "weekly-audit": <WeeklyAuditForm onBack={goBack} {...editProps} />,
    "weekly-scorecard": <WeeklyScorecardForm onBack={goBack} {...editProps} />,
    "performance": <PerformanceEvaluationForm onBack={goBack} {...editProps} />,
    "waste": <WasteReportForm onBack={goBack} {...editProps} />,
    "equipment": <EquipmentMaintenanceForm onBack={goBack} {...editProps} />,
    "training": <TrainingEvaluationForm onBack={goBack} {...editProps} />,
    "bagel-orders": <BagelOrdersForm onBack={goBack} {...editProps} />,
    "pastry-orders": <PastryOrdersForm onBack={goBack} {...editProps} />,
    "deep-clean": <DeepCleanForm onBack={goBack} {...editProps} />,
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

        {editLoading ? (
          <div className="text-center py-16 space-y-4">
            <div className="w-8 h-8 border-2 border-[#D4A853] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground">Loading report for editing...</p>
          </div>
        ) : formMap[slug]}
      </div>
    </DashboardLayout>
  );
}
