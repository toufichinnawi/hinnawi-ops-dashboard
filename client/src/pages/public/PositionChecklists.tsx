import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useParams } from "wouter";
import PinGate from "@/components/PinGate";
import { getPositionConfig, getChecklistInfo, type ChecklistType } from "@/lib/positionChecklists";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { CheckCircle2, ClipboardCheck, ArrowLeft, ChevronRight, Save, Camera } from "lucide-react";
import { toast } from "sonner";
import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUpload, type UploadedPhoto } from "@/components/PhotoUpload";

// ─── Save Draft Hook ───

function useDraft<T>(key: string, initialValue: T): {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  saveDraft: () => void;
  clearDraft: () => void;
  hasDraft: boolean;
  draftButton: React.ReactNode;
} {
  const storageKey = `hinnawi-draft-${key}`;
  const [hasDraft, setHasDraft] = useState(false);
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setHasDraft(true);
        return JSON.parse(saved) as T;
      }
    } catch { /* ignore */ }
    return initialValue;
  });

  // Show toast if draft was loaded
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (hasDraft && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.info("Draft restored. You can continue where you left off.", { duration: 4000 });
    }
  }, [hasDraft]);

  function saveDraft() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
      setHasDraft(true);
      toast.success("Draft saved! You can come back and finish later.", { duration: 3000 });
    } catch {
      toast.error("Could not save draft");
    }
  }

  function clearDraft() {
    localStorage.removeItem(storageKey);
    setHasDraft(false);
  }

  const draftButton = (
    <Button
      type="button"
      variant="outline"
      onClick={saveDraft}
      className="w-full h-12 text-lg border-[#D4A853] text-[#D4A853] hover:bg-[#D4A853]/10"
    >
      <Save className="w-5 h-5 mr-2" />
      Save Draft
    </Button>
  );

  return { value, setValue, saveDraft, clearDraft, hasDraft, draftButton };
}

// ─── Checklist Data Definitions ───

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
  { title: "Exterior", items: ["Signage clean and visible", "Entrance clean and inviting", "Windows clean", "Outdoor seating area clean (if applicable)", "Garbage area clean"] },
  { title: "Display & Merchandising", items: ["Pastry display full and attractive", "Coffee bags display organized", "Drink fridge stocked and clean", "Menu boards clean and updated", "Prices displayed for all items"] },
  { title: "Bathroom", items: ["Clean and sanitized", "Soap and paper towels stocked", "Mirror clean", "Floor clean", "No odor"] },
  { title: "Equipment", items: ["Espresso machine clean and functioning", "Grinder clean", "Filter coffee machine clean", "Grill clean and at temp", "Fridge temps in range", "Dishwasher clean and functioning"] },
  { title: "Product Quality", items: ["Bagels fresh and properly stored", "Vegetables fresh and crisp", "Cream cheese and spreads fresh", "Coffee taste test passed", "Pastries fresh and displayed well"] },
  { title: "Service & Staff", items: ["Staff in proper uniform (Hinnawi shirt, hair net)", "Greeting customers promptly", "Line moving efficiently", "Cash area clean and organized", "Team energy and attitude positive"] },
];


const ASST_MGR_SECTIONS = [
  { title: "Opening Duties", items: ["Arrive 15 minutes before opening", "Check staff attendance and assign positions", "Verify cash float is correct", "Ensure all equipment is turned on and functioning", "Check food prep is ready for service", "Verify display cases are stocked", "Check cleanliness of front of house"] },
  { title: "During Service", items: ["Monitor line speed and customer wait times", "Ensure quality control on all orders", "Manage break schedules", "Monitor inventory levels throughout the day", "Handle customer complaints promptly", "Maintain cleanliness standards", "Support team members as needed"] },
  { title: "Closing Duties", items: ["Ensure all closing tasks are completed", "Verify cash count and reconcile", "Check all equipment is turned off/cleaned", "Ensure proper food storage and labeling", "Complete daily report", "Lock up and set alarm"] },
  { title: "Leadership", items: ["Provide feedback to team members", "Address any staff issues or concerns", "Communicate with store manager about the day", "Follow up on previous day's action items", "Ensure staff are following dress code"] },
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
  "Sesame Bagel", "Everything Bagel", "Plain Bagel", "Mini-Bagel Plain",
  "Poppy Seeds Bagel", "Multigrain Bagel", "Cheese Bagel", "Rosemary Bagel",
  "Cinnamon Sugar Bagel", "Cinnamon Raisin Bagel", "Blueberry Bagel", "Coconut Bagel",
];
const WASTE_BAGEL_TYPES = [
  "Sesame Bagel", "Everything Bagel", "Plain Bagel", "Poppy Seeds Bagel", "Multigrain Bagel",
  "Cheese Bagel", "Rosemary Bagel", "Cinnamon Sugar Bagel", "Cinnamon Raisin Bagel",
  "Blueberry Bagel", "Coconut Bagel",
];
const PASTRY_TYPES = [
  "Banana Bread with Nuts", "Croissant", "Croissant aux Amandes", "Chocolatine",
  "Chocolate Chips Cookie", "Muffin a L'Erabe", "Muffin Bleuets", "Muffin Pistaches",
  "Muffin Chocolat", "Yogurt Granola", "Fresh orange juice", "Gateau aux Carottes",
  "Granola bag", "Bagel Chips Bags", "Maple Pecan Bar", "Pudding",
];
const CK_ITEMS = [
  "Tomatoes", "Pepper", "Onions", "Cucumber", "Lemon", "Avocado",
  "Mix Salad", "Lettuce", "Spring Mix", "Tofu", "Veggie Patty",
  "Mozzarella", "Cheddar", "Eggs", "Ham", "Smoke meat",
  "Bacon", "Bacon jam", "Chicken", "Cream Cheese",
];

const TRAINING_AREAS = [
  { title: "Customer Service", items: ["Greeting customers promptly and warmly", "Taking orders accurately", "Handling complaints professionally", "Upselling and suggestive selling", "Speed of service"] },
  { title: "Food Preparation", items: ["Bagel preparation and toasting", "Sandwich assembly and presentation", "Coffee preparation (espresso, filter)", "Pastry handling and display", "Food safety and hygiene practices"] },
  { title: "Operations", items: ["Opening/closing procedures", "Cash handling and POS operation", "Inventory awareness", "Cleaning and sanitation", "Equipment operation and care"] },
  { title: "Teamwork & Attitude", items: ["Cooperation with team members", "Willingness to learn", "Following instructions", "Punctuality and reliability", "Professional appearance and demeanor"] },
];

const SALES_ROWS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const LABOR_ROWS = ["Total Labor Hours", "Total Labor Cost ($)", "Labor % of Sales"];

// ─── Main Component ───

export default function PositionChecklists() {
  const params = useParams<{ position: string }>();
  const positionSlug = params.position || "";
  const config = getPositionConfig(positionSlug);

  const [verified, setVerified] = useState(false);
  const [storeCode, setStoreCode] = useState("");
  const [storeName, setStoreName] = useState("");
  const [activeChecklist, setActiveChecklist] = useState<ChecklistType | null>(null);

  if (!config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center mx-auto">
            <span className="text-2xl text-white">!</span>
          </div>
          <h2 className="text-xl font-bold">Position Not Found</h2>
          <p className="text-muted-foreground">
            The URL <code>/public/{positionSlug}</code> does not match any position.
          </p>
          <p className="text-sm text-muted-foreground">
            Valid positions: operational-manager, store-manager, assistant-manager, shift-lead, cashier, barista, cook
          </p>
        </div>
      </div>
    );
  }

  if (!verified) {
    return (
      <PinGate
        positionLabel={config.label}
        positionSlug={positionSlug}
        onVerified={(code, name) => {
          setStoreCode(code);
          setStoreName(name);
          setVerified(true);
        }}
      />
    );
  }

  if (activeChecklist) {
    return (
      <ChecklistForm
        type={activeChecklist}
        storeCode={storeCode}
        storeName={storeName}
        positionLabel={config.label}
        onBack={() => setActiveChecklist(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#faa600] flex items-center justify-center">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg leading-tight">Hinnawi Portal</h1>
            <p className="text-xs text-muted-foreground">{config.label} — {storeName}</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4 pb-8">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Your Checklists</h2>
          <p className="text-sm text-muted-foreground">Select a checklist to fill out and submit.</p>
        </div>

        <div className="space-y-3">
          {config.checklists.map((type) => {
            const info = getChecklistInfo(type);
            return (
              <Card key={type} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-[#faa600]" onClick={() => setActiveChecklist(type)}>
                <CardContent className="py-4 flex items-center gap-4">
                  <span className="text-3xl">{info.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold">{info.label}</h3>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Checklist Form Router ───

export interface ChecklistFormProps {
  type: ChecklistType;
  storeCode: string;
  storeName: string;
  positionLabel: string;
  onBack: () => void;
}

export function ChecklistForm({ type, storeCode, storeName, positionLabel, onBack }: ChecklistFormProps) {
  switch (type) {
    case "manager-checklist":
      return <ManagerChecklistForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} />;
    case "ops-manager-checklist":
      return <SectionChecklistForm title="Store Manager Weekly Audit" sections={AUDIT_SECTIONS} reportType="Store Manager Weekly Audit" storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} useRating isWeekly />;
    case "assistant-manager-checklist":
      return <SectionChecklistForm title="Assistant Manager Checklist" sections={ASST_MGR_SECTIONS} reportType="Assistant Manager Checklist" storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} useRating />;
    case "waste-report":
      return <WasteReportForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} />;
    case "equipment-maintenance":
      return <EquipmentMaintenanceForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} />;
    case "weekly-scorecard":
      return <WeeklyScorecardForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} />;
    case "training-evaluation":
      return <TrainingEvaluationForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} />;
    case "bagel-orders":
      return <BagelOrdersForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} />;
    case "performance-evaluation":
      return <PerformanceEvaluationForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} />;
    default:
      return <div>Unknown checklist type</div>;
  }
}

// ─── Shared Layout ───

function PublicFormLayout({ title, subtitle, children, onBack }: { title: string; subtitle: string; children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-8 h-8 rounded-lg bg-[#faa600] flex items-center justify-center">
            <ClipboardCheck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">{title}</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto p-4 space-y-4 pb-8">{children}</div>
    </div>
  );
}

function SuccessScreen({ message, onNew, onBack }: { message: string; onNew: () => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Submitted!</h2>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={onNew} className="bg-[#faa600] hover:bg-[#e09500] text-white">Submit Another</Button>
          <Button onClick={onBack} variant="outline">Back to Menu</Button>
        </div>
      </div>
    </div>
  );
}

class DuplicateReportError extends Error {
  existingReport: any;
  constructor(message: string, existingReport: any) {
    super(message);
    this.name = "DuplicateReportError";
    this.existingReport = existingReport;
  }
}

async function submitPublicReport(data: { submitterName: string; reportType: string; location: string; reportDate: string; data: any; totalScore?: string | null; overwrite?: boolean }) {
  const res = await fetch("/api/public/submit-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (res.status === 409) {
    const body = await res.json();
    throw new DuplicateReportError(body.message, body.existingReport);
  }
  if (!res.ok) throw new Error("Failed to submit");
  return res.json();
}

function DuplicateDialog({ open, existing, onOverwrite, onCancel, overwriting }: {
  open: boolean;
  existing: any;
  onOverwrite: () => void;
  onCancel: () => void;
  overwriting: boolean;
}) {
  if (!open) return null;
  const submittedBy = existing?.data?.submitterName || existing?.submitterName || "Someone";
  const submittedAt = existing?.createdAt ? new Date(existing.createdAt).toLocaleString() : "earlier today";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mx-auto">
          <ClipboardCheck className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="text-lg font-bold text-center">Checklist Already Submitted</h3>
        <p className="text-sm text-muted-foreground text-center">
          <strong>{submittedBy}</strong> already submitted this checklist for this store on this date ({submittedAt}).
        </p>
        <p className="text-sm text-center text-muted-foreground">
          Would you like to <strong>overwrite</strong> the existing entry with your new data?
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={onCancel} disabled={overwriting}>Cancel</Button>
          <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={onOverwrite} disabled={overwriting}>
            {overwriting ? "Overwriting..." : "Overwrite"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function useDuplicateCheck() {
  const [dupOpen, setDupOpen] = useState(false);
  const [dupExisting, setDupExisting] = useState<any>(null);
  const [dupOverwriting, setDupOverwriting] = useState(false);
  const pendingSubmitRef = useRef<(() => Promise<void>) | null>(null);

  async function submitWithDuplicateCheck(
    reportData: { submitterName: string; reportType: string; location: string; reportDate: string; data: any; totalScore?: string | null },
    onSuccess: () => void,
    onError: (msg: string) => void,
    setSubmitting: (v: boolean) => void,
  ) {
    setSubmitting(true);
    try {
      await submitPublicReport(reportData);
      onSuccess();
    } catch (err) {
      if (err instanceof DuplicateReportError) {
        setDupExisting(err.existingReport);
        setDupOpen(true);
        // Store the overwrite action for when user confirms
        pendingSubmitRef.current = async () => {
          setDupOverwriting(true);
          try {
            await submitPublicReport({ ...reportData, overwrite: true });
            setDupOpen(false);
            setDupExisting(null);
            onSuccess();
          } catch {
            onError("Failed to overwrite");
          } finally {
            setDupOverwriting(false);
          }
        };
      } else {
        onError("Failed to submit");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleOverwrite() {
    pendingSubmitRef.current?.();
  }

  function handleCancelDup() {
    setDupOpen(false);
    setDupExisting(null);
    pendingSubmitRef.current = null;
  }

  const duplicateDialog = (
    <DuplicateDialog
      open={dupOpen}
      existing={dupExisting}
      onOverwrite={handleOverwrite}
      onCancel={handleCancelDup}
      overwriting={dupOverwriting}
    />
  );

  return { submitWithDuplicateCheck, duplicateDialog };
}

// ─── Manager Checklist Form (formerly Operations Checklist) ───

function ManagerChecklistForm({ storeCode, storeName, positionLabel, onBack }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void }) {
  const defaultWeekMgr = useMemo(() => getDefaultWeekRange(), []);
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `manager-checklist-${storeCode}`,
    { name: "", dateOfSubmission: new Date().toISOString().split("T")[0], weekStart: defaultWeekMgr.start, weekEnd: defaultWeekMgr.end, tasks: OPS_TASKS.map(() => ({ rating: 0, isNA: false, comment: "" })), comments: "" }
  );
  const { name, dateOfSubmission, weekStart, weekEnd, tasks, comments } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDateOfSubmission = (v: string) => setDraft((d) => ({ ...d, dateOfSubmission: v }));
  const setWeekStart = (v: string) => setDraft((d) => ({ ...d, weekStart: v }));
  const setWeekEnd = (v: string) => setDraft((d) => ({ ...d, weekEnd: v }));
  const setTasks = (fn: (prev: typeof tasks) => typeof tasks) => setDraft((d) => ({ ...d, tasks: fn(d.tasks) }));
  const setComments = (v: string) => setDraft((d) => ({ ...d, comments: v }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const ratedTasks = tasks.filter((t) => !t.isNA && t.rating > 0);
  const avg = ratedTasks.length > 0 ? (ratedTasks.reduce((s, t) => s + t.rating, 0) / ratedTasks.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (ratedTasks.length === 0) { toast.error("Please rate at least one item"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(),
        reportType: "Manager Checklist",
        location: storeName,
        reportDate: weekStart,
        data: { dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd, tasks: OPS_TASKS.map((t, i) => ({ task: t.en, taskFr: t.fr, rating: tasks[i].rating, isNA: tasks[i].isNA, comment: tasks[i].comment })), comments, submittedVia: `Public - ${positionLabel}` },
        totalScore: avg,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Checklist submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Manager Checklist for ${storeName} submitted. Average: ${avg}/5`} onNew={() => { setSubmitted(false); setTasks(() => OPS_TASKS.map(() => ({ rating: 0, isNA: false, comment: "" }))); setComments(""); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Manager Checklist" subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Date of Submission</Label><Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
            <div className="space-y-2"><Label>End Date *</Label><Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>
      <Badge variant="outline" className="text-lg px-4 py-2 border-[#faa600] text-[#faa600]">Average: {avg} / 5</Badge>
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
                <StarRating value={tasks[i].rating} onChange={(v) => setTasks((p) => p.map((t, j) => j === i ? { ...t, rating: v } : t))} disabled={tasks[i].isNA} size="sm" />
                <Input placeholder="Comment..." value={tasks[i].comment} onChange={(e) => setTasks((p) => p.map((t, j) => j === i ? { ...t, comment: e.target.value } : t))} className="flex-1" disabled={tasks[i].isNA} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card><CardContent className="pt-6"><Label>Final Comments</Label><Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="General comments..." /></CardContent></Card>
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? "Submitting..." : "Submit Checklist"}</Button>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Section-based Checklist Form (Audit, Deep Cleaning, Asst Mgr, Store Mgr) ───

function SectionChecklistForm({ title, sections, reportType, storeCode, storeName, positionLabel, onBack, useRating, isWeekly }: {
  title: string; sections: { title: string; items: string[] }[]; reportType: string; storeCode: string; storeName: string; positionLabel: string; onBack: () => void; useRating?: boolean; isWeekly?: boolean;
}) {
  const initData = sections.map((s) => s.items.map(() => useRating ? { rating: 0, comment: "" } : { checked: false }));
  const defaultWeekSec = useMemo(() => getDefaultWeekRange(), []);
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `${reportType}-${storeCode}`,
    { name: "", dateOfSubmission: new Date().toISOString().split("T")[0], weekStart: defaultWeekSec.start, weekEnd: defaultWeekSec.end, data: initData, comments: "" }
  );
  const { name, dateOfSubmission, weekStart, weekEnd, data, comments } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDateOfSubmission = (v: string) => setDraft((d) => ({ ...d, dateOfSubmission: v }));
  const setWeekStart = (v: string) => setDraft((d) => ({ ...d, weekStart: v }));
  const setWeekEnd = (v: string) => setDraft((d) => ({ ...d, weekEnd: v }));
  const setData = (fn: (prev: any[][]) => any[][]) => setDraft((d) => ({ ...d, data: fn(d.data) }));
  const setComments = (v: string) => setDraft((d) => ({ ...d, comments: v }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sectionPhotos, setSectionPhotos] = useState<Record<string, UploadedPhoto[]>>({});
  // Per-item photos: key is "sectionTitle::itemIndex"
  const [itemPhotos, setItemPhotos] = useState<Record<string, UploadedPhoto[]>>({});
  const [expandedPhotoItem, setExpandedPhotoItem] = useState<string | null>(null);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const totalScore = useRating
    ? (() => {
        const allRatings = data.flat().filter((d: any) => d.rating > 0);
        return allRatings.length > 0 ? (allRatings.reduce((s: number, d: any) => s + d.rating, 0) / allRatings.length).toFixed(2) : "0.00";
      })()
    : (() => {
        const total = data.flat().length;
        const checked = data.flat().filter((d: any) => d.checked).length;
        return `${checked}/${total}`;
      })();

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(),
        reportType,
        location: storeName,
        reportDate: isWeekly ? weekStart : dateOfSubmission,
        data: (() => {
          const photoUrls: Record<string, string[]> = {};
          for (const [section, photos] of Object.entries(sectionPhotos)) {
            const urls = photos.filter(p => p.status === "success" && p.url).map(p => p.url);
            if (urls.length > 0) photoUrls[section] = urls;
          }
          const photosData = Object.keys(photoUrls).length > 0 ? { photos: photoUrls } : {};
          // Collect per-item photo URLs
          const itemPhotoUrls: Record<string, string[]> = {};
          for (const [key, photos] of Object.entries(itemPhotos)) {
            const urls = photos.filter(p => p.status === "success" && p.url).map(p => p.url);
            if (urls.length > 0) itemPhotoUrls[key] = urls;
          }
          const itemPhotosData = Object.keys(itemPhotoUrls).length > 0 ? { itemPhotos: itemPhotoUrls } : {};
          return { ...(isWeekly ? { dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd } : {}), sections: sections.map((s, si) => ({ title: s.title, items: s.items.map((item, ii) => ({ item, ...data[si][ii] })) })), comments, submittedVia: `Public - ${positionLabel}`, ...photosData, ...itemPhotosData };
        })(),
        totalScore,
      },
      () => { setSubmitted(true); clearDraft(); toast.success(`${title} submitted!`); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`${title} for ${storeName} submitted. Score: ${totalScore}`} onNew={() => { setSubmitted(false); setData(() => sections.map((s) => s.items.map(() => useRating ? { rating: 0, comment: "" } : { checked: false })) as any[][]); setComments(""); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={title} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>{isWeekly ? "Date of Submission" : "Date"}</Label><Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} /></div>
          {isWeekly && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Start Date *</Label><Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>End Date *</Label><Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} /></div>
            </div>
          )}
        </CardContent>
      </Card>
      <Badge variant="outline" className="text-lg px-4 py-2 border-[#faa600] text-[#faa600]">Score: {totalScore}{useRating ? " / 5" : ""}</Badge>
      {sections.map((section, si) => (
        <Card key={si}>
          <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {section.items.map((item, ii) => {
              const photoKey = `${section.title}::${ii}`;
              const photos = itemPhotos[photoKey] || [];
              const photoCount = photos.filter(p => p.status === "success").length;
              const isExpanded = expandedPhotoItem === photoKey;
              const isAuditForm = reportType === "Store Manager Weekly Audit" || reportType === "Operations Manager Checklist (Weekly Audit)";
              return (
                <div key={ii} className="space-y-2">
                  {useRating ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <p className="text-sm flex-1">{item}</p>
                      <div className="flex items-center gap-2">
                        {isAuditForm && (
                          <button
                            type="button"
                            onClick={() => setExpandedPhotoItem(isExpanded ? null : photoKey)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
                              photoCount > 0
                                ? "bg-[#faa600]/15 text-[#faa600] hover:bg-[#faa600]/25"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {photoCount > 0 && <span>{photoCount}</span>}
                          </button>
                        )}
                        <StarRating value={(data[si][ii] as any).rating} onChange={(v) => setData((p) => p.map((s, sj) => sj === si ? s.map((d, dj) => dj === ii ? { ...d, rating: v } : d) : s))} size="sm" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Checkbox checked={(data[si][ii] as any).checked} onCheckedChange={(c) => setData((p) => p.map((s, sj) => sj === si ? s.map((d, dj) => dj === ii ? { ...d, checked: !!c } : d) : s))} />
                      <span className="text-sm flex-1">{item}</span>
                      {isAuditForm && (
                        <button
                          type="button"
                          onClick={() => setExpandedPhotoItem(isExpanded ? null : photoKey)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
                            photoCount > 0
                              ? "bg-[#faa600]/15 text-[#faa600] hover:bg-[#faa600]/25"
                              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {photoCount > 0 && <span>{photoCount}</span>}
                        </button>
                      )}
                    </div>
                  )}
                  {isExpanded && (
                    <div className="pb-2 pl-2">
                      <PhotoUpload
                        photos={photos}
                        onChange={(newPhotos) => setItemPhotos(prev => ({ ...prev, [photoKey]: newPhotos }))}
                        maxPhotos={3}
                        label="Item Photos"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
      <Card><CardContent className="pt-6"><Label>Comments</Label><Textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Additional comments..." /></CardContent></Card>
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? "Submitting..." : `Submit ${title}`}</Button>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Waste Report Form ───

// ─── Waste Item Types & Helpers (matching admin dashboard) ───

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

function initWasteRows(items: string[], defaultQty = "bag"): Record<string, WasteItemRow> {
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
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
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
                            row.enabled ? "bg-[#faa600]" : "bg-muted"
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

function WasteReportForm({ storeCode, storeName, positionLabel, onBack }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void }) {
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `waste-report-v2-${storeCode}`,
    { name: "", date: new Date().toISOString().split("T")[0], bagelRows: initWasteRows(WASTE_BAGEL_TYPES, "bag"), pastryRows: initWasteRows(PASTRY_TYPES, "unit"), ckRows: initWasteRows(CK_ITEMS, "unit") }
  );
  const { name, date, bagelRows, pastryRows, ckRows } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDate = (v: string) => setDraft((d) => ({ ...d, date: v }));
  const setBagelRows = (v: Record<string, WasteItemRow>) => setDraft((d) => ({ ...d, bagelRows: v }));
  const setPastryRows = (v: Record<string, WasteItemRow>) => setDraft((d) => ({ ...d, pastryRows: v }));
  const setCkRows = (v: Record<string, WasteItemRow>) => setDraft((d) => ({ ...d, ckRows: v }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  // Collect data in the same format as admin dashboard
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
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    const data = collectData();
    await submitWithDuplicateCheck(
      { submitterName: name.trim(), reportType: "Leftovers & Waste", location: storeName, reportDate: date, data: { ...data, submittedVia: `Public - ${positionLabel}` } },
      () => { setSubmitted(true); clearDraft(); toast.success("Waste report submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Waste report for ${storeName} submitted.`} onNew={() => { setSubmitted(false); setBagelRows(initWasteRows(WASTE_BAGEL_TYPES, "bag")); setPastryRows(initWasteRows(PASTRY_TYPES, "unit")); setCkRows(initWasteRows(CK_ITEMS, "unit")); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Leftovers & Waste Report" subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </CardContent></Card>
      <WasteItemTable title="Bagels" items={WASTE_BAGEL_TYPES} rows={bagelRows} onChange={setBagelRows} qtyTypes={QTY_TYPES_BAGEL} />
      <WasteItemTable title="Pastries" items={PASTRY_TYPES} rows={pastryRows} onChange={setPastryRows} qtyTypes={QTY_TYPES_PASTRY} />
      <WasteItemTable title="CK Items" items={CK_ITEMS} rows={ckRows} onChange={setCkRows} qtyTypes={QTY_TYPES_CK} />
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? "Submitting..." : "Submit Waste Report"}</Button>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Equipment Maintenance Form ───

function EquipmentMaintenanceForm({ storeCode, storeName, positionLabel, onBack }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void }) {
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `equipment-maintenance-${storeCode}`,
    { name: "", date: new Date().toISOString().split("T")[0], daily: EQUIP_DAILY.map(() => ({ checked: false, initial: "" })), weekly: EQUIP_WEEKLY.map(() => ({ checked: false, initial: "" })), monthly: EQUIP_MONTHLY.map(() => ({ checked: false, initial: "" })) }
  );
  const { name, date, daily, weekly, monthly } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDate = (v: string) => setDraft((d) => ({ ...d, date: v }));
  const setDaily: React.Dispatch<React.SetStateAction<{ checked: boolean; initial: string }[]>> = (fn) => setDraft((d) => ({ ...d, daily: typeof fn === 'function' ? fn(d.daily) : fn }));
  const setWeekly: React.Dispatch<React.SetStateAction<{ checked: boolean; initial: string }[]>> = (fn) => setDraft((d) => ({ ...d, weekly: typeof fn === 'function' ? fn(d.weekly) : fn }));
  const setMonthly: React.Dispatch<React.SetStateAction<{ checked: boolean; initial: string }[]>> = (fn) => setDraft((d) => ({ ...d, monthly: typeof fn === 'function' ? fn(d.monthly) : fn }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    const total = daily.length + weekly.length + monthly.length;
    const checked = [...daily, ...weekly, ...monthly].filter((i) => i.checked).length;
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Equipment Maintenance", location: storeName, reportDate: date,
        data: { daily: EQUIP_DAILY.map((e, i) => ({ ...e, ...daily[i] })), weekly: EQUIP_WEEKLY.map((e, i) => ({ ...e, ...weekly[i] })), monthly: EQUIP_MONTHLY.map((e, i) => ({ ...e, ...monthly[i] })), submittedVia: `Public - ${positionLabel}` },
        totalScore: `${checked}/${total}`,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Equipment checklist submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  const renderEquipSection = (sectionTitle: string, items: { equipment: string; task: string }[], data: { checked: boolean; initial: string }[], setData: React.Dispatch<React.SetStateAction<{ checked: boolean; initial: string }[]>>) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{sectionTitle}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
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

  if (submitted) return <SuccessScreen message={`Equipment maintenance checklist for ${storeName} submitted.`} onNew={() => { setSubmitted(false); setDaily(EQUIP_DAILY.map(() => ({ checked: false, initial: "" }))); setWeekly(EQUIP_WEEKLY.map(() => ({ checked: false, initial: "" }))); setMonthly(EQUIP_MONTHLY.map(() => ({ checked: false, initial: "" }))); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Equipment & Maintenance" subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </CardContent></Card>
      {renderEquipSection("Daily Checks", EQUIP_DAILY, daily, setDaily)}
      {renderEquipSection("Weekly Checks", EQUIP_WEEKLY, weekly, setWeekly)}
      {renderEquipSection("Monthly Checks", EQUIP_MONTHLY, monthly, setMonthly)}
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? "Submitting..." : "Submit Equipment Checklist"}</Button>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Weekly Scorecard Form ───

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

function WeeklyScorecardForm({ storeCode, storeName, positionLabel, onBack }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void }) {
  interface ScorecardSec { thisWeekGoal: string; thisWeekActual: string; lastWeekActual: string; lastMonthActual: string; howContribute: string; }
  interface DigitalSec { googleReviews: string; howContribute: string; }
  const initSec = (): ScorecardSec => ({ thisWeekGoal: "", thisWeekActual: "", lastWeekActual: "", lastMonthActual: "", howContribute: "" });

  const defaultWeek = useMemo(() => getDefaultWeekRange(), []);

  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `weekly-scorecard-${storeCode}`,
    { managerName: "", dateEntered: new Date().toISOString().split("T")[0], weekStart: defaultWeek.start, weekEnd: defaultWeek.end, sales: initSec(), labour: initSec(), digital: { googleReviews: "", howContribute: "" } as DigitalSec, food: initSec() }
  );
  const { managerName, dateEntered, weekStart, weekEnd, sales, labour, digital, food } = draft;
  const weekOfLabel = useMemo(() => {
    const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return weekStart && weekEnd ? `${fmt(weekStart)} - ${fmt(weekEnd)}` : "";
  }, [weekStart, weekEnd]);
  const setManagerName = (v: string) => setDraft((d) => ({ ...d, managerName: v }));
  const setDateEntered = (v: string) => setDraft((d) => ({ ...d, dateEntered: v }));
  const setWeekStart = (v: string) => setDraft((d) => ({ ...d, weekStart: v }));
  const setWeekEnd = (v: string) => setDraft((d) => ({ ...d, weekEnd: v }));
  const setSales = (v: ScorecardSec) => setDraft((d) => ({ ...d, sales: v }));
  const setLabour = (v: ScorecardSec) => setDraft((d) => ({ ...d, labour: v }));
  const setDigital = (v: DigitalSec) => setDraft((d) => ({ ...d, digital: v }));
  const setFood = (v: ScorecardSec) => setDraft((d) => ({ ...d, food: v }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const handleSubmit = async () => {
    if (!managerName.trim()) { toast.error("Please fill required fields"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName: managerName.trim(), reportType: "weekly-scorecard", location: storeCode, reportDate: weekStart,
        data: { dateEntered, weekOf: weekOfLabel, weekOfStart: weekStart, weekOfEnd: weekEnd, sales, labour, digital, food, submittedVia: `Public - ${positionLabel}` },
        totalScore: sales.thisWeekActual ? `$${parseFloat(sales.thisWeekActual).toFixed(0)}` : undefined,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Scorecard submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  // Helper to render a scorecard section
  const renderSection = (title: string, color: string, unit: "%" | "$", goalLabel: string, data: ScorecardSec, onChange: (d: ScorecardSec) => void) => {
    const update = (field: keyof ScorecardSec, value: string) => onChange({ ...data, [field]: value });
    const goal = parseFloat(data.thisWeekGoal);
    const actual = parseFloat(data.thisWeekActual);
    const hasComp = !isNaN(goal) && !isNaN(actual) && goal > 0;
    const lowerBetter = title === "Labour" || title === "Food Cost";
    const onTarget = hasComp ? (lowerBetter ? actual <= goal : actual >= goal) : null;
    const variance = hasComp ? (unit === "%" ? (actual - goal).toFixed(1) : (actual - goal).toFixed(2)) : null;
    const pre = unit === "$" ? "$" : "";
    const suf = unit === "%" ? "%" : "";
    return (
      <Card className="overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: color }}>
          <h3 className="font-serif text-lg font-semibold text-white">{title}</h3>
          {onTarget !== null && (
            <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${onTarget ? "bg-white/20 text-white" : "bg-red-100 text-red-700"}`}>
              {onTarget ? "On Target" : "Off Target"}
            </span>
          )}
        </div>
        <CardContent className="pt-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{goalLabel}</Label>
              <div className="relative">
                {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
                <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.thisWeekGoal} onChange={(e) => update("thisWeekGoal", e.target.value)} placeholder="0" className={`h-10 text-sm font-mono ${unit === "$" ? "pl-7" : ""}`} />
                {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Week</Label>
              <div className="relative">
                {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
                <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.thisWeekActual} onChange={(e) => update("thisWeekActual", e.target.value)} placeholder="0" className={`h-10 text-sm font-mono ${unit === "$" ? "pl-7" : ""}`} />
                {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variance</Label>
              <div className={`h-10 rounded-md border flex items-center justify-center text-sm font-mono font-medium ${onTarget === null ? "border-border/60 text-muted-foreground bg-muted/30" : onTarget ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-700 bg-red-50"}`}>
                {variance !== null ? <span>{parseFloat(variance) > 0 ? "+" : ""}{pre}{variance}{suf}</span> : <span className="text-muted-foreground">\u2014</span>}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Week</Label>
              <div className="relative">
                {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
                <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.lastWeekActual} onChange={(e) => update("lastWeekActual", e.target.value)} placeholder="0" className={`h-9 text-sm font-mono bg-muted/20 ${unit === "$" ? "pl-7" : ""}`} />
                {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Month</Label>
              <div className="relative">
                {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
                <Input type="number" min="0" step={unit === "%" ? "0.1" : "0.01"} value={data.lastMonthActual} onChange={(e) => update("lastMonthActual", e.target.value)} placeholder="0" className={`h-9 text-sm font-mono bg-muted/20 ${unit === "$" ? "pl-7" : ""}`} />
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
  };

  if (submitted) return <SuccessScreen message={`Weekly Scorecard for ${storeName} submitted.`} onNew={() => { setSubmitted(false); setDraft({ managerName: "", dateEntered: new Date().toISOString().split("T")[0], weekStart: defaultWeek.start, weekEnd: defaultWeek.end, sales: initSec(), labour: initSec(), digital: { googleReviews: "", howContribute: "" }, food: initSec() }); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Store Manager Weekly Scorecard" subtitle={`${positionLabel} \u2014 ${storeName}`} onBack={onBack}>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Store Location</Label>
          <Input value={storeName} disabled className="bg-muted" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Enter your name" />
          </div>
          <div className="space-y-1.5">
            <Label>Date Completed</Label>
            <Input type="date" value={dateEntered} onChange={(e) => setDateEntered(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Week Of — Start *</Label>
            <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Week Of — End *</Label>
            <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
          </div>
        </div>
      </CardContent></Card>

      {renderSection("Sales", "#D4A853", "$", "Weekly Goal", sales, setSales)}
      {renderSection("Labour", "#3B82F6", "%", "Target %", labour, setLabour)}

      {/* Digital Section */}
      <Card className="overflow-hidden">
        <div className="px-5 py-3" style={{ background: "#6366F1" }}>
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

      {renderSection("Food Cost", "#F97316", "%", "Target %", food, setFood)}

      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">{submitting ? "Submitting..." : "Submit Scorecard"}</Button>
        </div>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Training Evaluation Form ───

function TrainingEvaluationForm({ storeCode, storeName, positionLabel, onBack }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void }) {
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `training-eval-${storeCode}`,
    { name: "", date: new Date().toISOString().split("T")[0], traineeName: "", ratings: TRAINING_AREAS.map((a) => a.items.map(() => ({ rating: 0, comment: "" }))), overallComments: "" }
  );
  const { name, date, traineeName, ratings, overallComments } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDate = (v: string) => setDraft((d) => ({ ...d, date: v }));
  const setTraineeName = (v: string) => setDraft((d) => ({ ...d, traineeName: v }));
  const setRatings = (fn: (prev: { rating: number; comment: string }[][]) => { rating: number; comment: string }[][]) => setDraft((d) => ({ ...d, ratings: fn(d.ratings) }));
  const setOverallComments = (v: string) => setDraft((d) => ({ ...d, overallComments: v }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const allRatings = ratings.flat().filter((r) => r.rating > 0);
  const avg = allRatings.length > 0 ? (allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!traineeName.trim()) { toast.error("Please enter trainee name"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Training Evaluation", location: storeName, reportDate: date,
        data: { traineeName, areas: TRAINING_AREAS.map((a, ai) => ({ title: a.title, items: a.items.map((item, ii) => ({ item, ...ratings[ai][ii] })) })), overallComments, submittedVia: `Public - ${positionLabel}` },
        totalScore: avg,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Training evaluation submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Training evaluation for ${traineeName} at ${storeName} submitted. Average: ${avg}/5`} onNew={() => { setSubmitted(false); setRatings(() => TRAINING_AREAS.map((a) => a.items.map(() => ({ rating: 0, comment: "" })))); setTraineeName(""); setOverallComments(""); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Training Evaluation" subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name (Evaluator) *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Trainee Name *</Label><Input placeholder="Enter trainee name" value={traineeName} onChange={(e) => setTraineeName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </CardContent></Card>
      <Badge variant="outline" className="text-lg px-4 py-2 border-[#faa600] text-[#faa600]">Average: {avg} / 5</Badge>
      {TRAINING_AREAS.map((area, ai) => (
        <Card key={ai}>
          <CardHeader><CardTitle className="text-base">{area.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {area.items.map((item, ii) => (
              <div key={ii} className="space-y-2">
                <p className="text-sm">{item}</p>
                <div className="flex items-center gap-3">
                  <StarRating value={ratings[ai][ii].rating} onChange={(v) => setRatings((p) => p.map((a, aj) => aj === ai ? a.map((r, rj) => rj === ii ? { ...r, rating: v } : r) : a))} size="sm" />
                  <Input placeholder="Comment..." value={ratings[ai][ii].comment} onChange={(e) => setRatings((p) => p.map((a, aj) => aj === ai ? a.map((r, rj) => rj === ii ? { ...r, comment: e.target.value } : r) : a))} className="flex-1 h-8" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      <Card><CardContent className="pt-6"><Label>Overall Comments</Label><Textarea value={overallComments} onChange={(e) => setOverallComments(e.target.value)} placeholder="Overall assessment..." /></CardContent></Card>
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? "Submitting..." : "Submit Evaluation"}</Button>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Bagel Orders Form ───

function BagelOrdersForm({ storeCode, storeName, positionLabel, onBack }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void }) {
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `bagel-orders-v2-${storeCode}`,
    { name: "", orderForDate: new Date().toISOString().split("T")[0], quantities: Object.fromEntries(BAGEL_TYPES.map(t => [t, ""])), itemUnits: Object.fromEntries(BAGEL_TYPES.map(t => [t, "dozen"])) as Record<string, "dozen" | "unit"> }
  );
  const { name, orderForDate, quantities, itemUnits } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setOrderForDate = (v: string) => setDraft((d) => ({ ...d, orderForDate: v }));
  const setQuantity = (type: string, val: string) => setDraft((d) => ({ ...d, quantities: { ...d.quantities, [type]: val } }));
  const setItemUnit = (type: string, val: "dozen" | "unit") => setDraft((d) => ({ ...d, itemUnits: { ...d.itemUnits, [type]: val } }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!orderForDate) { toast.error("Please select the order date"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Bagel Orders", location: storeName, reportDate: orderForDate,
        data: { orderForDate, orders: BAGEL_TYPES.map(type => ({ type, quantity: quantities[type] || "0", unit: (itemUnits?.[type]) || "dozen" })), submittedVia: `Public - ${positionLabel}` },
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Bagel orders submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Bagel orders for ${storeName} submitted.`} onNew={() => { setSubmitted(false); setDraft((d) => ({ ...d, quantities: Object.fromEntries(BAGEL_TYPES.map(t => [t, ""])), itemUnits: Object.fromEntries(BAGEL_TYPES.map(t => [t, "dozen"])) as Record<string, "dozen" | "unit"> })); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Bagel Orders" subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Order for Date *</Label><Input type="date" value={orderForDate} onChange={(e) => setOrderForDate(e.target.value)} /></div>

      </CardContent></Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Quantities</CardTitle>
          <p className="text-sm text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">Select dozen or unit per item. Default is dozen (12 units per dozen).</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {BAGEL_TYPES.map((type) => (
              <div key={type} className="flex items-center justify-between gap-4 py-1.5 border-b last:border-0">
                <span className="text-sm">{type}</span>
                <div className="flex items-center gap-2">
                  <Input type="number" min="0" step="0.5" placeholder="0" value={quantities[type]} onChange={(e) => setQuantity(type, e.target.value)} className="h-8 w-20 text-center text-sm" />
                  <select value={(itemUnits?.[type]) || "dozen"} onChange={(e) => setItemUnit(type, e.target.value as "dozen" | "unit")} className="h-8 w-16 rounded-md border border-border bg-background px-1 text-xs">
                    <option value="dozen">doz.</option>
                    <option value="unit">pcs</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? "Submitting..." : "Submit Bagel Orders"}</Button>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Performance Evaluation Form ───

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

function PerformanceEvaluationForm({ storeCode, storeName, positionLabel, onBack }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void }) {
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `perf-eval-${storeCode}`,
    { name: "", date: new Date().toISOString().split("T")[0], employeeName: "", employeePosition: "", ratings: EVAL_CRITERIA.map(() => ({ rating: 0, comment: "" })), overallComments: "" }
  );
  const { name, date, employeeName, employeePosition, ratings, overallComments } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDate = (v: string) => setDraft((d) => ({ ...d, date: v }));
  const setEmployeeName = (v: string) => setDraft((d) => ({ ...d, employeeName: v }));
  const setEmployeePosition = (v: string) => setDraft((d) => ({ ...d, employeePosition: v }));
  const setRatings = (fn: (prev: { rating: number; comment: string }[]) => { rating: number; comment: string }[]) => setDraft((d) => ({ ...d, ratings: fn(d.ratings) }));
  const setOverallComments = (v: string) => setDraft((d) => ({ ...d, overallComments: v }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const rated = ratings.filter((r) => r.rating > 0);
  const avg = rated.length > 0 ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!employeeName.trim()) { toast.error("Please enter employee name"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Performance Evaluation", location: storeName, reportDate: date,
        data: { employeeName, employeePosition, criteria: EVAL_CRITERIA.map((c, i) => ({ ...c, ...ratings[i] })), overallComments, submittedVia: `Public - ${positionLabel}` },
        totalScore: avg,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Evaluation submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Performance evaluation for ${employeeName} submitted. Average: ${avg}/5`} onNew={() => { setSubmitted(false); setRatings(() => EVAL_CRITERIA.map(() => ({ rating: 0, comment: "" }))); setEmployeeName(""); setEmployeePosition(""); setOverallComments(""); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Performance Evaluation" subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name (Evaluator) *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Employee Name *</Label><Input placeholder="Employee name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Employee Position</Label><Input placeholder="Position" value={employeePosition} onChange={(e) => setEmployeePosition(e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </CardContent></Card>
      <Badge variant="outline" className="text-lg px-4 py-2 border-[#faa600] text-[#faa600]">Average: {avg} / 5</Badge>
      {EVAL_CRITERIA.map((criterion, i) => (
        <Card key={criterion.key}>
          <CardContent className="pt-4 pb-4 space-y-2">
            <p className="font-medium">{criterion.title}</p>
            <p className="text-xs text-muted-foreground">{criterion.description}</p>
            <div className="flex items-center gap-3">
              <StarRating value={ratings[i].rating} onChange={(v) => setRatings((p) => p.map((r, j) => j === i ? { ...r, rating: v } : r))} size="sm" />
              <Input placeholder="Comment..." value={ratings[i].comment} onChange={(e) => setRatings((p) => p.map((r, j) => j === i ? { ...r, comment: e.target.value } : r))} className="flex-1 h-8" />
            </div>
          </CardContent>
        </Card>
      ))}
      <Card><CardContent className="pt-6"><Label>Overall Comments</Label><Textarea value={overallComments} onChange={(e) => setOverallComments(e.target.value)} placeholder="Overall assessment and recommendations..." /></CardContent></Card>
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? "Submitting..." : "Submit Evaluation"}</Button>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}
