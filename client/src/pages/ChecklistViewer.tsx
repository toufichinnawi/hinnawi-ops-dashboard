// Dashboard-internal checklist viewer — bypasses PIN gate for logged-in users
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardCheck,
  ChevronRight,
  Store as StoreIcon,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Users,
  Star,
  Utensils,
  MessageSquare,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  POSITION_CHECKLISTS,
  ALL_CHECKLISTS,
  getPositionConfig,
  getChecklistInfo,
  type ChecklistType,
} from "@/lib/positionChecklists";
import { stores } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/StarRating";
import { CheckCircle2, Camera } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhotoUpload, type UploadedPhoto } from "@/components/PhotoUpload";
import { calcBagelCost, calcPastryCost, calcCKCost } from "@shared/wastePricing";
import { useDuplicateReportCheck } from "@/hooks/useDuplicateReportCheck";

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

// ─── Checklist Data Definitions (same as public page) ───

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
const PASTRY_TYPES = ["Croissant", "Pain au Chocolat", "Muffin", "Cookie", "Brownie", "Scone", "Danish", "Cinnamon Roll"];
const CK_ITEMS = ["Cream Cheese (tubs)", "Hummus (tubs)", "Egg Salad (kg)", "Tuna Salad (kg)", "Chicken Salad (kg)", "Smoked Salmon (packs)", "Avocado (units)"];
const PASTRY_ORDER_ITEMS = [
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

// (SALES_ROWS and LABOR_ROWS removed — replaced by new scorecard sections)

// ─── Store Selector ───

function StoreSelector({
  selectedStore,
  onSelect,
}: {
  selectedStore: string | null;
  onSelect: (code: string, name: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-lg text-foreground">Select Store</h3>
        <p className="text-sm text-muted-foreground">
          Choose which store this checklist is for
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stores.map((store) => (
          <button
            key={store.id}
            onClick={() => onSelect(store.shortName, store.name)}
            className={cn(
              "p-4 rounded-xl border-2 transition-all duration-200 text-left",
              selectedStore === store.shortName
                ? "border-[#D4A853] bg-[#D4A853]/10"
                : "border-border/60 bg-card hover:border-[#D4A853]/40 hover:bg-muted/30"
            )}
          >
            <div
              className="w-3 h-3 rounded-full mb-2"
              style={{ background: store.color }}
            />
            <p className="font-semibold text-sm">{store.shortName}</p>
            <p className="text-xs text-muted-foreground">{store.name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function ChecklistViewer() {
  const params = useParams<{ position: string }>();
  const [, navigate] = useLocation();
  const positionSlug = params.position || "";
  const config = getPositionConfig(positionSlug);

  const [activeChecklist, setActiveChecklist] = useState<ChecklistType | null>(
    null
  );

  if (!config) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-20 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500 flex items-center justify-center mx-auto">
              <span className="text-2xl text-white">!</span>
            </div>
            <h2 className="text-xl font-bold">Position Not Found</h2>
            <p className="text-muted-foreground">
              The position <code>{positionSlug}</code> does not exist.
            </p>
            <Button onClick={() => navigate("/checklists")} variant="outline">
              Back to Checklists
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If a checklist is active, show the form directly (store selected inside form)
  if (activeChecklist) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 max-w-[900px]">
          <DashboardChecklistForm
            type={activeChecklist}
            storeCode=""
            storeName=""
            positionLabel={config.label}
            onBack={() => setActiveChecklist(null)}
          />
        </div>
      </DashboardLayout>
    );
  }

  // Show checklist list directly (no store selector)
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/checklists")}
            className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">
              Checklists
            </p>
            <h2 className="text-2xl font-serif text-foreground">
              {config.label}
            </h2>
          </div>
        </div>

        {/* Checklist List — shown directly */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <h3 className="font-serif text-lg text-foreground">
            Select a Checklist
          </h3>
          {config.checklists.map((type) => {
            const info = getChecklistInfo(type);
            return (
              <div
                key={type}
                onClick={() => setActiveChecklist(type)}
                className="bg-card rounded-xl border border-border/60 p-5 flex items-center gap-4 cursor-pointer hover:border-[#D4A853]/40 hover:bg-muted/30 transition-all"
              >
                <span className="text-3xl">{info.icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">
                    {info.label}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {info.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            );
          })}
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

// ─── Dashboard Checklist Form Router ───

interface DashboardChecklistFormProps {
  type: ChecklistType;
  storeCode: string;
  storeName: string;
  positionLabel: string;
  onBack: () => void;
}

function DashboardChecklistForm({
  type,
  storeCode,
  storeName,
  positionLabel,
  onBack,
}: DashboardChecklistFormProps) {
  switch (type) {
    case "manager-checklist":
      return (
        <ManagerChecklistForm
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
        />
      );
    case "ops-manager-checklist":
      return (
        <SimpleAuditForm
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
        />
      );
    case "assistant-manager-checklist":
      return (
        <SectionChecklistForm
          title="Assistant Manager Checklist"
          sections={ASST_MGR_SECTIONS}
          reportType="Assistant Manager Checklist"
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
          useRating
        />
      );
    case "waste-report":
      return (
        <WasteReportForm
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
        />
      );
    case "equipment-maintenance":
      return (
        <EquipmentMaintenanceForm
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
        />
      );
    case "weekly-scorecard":
      return (
        <WeeklyScorecardForm
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
        />
      );
    case "training-evaluation":
      return (
        <TrainingEvaluationForm
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
        />
      );
    case "bagel-orders":
      return (
        <BagelOrdersForm
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
        />
      );
    case "pastry-orders":
      return (
        <PastryOrdersForm
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
        />
      );
    case "performance-evaluation":
      return (
        <PerformanceEvaluationForm
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
        />
      );
    default:
      return <div>Unknown checklist type</div>;
  }
}

// ─── Shared Form Layout (Dashboard-styled) ───

function FormHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={onBack}
        className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div>
        <h2 className="text-xl font-serif text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function SuccessCard({
  message,
  onNew,
  onBack,
}: {
  message: string;
  onNew: () => void;
  onBack: () => void;
}) {
  return (
    <div className="text-center py-12 space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center mx-auto">
        <CheckCircle2 className="h-8 w-8 text-white" />
      </div>
      <h2 className="text-2xl font-serif">Submitted!</h2>
      <p className="text-muted-foreground">{message}</p>
      <div className="flex gap-3 justify-center">
        <Button
          onClick={onNew}
          className="bg-[#D4A853] hover:bg-[#c49843] text-white"
        >
          Submit Another
        </Button>
        <Button onClick={onBack} variant="outline">
          Back to Checklists
        </Button>
      </div>
    </div>
  );
}


// ─── Store Dropdown (inside forms) ───

function StoreDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/60 p-5">
      <Label className="text-sm font-medium">Store</Label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
        {stores.map((store) => (
          <button
            key={store.id}
            type="button"
            onClick={() => onChange(store.shortName)}
            className={cn(
              "px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 text-left",
              value === store.shortName
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
    </div>
  );
}

// ─── Manager Checklist (Star Rating) ───

interface FormProps {
  storeCode: string;
  storeName: string;
  positionLabel: string;
  onBack: () => void;
}

function ManagerChecklistForm({
  storeCode: initialStoreCode,
  storeName: _storeName,
  positionLabel,
  onBack,
}: FormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const [ratings, setRatings] = useState(() => OPS_TASKS.map(() => ({ rating: 0, na: false, comment: "" })));
  const [finalComments, setFinalComments] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [dateOfSubmission, setDateOfSubmission] = useState(() => new Date().toISOString().split("T")[0]);
  const defaultWeekMgr = useMemo(() => getDefaultWeekRange(), []);
  const [weekStart, setWeekStart] = useState(defaultWeekMgr.start);
  const [weekEnd, setWeekEnd] = useState(defaultWeekMgr.end);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;

  const ratedItems = ratings.filter((r) => r.rating > 0 && !r.na);
  const avgScore = ratedItems.length > 0 ? (ratedItems.reduce((s, r) => s + r.rating, 0) / ratedItems.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName,
        reportType: "Manager Checklist",
        location: selectedStore,
        reportDate: weekStart,
        data: { dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd, tasks: OPS_TASKS.map((t, i) => ({ ...t, ...ratings[i] })), finalComments },
        totalScore: avgScore,
      },
      () => setSubmitted(true),
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessCard message={`Manager Checklist submitted for ${currentStoreName} with score ${avgScore}/5`} onNew={() => { setRatings(OPS_TASKS.map(() => ({ rating: 0, na: false, comment: "" }))); setFinalComments(""); setSubmitted(false); }} onBack={onBack} />;

  return (
    <div>
      <FormHeader title="Manager Checklist" subtitle={`${positionLabel}`} onBack={onBack} />
      <div className="space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-3">
          <div><Label className="text-sm font-medium">Your Name</Label>
          <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" className="mt-1.5" /></div>
          <div><Label className="text-sm font-medium">Date of Submission</Label>
          <Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} className="mt-1.5" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-sm font-medium">Start Date *</Label>
            <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="mt-1.5" /></div>
            <div><Label className="text-sm font-medium">End Date *</Label>
            <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} className="mt-1.5" /></div>
          </div>
        </div>

        <Badge variant="outline" className="text-lg px-4 py-2 border-[#D4A853]/30 text-[#D4A853]">Average: {avgScore} / 5</Badge>

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <h3 className="font-semibold mb-3">Rate Each Item</h3>
          <div className="space-y-4">
            {OPS_TASKS.map((task, i) => (
              <div key={i} className="space-y-2 pb-3 border-b border-border/20 last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{task.en}</p>
                    <p className="text-xs text-muted-foreground italic">{task.fr}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Checkbox checked={ratings[i].na} onCheckedChange={(v) => setRatings((p) => p.map((r, ri) => ri === i ? { ...r, na: !!v, rating: v ? 0 : r.rating } : r))} />
                      N/A
                    </label>
                  </div>
                </div>
                {!ratings[i].na && (
                  <div className="flex items-center gap-3">
                    <StarRating value={ratings[i].rating} onChange={(v) => setRatings((p) => p.map((r, ri) => ri === i ? { ...r, rating: v } : r))} />
                    <Input placeholder="Comment..." value={ratings[i].comment} onChange={(e) => setRatings((p) => p.map((r, ri) => ri === i ? { ...r, comment: e.target.value } : r))} className="flex-1 h-8" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Final Comments</Label>
          <Textarea value={finalComments} onChange={(e) => setFinalComments(e.target.value)} placeholder="Any additional observations..." className="mt-1.5" rows={3} />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white">
          {submitting ? "Submitting..." : "Submit Checklist"}
        </Button>
        {duplicateDialog}
      </div>
    </div>
  );
}
// ─── Section Checklistt (Checkbox or Rating) ───

interface SectionFormProps extends FormProps {
  title: string;
  sections: { title: string; items: string[] }[];
  reportType: string;
  useRating?: boolean;
  isWeekly?: boolean;
}

function SectionChecklistForm({
  title,
  sections,
  reportType,
  storeCode: initialStoreCode,
  storeName: _storeName2,
  positionLabel,
  onBack,
  useRating,
  isWeekly,
}: SectionFormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [dateOfSubmission, setDateOfSubmission] = useState(() => new Date().toISOString().split("T")[0]);
  const defaultWeekSec = useMemo(() => getDefaultWeekRange(), []);
  const [weekStart, setWeekStart] = useState(defaultWeekSec.start);
  const [weekEnd, setWeekEnd] = useState(defaultWeekSec.end);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: sectionDuplicateDialog } = useDuplicateCheck();
  const [sectionPhotos, setSectionPhotos] = useState<Record<string, UploadedPhoto[]>>({});
  // Per-item photos: key is "sectionTitle::item::itemIndex"
  const [itemPhotos, setItemPhotos] = useState<Record<string, UploadedPhoto[]>>({});
  const [expandedPhotoItem, setExpandedPhotoItem] = useState<string | null>(null);
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;

  const allItems = sections.flatMap((s) => s.items);
  const totalItems = allItems.length;
  const completedCount = useRating
    ? Object.keys(ratings).length
    : Object.values(checked).filter(Boolean).length;

  const avgScore = useRating
    ? Object.keys(ratings).length > 0
      ? (
          Object.values(ratings).reduce((a, b) => a + b, 0) /
          Object.keys(ratings).length
        ).toFixed(2)
      : "0.00"
    : null;

  const handleSubmit = async () => {
    if (!submitterName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!selectedStore) {
      toast.error("Please select a store");
      return;
    }
    const photoUrls: Record<string, string[]> = {};
    for (const [section, photos] of Object.entries(sectionPhotos)) {
      const urls = photos.filter(p => p.status === "success" && p.url).map(p => p.url);
      if (urls.length > 0) photoUrls[section] = urls;
    }
    const itemPhotoUrls: Record<string, string[]> = {};
    for (const [key, photos] of Object.entries(itemPhotos)) {
      const urls = photos.filter(p => p.status === "success" && p.url).map(p => p.url);
      if (urls.length > 0) itemPhotoUrls[key] = urls;
    }
    const base = isWeekly ? { dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd } : {};
    const photosData = Object.keys(photoUrls).length > 0 ? { photos: photoUrls } : {};
    const itemPhotosData = Object.keys(itemPhotoUrls).length > 0 ? { itemPhotos: itemPhotoUrls } : {};
    const reportData = useRating
      ? { ...base, ratings, notes, sections, ...photosData, ...itemPhotosData }
      : { ...base, checked, notes, sections, ...photosData, ...itemPhotosData };
    await submitWithDuplicateCheck(
      {
        submitterName,
        reportType,
        location: selectedStore,
        reportDate: isWeekly ? weekStart : new Date().toISOString().split("T")[0],
        data: reportData,
        totalScore: avgScore,
      },
      () => setSubmitted(true),
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) {
    return (
      <SuccessCard
        message={`${title} submitted for ${currentStoreName}${avgScore ? ` with score ${avgScore}/5` : ""}`}
        onNew={() => {
          setChecked({});
          setRatings({});
          setNotes("");
          setSubmitted(false);
        }}
        onBack={onBack}
      />
    );
  }

  return (
    <div>
      <FormHeader
        title={title}
        subtitle={`${positionLabel}`}
        onBack={onBack}
      />

      <div className="space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />

        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-3">
          <div><Label className="text-sm font-medium">Your Name</Label>
          <Input
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="Enter your name"
            className="mt-1.5"
          /></div>
          {isWeekly && (
            <>
              <div><Label className="text-sm font-medium">Date of Submission</Label>
              <Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} className="mt-1.5" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-sm font-medium">Start Date *</Label>
                <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="mt-1.5" /></div>
                <div><Label className="text-sm font-medium">End Date *</Label>
                <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} className="mt-1.5" /></div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Progress: {completedCount}/{totalItems}
          </span>
          {avgScore && (
            <Badge
              variant="outline"
              className="border-[#D4A853]/30 text-[#D4A853]"
            >
              Avg: {avgScore}/5
            </Badge>
          )}
        </div>

        {sections.map((section) => (
          <div
            key={section.title}
            className="bg-card rounded-xl border border-border/60 p-5"
          >
            <h3 className="font-semibold mb-3">{section.title}</h3>
            <div className="space-y-2">
              {section.items.map((item, itemIdx) => {
                const key = `${section.title}::${item}`;
                const photoKey = `${section.title}::${itemIdx}`;
                const photos = itemPhotos[photoKey] || [];
                const photoCount = photos.filter(p => p.status === "success").length;
                const isExpanded = expandedPhotoItem === photoKey;
                const isAuditForm = reportType === "Store Weekly Audit" || reportType === "Operations Manager Checklist (Weekly Audit)";
                return (
                  <div key={key} className="border-b border-border/20 last:border-0">
                    <div className="flex items-center justify-between gap-3 py-1.5">
                      <span className="text-sm flex-1">{item}</span>
                      <div className="flex items-center gap-2">
                        {isAuditForm && (
                          <button
                            type="button"
                            onClick={() => setExpandedPhotoItem(isExpanded ? null : photoKey)}
                            className={cn(
                              "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
                              photoCount > 0
                                ? "bg-[#D4A853]/15 text-[#D4A853] hover:bg-[#D4A853]/25"
                                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            {photoCount > 0 && <span>{photoCount}</span>}
                          </button>
                        )}
                        {useRating ? (
                          <StarRating
                            value={ratings[key] || 0}
                            onChange={(v) =>
                              setRatings((prev) => ({ ...prev, [key]: v }))
                            }
                          />
                        ) : (
                          <Checkbox
                            checked={!!checked[key]}
                            onCheckedChange={(v) =>
                              setChecked((prev) => ({
                                ...prev,
                                [key]: !!v,
                              }))
                            }
                          />
                        )}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="pb-3 pl-2">
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
            </div>
          </div>
        ))}

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional observations..."
            className="mt-1.5"
            rows={3}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white"
        >
          {submitting ? "Submitting..." : "Submit Checklist"}
        </Button>
        {sectionDuplicateDialog}
      </div>
    </div>
  );
}
// ─── Simple Audit Formm (6 sections: rating + comment + photo) ───

function SimpleAuditForm({ storeCode: initialStoreCode, storeName: _sn, positionLabel, onBack }: FormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const [submitterName, setSubmitterName] = useState("");
  const [dateOfSubmission, setDateOfSubmission] = useState(() => new Date().toISOString().split("T")[0]);
  const defaultWeek = useMemo(() => getDefaultWeekRange(), []);
  const [weekStart, setWeekStart] = useState(defaultWeek.start);
  const [weekEnd, setWeekEnd] = useState(defaultWeek.end);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [sectionPhotos, setSectionPhotos] = useState<Record<string, UploadedPhoto[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: auditDuplicateDialog } = useDuplicateCheck();
  const currentStoreName = stores.find(s => s.shortName === selectedStore)?.name || selectedStore;

  const allRatings = Object.values(ratings).filter(v => v > 0);
  const avg = allRatings.length > 0 ? (allRatings.reduce((a, b) => a + b, 0) / allRatings.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    const photoUrls: Record<string, string[]> = {};
    for (const [section, photos] of Object.entries(sectionPhotos)) {
      const urls = photos.filter(p => p.status === "success" && p.url).map(p => p.url);
      if (urls.length > 0) photoUrls[section] = urls;
    }
    await submitWithDuplicateCheck(
      {
        submitterName,
        reportType: "Store Weekly Audit",
        location: selectedStore,
        reportDate: weekStart,
        data: {
          dateOfSubmission, weekOfStart: weekStart, weekOfEnd: weekEnd,
          sections: AUDIT_SECTIONS_SIMPLE.map(s => ({ title: s, rating: ratings[s] || 0, comment: sectionComments[s] || "", photos: photoUrls[s] || [] })),
          notes,
          averageScore: avg,
        },
        totalScore: avg,
      },
      () => setSubmitted(true),
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) {
    return (
      <SuccessCard
        message={`Store Weekly Audit submitted for ${currentStoreName} with score ${avg}/5`}
        onNew={() => { setRatings({}); setSectionComments({}); setNotes(""); setSectionPhotos({}); setSubmitted(false); }}
        onBack={onBack}
      />
    );
  }

  return (
    <div>
      <FormHeader title="Store Weekly Audit" subtitle={positionLabel} onBack={onBack} />
      <div className="space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-3">
          <div><Label className="text-sm font-medium">Your Name</Label>
          <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" className="mt-1.5" /></div>
          <div><Label className="text-sm font-medium">Date of Submission</Label>
          <Input type="date" value={dateOfSubmission} onChange={(e) => setDateOfSubmission(e.target.value)} className="mt-1.5" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-sm font-medium">Start Date *</Label>
            <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className="mt-1.5" /></div>
            <div><Label className="text-sm font-medium">End Date *</Label>
            <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} className="mt-1.5" /></div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Sections: {AUDIT_SECTIONS_SIMPLE.length}</span>
          <Badge variant="outline" className="border-[#D4A853]/30 text-[#D4A853]">Avg: {avg}/5</Badge>
        </div>

        {AUDIT_SECTIONS_SIMPLE.map((section) => {
          const photos = sectionPhotos[section] || [];
          const photoCount = photos.filter(p => p.status === "success").length;
          return (
            <div key={section} className="bg-card rounded-xl border border-border/60 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{section}</h3>
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
                  onClick={() => { if (!sectionPhotos[section]) setSectionPhotos(prev => ({ ...prev, [section]: [] })); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors mb-2",
                    photoCount > 0 ? "bg-[#D4A853]/15 text-[#D4A853] hover:bg-[#D4A853]/25" : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
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
            </div>
          );
        })}

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Additional Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="General notes..." className="mt-1.5" rows={3} />
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white">
          {submitting ? "Submitting..." : "Submit Audit"}
        </Button>
        {auditDuplicateDialog}
      </div>
    </div>
  );
}

// ─── Waste Report ───

// ─── Waste Item Data (Public version) ───

const WASTE_BAGELS_PUB = [
  "Sesame Bagel", "Everything Bagel", "Plain Bagel", "Poppy Seeds Bagel", "Multigrain Bagel",
  "Cheese Bagel", "Rosemary Bagel", "Cinnamon Sugar Bagel", "Cinnamon Raisin Bagel",
  "Blueberry Bagel", "Coconut Bagel",
];
const WASTE_PASTRIES_PUB = [
  "Banana Bread with Nuts", "Croissant", "Croissant aux Amandes", "Chocolatine",
  "Chocolate Chips Cookie", "Muffin a L'Erable", "Muffin Bleuets", "Muffin Pistaches",
  "Muffin Chocolat", "Yogurt Granola", "Fresh orange juice", "Gateau aux Carottes",
  "Granola bag", "Bagel Chips Bags", "Maple Pecan Bar", "Pudding",
];
const WASTE_CK_PUB = [
  "Tomatoes", "Pepper", "Onions", "Cucumber", "Lemon", "Avocado",
  "Mix Salad", "Lettuce", "Spring Mix", "Tofu", "Veggie Patty",
  "Mozzarella", "Cheddar", "Eggs", "Ham", "Smoke meat",
  "Bacon", "Bacon jam", "Chicken", "Cream Cheese",
];

const QTY_TYPES_BAGEL_PUB = ["bag", "unit", "dozen"];
const QTY_TYPES_PASTRY_PUB = ["unit"];
const QTY_TYPES_CK_PUB = ["unit", "container"];

interface WasteRow {
  enabled: boolean;
  leftover: string;
  leftoverQty: string;
  waste: string;
  wasteQty: string;
  comment: string;
}

function initWasteRows(items: string[], defaultQty = "bag"): Record<string, WasteRow> {
  const rows: Record<string, WasteRow> = {};
  items.forEach((item) => {
    rows[item] = { enabled: true, leftover: "", leftoverQty: defaultQty, waste: "", wasteQty: defaultQty, comment: "" };
  });
  return rows;
}

function WasteTable({ title, items, rows, onChange, qtyTypes, costFn }: {
  title: string;
  items: string[];
  rows: Record<string, WasteRow>;
  onChange: (rows: Record<string, WasteRow>) => void;
  qtyTypes: string[];
  costFn: (item: string, qty: number, qtyType: string) => number;
}) {
  const updateRow = (item: string, field: keyof WasteRow, value: string | boolean) => {
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
    <div className="bg-card rounded-xl border border-border/60 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
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
              const leftoverCost = lQty > 0 ? costFn(item, lQty, row.leftoverQty) : 0;
              const wasteCost = wQty > 0 ? costFn(item, wQty, row.wasteQty) : 0;
              return (
                <tr key={item} className="border-b border-border/30 last:border-0">
                  <td className="py-2 pr-2">
                    <span className="text-sm font-medium truncate">{item}</span>
                  </td>
                  <td className="py-2 px-2">
                    <Input type="number" min="0" step="0.1" value={row.leftover} onChange={(e) => updateRow(item, "leftover", e.target.value)} className="h-8 w-[60px] text-sm" />
                  </td>
                  <td className="py-2 px-2">
                    <select value={row.leftoverQty} onChange={(e) => updateRow(item, "leftoverQty", e.target.value)} className="h-8 w-[75px] text-sm rounded-md border border-border bg-background px-1.5">
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
                    <Input type="number" min="0" step="0.1" value={row.waste} onChange={(e) => updateRow(item, "waste", e.target.value)} className="h-8 w-[60px] text-sm" />
                  </td>
                  <td className="py-2 px-2">
                    <select value={row.wasteQty} onChange={(e) => updateRow(item, "wasteQty", e.target.value)} className="h-8 w-[75px] text-sm rounded-md border border-border bg-background px-1.5">
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
                    <Input value={row.comment} onChange={(e) => updateRow(item, "comment", e.target.value)} className="h-8 text-sm" placeholder="..." />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WasteReportForm({ storeCode: initialStoreCode, storeName: _sn3, positionLabel, onBack }: FormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [bagelRows, setBagelRows] = useState<Record<string, WasteRow>>(() => initWasteRows(WASTE_BAGELS_PUB, "bag"));
  const [pastryRows, setPastryRows] = useState<Record<string, WasteRow>>(() => initWasteRows(WASTE_PASTRIES_PUB, "unit"));
  const [ckRows, setCkRows] = useState<Record<string, WasteRow>>(() => initWasteRows(WASTE_CK_PUB, "unit"));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: wasteDuplicateDialog } = useDuplicateCheck();

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

  const collectData = () => {
    const collect = (rows: Record<string, WasteRow>) =>
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
    if (!selectedStore) { toast.error("Please select a store"); return; }
    const data = collectData();
    await submitWithDuplicateCheck(
      {
        submitterName: "Store Staff",
        reportType: "Leftovers & Waste Report",
        location: selectedStore,
        reportDate,
        data,
      },
      () => setSubmitted(true),
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessCard message={`Waste Report submitted for ${currentStoreName} on ${reportDate}`} onNew={() => { setBagelRows(initWasteRows(WASTE_BAGELS_PUB, "bag")); setPastryRows(initWasteRows(WASTE_PASTRIES_PUB, "unit")); setCkRows(initWasteRows(WASTE_CK_PUB, "unit")); setSubmitted(false); }} onBack={onBack} />;

  return (
    <div>
      <FormHeader title="Leftovers & Waste Report" subtitle={`${positionLabel}`} onBack={onBack} />
      <div className="space-y-4">
        <div className="bg-card rounded-xl border border-border/60 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date</Label>
              <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="h-9" />
            </div>
            <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
          </div>
        </div>

        <WasteTable title="Bagels" items={WASTE_BAGELS_PUB} rows={bagelRows} onChange={setBagelRows} qtyTypes={QTY_TYPES_BAGEL_PUB} costFn={(_item, qty, qtyType) => calcBagelCost(qty, qtyType)} />
        <WasteTable title="Pastries" items={WASTE_PASTRIES_PUB} rows={pastryRows} onChange={setPastryRows} qtyTypes={QTY_TYPES_PASTRY_PUB} costFn={(item, qty, _qtyType) => calcPastryCost(item, qty)} />
        <WasteTable title="CK Items" items={WASTE_CK_PUB} rows={ckRows} onChange={setCkRows} qtyTypes={QTY_TYPES_CK_PUB} costFn={(item, qty, qtyType) => calcCKCost(item, qty, qtyType)} />

        {/* Total Cost Summary */}
        {costs.grandTotal > 0 && (
          <div className="bg-red-50/50 rounded-xl border border-red-200 p-5">
            <h3 className="font-semibold mb-3 text-red-800">Waste & Leftover Cost Summary</h3>
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
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white h-11">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
          <Button variant="outline" className="w-full h-11" onClick={() => {
            const data = collectData();
            const storeName = stores.find(s => s.shortName === selectedStore)?.name || selectedStore;
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
            window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
            toast.info("Opening email client...");
          }}>
            Send by Email
          </Button>
        </div>
        {wasteDuplicateDialog}
      </div>
    </div>
  );
}

// ─── Equipment Maintenance ───

function EquipmentMaintenanceForm({ storeCode: initialStoreCode, storeName: _sn4, positionLabel, onBack }: FormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;
  const [submitterName, setSubmitterName] = useState("");
  const [dailyChecks, setDailyChecks] = useState<Record<string, boolean>>({});
  const [weeklyChecks, setWeeklyChecks] = useState<Record<string, boolean>>({});
  const [monthlyChecks, setMonthlyChecks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: equipDuplicateDialog } = useDuplicateCheck();

  const handleSubmit = async () => {
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName,
        reportType: "Equipment & Maintenance",
        location: selectedStore,
        reportDate: new Date().toISOString().split("T")[0],
        data: { dailyChecks, weeklyChecks, monthlyChecks, notes },
      },
      () => setSubmitted(true),
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessCard message={`Equipment Maintenance submitted for ${currentStoreName}`} onNew={() => { setDailyChecks({}); setWeeklyChecks({}); setMonthlyChecks({}); setNotes(""); setSubmitted(false); }} onBack={onBack} />;

  const renderEquipTable = (title: string, items: typeof EQUIP_DAILY, state: Record<string, boolean>, setState: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void) => (
    <div className="bg-card rounded-xl border border-border/60 p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => {
          const key = `${item.equipment}::${item.task}`;
          return (
            <div key={i} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/20 last:border-0">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{item.equipment}</span>
                <span className="text-sm text-muted-foreground ml-2">— {item.task}</span>
              </div>
              <Checkbox checked={!!state[key]} onCheckedChange={(v) => setState((prev) => ({ ...prev, [key]: !!v }))} />
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div>
      <FormHeader title="Equipment & Maintenance" subtitle={`${positionLabel}`} onBack={onBack} />
      <div className="space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Your Name</Label>
          <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" className="mt-1.5" />
        </div>
        {renderEquipTable("Daily Checks", EQUIP_DAILY, dailyChecks, setDailyChecks)}
        {renderEquipTable("Weekly Checks", EQUIP_WEEKLY, weeklyChecks, setWeeklyChecks)}
        {renderEquipTable("Monthly Checks", EQUIP_MONTHLY, monthlyChecks, setMonthlyChecks)}
        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any issues or repairs needed..." className="mt-1.5" rows={3} />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white">
          {submitting ? "Submitting..." : "Submit Checklist"}
        </Button>
        {equipDuplicateDialog}
      </div>
    </div>
  );
}
// ─── Weekly Scorecard ────

// ─── Scorecard Section Component ───

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

function ScorecardSection({
  title,
  icon: Icon,
  color,
  unit,
  data,
  onChange,
  prevLabel,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  unit: "%" | "$";
  data: ScorecardSectionData;
  onChange: (d: ScorecardSectionData) => void;
  prevLabel?: string;
}) {
  const update = (field: keyof ScorecardSectionData, value: string) => onChange({ ...data, [field]: value });

  const goal = parseFloat(data.thisWeekGoal);
  const actual = parseFloat(data.thisWeekActual);
  const hasComparison = !isNaN(goal) && !isNaN(actual) && goal > 0;
  const lowerIsBetter = title === "Labour" || title.includes("Food");
  const isOnTarget = hasComparison ? (lowerIsBetter ? actual <= goal : actual >= goal) : null;

  const prefix = unit === "$" ? "$" : "";
  const suffix = unit === "%" ? "%" : "";

  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-3" style={{ background: color }}>
        <Icon className="w-5 h-5 text-white" />
        <h3 className="font-serif text-lg font-semibold text-white">{title}</h3>
        {isOnTarget !== null && (
          <div className={cn("ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
            isOnTarget ? "bg-white/20 text-white" : "bg-red-100 text-red-700"
          )}>
            {isOnTarget ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isOnTarget ? "On Target" : "Off Target"}
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Table header */}
        <div className="grid grid-cols-3 gap-3">
          <div />
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Goal</Label>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Actual</Label>
        </div>

        {/* This Week (Mon-Sun) */}
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

        {/* Previous Week (Mon-Sun) */}
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
      </div>
    </div>
  );
}

// ─── Food Cost Section (special — has Last Month row + Waste field) ───

function FoodCostSection({
  data,
  onChange,
}: {
  data: FoodSectionData;
  onChange: (d: FoodSectionData) => void;
}) {
  const update = (field: keyof FoodSectionData, value: string) => onChange({ ...data, [field]: value });

  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-3" style={{ background: "#F97316" }}>
        <Utensils className="w-5 h-5 text-white" />
        <h3 className="font-serif text-lg font-semibold text-white">Food Cost / Purchases</h3>
      </div>

      <div className="p-5 space-y-4">
        {/* Table header */}
        <div className="grid grid-cols-3 gap-3">
          <div />
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Goal</Label>
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-center">Actual</Label>
        </div>

        {/* This Week */}
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

        {/* Last Month */}
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

        {/* Waste (this week) */}
        <div className="grid grid-cols-3 gap-3 items-center">
          <Label className="text-sm font-medium">Waste (this week)</Label>
          <div />
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
            <Input type="number" min="0" step="0.01" value={data.wasteThisWeek} onChange={(e) => update("wasteThisWeek", e.target.value)} placeholder="0.00" className="h-10 text-sm font-mono pl-7" />
          </div>
        </div>

        {/* How Do I Contribute? */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-amber-700 uppercase tracking-wider">How Do I Contribute?</Label>
          <Textarea value={data.howContribute} onChange={(e) => update("howContribute", e.target.value)} placeholder="Describe specific actions you take to reduce food costs and waste..." rows={3} className="text-sm resize-none" />
        </div>
      </div>
    </div>
  );
}

// ─── Digital Section (special — has Google Reviews text instead of numbers) ───

interface DigitalSectionData {
  googleReviews: string;
  howContribute: string;
}

function DigitalSection({
  data,
  onChange,
}: {
  data: DigitalSectionData;
  onChange: (d: DigitalSectionData) => void;
}) {
  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      <div className="px-5 py-3 flex items-center gap-3" style={{ background: "#6366F1" }}>
        <MessageSquare className="w-5 h-5 text-white" />
        <h3 className="font-serif text-lg font-semibold text-white">Digital</h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Google Reviews (Last Week)</Label>
          <Textarea
            value={data.googleReviews}
            onChange={(e) => onChange({ ...data, googleReviews: e.target.value })}
            placeholder="Paste or summarize recent Google reviews..."
            rows={3}
            className="text-sm resize-none"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How Do I Contribute?</Label>
          <Textarea
            value={data.howContribute}
            onChange={(e) => onChange({ ...data, howContribute: e.target.value })}
            placeholder="Describe how you encourage reviews, respond to feedback, manage online presence..."
            rows={3}
            className="text-sm resize-none"
          />
        </div>
      </div>
    </div>
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

function WeeklyScorecardForm({ storeCode: initialStoreCode, storeName: _sn5, positionLabel, onBack }: FormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;
  const [submitterName, setSubmitterName] = useState("");
  const [dateEntered, setDateEntered] = useState(() => new Date().toISOString().split("T")[0]);
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
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName,
        reportType: "Weekly Scorecard",
        location: selectedStore,
        reportDate: weekStart,
        data: { dateEntered, weekOf: weekOfLabel, weekOfStart: weekStart, weekOfEnd: weekEnd, sales, labour, digital, food, generalNotes },
      },
      () => setSubmitted(true),
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessCard message={`Weekly Scorecard submitted for ${currentStoreName}`} onNew={() => { setSales(initScorecardSection()); setLabour(initScorecardSection("18")); setDigital({ googleReviews: "", howContribute: "" }); setFood(initFoodSection()); setGeneralNotes(""); setSubmitterName(""); setSubmitted(false); }} onBack={onBack} />;

  return (
    <div>
      <FormHeader title="Store Manager Weekly Scorecard" subtitle={`${positionLabel}`} onBack={onBack} />
      <div className="space-y-5">
        {/* Header Info */}
        <div className="bg-card rounded-xl border border-border/60 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Name *</Label>
              <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Date Completed</Label>
              <Input type="date" value={dateEntered} onChange={(e) => setDateEntered(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Week Of — Start *</Label>
              <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Week Of — End *</Label>
              <Input type="date" value={weekEnd} onChange={(e) => setWeekEnd(e.target.value)} />
            </div>
            <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
          </div>
        </div>

        {/* Sales Section */}
        <ScorecardSection title="Sales" icon={DollarSign} color="#D4A853" unit="$" data={sales} onChange={setSales} />

        {/* Labour Section */}
        <ScorecardSection title="Labour" icon={Users} color="#3B82F6" unit="%" data={labour} onChange={setLabour} />

        {/* Food Cost / Purchases Section */}
        <FoodCostSection data={food} onChange={setFood} />

        {/* Digital Section */}
        <DigitalSection data={digital} onChange={setDigital} />

        {/* General Notes */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
          <div className="px-5 py-3 flex items-center gap-3" style={{ background: "#6B7280" }}>
            <MessageSquare className="w-5 h-5 text-white" />
            <h3 className="font-serif text-lg font-semibold text-white">Notes</h3>
          </div>
          <div className="p-5">
            <Textarea value={generalNotes} onChange={(e) => setGeneralNotes(e.target.value)} placeholder="Any additional notes, observations, or comments for this week..." rows={4} className="text-sm resize-none" />
          </div>
        </div>

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white h-11">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {submitting ? "Submitting..." : "Submit Scorecard"}
        </Button>
        {scorecardDuplicateDialog}
      </div>
    </div>
  );
}

// ─── Training Evaluation ───

function TrainingEvaluationForm({ storeCode: initialStoreCode, storeName: _sn6, positionLabel, onBack }: FormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;
  const [submitterName, setSubmitterName] = useState("");
  const [traineeName, setTraineeName] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [ratings, setRatings] = useState(() => TRAINING_AREAS.map((a) => a.items.map(() => ({ rating: 0, comment: "" }))));
  const [overallComments, setOverallComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: trainingDuplicateDialog } = useDuplicateCheck();

  const allRatings = ratings.flat().filter((r) => r.rating > 0);
  const avgScore = allRatings.length > 0 ? (allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!submitterName.trim() || !traineeName.trim()) { toast.error("Please enter both names"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName,
        reportType: "Training Evaluation",
        location: selectedStore,
        reportDate,
        data: { traineeName, areas: TRAINING_AREAS.map((a, ai) => ({ title: a.title, items: a.items.map((item, ii) => ({ item, ...ratings[ai][ii] })) })), overallComments },
        totalScore: avgScore,
      },
      () => setSubmitted(true),
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessCard message={`Training Evaluation for ${traineeName} submitted (${avgScore}/5)`} onNew={() => { setRatings(TRAINING_AREAS.map((a) => a.items.map(() => ({ rating: 0, comment: "" })))); setOverallComments(""); setTraineeName(""); setSubmitted(false); }} onBack={onBack} />;

  return (
    <div>
      <FormHeader title="Training Evaluation" subtitle={`${positionLabel}`} onBack={onBack} />
      <div className="space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-3">
          <div>
            <Label className="text-sm font-medium">Your Name (Evaluator)</Label>
            <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Trainee Name</Label>
            <Input value={traineeName} onChange={(e) => setTraineeName(e.target.value)} placeholder="Enter trainee's name" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Date</Label>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <Badge variant="outline" className="text-lg px-4 py-2 border-[#D4A853]/30 text-[#D4A853]">Average: {avgScore} / 5</Badge>

        {TRAINING_AREAS.map((area, ai) => (
          <div key={area.title} className="bg-card rounded-xl border border-border/60 p-5">
            <h3 className="font-semibold mb-3">{area.title}</h3>
            <div className="space-y-3">
              {area.items.map((item, ii) => (
                <div key={ii} className="space-y-2">
                  <p className="text-sm">{item}</p>
                  <div className="flex items-center gap-3">
                    <StarRating value={ratings[ai][ii].rating} onChange={(v) => setRatings((p) => p.map((a, aj) => aj === ai ? a.map((r, rj) => rj === ii ? { ...r, rating: v } : r) : a))} />
                    <Input placeholder="Comment..." value={ratings[ai][ii].comment} onChange={(e) => setRatings((p) => p.map((a, aj) => aj === ai ? a.map((r, rj) => rj === ii ? { ...r, comment: e.target.value } : r) : a))} className="flex-1 h-8" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Overall Comments</Label>
          <Textarea value={overallComments} onChange={(e) => setOverallComments(e.target.value)} placeholder="Overall assessment..." className="mt-1.5" rows={3} />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white">
          {submitting ? "Submitting..." : "Submit Evaluation"}
        </Button>
        {trainingDuplicateDialog}
      </div>
    </div>
  );
}

// ─── Bagel Orders ───

function BagelOrdersForm({ storeCode: initialStoreCode, storeName: _sn7, positionLabel, onBack }: FormProps) {
  // If a valid store code is provided (not empty, not "sales"), lock to that store
  const isStoreLocked = !!initialStoreCode && initialStoreCode !== "sales" && initialStoreCode !== "" && stores.some(s => s.shortName === initialStoreCode);
  const [selectedLocation, setSelectedLocation] = useState(initialStoreCode || "sales");
  const isSales = selectedLocation === "sales";
  const [submitterName, setSubmitterName] = useState("");
  const [clientName, setClientName] = useState("");
  const [orderForDate, setOrderForDate] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(BAGEL_TYPES.map(t => [t, ""])));
  const [itemUnits, setItemUnits] = useState<Record<string, "dozen" | "unit" | "box">>(() => Object.fromEntries(BAGEL_TYPES.map(t => [t, "dozen"])));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: bagelDuplicateDialog } = useDuplicateCheck();

  const locationLabel = isSales ? "Sales" : (stores.find(s => s.shortName === selectedLocation)?.name || selectedLocation);

  const buildPayload = () => ({
    submitterName,
    reportType: "Bagel Orders",
    location: isSales ? "sales" : selectedLocation,
    reportDate: orderForDate,
    data: {
      orderForDate,
      ...(isSales ? { clientName: clientName.trim() } : {}),
      orders: BAGEL_TYPES.map(type => ({ type, quantity: quantities[type] || "0", unit: itemUnits[type] || "dozen" })),
    },
  });

  const handleSubmit = async () => {
    if (!selectedLocation) { toast.error("Please select a location"); return; }
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (isSales && !clientName.trim()) { toast.error("Please enter the client name"); return; }
    if (!orderForDate) { toast.error("Please select the order date"); return; }
    await submitWithDuplicateCheck(
      buildPayload(),
      () => { setSubmitted(true); toast.success(`Bagel order submitted for ${locationLabel}${isSales ? ` — ${clientName}` : ""}!`); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessCard message={`Bagel order submitted for ${locationLabel}${isSales ? ` — ${clientName}` : ""}`} onNew={() => { setQuantities(Object.fromEntries(BAGEL_TYPES.map(t => [t, ""]))); setItemUnits(Object.fromEntries(BAGEL_TYPES.map(t => [t, "dozen"])) as Record<string, "dozen" | "unit" | "box">); setClientName(""); setSubmitted(false); }} onBack={onBack} />;

  return (
    <div>
      <FormHeader title="Bagel Orders" subtitle={`${positionLabel}`} onBack={onBack} />
      <div className="space-y-4">
        {/* Location Selector — locked when accessed from a specific store portal */}
        {isStoreLocked ? (
          <div className="bg-card rounded-xl border border-[#D4A853]/30 p-5">
            <Label className="text-sm font-medium">Location</Label>
            <div className="mt-1.5 flex items-center gap-3 px-4 py-3 rounded-lg border border-[#D4A853] bg-[#D4A853]/10">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: stores.find(s => s.shortName === initialStoreCode)?.color }} />
              <div>
                <span className="text-sm font-semibold text-[#D4A853]">{initialStoreCode}</span>
                <span className="text-sm text-muted-foreground ml-2">{stores.find(s => s.shortName === initialStoreCode)?.name}</span>
              </div>
              <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Auto-assigned</span>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/60 p-5">
            <Label className="text-sm font-medium">Location</Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-1.5">
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
          </div>
        )}

        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-3">
          {isSales && (
            <div>
              <Label className="text-sm font-medium">Client Name <span className="text-red-500">*</span></Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Enter client name" className="mt-1.5" />
            </div>
          )}
          <div>
            <Label className="text-sm font-medium">Your Name <span className="text-red-500">*</span></Label>
            <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Order for Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={orderForDate} onChange={(e) => setOrderForDate(e.target.value)} className="mt-1.5" />
          </div>

        </div>
        <div className="bg-card rounded-xl border border-border/60 p-5">
          <h3 className="font-semibold mb-1">Order Quantities</h3>
          <p className="text-sm text-amber-600 font-medium mb-4 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">Select dozen or unit per item.{isSales ? " Box option available for Sales orders." : ""} Default is dozen (12 units per dozen).</p>
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
        </div>
         <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white">
          {submitting ? "Submitting..." : "Submit Order"}
        </Button>
        {bagelDuplicateDialog}
      </div>
    </div>
  );
}
// ─── Pastry Orders (Portal) ────

function PastryOrdersForm({ storeCode: initialStoreCode, storeName: _sn9, positionLabel, onBack }: FormProps) {
  // If a valid store code is provided, lock to that store
  const isStoreLocked = !!initialStoreCode && initialStoreCode !== "" && stores.some(s => s.shortName === initialStoreCode);
  const [selectedLocation, setSelectedLocation] = useState(initialStoreCode || stores[0]?.shortName || "");
  const [submitterName, setSubmitterName] = useState("");
  const [orderForDate, setOrderForDate] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>(() => Object.fromEntries(PASTRY_ORDER_ITEMS.map(t => [t, ""])));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: pastryDuplicateDialog } = useDuplicateCheck();

  const locationLabel = stores.find(s => s.shortName === selectedLocation)?.name || selectedLocation;

  const buildPayload = () => ({
    submitterName,
    reportType: "Pastry Orders",
    location: selectedLocation,
    reportDate: orderForDate,
    data: {
      orderForDate,
      orders: PASTRY_ORDER_ITEMS.map(type => ({ type, quantity: quantities[type] || "0", unit: "unit" })),
    },
  });

  const handleSubmit = async () => {
    if (!selectedLocation) { toast.error("Please select a location"); return; }
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (!orderForDate) { toast.error("Please select the order date"); return; }
    await submitWithDuplicateCheck(
      buildPayload(),
      () => { setSubmitted(true); toast.success(`Pastry order submitted for ${locationLabel}!`); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessCard message={`Pastry order submitted for ${locationLabel}`} onNew={() => { setQuantities(Object.fromEntries(PASTRY_ORDER_ITEMS.map(t => [t, ""]))); setSubmitted(false); }} onBack={onBack} />;

  return (
    <div>
      <FormHeader title="Pastry Orders" subtitle={`${positionLabel}`} onBack={onBack} />
      <div className="space-y-4">
        {/* Location Selector — locked when accessed from a specific store portal */}
        {isStoreLocked ? (
          <div className="bg-card rounded-xl border border-rose-300/30 p-5">
            <Label className="text-sm font-medium">Location</Label>
            <div className="mt-1.5 flex items-center gap-3 px-4 py-3 rounded-lg border border-rose-500 bg-rose-50">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: stores.find(s => s.shortName === initialStoreCode)?.color }} />
              <div>
                <span className="text-sm font-semibold text-rose-700">{initialStoreCode}</span>
                <span className="text-sm text-muted-foreground ml-2">{stores.find(s => s.shortName === initialStoreCode)?.name}</span>
              </div>
              <span className="ml-auto text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">Auto-assigned</span>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border/60 p-5">
            <Label className="text-sm font-medium">Location</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
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
          </div>
        )}

        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-3">
          <div>
            <Label className="text-sm font-medium">Your Name <span className="text-red-500">*</span></Label>
            <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Order for Date <span className="text-red-500">*</span></Label>
            <Input type="date" value={orderForDate} onChange={(e) => setOrderForDate(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <h3 className="font-semibold mb-1">Pastry Quantities</h3>
          <p className="text-sm text-rose-600 font-medium mb-4 bg-rose-50 border border-rose-200 rounded-md px-3 py-1.5">Enter the quantity for each pastry item (in units).</p>
          <div className="space-y-2">
            {PASTRY_ORDER_ITEMS.map((type) => (
              <div key={type} className="flex items-center justify-between gap-4 py-1.5 border-b last:border-0">
                <span className="text-sm">{type}</span>
                <div className="flex items-center gap-2">
                  <Input type="number" min="0" step="1" placeholder="0" value={quantities[type]} onChange={(e) => setQuantities(prev => ({ ...prev, [type]: e.target.value }))} className="h-8 w-20 text-center text-sm" />
                  <span className="text-xs text-muted-foreground w-10">unit</span>
                </div>
              </div>
            ))}
          </div>
        </div>
         <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
          {submitting ? "Submitting..." : "Submit Order"}
        </Button>
        {pastryDuplicateDialog}
      </div>
    </div>
  );
}
// ─── Performance Evaluation ───

function PerformanceEvaluationForm({ storeCode: initialStoreCode, storeName: _sn8, positionLabel, onBack }: FormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;
  const [submitterName, setSubmitterName] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeePosition, setEmployeePosition] = useState("");
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [ratings, setRatings] = useState(() => EVAL_CRITERIA.map(() => ({ rating: 0, comment: "" })));
  const [overallComments, setOverallComments] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog: perfDuplicateDialog } = useDuplicateCheck();

  const allRatings = ratings.filter((r) => r.rating > 0);
  const avgScore = allRatings.length > 0 ? (allRatings.reduce((s, r) => s + r.rating, 0) / allRatings.length).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!submitterName.trim() || !employeeName.trim()) { toast.error("Please enter both names"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName,
        reportType: "Performance Evaluation",
        location: selectedStore,
        reportDate,
        data: { employeeName, employeePosition, criteria: EVAL_CRITERIA.map((c, i) => ({ ...c, ...ratings[i] })), overallComments },
        totalScore: avgScore,
      },
      () => setSubmitted(true),
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessCard message={`Performance Evaluation for ${employeeName} submitted (${avgScore}/5)`} onNew={() => { setRatings(EVAL_CRITERIA.map(() => ({ rating: 0, comment: "" }))); setOverallComments(""); setEmployeeName(""); setEmployeePosition(""); setSubmitted(false); }} onBack={onBack} />;

  return (
    <div>
      <FormHeader title="Performance Evaluation" subtitle={`${positionLabel}`} onBack={onBack} />
      <div className="space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="bg-card rounded-xl border border-border/60 p-5 space-y-3">
          <div>
            <Label className="text-sm font-medium">Your Name (Evaluator)</Label>
            <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Employee Name</Label>
            <Input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} placeholder="Enter employee's name" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Employee Position</Label>
            <Input value={employeePosition} onChange={(e) => setEmployeePosition(e.target.value)} placeholder="e.g. Barista, Shift Lead" className="mt-1.5" />
          </div>
          <div>
            <Label className="text-sm font-medium">Date</Label>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="mt-1.5" />
          </div>
        </div>

        <Badge variant="outline" className="text-lg px-4 py-2 border-[#D4A853]/30 text-[#D4A853]">Average: {avgScore} / 5</Badge>

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <h3 className="font-semibold mb-3">Evaluation Criteria</h3>
          <div className="space-y-4">
            {EVAL_CRITERIA.map((criterion, i) => (
              <div key={criterion.key} className="space-y-2 pb-3 border-b border-border/20 last:border-0">
                <div>
                  <p className="text-sm font-medium">{criterion.title}</p>
                  <p className="text-xs text-muted-foreground">{criterion.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StarRating value={ratings[i].rating} onChange={(v) => setRatings((p) => p.map((r, ri) => ri === i ? { ...r, rating: v } : r))} />
                  <Input placeholder="Comment..." value={ratings[i].comment} onChange={(e) => setRatings((p) => p.map((r, ri) => ri === i ? { ...r, comment: e.target.value } : r))} className="flex-1 h-8" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Overall Comments</Label>
          <Textarea value={overallComments} onChange={(e) => setOverallComments(e.target.value)} placeholder="Performance observations, goals, areas for improvement..." className="mt-1.5" rows={4} />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white">
          {submitting ? "Submitting..." : "Submit Evaluation"}
        </Button>
        {perfDuplicateDialog}
      </div>
    </div>
  );
}
