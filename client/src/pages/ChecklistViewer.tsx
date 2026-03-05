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
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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

const AUDIT_SECTIONS = [
  { title: "Exterior", items: ["Signage clean and visible", "Entrance clean and inviting", "Windows clean", "Outdoor seating area clean (if applicable)", "Garbage area clean"] },
  { title: "Display & Merchandising", items: ["Pastry display full and attractive", "Coffee bags display organized", "Drink fridge stocked and clean", "Menu boards clean and updated", "Prices displayed for all items"] },
  { title: "Bathroom", items: ["Clean and sanitized", "Soap and paper towels stocked", "Mirror clean", "Floor clean", "No odor"] },
  { title: "Equipment", items: ["Espresso machine clean and functioning", "Grinder clean", "Filter coffee machine clean", "Grill clean and at temp", "Fridge temps in range", "Dishwasher clean and functioning"] },
  { title: "Product Quality", items: ["Bagels fresh and properly stored", "Vegetables fresh and crisp", "Cream cheese and spreads fresh", "Coffee taste test passed", "Pastries fresh and displayed well"] },
  { title: "Service & Staff", items: ["Staff in proper uniform (Hinnawi shirt, hair net)", "Greeting customers promptly", "Line moving efficiently", "Cash area clean and organized", "Team energy and attitude positive"] },
];

const DEEP_CLEANING_SECTIONS = [
  { title: "Kitchen", items: ["Deep clean grill and grease traps", "Clean behind and under all equipment", "Degrease hood and ventilation filters", "Clean all shelving and storage areas", "Sanitize cutting boards and prep surfaces", "Clean freezer interior and organize", "Clean fridge interior and check expiry dates", "Scrub kitchen floor and baseboards", "Clean dishwasher interior and filters"] },
  { title: "Front of House", items: ["Deep clean espresso machine (backflush with detergent)", "Clean and descale filter coffee machine", "Deep clean grinder burrs", "Clean all display cases inside and out", "Wash all windows inside and out", "Clean and sanitize all tables and chairs", "Vacuum and mop all floor areas", "Clean light fixtures and ceiling fans", "Dust all shelves and decorations", "Clean entrance door and handles"] },
  { title: "Bathroom", items: ["Deep clean toilet and fixtures", "Scrub floor and grout", "Clean mirror and walls", "Restock all supplies", "Check and clean ventilation"] },
  { title: "Storage & Back Areas", items: ["Organize dry storage", "Clean storage shelves", "Check and clean garbage area", "Clean staff area", "Check fire extinguisher accessibility"] },
];

const ASST_MGR_SECTIONS = [
  { title: "Opening Duties", items: ["Arrive 15 minutes before opening", "Check staff attendance and assign positions", "Verify cash float is correct", "Ensure all equipment is turned on and functioning", "Check food prep is ready for service", "Verify display cases are stocked", "Check cleanliness of front of house"] },
  { title: "During Service", items: ["Monitor line speed and customer wait times", "Ensure quality control on all orders", "Manage break schedules", "Monitor inventory levels throughout the day", "Handle customer complaints promptly", "Maintain cleanliness standards", "Support team members as needed"] },
  { title: "Closing Duties", items: ["Ensure all closing tasks are completed", "Verify cash count and reconcile", "Check all equipment is turned off/cleaned", "Ensure proper food storage and labeling", "Complete daily report", "Lock up and set alarm"] },
  { title: "Leadership", items: ["Provide feedback to team members", "Address any staff issues or concerns", "Communicate with store manager about the day", "Follow up on previous day's action items", "Ensure staff are following dress code"] },
];

const STORE_MGR_SECTIONS = [
  { title: "In the Morning", items: ["Ensure store is stocked/prepared for lunch service by 9:00 AM.", "Feedback for shift employees.", "Make sure all staff are wearing hair net and clean Hinnawi shirts.", "Prepare feedback for previous closing crew.", "Ensure opening tasks are completed by 6:55 AM"] },
  { title: "In the Afternoon", items: ["Check coffee station.", "Ensure garbage bins are emptied.", "Ensure pastries display is reorganized.", "Track dessert levels and place orders for new stock.", "Monitor kitchen cleanliness.", "Label leftovers and store appropriately.", "Ensure amazing and quick service at lunch.", "Evaluate labor at 1:00 PM.", "Ensure post-rush duty list is completed by 1:00 PM."] },
  { title: "Closing Team", items: ["Ensure the coffee station has closed properly.", "Ensure all stock is recorded and store leftovers.", "Ensure a clean cashier area.", "Make sure all prep stations are sanitized and closed by 5:30 PM.", "Complete inventory and ensure all team tasks are finished.", "Ensure closed leaves before 7:30/8:00 PM.", "Entrance & Floor are clean", "No dust and splashes at Coffee & Pastry Areas", "Fridges & Machines are clean and well-maintained", "Bathroom is clean"] },
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

const BAGEL_TYPES = ["Sesame", "Poppy", "Everything", "Plain", "Whole Wheat", "Blueberry", "Cinnamon Raisin", "Jalapeno", "Multigrain", "Onion"];
const PASTRY_TYPES = ["Croissant", "Pain au Chocolat", "Muffin", "Cookie", "Brownie", "Scone", "Danish", "Cinnamon Roll"];
const CK_ITEMS = ["Cream Cheese (tubs)", "Hummus (tubs)", "Egg Salad (kg)", "Tuna Salad (kg)", "Chicken Salad (kg)", "Smoked Salmon (packs)", "Avocado (units)"];

const TRAINING_AREAS = [
  { title: "Customer Service", items: ["Greeting customers promptly and warmly", "Taking orders accurately", "Handling complaints professionally", "Upselling and suggestive selling", "Speed of service"] },
  { title: "Food Preparation", items: ["Bagel preparation and toasting", "Sandwich assembly and presentation", "Coffee preparation (espresso, filter)", "Pastry handling and display", "Food safety and hygiene practices"] },
  { title: "Operations", items: ["Opening/closing procedures", "Cash handling and POS operation", "Inventory awareness", "Cleaning and sanitation", "Equipment operation and care"] },
  { title: "Teamwork & Attitude", items: ["Cooperation with team members", "Willingness to learn", "Following instructions", "Punctuality and reliability", "Professional appearance and demeanor"] },
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
        <SectionChecklistForm
          title="Operations Manager Checklist (Weekly Audit)"
          sections={AUDIT_SECTIONS}
          reportType="Operations Manager Checklist (Weekly Audit)"
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
          useRating
        />
      );
    case "weekly-deep-cleaning":
      return (
        <SectionChecklistForm
          title="Weekly Deep Cleaning"
          sections={DEEP_CLEANING_SECTIONS}
          reportType="Deep Cleaning"
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
    case "store-manager-checklist":
      return (
        <SectionChecklistForm
          title="Store Evaluation Checklist"
          sections={STORE_MGR_SECTIONS}
          reportType="manager-checklist"
          storeCode={storeCode}
          storeName={storeName}
          positionLabel={positionLabel}
          onBack={onBack}
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

async function submitReport(data: {
  submitterName: string;
  reportType: string;
  location: string;
  reportDate: string;
  data: any;
  totalScore?: string | null;
}) {
  const res = await fetch("/api/public/submit-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Submit failed");
  return res.json();
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
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;

  const totalRated = Object.keys(ratings).length;
  const avgScore =
    totalRated > 0
      ? (
          Object.values(ratings).reduce((a, b) => a + b, 0) / totalRated
        ).toFixed(2)
      : "0.00";

  const handleSubmit = async () => {
    if (!submitterName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!selectedStore) {
      toast.error("Please select a store");
      return;
    }
    if (totalRated < OPS_TASKS.length) {
      toast.error(`Please rate all ${OPS_TASKS.length} items`);
      return;
    }
    setSubmitting(true);
    try {
      await submitReport({
        submitterName,
        reportType: "Manager Checklist",
        location: selectedStore,
        reportDate: new Date().toISOString().split("T")[0],
        data: { ratings, notes, tasks: OPS_TASKS },
        totalScore: avgScore,
      });
      setSubmitted(true);
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <SuccessCard
        message={`Manager Checklist submitted for ${currentStoreName} with score ${avgScore}/5`}
        onNew={() => {
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
        title="Manager Checklist"
        subtitle={`${positionLabel}`}
        onBack={onBack}
      />

      <div className="space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Your Name</Label>
          <Input
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="Enter your name"
            className="mt-1.5"
          />
        </div>

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">
              Rate Each Item ({totalRated}/{OPS_TASKS.length})
            </h3>
            <Badge
              variant="outline"
              className="border-[#D4A853]/30 text-[#D4A853]"
            >
              Avg: {avgScore}/5
            </Badge>
          </div>
          <div className="space-y-3">
            {OPS_TASKS.map((task, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{task.en}</p>
                  <p className="text-xs text-muted-foreground italic">
                    {task.fr}
                  </p>
                </div>
                <StarRating
                  value={ratings[i] || 0}
                  onChange={(v) =>
                    setRatings((prev) => ({ ...prev, [i]: v }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

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
      </div>
    </div>
  );
}

// ─── Section Checklist (Checkbox or Rating) ───

interface SectionFormProps extends FormProps {
  title: string;
  sections: { title: string; items: string[] }[];
  reportType: string;
  useRating?: boolean;
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
}: SectionFormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitterName, setSubmitterName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);
    try {
      await submitReport({
        submitterName,
        reportType,
        location: selectedStore,
        reportDate: new Date().toISOString().split("T")[0],
        data: useRating
          ? { ratings, notes, sections }
          : { checked, notes, sections },
        totalScore: avgScore,
      });
      setSubmitted(true);
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
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

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Your Name</Label>
          <Input
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
            placeholder="Enter your name"
            className="mt-1.5"
          />
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
              {section.items.map((item) => {
                const key = `${section.title}::${item}`;
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 py-1.5 border-b border-border/20 last:border-0"
                  >
                    <span className="text-sm flex-1">{item}</span>
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
  "Chocolate Chips Cookie", "Muffin a L'Erabe", "Muffin Bleuets", "Muffin Pistaches",
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

function WasteTable({ title, items, rows, onChange, qtyTypes }: {
  title: string;
  items: string[];
  rows: Record<string, WasteRow>;
  onChange: (rows: Record<string, WasteRow>) => void;
  qtyTypes: string[];
}) {
  const updateRow = (item: string, field: keyof WasteRow, value: string | boolean) => {
    onChange({ ...rows, [item]: { ...rows[item], [field]: value } });
  };

  return (
    <div className="bg-card rounded-xl border border-border/60 p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/60">
              <th className="text-left py-2 pr-2 font-medium text-muted-foreground w-[160px]">Item</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[65px]">Leftover</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[80px]">Qty Type</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[65px]">Waste</th>
              <th className="text-left py-2 px-2 font-medium text-muted-foreground w-[80px]">Qty Type</th>
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
                    <Input type="number" min="0" step="0.1" value={row.leftover} onChange={(e) => updateRow(item, "leftover", e.target.value)} disabled={!row.enabled} className="h-8 w-[60px] text-sm" />
                  </td>
                  <td className="py-2 px-2">
                    <select value={row.leftoverQty} onChange={(e) => updateRow(item, "leftoverQty", e.target.value)} disabled={!row.enabled} className="h-8 w-[75px] text-sm rounded-md border border-border bg-background px-1.5">
                      {qtyTypes.map((q: string) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <Input type="number" min="0" step="0.1" value={row.waste} onChange={(e) => updateRow(item, "waste", e.target.value)} disabled={!row.enabled} className="h-8 w-[60px] text-sm" />
                  </td>
                  <td className="py-2 px-2">
                    <select value={row.wasteQty} onChange={(e) => updateRow(item, "wasteQty", e.target.value)} disabled={!row.enabled} className="h-8 w-[75px] text-sm rounded-md border border-border bg-background px-1.5">
                      {qtyTypes.map((q: string) => <option key={q} value={q}>{q}</option>)}
                    </select>
                  </td>
                  <td className="py-2 pl-2">
                    <Input value={row.comment} onChange={(e) => updateRow(item, "comment", e.target.value)} disabled={!row.enabled} className="h-8 text-sm" placeholder="..." />
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

  const collectData = () => {
    const collect = (rows: Record<string, WasteRow>) =>
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
      await submitReport({
        submitterName: "Store Staff",
        reportType: "Leftovers & Waste Report",
        location: selectedStore,
        reportDate,
        data,
      });
      setSubmitted(true);
    } catch { toast.error("Failed to submit"); }
    finally { setSubmitting(false); }
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

        <WasteTable title="Bagels" items={WASTE_BAGELS_PUB} rows={bagelRows} onChange={setBagelRows} qtyTypes={QTY_TYPES_BAGEL_PUB} />
        <WasteTable title="Pastries" items={WASTE_PASTRIES_PUB} rows={pastryRows} onChange={setPastryRows} qtyTypes={QTY_TYPES_PASTRY_PUB} />
        <WasteTable title="CK Items" items={WASTE_CK_PUB} rows={ckRows} onChange={setCkRows} qtyTypes={QTY_TYPES_CK_PUB} />

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

  const handleSubmit = async () => {
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    setSubmitting(true);
    try {
      await submitReport({
        submitterName,
        reportType: "Equipment & Maintenance",
        location: selectedStore,
        reportDate: new Date().toISOString().split("T")[0],
        data: { dailyChecks, weeklyChecks, monthlyChecks, notes },
      });
      setSubmitted(true);
    } catch { toast.error("Failed to submit"); }
    finally { setSubmitting(false); }
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
      </div>
    </div>
  );
}

// ─── Weekly Scorecard ───

// ─── Scorecard Section Component ───

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

function ScorecardSection({
  title,
  icon: Icon,
  color,
  unit,
  goalLabel,
  data,
  onChange,
}: {
  title: string;
  icon: React.ElementType;
  color: string;
  unit: "%" | "$" | "" | "stars";
  goalLabel?: string;
  data: ScorecardSectionData;
  onChange: (d: ScorecardSectionData) => void;
}) {
  const update = (field: keyof ScorecardSectionData, value: string) => onChange({ ...data, [field]: value });

  const goal = parseFloat(data.thisWeekGoal);
  const actual = parseFloat(data.thisWeekActual);
  const hasComparison = !isNaN(goal) && !isNaN(actual) && goal > 0;

  // For labour/food %, lower is better; for sales/digital, higher is better
  const lowerIsBetter = title === "Labour" || title === "Food Cost";
  const isOnTarget = hasComparison
    ? lowerIsBetter ? actual <= goal : actual >= goal
    : null;

  const variance = hasComparison
    ? unit === "%" ? (actual - goal).toFixed(1) : (actual - goal).toFixed(2)
    : null;

  const prefix = unit === "$" ? "$" : "";
  const suffix = unit === "%" ? "%" : unit === "stars" ? " ★" : "";

  return (
    <div className="bg-card rounded-xl border border-border/60 overflow-hidden">
      {/* Section Header */}
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
        {/* Goal / Actual / Variance Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{goalLabel || "Goal"}</Label>
            <div className="relative">
              {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
              <Input
                type="number" min="0" step={unit === "%" ? "0.1" : "0.01"}
                value={data.thisWeekGoal}
                onChange={(e) => update("thisWeekGoal", e.target.value)}
                placeholder="0"
                className={cn("h-10 text-sm font-mono", unit === "$" && "pl-7")}
              />
              {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">This Week</Label>
            <div className="relative">
              {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
              <Input
                type="number" min="0" step={unit === "%" ? "0.1" : "0.01"}
                value={data.thisWeekActual}
                onChange={(e) => update("thisWeekActual", e.target.value)}
                placeholder="0"
                className={cn("h-10 text-sm font-mono", unit === "$" && "pl-7")}
              />
              {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variance</Label>
            <div className={cn(
              "h-10 rounded-md border flex items-center justify-center text-sm font-mono font-medium",
              isOnTarget === null ? "border-border/60 text-muted-foreground bg-muted/30" :
              isOnTarget ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-red-200 text-red-700 bg-red-50"
            )}>
              {variance !== null ? (
                <span>{parseFloat(variance) > 0 ? "+" : ""}{prefix}{variance}{suffix}</span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        {/* Last Week / Last Month */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Week</Label>
            <div className="relative">
              {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
              <Input
                type="number" min="0" step={unit === "%" ? "0.1" : "0.01"}
                value={data.lastWeekActual}
                onChange={(e) => update("lastWeekActual", e.target.value)}
                placeholder="0"
                className={cn("h-9 text-sm font-mono bg-muted/20", unit === "$" && "pl-7")}
              />
              {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Month</Label>
            <div className="relative">
              {unit === "$" && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>}
              <Input
                type="number" min="0" step={unit === "%" ? "0.1" : "0.01"}
                value={data.lastMonthActual}
                onChange={(e) => update("lastMonthActual", e.target.value)}
                placeholder="0"
                className={cn("h-9 text-sm font-mono bg-muted/20", unit === "$" && "pl-7")}
              />
              {unit === "%" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>}
            </div>
          </div>
        </div>

        {/* How Do I Contribute? */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">How Do I Contribute?</Label>
          <Textarea
            value={data.howContribute}
            onChange={(e) => update("howContribute", e.target.value)}
            placeholder="Describe specific actions you take to impact this area..."
            rows={3}
            className="text-sm resize-none"
          />
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

function getWeekOfRange(today: Date = new Date()): { label: string; start: string; end: string } {
  const d = new Date(today); d.setHours(0,0,0,0);
  const day = d.getDay();
  const thisMon = new Date(d);
  thisMon.setDate(d.getDate() - ((day + 6) % 7));
  // Previous work week: Mon to Fri
  const prevMon = new Date(thisMon); prevMon.setDate(thisMon.getDate() - 7);
  const prevFri = new Date(prevMon); prevFri.setDate(prevMon.getDate() + 4);
  const fmt = (dt: Date) => dt.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const iso = (dt: Date) => dt.toISOString().split("T")[0];
  return { label: `${fmt(prevMon)} - ${fmt(prevFri)}`, start: iso(prevMon), end: iso(prevFri) };
}

function WeeklyScorecardForm({ storeCode: initialStoreCode, storeName: _sn5, positionLabel, onBack }: FormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;
  const [submitterName, setSubmitterName] = useState("");
  const [dateEntered, setDateEntered] = useState(() => new Date().toISOString().split("T")[0]);
  const defaultRange = useMemo(() => getWeekOfRange(), []);
  const [weekOfDate, setWeekOfDate] = useState(defaultRange.start);
  const weekOfRange = useMemo(() => getWeekOfRange(new Date(weekOfDate + "T12:00:00")), [weekOfDate]);
  const [sales, setSales] = useState<ScorecardSectionData>(initScorecardSection());
  const [labour, setLabour] = useState<ScorecardSectionData>(initScorecardSection());
  const [digital, setDigital] = useState<DigitalSectionData>({ googleReviews: "", howContribute: "" });
  const [food, setFood] = useState<ScorecardSectionData>(initScorecardSection());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    setSubmitting(true);
    try {
      await submitReport({
        submitterName,
        reportType: "Weekly Scorecard",
        location: selectedStore,
        reportDate: weekOfRange.start,
        data: { dateEntered, weekOf: weekOfRange.label, weekOfStart: weekOfRange.start, weekOfEnd: weekOfRange.end, sales, labour, digital, food },
      });
      setSubmitted(true);
    } catch { toast.error("Failed to submit"); }
    finally { setSubmitting(false); }
  };

  if (submitted) return <SuccessCard message={`Weekly Scorecard submitted for ${currentStoreName}`} onNew={() => { setSales(initScorecardSection()); setLabour(initScorecardSection()); setDigital({ googleReviews: "", howContribute: "" }); setFood(initScorecardSection()); setSubmitterName(""); setSubmitted(false); }} onBack={onBack} />;

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
              <Label className="text-sm font-medium">Date</Label>
              <Input type="date" value={dateEntered} onChange={(e) => setDateEntered(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Week Of</Label>
              <Input type="date" value={weekOfDate} onChange={(e) => setWeekOfDate(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">{weekOfRange.label}</p>
            </div>
            <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
          </div>
        </div>

        {/* Sales Section */}
        <ScorecardSection title="Sales" icon={DollarSign} color="#D4A853" unit="$" goalLabel="Weekly Goal" data={sales} onChange={setSales} />

        {/* Labour Section */}
        <ScorecardSection title="Labour" icon={Users} color="#3B82F6" unit="%" goalLabel="Target %" data={labour} onChange={setLabour} />

        {/* Digital Section */}
        <DigitalSection data={digital} onChange={setDigital} />

        {/* Food Cost Section */}
        <ScorecardSection title="Food Cost" icon={Utensils} color="#F97316" unit="%" goalLabel="Target %" data={food} onChange={setFood} />

        {/* Submit */}
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white h-11">
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {submitting ? "Submitting..." : "Submit Scorecard"}
        </Button>
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
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalRated = Object.keys(ratings).length;
  const totalItems = TRAINING_AREAS.flatMap((a) => a.items).length;
  const avgScore = totalRated > 0 ? (Object.values(ratings).reduce((a, b) => a + b, 0) / totalRated).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!submitterName.trim() || !traineeName.trim()) { toast.error("Please enter both names"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    setSubmitting(true);
    try {
      await submitReport({
        submitterName,
        reportType: "Training Evaluation",
        location: selectedStore,
        reportDate: new Date().toISOString().split("T")[0],
        data: { traineeName, ratings, notes, areas: TRAINING_AREAS },
        totalScore: avgScore,
      });
      setSubmitted(true);
    } catch { toast.error("Failed to submit"); }
    finally { setSubmitting(false); }
  };

  if (submitted) return <SuccessCard message={`Training Evaluation for ${traineeName} submitted (${avgScore}/5)`} onNew={() => { setRatings({}); setNotes(""); setTraineeName(""); setSubmitted(false); }} onBack={onBack} />;

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
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Progress: {totalRated}/{totalItems}</span>
          <Badge variant="outline" className="border-[#D4A853]/30 text-[#D4A853]">Avg: {avgScore}/5</Badge>
        </div>

        {TRAINING_AREAS.map((area) => (
          <div key={area.title} className="bg-card rounded-xl border border-border/60 p-5">
            <h3 className="font-semibold mb-3">{area.title}</h3>
            <div className="space-y-2">
              {area.items.map((item) => {
                const key = `${area.title}::${item}`;
                return (
                  <div key={key} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/20 last:border-0">
                    <span className="text-sm flex-1">{item}</span>
                    <StarRating value={ratings[key] || 0} onChange={(v) => setRatings((prev) => ({ ...prev, [key]: v }))} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Training observations..." className="mt-1.5" rows={3} />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white">
          {submitting ? "Submitting..." : "Submit Evaluation"}
        </Button>
      </div>
    </div>
  );
}

// ─── Bagel Orders ───

function BagelOrdersForm({ storeCode: initialStoreCode, storeName: _sn7, positionLabel, onBack }: FormProps) {
  const [selectedStore, setSelectedStore] = useState(initialStoreCode || "");
  const currentStoreName = stores.find((s) => s.shortName === selectedStore)?.name || selectedStore;
  const [submitterName, setSubmitterName] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalBagels = Object.values(quantities).reduce((sum, v) => sum + (parseInt(v) || 0), 0);

  const handleSubmit = async () => {
    if (!submitterName.trim()) { toast.error("Please enter your name"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    if (totalBagels === 0) { toast.error("Please enter at least one bagel quantity"); return; }
    setSubmitting(true);
    try {
      await submitReport({
        submitterName,
        reportType: "Bagel Orders",
        location: selectedStore,
        reportDate: new Date().toISOString().split("T")[0],
        data: { quantities, notes, totalBagels },
      });
      setSubmitted(true);
    } catch { toast.error("Failed to submit"); }
    finally { setSubmitting(false); }
  };

  if (submitted) return <SuccessCard message={`Bagel order (${totalBagels} total) submitted for ${currentStoreName}`} onNew={() => { setQuantities({}); setNotes(""); setSubmitted(false); }} onBack={onBack} />;

  return (
    <div>
      <FormHeader title="Bagel Orders" subtitle={`${positionLabel}`} onBack={onBack} />
      <div className="space-y-4">
        <StoreDropdown value={selectedStore} onChange={setSelectedStore} />
        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Your Name</Label>
          <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Enter your name" className="mt-1.5" />
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">🥯 Bagel Quantities</h3>
            <Badge variant="outline" className="border-[#D4A853]/30 text-[#D4A853]">Total: {totalBagels}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {BAGEL_TYPES.map((type) => (
              <div key={type} className="flex items-center gap-2">
                <Label className="text-sm flex-1 min-w-0">{type}</Label>
                <Input type="number" min="0" className="w-20" placeholder="0" value={quantities[type] || ""} onChange={(e) => setQuantities((prev) => ({ ...prev, [type]: e.target.value }))} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special requests..." className="mt-1.5" rows={3} />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white">
          {submitting ? "Submitting..." : "Submit Order"}
        </Button>
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
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const competencies = [
    "Quality of Work", "Productivity", "Reliability & Attendance",
    "Communication", "Teamwork", "Customer Service",
    "Initiative", "Adaptability", "Cleanliness & Hygiene",
    "Following Procedures",
  ];

  const totalRated = Object.keys(ratings).length;
  const avgScore = totalRated > 0 ? (Object.values(ratings).reduce((a, b) => a + b, 0) / totalRated).toFixed(2) : "0.00";

  const handleSubmit = async () => {
    if (!submitterName.trim() || !employeeName.trim()) { toast.error("Please enter both names"); return; }
    if (!selectedStore) { toast.error("Please select a store"); return; }
    setSubmitting(true);
    try {
      await submitReport({
        submitterName,
        reportType: "Performance Evaluation",
        location: selectedStore,
        reportDate: new Date().toISOString().split("T")[0],
        data: { employeeName, ratings, notes, competencies },
        totalScore: avgScore,
      });
      setSubmitted(true);
    } catch { toast.error("Failed to submit"); }
    finally { setSubmitting(false); }
  };

  if (submitted) return <SuccessCard message={`Performance Evaluation for ${employeeName} submitted (${avgScore}/5)`} onNew={() => { setRatings({}); setNotes(""); setEmployeeName(""); setSubmitted(false); }} onBack={onBack} />;

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
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Progress: {totalRated}/{competencies.length}</span>
          <Badge variant="outline" className="border-[#D4A853]/30 text-[#D4A853]">Avg: {avgScore}/5</Badge>
        </div>

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <h3 className="font-semibold mb-3">Competencies</h3>
          <div className="space-y-3">
            {competencies.map((comp) => (
              <div key={comp} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/20 last:border-0">
                <span className="text-sm flex-1">{comp}</span>
                <StarRating value={ratings[comp] || 0} onChange={(v) => setRatings((prev) => ({ ...prev, [comp]: v }))} />
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border/60 p-5">
          <Label className="text-sm font-medium">Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Performance observations, goals, areas for improvement..." className="mt-1.5" rows={4} />
        </div>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-[#D4A853] hover:bg-[#c49843] text-white">
          {submitting ? "Submitting..." : "Submit Evaluation"}
        </Button>
      </div>
    </div>
  );
}
