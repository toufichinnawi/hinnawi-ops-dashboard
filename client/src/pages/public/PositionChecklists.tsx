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
import { CheckCircle2, ClipboardCheck, ArrowLeft, ChevronRight, Save, Camera, Lock, Clock } from "lucide-react";
import { useDuplicateReportCheck, updateReport } from "@/hooks/useDuplicateReportCheck";
import { toast } from "sonner";
import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUpload, type UploadedPhoto } from "@/components/PhotoUpload";
import { stores } from "@/lib/data";
import { calcBagelCost, calcPastryCost, calcCKCost } from "@shared/wastePricing";

// ─── Save Draft Hook (server-side + localStorage fallback) ───

interface DraftServerConfig {
  reportType: string;
  location: string;
  reportDate: string;
}

function useDraft<T>(key: string, initialValue: T, serverConfig?: DraftServerConfig): {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
  saveDraft: () => void;
  clearDraft: () => void;
  hasDraft: boolean;
  draftButton: React.ReactNode;
  savingDraft: boolean;
} {
  const storageKey = `hinnawi-draft-${key}`;
  const [hasDraft, setHasDraft] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [serverDraftLoaded, setServerDraftLoaded] = useState(false);
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

  // Load server-side draft on mount (if serverConfig is provided)
  useEffect(() => {
    if (!serverConfig || serverDraftLoaded) return;
    setServerDraftLoaded(true);
    const { reportType, location, reportDate } = serverConfig;
    fetch(`/api/public/draft?location=${encodeURIComponent(location)}&reportType=${encodeURIComponent(reportType)}&reportDate=${encodeURIComponent(reportDate)}`)
      .then((res) => res.json())
      .then((body) => {
        if (body.success && body.draft && body.draft.data) {
          // Only restore server draft if no local draft exists
          const localDraft = localStorage.getItem(storageKey);
          if (!localDraft) {
            setValue(body.draft.data as T);
            setHasDraft(true);
            toast.info("Server draft restored. Continue where you left off.", { duration: 4000 });
          }
        }
      })
      .catch(() => { /* ignore fetch errors */ });
  }, [serverConfig?.reportType, serverConfig?.location, serverConfig?.reportDate]);

  // Show toast if local draft was loaded
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (hasDraft && !notifiedRef.current) {
      notifiedRef.current = true;
      toast.info("Draft restored. You can continue where you left off.", { duration: 4000 });
    }
  }, [hasDraft]);

  function saveDraft() {
    // Save to localStorage
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
      setHasDraft(true);
    } catch { /* ignore */ }

    // Save to server if config is provided
    if (serverConfig) {
      setSavingDraft(true);
      fetch("/api/public/save-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: serverConfig.reportType,
          location: serverConfig.location,
          reportDate: serverConfig.reportDate,
          data: value,
          submitterName: (value as any)?.name || (value as any)?.submitterName || "",
        }),
      })
        .then((res) => res.json())
        .then((body) => {
          if (body.success) {
            toast.success("Draft saved to server! You can come back from any device.", { duration: 3000 });
          } else {
            toast.success("Draft saved locally.", { duration: 3000 });
          }
        })
        .catch(() => {
          toast.success("Draft saved locally.", { duration: 3000 });
        })
        .finally(() => setSavingDraft(false));
    } else {
      toast.success("Draft saved! You can come back and finish later.", { duration: 3000 });
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
      disabled={savingDraft}
      className="w-full h-12 text-lg border-[#D4A853] text-[#D4A853] hover:bg-[#D4A853]/10"
    >
      <Save className="w-5 h-5 mr-2" />
      {savingDraft ? "Saving..." : "Save Draft"}
    </Button>
  );

  return { value, setValue, saveDraft, clearDraft, hasDraft, draftButton, savingDraft };
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

const AUDIT_SECTIONS_SIMPLE = [
  "Exterior",
  "Display",
  "Bathroom",
  "Equipment",
  "Product Quality",
  "Service Quality",
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
  "Chocolate Chips Cookie", "Muffin a L'Erable", "Muffin Bleuets", "Muffin Pistaches",
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
                    {info.schedule && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Clock className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          {info.schedule.label}
                        </span>
                      </div>
                    )}
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
  editReportId?: number;
  editData?: any;
}

export function ChecklistForm({ type, storeCode, storeName, positionLabel, onBack, editReportId, editData }: ChecklistFormProps) {
  const editProps = { editReportId, editData };
  switch (type) {
    case "manager-checklist":
      return <ManagerChecklistForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
    case "ops-manager-checklist":
      return <SimpleAuditFormPublic storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
    case "assistant-manager-checklist":
      return <SectionChecklistForm title="Assistant Manager Checklist" sections={ASST_MGR_SECTIONS} reportType="Assistant Manager Checklist" storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} useRating {...editProps} />;
    case "waste-report":
      return <WasteReportForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
    case "equipment-maintenance":
      return <EquipmentMaintenanceForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
    case "weekly-scorecard":
      return <WeeklyScorecardForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
    case "training-evaluation":
      return <TrainingEvaluationForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
    case "bagel-orders":
      return <BagelOrdersForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
    case "pastry-orders":
      return <PastryOrdersForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
    case "performance-evaluation":
      return <PerformanceEvaluationForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
    case "deep-clean":
      return <DeepCleanChecklistForm storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} {...editProps} />;
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

function SuccessScreen({ message, onNew, onBack }: { message: string; onNew?: () => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold">Submitted!</h2>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex gap-3 justify-center">
          {onNew && <Button onClick={onNew} className="bg-[#faa600] hover:bg-[#e09500] text-white">Submit Another</Button>}
          <Button onClick={onBack} variant="outline">Back to Menu</Button>
        </div>
      </div>
    </div>
  );
}

// Shared duplicate-check hook — first tries overwrite:false, shows dialog on 409, then re-submits with overwrite:true
function useDuplicateCheck() {
  const { submitWithCheck, duplicateDialog } = useDuplicateReportCheck();
  // Adapter to match existing call sites: submitWithDuplicateCheck(payload, onSuccess, onError, setSubmitting)
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

// ─── Manager Checklist Form (formerly Operations Checklist) ───

function ManagerChecklistForm({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any }) {
  const isEdit = !!editReportId;
  const defaultWeekMgr = useMemo(() => getDefaultWeekRange(), []);
  const draftServerConfig = useMemo(() => ({
    reportType: "manager-checklist",
    location: storeCode,
    reportDate: defaultWeekMgr.start,
  }), [storeCode, defaultWeekMgr.start]);
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `manager-checklist-${storeCode}`,
    { name: "", dateOfSubmission: new Date().toISOString().split("T")[0], weekStart: defaultWeekMgr.start, weekEnd: defaultWeekMgr.end, tasks: OPS_TASKS.map(() => ({ rating: 0, isNA: false, comment: "" })), comments: "" },
    draftServerConfig
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

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    setDraft((prev) => ({
      ...prev,
      name: d.submitterName || prev.name,
      dateOfSubmission: d.dateOfSubmission || prev.dateOfSubmission,
      weekStart: d.weekOfStart || prev.weekStart,
      weekEnd: d.weekOfEnd || prev.weekEnd,
      comments: d.comments || "",
      tasks: d.tasks ? OPS_TASKS.map((_, i) => ({
        rating: d.tasks[i]?.rating ?? 0,
        isNA: d.tasks[i]?.isNA ?? false,
        comment: d.tasks[i]?.comment ?? "",
      })) : prev.tasks,
    }));
  }, [editData]);

  const ratedTasks = tasks.filter((t) => !t.isNA && t.rating > 0);
  const avg = ratedTasks.length > 0 ? (ratedTasks.reduce((s, t) => s + t.rating, 0) / ratedTasks.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (ratedTasks.length === 0) { toast.error("Please rate at least one item"); return; }
    const reportData = { dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd, tasks: OPS_TASKS.map((t, i) => ({ task: t.en, taskFr: t.fr, rating: tasks[i].rating, isNA: tasks[i].isNA, comment: tasks[i].comment })), comments, submittedVia: `Public - ${positionLabel}`, submitterName: name.trim() };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, totalScore: avg, status: "submitted" });
        setSubmitted(true); toast.success("Checklist updated!");
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(),
        reportType: "Manager Checklist",
        location: storeName,
        reportDate: weekStart,
        data: reportData,
        totalScore: avg,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Checklist submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Manager Checklist for ${storeName} ${isEdit ? "updated" : "submitted"}. Average: ${avg}/5`} onNew={isEdit ? undefined : () => { setSubmitted(false); setTasks(() => OPS_TASKS.map(() => ({ rating: 0, isNA: false, comment: "" }))); setComments(""); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? "Edit Manager Checklist" : "Manager Checklist"} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
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
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? (isEdit ? "Updating..." : "Submitting...") : (isEdit ? "Update Checklist" : "Submit Checklist")}</Button>
        {!isEdit && draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Simple Audit Form (6 sections: rating + comment + photo) ───

function SimpleAuditFormPublic({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: {
  storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any;
}) {
  const isEdit = !!editReportId;
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const auditServerConfig = useMemo(() => ({
    reportType: "ops-manager-checklist",
    location: storeCode,
    reportDate: todayStr,
  }), [storeCode, todayStr]);
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `store-weekly-audit-${storeCode}`,
    { name: "", dateOfSubmission: new Date().toISOString().split("T")[0], ratings: {} as Record<string, number>, sectionComments: {} as Record<string, string>, notes: "" },
    auditServerConfig
  );
  const { name, dateOfSubmission, ratings, sectionComments, notes } = draft;
  const setName = (v: string) => setDraft(d => ({ ...d, name: v }));
  const setDateOfSubmission = (v: string) => setDraft(d => ({ ...d, dateOfSubmission: v }));
  const setRating = (section: string, v: number) => setDraft(d => ({ ...d, ratings: { ...d.ratings, [section]: v } }));
  const setComment = (section: string, v: string) => setDraft(d => ({ ...d, sectionComments: { ...d.sectionComments, [section]: v } }));
  const setNotes = (v: string) => setDraft(d => ({ ...d, notes: v }));
  const [sectionPhotos, setSectionPhotos] = useState<Record<string, UploadedPhoto[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const allRatings = Object.values(ratings).filter(v => v > 0);
  const avg = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2) : "0.00";

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    const newRatings: Record<string, number> = {};
    const newComments: Record<string, string> = {};
    if (d.sections) d.sections.forEach((s: any) => { newRatings[s.title] = s.rating || 0; newComments[s.title] = s.comment || ""; });
    setDraft(prev => ({
      ...prev,
      name: d.submitterName || prev.name,
      dateOfSubmission: d.dateOfSubmission || prev.dateOfSubmission,
      ratings: Object.keys(newRatings).length ? newRatings : prev.ratings,
      sectionComments: Object.keys(newComments).length ? newComments : prev.sectionComments,
      notes: d.notes || "",
    }));
  }, [editData]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    const photoUrls: Record<string, string[]> = {};
    for (const [section, photos] of Object.entries(sectionPhotos)) {
      const urls = photos.filter(p => p.status === "success" && p.url).map(p => p.url);
      if (urls.length > 0) photoUrls[section] = urls;
    }
    const reportData = {
      dateOfSubmission,
      sections: AUDIT_SECTIONS_SIMPLE.map(s => ({ title: s, rating: ratings[s] || 0, comment: sectionComments[s] || "", photos: photoUrls[s] || [] })),
      notes, averageScore: avg, submittedVia: `Public - ${positionLabel}`, submitterName: name.trim(),
    };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, totalScore: avg, status: "submitted" });
        setSubmitted(true); toast.success("Audit updated!");
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(),
        reportType: "Store Weekly Audit",
        location: storeName,
        reportDate: dateOfSubmission,
        data: reportData,
        totalScore: avg,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Store Weekly Audit submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Store Weekly Audit for ${storeName} ${isEdit ? "updated" : "submitted"}. Score: ${avg}/5`} onNew={isEdit ? undefined : () => { setSubmitted(false); setDraft(d => ({ ...d, ratings: {}, sectionComments: {}, notes: "" })); setSectionPhotos({}); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? "Edit Store Weekly Audit" : "Store Weekly Audit"} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Date of Submission</Label><Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} /></div>
        </CardContent>
      </Card>
      <Badge variant="outline" className="text-lg px-4 py-2 border-[#faa600] text-[#faa600]">Score: {avg} / 5</Badge>
      {AUDIT_SECTIONS_SIMPLE.map((section) => {
        const photos = sectionPhotos[section] || [];
        const photoCount = photos.filter(p => p.status === "success").length;
        return (
          <Card key={section}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{section}</CardTitle>
                <StarRating value={ratings[section] || 0} onChange={(v) => setRating(section, v)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={sectionComments[section] || ""}
                onChange={(e) => setComment(section, e.target.value)}
                placeholder={`Comments about ${section.toLowerCase()}...`}
                rows={2}
              />
              <div>
                <button
                  type="button"
                  onClick={() => { if (!sectionPhotos[section]) setSectionPhotos(prev => ({ ...prev, [section]: [] })); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors mb-2",
                    photoCount > 0 ? "bg-[#faa600]/15 text-[#faa600] hover:bg-[#faa600]/25" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
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
            </CardContent>
          </Card>
        );
      })}
      <Card><CardContent className="pt-6"><Label>Additional Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="General notes..." /></CardContent></Card>
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? "Submitting..." : "Submit Audit"}</Button>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Section-based Checklist Form (Audit, Deep Cleaning, Asst Mgr, Store Mgr) ───

function SectionChecklistForm({ title, sections, reportType, storeCode, storeName, positionLabel, onBack, useRating, isWeekly, editReportId, editData }: {
  title: string; sections: { title: string; items: string[] }[]; reportType: string; storeCode: string; storeName: string; positionLabel: string; onBack: () => void; useRating?: boolean; isWeekly?: boolean; editReportId?: number; editData?: any;
}) {
  const isEdit = !!editReportId;
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

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    const newData = sections.map((s, si) => {
      const savedSection = d.sections?.find((ds: any) => ds.title === s.title);
      if (!savedSection?.items) return initData[si];
      return s.items.map((item, ii) => {
        const savedItem = savedSection.items.find((di: any) => di.item === item);
        if (!savedItem) return initData[si][ii];
        return useRating ? { rating: savedItem.rating || 0, comment: savedItem.comment || "" } : { checked: !!savedItem.checked };
      });
    });
    setDraft(prev => ({
      ...prev,
      name: d.submitterName || prev.name,
      dateOfSubmission: d.dateOfSubmission || prev.dateOfSubmission,
      weekStart: d.weekOfStart || prev.weekStart,
      weekEnd: d.weekOfEnd || prev.weekEnd,
      data: newData,
      comments: d.comments || "",
    }));
  }, [editData]);

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
    const photoUrls: Record<string, string[]> = {};
    for (const [section, photos] of Object.entries(sectionPhotos)) {
      const urls = photos.filter(p => p.status === "success" && p.url).map(p => p.url);
      if (urls.length > 0) photoUrls[section] = urls;
    }
    const photosData = Object.keys(photoUrls).length > 0 ? { photos: photoUrls } : {};
    const itemPhotoUrls: Record<string, string[]> = {};
    for (const [key, photos] of Object.entries(itemPhotos)) {
      const urls = photos.filter(p => p.status === "success" && p.url).map(p => p.url);
      if (urls.length > 0) itemPhotoUrls[key] = urls;
    }
    const itemPhotosData = Object.keys(itemPhotoUrls).length > 0 ? { itemPhotos: itemPhotoUrls } : {};
    const reportData = { ...(isWeekly ? { dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd } : {}), sections: sections.map((s, si) => ({ title: s.title, items: s.items.map((item, ii) => ({ item, ...data[si][ii] })) })), comments, submittedVia: `Public - ${positionLabel}`, submitterName: name.trim(), ...photosData, ...itemPhotosData };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, totalScore, status: "submitted" });
        setSubmitted(true); toast.success(`${title} updated!`);
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(),
        reportType,
        location: storeName,
        reportDate: isWeekly ? weekStart : dateOfSubmission,
        data: reportData,
        totalScore,
      },
      () => { setSubmitted(true); clearDraft(); toast.success(`${title} submitted!`); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`${title} for ${storeName} ${isEdit ? "updated" : "submitted"}. Score: ${totalScore}`} onNew={isEdit ? undefined : () => { setSubmitted(false); setData(() => sections.map((s) => s.items.map(() => useRating ? { rating: 0, comment: "" } : { checked: false })) as any[][]); setComments(""); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? `Edit ${title}` : title} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
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
              const isAuditForm = reportType === "Store Weekly Audit" || reportType === "Operations Manager Checklist (Weekly Audit)";
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

function WasteItemTable({ title, items, rows, onChange, qtyTypes, costFn, hideCosts = false }: {
  title: string;
  items: string[];
  rows: Record<string, WasteItemRow>;
  onChange: (rows: Record<string, WasteItemRow>) => void;
  qtyTypes: string[];
  costFn: (item: string, qty: number, qtyType: string) => number;
  hideCosts?: boolean;
}) {
  const updateRow = (item: string, field: keyof WasteItemRow, value: string | boolean) => {
    onChange({ ...rows, [item]: { ...rows[item], [field]: value } });
  };

  let sectionLeftoverCost = 0;
  let sectionWasteCost = 0;
  items.forEach((item) => {
    const row = rows[item];
    if (!row) return;
    const lQty = parseFloat(row.leftover) || 0;
    const wQty = parseFloat(row.waste) || 0;
    if (lQty > 0) sectionLeftoverCost += costFn(item, lQty, row.leftoverQty);
    if (wQty > 0) sectionWasteCost += costFn(item, wQty, row.wasteQty);
  });
  const sectionTotal = sectionLeftoverCost + sectionWasteCost;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {!hideCosts && sectionTotal > 0 && (
            <span className="text-sm font-mono font-semibold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg border border-red-200/50">
              ${sectionTotal.toFixed(2)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-[180px]">Item</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[70px]">Leftover</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[90px]">Qty Type</th>
                {!hideCosts && <th className="text-right py-2 px-1 font-medium text-blue-600 w-[55px]">L.Cost</th>}
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[70px]">Waste</th>
                <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[90px]">Qty Type</th>
                {!hideCosts && <th className="text-right py-2 px-1 font-medium text-orange-600 w-[55px]">W.Cost</th>}
                <th className="text-left py-2 pl-2 font-medium text-muted-foreground">Comment</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const row = rows[item];
                if (!row) return null;
                const lQty = parseFloat(row.leftover) || 0;
                const wQty = parseFloat(row.waste) || 0;
                const leftoverCost = lQty > 0 ? costFn(item, lQty, row.leftoverQty) : 0;
                const wasteCost = wQty > 0 ? costFn(item, wQty, row.wasteQty) : 0;
                return (
                  <tr key={item} className="border-b border-border/30 last:border-0">
                    <td className="py-2 pr-2">
                      <span className="text-sm font-medium truncate">{item}</span>
                    </td>
                    <td className="py-2 px-2">
                      <Input
                        type="number" min="0" step="0.1"
                        value={row.leftover}
                        onChange={(e) => updateRow(item, "leftover", e.target.value)}
                        className="h-8 w-[65px] text-sm"
                        placeholder=""
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.leftoverQty}
                        onChange={(e) => updateRow(item, "leftoverQty", e.target.value)}
                        className="h-8 w-[80px] text-sm rounded-md border border-border bg-background px-1.5"
                      >
                        {qtyTypes.map((q: string) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </td>
                    {!hideCosts && <td className="py-2 px-1 text-right">
                      {leftoverCost > 0 ? (
                        <span className="text-xs font-mono text-blue-600">${leftoverCost.toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>}
                    <td className="py-2 px-2">
                      <Input
                        type="number" min="0" step="0.1"
                        value={row.waste}
                        onChange={(e) => updateRow(item, "waste", e.target.value)}
                        className="h-8 w-[65px] text-sm"
                        placeholder=""
                      />
                    </td>
                    <td className="py-2 px-2">
                      <select
                        value={row.wasteQty}
                        onChange={(e) => updateRow(item, "wasteQty", e.target.value)}
                        className="h-8 w-[80px] text-sm rounded-md border border-border bg-background px-1.5"
                      >
                        {qtyTypes.map((q: string) => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </td>
                    {!hideCosts && <td className="py-2 px-1 text-right">
                      {wasteCost > 0 ? (
                        <span className="text-xs font-mono text-orange-600">${wasteCost.toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>}
                    <td className="py-2 pl-2">
                      <Input
                        value={row.comment}
                        onChange={(e) => updateRow(item, "comment", e.target.value)}
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

function WasteReportForm({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any }) {
  const isEdit = !!editReportId;
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

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    const parseWasteItems = (items: any[], allItems: string[], defaultQty: string): Record<string, WasteItemRow> => {
      const rows = initWasteRows(allItems, defaultQty);
      if (!items) return rows;
      items.forEach((entry: any) => {
        if (!entry.item || !rows[entry.item]) return;
        const leftParts = (entry.leftover || "").match(/^([\d.]+)\s*(\w+)?$/);
        const wasteParts = (entry.waste || "").match(/^([\d.]+)\s*(\w+)?$/);
        rows[entry.item] = {
          enabled: true,
          leftover: leftParts ? leftParts[1] : "",
          leftoverQty: leftParts?.[2] || defaultQty,
          waste: wasteParts ? wasteParts[1] : "",
          wasteQty: wasteParts?.[2] || defaultQty,
          comment: entry.comment || "",
        };
      });
      return rows;
    };
    setDraft((prev) => ({
      ...prev,
      name: d.submitterName || prev.name,
      bagelRows: parseWasteItems(d.bagels, WASTE_BAGEL_TYPES, "bag"),
      pastryRows: parseWasteItems(d.pastries, PASTRY_TYPES, "unit"),
      ckRows: parseWasteItems(d.ckItems, CK_ITEMS, "unit"),
    }));
  }, [editData]);

  const calcTotalCosts = () => {
    let leftoverTotal = 0;
    let wasteTotal = 0;
    Object.entries(bagelRows).forEach(([, r]) => {
      const lQ = parseFloat(r.leftover) || 0;
      const wQ = parseFloat(r.waste) || 0;
      if (lQ > 0) leftoverTotal += calcBagelCost(lQ, r.leftoverQty);
      if (wQ > 0) wasteTotal += calcBagelCost(wQ, r.wasteQty);
    });
    Object.entries(pastryRows).forEach(([item, r]) => {
      const lQ = parseFloat(r.leftover) || 0;
      const wQ = parseFloat(r.waste) || 0;
      if (lQ > 0) leftoverTotal += calcPastryCost(item, lQ);
      if (wQ > 0) wasteTotal += calcPastryCost(item, wQ);
    });
    Object.entries(ckRows).forEach(([item, r]) => {
      const lQ = parseFloat(r.leftover) || 0;
      const wQ = parseFloat(r.waste) || 0;
      if (lQ > 0) leftoverTotal += calcCKCost(item, lQ, r.leftoverQty);
      if (wQ > 0) wasteTotal += calcCKCost(item, wQ, r.wasteQty);
    });
    return { leftoverTotal, wasteTotal, grandTotal: leftoverTotal + wasteTotal };
  };

  const costs = calcTotalCosts();

  // Collect data in the same format as admin dashboard
  const collectData = () => {
    const collect = (rows: Record<string, WasteItemRow>) =>
      Object.entries(rows)
        .filter(([, r]) => r.leftover || r.waste)
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
      costs: calcTotalCosts(),
    };
  };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    const data = collectData();
    const reportData = { ...data, submittedVia: `Public - ${positionLabel}`, submitterName: name.trim() };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, status: "submitted" });
        setSubmitted(true); toast.success("Waste report updated!");
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      { submitterName: name.trim(), reportType: "Leftovers & Waste", location: storeName, reportDate: date, data: reportData },
      () => { setSubmitted(true); clearDraft(); toast.success("Waste report submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Waste report for ${storeName} ${isEdit ? "updated" : "submitted"}.`} onNew={isEdit ? undefined : () => { setSubmitted(false); setBagelRows(initWasteRows(WASTE_BAGEL_TYPES, "bag")); setPastryRows(initWasteRows(PASTRY_TYPES, "unit")); setCkRows(initWasteRows(CK_ITEMS, "unit")); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? "Edit Leftovers & Waste Report" : "Leftovers & Waste Report"} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </CardContent></Card>
      <WasteItemTable title="Bagels" items={WASTE_BAGEL_TYPES} rows={bagelRows} onChange={setBagelRows} qtyTypes={QTY_TYPES_BAGEL} costFn={(_item, qty, qtyType) => calcBagelCost(qty, qtyType)} hideCosts />
      <WasteItemTable title="Pastries" items={PASTRY_TYPES} rows={pastryRows} onChange={setPastryRows} qtyTypes={QTY_TYPES_PASTRY} costFn={(item, qty, _qtyType) => calcPastryCost(item, qty)} hideCosts />
      <WasteItemTable title="CK Items" items={CK_ITEMS} rows={ckRows} onChange={setCkRows} qtyTypes={QTY_TYPES_CK} costFn={(item, qty, qtyType) => calcCKCost(item, qty, qtyType)} hideCosts />

      {/* Total Cost Summary — HIDDEN on portal to prevent cheating. Costs only visible on admin dashboard. */}

      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? (isEdit ? "Updating..." : "Submitting...") : (isEdit ? "Update Waste Report" : "Submit Waste Report")}</Button>
        {!isEdit && draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Equipment Maintenance Form ───

function EquipmentMaintenanceForm({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any }) {
  const isEdit = !!editReportId;
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

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    const mapItems = (saved: any[], items: { equipment: string; task: string }[]) => items.map((item, i) => {
      const s = saved?.find((e: any) => e.equipment === item.equipment);
      return s ? { checked: !!s.checked, initial: s.initial || "" } : { checked: false, initial: "" };
    });
    setDraft(prev => ({
      ...prev,
      name: d.submitterName || prev.name,
      daily: d.daily ? mapItems(d.daily, EQUIP_DAILY) : prev.daily,
      weekly: d.weekly ? mapItems(d.weekly, EQUIP_WEEKLY) : prev.weekly,
      monthly: d.monthly ? mapItems(d.monthly, EQUIP_MONTHLY) : prev.monthly,
    }));
  }, [editData]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    const total = daily.length + weekly.length + monthly.length;
    const checked = [...daily, ...weekly, ...monthly].filter((i) => i.checked).length;
    const reportData = { daily: EQUIP_DAILY.map((e, i) => ({ ...e, ...daily[i] })), weekly: EQUIP_WEEKLY.map((e, i) => ({ ...e, ...weekly[i] })), monthly: EQUIP_MONTHLY.map((e, i) => ({ ...e, ...monthly[i] })), submittedVia: `Public - ${positionLabel}`, submitterName: name.trim() };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, totalScore: `${checked}/${total}`, status: "submitted" });
        setSubmitted(true); toast.success("Equipment checklist updated!");
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Equipment Maintenance", location: storeName, reportDate: date,
        data: reportData,
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

  if (submitted) return <SuccessScreen message={`Equipment maintenance checklist for ${storeName} ${isEdit ? "updated" : "submitted"}.`} onNew={isEdit ? undefined : () => { setSubmitted(false); setDaily(EQUIP_DAILY.map(() => ({ checked: false, initial: "" }))); setWeekly(EQUIP_WEEKLY.map(() => ({ checked: false, initial: "" }))); setMonthly(EQUIP_MONTHLY.map(() => ({ checked: false, initial: "" }))); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? "Edit Equipment & Maintenance" : "Equipment & Maintenance"} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </CardContent></Card>
      {renderEquipSection("Daily Checks", EQUIP_DAILY, daily, setDaily)}
      {renderEquipSection("Weekly Checks", EQUIP_WEEKLY, weekly, setWeekly)}
      {renderEquipSection("Monthly Checks", EQUIP_MONTHLY, monthly, setMonthly)}
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white">{submitting ? (isEdit ? "Updating..." : "Submitting...") : (isEdit ? "Update Equipment Checklist" : "Submit Equipment Checklist")}</Button>
        {!isEdit && draftButton}
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

function WeeklyScorecardForm({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any }) {
  const isEdit = !!editReportId;
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

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    setDraft(prev => ({
      ...prev,
      managerName: d.submitterName || d.managerName || prev.managerName,
      dateEntered: d.dateEntered || prev.dateEntered,
      weekStart: d.weekOfStart || prev.weekStart,
      weekEnd: d.weekOfEnd || prev.weekEnd,
      sales: d.sales || prev.sales,
      labour: d.labour || prev.labour,
      digital: d.digital || prev.digital,
      food: d.food || prev.food,
    }));
  }, [editData]);

  const handleSubmit = async () => {
    if (!managerName.trim()) { toast.error("Please fill required fields"); return; }
    const reportData = { dateEntered, weekOf: weekOfLabel, weekOfStart: weekStart, weekOfEnd: weekEnd, sales, labour, digital, food, submittedVia: `Public - ${positionLabel}`, submitterName: managerName.trim() };
    const score = sales.thisWeekActual ? `$${parseFloat(sales.thisWeekActual).toFixed(0)}` : undefined;
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, totalScore: score, status: "submitted" });
        setSubmitted(true); toast.success("Scorecard updated!");
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: managerName.trim(), reportType: "weekly-scorecard", location: storeCode, reportDate: weekStart,
        data: reportData,
        totalScore: score,
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

  if (submitted) return <SuccessScreen message={`Weekly Scorecard for ${storeName} ${isEdit ? "updated" : "submitted"}.`} onNew={isEdit ? undefined : () => { setSubmitted(false); setDraft({ managerName: "", dateEntered: new Date().toISOString().split("T")[0], weekStart: defaultWeek.start, weekEnd: defaultWeek.end, sales: initSec(), labour: initSec(), digital: { googleReviews: "", howContribute: "" }, food: initSec() }); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? "Edit Weekly Scorecard" : "Store Manager Weekly Scorecard"} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
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
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1 bg-[#D4A853] text-[#1C1210] hover:bg-[#C49A48]">{submitting ? (isEdit ? "Updating..." : "Submitting...") : (isEdit ? "Update Scorecard" : "Submit Scorecard")}</Button>
        </div>
        {!isEdit && draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}

// ─── Training Evaluation Form ───

function TrainingEvaluationForm({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any }) {
  const isEdit = !!editReportId;
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

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    const newRatings = TRAINING_AREAS.map((a, ai) => {
      const savedArea = d.areas?.find((da: any) => da.title === a.title);
      if (!savedArea?.items) return a.items.map(() => ({ rating: 0, comment: "" }));
      return a.items.map((item, ii) => {
        const savedItem = savedArea.items.find((di: any) => di.item === item);
        return savedItem ? { rating: savedItem.rating || 0, comment: savedItem.comment || "" } : { rating: 0, comment: "" };
      });
    });
    setDraft(prev => ({
      ...prev,
      name: d.submitterName || prev.name,
      traineeName: d.traineeName || prev.traineeName,
      ratings: newRatings,
      overallComments: d.overallComments || "",
    }));
  }, [editData]);

  const allRatings = ratings.flat().filter((r) => r.rating > 0);
  const avg = allRatings.length > 0 ? (allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!traineeName.trim()) { toast.error("Please enter trainee name"); return; }
    const reportData = { traineeName, areas: TRAINING_AREAS.map((a, ai) => ({ title: a.title, items: a.items.map((item, ii) => ({ item, ...ratings[ai][ii] })) })), overallComments, submittedVia: `Public - ${positionLabel}`, submitterName: name.trim() };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, totalScore: avg, status: "submitted" });
        setSubmitted(true); toast.success("Training evaluation updated!");
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Training Evaluation", location: storeName, reportDate: date,
        data: reportData,
        totalScore: avg,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Training evaluation submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Training evaluation for ${traineeName} at ${storeName} ${isEdit ? "updated" : "submitted"}. Average: ${avg}/5`} onNew={isEdit ? undefined : () => { setSubmitted(false); setRatings(() => TRAINING_AREAS.map((a) => a.items.map(() => ({ rating: 0, comment: "" })))); setTraineeName(""); setOverallComments(""); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? "Edit Training Evaluation" : "Training Evaluation"} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
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

function BagelOrdersForm({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any }) {
  const isEdit = !!editReportId;
  // Map portal storeCode (e.g. "ontario") to shortName (e.g. "ON") if needed
  const resolvedStoreCode = (() => {
    if (!storeCode || storeCode === "sales") return storeCode || "sales";
    // Check if storeCode is already a shortName (e.g. "ON")
    if (stores.find(s => s.shortName === storeCode)) return storeCode;
    // Map from store id (e.g. "ontario") to shortName (e.g. "ON")
    const mapped = stores.find(s => s.id === storeCode);
    if (mapped) return mapped.shortName;
    return storeCode;
  })();
  // Lock location when a specific store is assigned (not sales, not empty)
  const isLocationLocked = resolvedStoreCode !== "sales" && resolvedStoreCode !== "" && stores.some(s => s.shortName === resolvedStoreCode);
  const [selectedLocation, setSelectedLocation] = useState(resolvedStoreCode);
  const isSales = selectedLocation === "sales";
  const resolvedStoreName = isSales ? "Sales" : (stores.find(s => s.shortName === selectedLocation)?.name || storeName);

  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `bagel-orders-v2-${selectedLocation}`,
    { name: "", clientName: "", orderForDate: new Date().toISOString().split("T")[0], quantities: Object.fromEntries(BAGEL_TYPES.map(t => [t, ""])), itemUnits: Object.fromEntries(BAGEL_TYPES.map(t => [t, "dozen"])) as Record<string, "dozen" | "unit" | "box"> }
  );
  const { name, clientName, orderForDate, quantities, itemUnits } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setClientName = (v: string) => setDraft((d) => ({ ...d, clientName: v }));
  const setOrderForDate = (v: string) => setDraft((d) => ({ ...d, orderForDate: v }));
  const setQuantity = (type: string, val: string) => setDraft((d) => ({ ...d, quantities: { ...d.quantities, [type]: val } }));
  const setItemUnit = (type: string, val: "dozen" | "unit" | "box") => setDraft((d) => ({ ...d, itemUnits: { ...d.itemUnits, [type]: val } }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    const newQty: Record<string, string> = {};
    const newUnits: Record<string, "dozen" | "unit" | "box"> = {};
    if (d.orders) d.orders.forEach((o: any) => { newQty[o.type] = String(o.quantity || ""); newUnits[o.type] = o.unit || "dozen"; });
    setDraft(prev => ({
      ...prev,
      name: d.submitterName || prev.name,
      clientName: d.clientName || prev.clientName,
      orderForDate: d.orderForDate || prev.orderForDate,
      quantities: Object.keys(newQty).length ? { ...prev.quantities, ...newQty } : prev.quantities,
      itemUnits: Object.keys(newUnits).length ? { ...prev.itemUnits, ...newUnits } : prev.itemUnits,
    }));
  }, [editData]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (isSales && !clientName.trim()) { toast.error("Please enter the client name"); return; }
    if (!orderForDate) { toast.error("Please select the order date"); return; }
    const reportData = {
      orderForDate,
      ...(isSales ? { clientName: clientName.trim() } : {}),
      orders: BAGEL_TYPES.map(type => ({ type, quantity: quantities[type] || "0", unit: (itemUnits?.[type]) || "dozen" })),
      submittedVia: `Public - ${positionLabel}`, submitterName: name.trim(),
    };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, status: "submitted" });
        setSubmitted(true); toast.success(`Bagel order updated!`);
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Bagel Orders", location: isSales ? "sales" : selectedLocation, reportDate: orderForDate,
        data: reportData,
      },
      () => { setSubmitted(true); clearDraft(); toast.success(`Bagel order submitted for ${resolvedStoreName}${isSales ? ` — ${clientName}` : ""}!`); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Bagel order for ${resolvedStoreName}${isSales ? ` — ${clientName}` : ""} ${isEdit ? "updated" : "submitted"}.`} onNew={isEdit ? undefined : () => { setSubmitted(false); setDraft((d) => ({ ...d, clientName: "", quantities: Object.fromEntries(BAGEL_TYPES.map(t => [t, ""])), itemUnits: Object.fromEntries(BAGEL_TYPES.map(t => [t, "dozen"])) as Record<string, "dozen" | "unit" | "box"> })); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? "Edit Bagel Order" : "Bagel Orders"} subtitle={`${positionLabel} — ${resolvedStoreName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
      {/* Location Selector — locked for store managers, full selector for ops manager */}
      {isLocationLocked ? (
        <Card><CardContent className="pt-6">
          <Label className="text-sm font-medium">Location</Label>
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-[#faa600] bg-[#faa600]/10">
            <div className="w-2 h-2 rounded-full" style={{ background: stores.find(s => s.shortName === selectedLocation)?.color || "#faa600" }} />
            <span className="text-sm font-medium text-[#e09500]">{selectedLocation}</span>
            <span className="text-xs text-muted-foreground">— {resolvedStoreName}</span>
            <Lock className="w-3 h-3 text-muted-foreground ml-auto" />
          </div>
        </CardContent></Card>
      ) : (
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
                  : "border-gray-200 bg-white hover:border-purple-400 text-gray-500 hover:text-gray-700"
              )}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Sales</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">Client Orders</p>
            </button>
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                onClick={() => setSelectedLocation(store.shortName)}
                className={cn(
                  "px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 text-left",
                  selectedLocation === store.shortName
                    ? "border-[#faa600] bg-[#faa600]/10 text-[#e09500]"
                    : "border-gray-200 bg-white hover:border-[#faa600]/40 text-gray-500 hover:text-gray-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: store.color }} />
                  <span>{store.shortName}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{store.name}</p>
              </button>
            ))}
          </div>
        </CardContent></Card>
      )}

      <Card><CardContent className="pt-6 space-y-4">
        {isSales && (
          <div className="space-y-2"><Label>Client Name <span className="text-red-500">*</span></Label><Input placeholder="Enter client name" value={clientName} onChange={(e) => setClientName(e.target.value)} /></div>
        )}
        <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Order for Date *</Label><Input type="date" value={orderForDate} onChange={(e) => setOrderForDate(e.target.value)} /></div>

      </CardContent></Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Quantities</CardTitle>
          <p className="text-sm text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">Select dozen or unit per item.{isSales ? " Box option available for Sales orders." : ""} Default is dozen (12 units per dozen).</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {BAGEL_TYPES.map((type) => (
              <div key={type} className="flex items-center justify-between gap-4 py-1.5 border-b last:border-0">
                <span className="text-sm">{type}</span>
                <div className="flex items-center gap-2">
                  <Input type="number" min="0" step="0.5" placeholder="0" value={quantities[type]} onChange={(e) => setQuantity(type, e.target.value)} className="h-8 w-20 text-center text-sm" />
                  <select value={(itemUnits?.[type]) || "dozen"} onChange={(e) => setItemUnit(type, e.target.value as "dozen" | "unit" | "box")} className={cn("h-8 rounded-md border border-border bg-background px-1 text-xs", isSales ? "w-[4.5rem]" : "w-16")}>
                    <option value="dozen">doz.</option>
                    <option value="unit">pcs</option>
                    {isSales && <option value="box">box</option>}
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

// ─── Pastry Orders Form ───

const PASTRY_ORDER_ITEMS = [
  "Banana Bread with Nuts", "Croissant", "Croissant aux Amandes", "Chocolatine",
  "Chocolate Chips Cookie", "Muffin a L'Erable", "Muffin Bleuets", "Muffin Pistaches",
  "Muffin Chocolat", "Yogurt Granola", "Fresh orange juice", "Gateau aux Carottes",
  "Granola bag", "Bagel Chips Bags", "Maple Pecan Bar", "Pudding",
];

function PastryOrdersForm({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any }) {
  const isEdit = !!editReportId;
  // Map portal storeCode (e.g. "ontario") to shortName (e.g. "ON") if needed
  const resolvedStoreCode = (() => {
    if (!storeCode) return "";
    if (stores.find(s => s.shortName === storeCode)) return storeCode;
    const mapped = stores.find(s => s.id === storeCode);
    if (mapped) return mapped.shortName;
    return storeCode;
  })();
  const isLocationLocked = resolvedStoreCode !== "" && stores.some(s => s.shortName === resolvedStoreCode);
  const [selectedLocation, setSelectedLocation] = useState(resolvedStoreCode || stores[0]?.shortName || "PK");
  const resolvedStoreName = stores.find(s => s.shortName === selectedLocation)?.name || storeName;

  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `pastry-orders-v1-${selectedLocation}`,
    { name: "", orderForDate: new Date().toISOString().split("T")[0], quantities: Object.fromEntries(PASTRY_ORDER_ITEMS.map(t => [t, ""])) }
  );
  const { name, orderForDate, quantities } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setOrderForDate = (v: string) => setDraft((d) => ({ ...d, orderForDate: v }));
  const setQuantity = (type: string, val: string) => setDraft((d) => ({ ...d, quantities: { ...d.quantities, [type]: val } }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    const newQty: Record<string, string> = {};
    if (d.orders) d.orders.forEach((o: any) => { newQty[o.type] = String(o.quantity || ""); });
    setDraft(prev => ({
      ...prev,
      name: d.submitterName || prev.name,
      orderForDate: d.orderForDate || prev.orderForDate,
      quantities: Object.keys(newQty).length ? { ...prev.quantities, ...newQty } : prev.quantities,
    }));
  }, [editData]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!orderForDate) { toast.error("Please select the order date"); return; }
    const reportData = {
      orderForDate,
      orders: PASTRY_ORDER_ITEMS.map(type => ({ type, quantity: quantities[type] || "0", unit: "unit" })),
      submittedVia: `Public - ${positionLabel}`, submitterName: name.trim(),
    };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, status: "submitted" });
        setSubmitted(true); toast.success(`Pastry order updated!`);
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Pastry Orders", location: selectedLocation, reportDate: orderForDate,
        data: reportData,
      },
      () => { setSubmitted(true); clearDraft(); toast.success(`Pastry order submitted for ${resolvedStoreName}!`); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Pastry order for ${resolvedStoreName} ${isEdit ? "updated" : "submitted"}.`} onNew={isEdit ? undefined : () => { setSubmitted(false); setDraft((d) => ({ ...d, quantities: Object.fromEntries(PASTRY_ORDER_ITEMS.map(t => [t, ""])) })); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? "Edit Pastry Order" : "Pastry Orders"} subtitle={`${positionLabel} — ${resolvedStoreName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
      {/* Location Selector — locked for store managers, full selector otherwise */}
      {isLocationLocked ? (
        <Card><CardContent className="pt-6">
          <Label className="text-sm font-medium">Location</Label>
          <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-400 bg-rose-50">
            <div className="w-2 h-2 rounded-full" style={{ background: stores.find(s => s.shortName === selectedLocation)?.color || "#f43f5e" }} />
            <span className="text-sm font-medium text-rose-700">{selectedLocation}</span>
            <span className="text-xs text-muted-foreground">— {resolvedStoreName}</span>
            <Lock className="w-3 h-3 text-muted-foreground ml-auto" />
          </div>
        </CardContent></Card>
      ) : (
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
                    ? "border-rose-400 bg-rose-50 text-rose-700"
                    : "border-gray-200 bg-white hover:border-rose-300 text-gray-500 hover:text-gray-700"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: store.color }} />
                  <span>{store.shortName}</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">{store.name}</p>
              </button>
            ))}
          </div>
        </CardContent></Card>
      )}

      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Order for Date *</Label><Input type="date" value={orderForDate} onChange={(e) => setOrderForDate(e.target.value)} /></div>
      </CardContent></Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Quantities</CardTitle>
          <p className="text-sm text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-md px-3 py-1.5">Enter quantity per item (units).</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {PASTRY_ORDER_ITEMS.map((type) => (
              <div key={type} className="flex items-center justify-between gap-4 py-1.5 border-b last:border-0">
                <span className="text-sm">{type}</span>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="0" min="0" className="w-20 text-center" value={quantities[type] || ""} onChange={(e) => setQuantity(type, e.target.value)} />
                  <span className="text-xs text-muted-foreground w-10">unit</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3">
        <Button onClick={handleSubmit} disabled={submitting} className="w-full h-12 text-lg bg-rose-500 hover:bg-rose-600 text-white">{submitting ? "Submitting..." : "Submit Pastry Orders"}</Button>
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

function PerformanceEvaluationForm({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any }) {
  const isEdit = !!editReportId;
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

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    const newRatings = EVAL_CRITERIA.map((c, i) => {
      const saved = d.criteria?.find((dc: any) => dc.key === c.key);
      return saved ? { rating: saved.rating || 0, comment: saved.comment || "" } : { rating: 0, comment: "" };
    });
    setDraft(prev => ({
      ...prev,
      name: d.submitterName || prev.name,
      employeeName: d.employeeName || prev.employeeName,
      employeePosition: d.employeePosition || prev.employeePosition,
      ratings: newRatings,
      overallComments: d.overallComments || "",
    }));
  }, [editData]);

  const rated = ratings.filter((r) => r.rating > 0);
  const avg = rated.length > 0 ? (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    if (!employeeName.trim()) { toast.error("Please enter employee name"); return; }
    const reportData = { employeeName, employeePosition, criteria: EVAL_CRITERIA.map((c, i) => ({ ...c, ...ratings[i] })), overallComments, submittedVia: `Public - ${positionLabel}`, submitterName: name.trim() };
    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, totalScore: avg, status: "submitted" });
        setSubmitted(true); toast.success("Evaluation updated!");
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Performance Evaluation", location: storeName, reportDate: date,
        data: reportData,
        totalScore: avg,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Evaluation submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Performance evaluation for ${employeeName} ${isEdit ? "updated" : "submitted"}. Average: ${avg}/5`} onNew={isEdit ? undefined : () => { setSubmitted(false); setRatings(() => EVAL_CRITERIA.map(() => ({ rating: 0, comment: "" }))); setEmployeeName(""); setEmployeePosition(""); setOverallComments(""); }} onBack={onBack} />;

  return (
    <PublicFormLayout title={isEdit ? "Edit Performance Evaluation" : "Performance Evaluation"} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      {isEdit && <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm"><span className="font-medium">Editing mode</span> — Changes will update the existing report</div>}
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

// ─── Deep Clean Checklist Form ───

interface DeepCleanItemState {
  rating: number;
  na: boolean;
  comment: string;
}

function DeepCleanChecklistForm({ storeCode, storeName, positionLabel, onBack, editReportId, editData }: {
  storeCode: string; storeName: string; positionLabel: string; onBack: () => void; editReportId?: number; editData?: any;
}) {
  const isEdit = !!editReportId;
  const defaultWeek = useMemo(() => getDefaultWeekRange(), []);

  const initItems = (): Record<string, DeepCleanItemState[]> => {
    const result: Record<string, DeepCleanItemState[]> = {};
    DEEP_CLEAN_SECTIONS.forEach((s) => {
      result[s.title] = s.items.map(() => ({ rating: 0, na: false, comment: "" }));
    });
    return result;
  };

  const draftServerConfig = useMemo(() => ({
    reportType: "deep-clean",
    location: storeCode,
    reportDate: defaultWeek.start,
  }), [storeCode, defaultWeek.start]);

  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `deep-clean-${storeCode}`,
    {
      name: "",
      dateOfSubmission: new Date().toISOString().split("T")[0],
      items: initItems(),
      overallComments: "",
    },
    draftServerConfig
  );

  const { name, dateOfSubmission, items, overallComments } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDateOfSubmission = (v: string) => setDraft((d) => ({ ...d, dateOfSubmission: v }));
  const setOverallComments = (v: string) => setDraft((d) => ({ ...d, overallComments: v }));

  const updateItem = (sectionTitle: string, itemIdx: number, update: Partial<DeepCleanItemState>) => {
    setDraft((d) => ({
      ...d,
      items: {
        ...d.items,
        [sectionTitle]: d.items[sectionTitle].map((item, i) =>
          i === itemIdx ? { ...item, ...update } : item
        ),
      },
    }));
  };

  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  // Calculate average score (excluding N/A items)
  const allRatings = Object.values(items).flat().filter((item) => !item.na && item.rating > 0);
  const avg = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b.rating, 0) / allRatings.length).toFixed(2) : "0.00";

  // Pre-fill from editData
  useEffect(() => {
    if (!editData) return;
    const d = typeof editData === "string" ? JSON.parse(editData) : editData;
    const newItems = initItems();
    if (d.sections) {
      d.sections.forEach((sec: any) => {
        if (newItems[sec.title] && sec.items) {
          sec.items.forEach((item: any, idx: number) => {
            if (newItems[sec.title][idx]) {
              newItems[sec.title][idx] = {
                rating: item.rating || 0,
                na: item.na || false,
                comment: item.comment || "",
              };
            }
          });
        }
      });
    }
    setDraft((prev) => ({
      ...prev,
      name: d.submitterName || prev.name,
      dateOfSubmission: d.dateOfSubmission || prev.dateOfSubmission,
      items: newItems,
      overallComments: d.overallComments || "",
    }));
  }, [editData]);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }

    const reportData = {
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
      submittedVia: `Public - ${positionLabel}`,
      submitterName: name.trim(),
    };

    if (isEdit) {
      setSubmitting(true);
      try {
        await updateReport(editReportId!, { data: reportData, totalScore: avg, status: "submitted" });
        setSubmitted(true);
        toast.success("Deep Clean Checklist updated!");
      } catch { toast.error("Failed to update"); }
      setSubmitting(false);
      return;
    }

    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(),
        reportType: "Weekly Deep Clean Checklist",
        location: storeName,
        reportDate: dateOfSubmission,
        data: reportData,
        totalScore: avg,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Weekly Deep Clean Checklist submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) {
    return (
      <SuccessScreen
        message={`Weekly Deep Clean Checklist for ${storeName} ${isEdit ? "updated" : "submitted"}. Score: ${avg}/5`}
        onNew={isEdit ? undefined : () => { setSubmitted(false); setDraft((d) => ({ ...d, items: initItems(), overallComments: "" })); }}
        onBack={onBack}
      />
    );
  }

  return (
    <PublicFormLayout title={isEdit ? "Edit Weekly Deep Clean Checklist" : "Weekly Deep Clean Checklist"} subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      {isEdit && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <span className="font-medium">Editing mode</span> — Changes will update the existing report
        </div>
      )}

      {/* Header Fields */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Submitting Manager Name *</Label>
            <Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Date of Verification</Label>
            <Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Average Score Badge */}
      <Badge variant="outline" className="text-lg px-4 py-2 border-[#faa600] text-[#faa600]">
        Average: {avg} / 5
      </Badge>

      {/* Sections */}
      {DEEP_CLEAN_SECTIONS.map((section) => (
        <Card key={section.title}>
          <CardHeader>
            <CardTitle className="text-base font-bold">{section.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{section.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_120px_40px_1fr] gap-2 text-xs text-muted-foreground font-medium px-1">
              <span>Task</span>
              <span className="text-center">Rating (1-5)</span>
              <span className="text-center">N/A</span>
              <span>Manager Comments / Corrective Action</span>
            </div>
            {section.items.map((itemText, idx) => {
              const itemState = items[section.title]?.[idx] || { rating: 0, na: false, comment: "" };
              return (
                <div key={idx} className="border rounded-lg p-3 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_120px_40px_1fr] sm:gap-2 sm:items-center">
                  <p className="text-sm font-medium">{itemText}</p>
                  <div className="flex justify-center">
                    <StarRating
                      value={itemState.na ? 0 : itemState.rating}
                      onChange={(v) => updateItem(section.title, idx, { rating: v, na: false })}
                      size="sm"
                    />
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
                  <Input
                    placeholder="Comment..."
                    value={itemState.comment}
                    onChange={(e) => updateItem(section.title, idx, { comment: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      {/* Overall Comments */}
      <Card>
        <CardContent className="pt-6">
          <Label>Overall Comments / Areas for Improvement</Label>
          <Textarea
            value={overallComments}
            onChange={(e) => setOverallComments(e.target.value)}
            placeholder="Overall assessment, areas for improvement, follow-up actions..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex flex-col gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full h-12 text-lg bg-[#faa600] hover:bg-[#e09500] text-white"
        >
          {submitting ? "Submitting..." : isEdit ? "Update Checklist" : "Submit Checklist"}
        </Button>
        {draftButton}
      </div>
      {duplicateDialog}
    </PublicFormLayout>
  );
}
