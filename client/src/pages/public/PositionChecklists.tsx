import { useState, useRef, useEffect } from "react";
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
import { CheckCircle2, ClipboardCheck, ArrowLeft, ChevronRight, Save } from "lucide-react";
import { toast } from "sonner";

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
      return <SectionChecklistForm title="Operations Manager Checklist (Weekly Audit)" sections={AUDIT_SECTIONS} reportType="Operations Manager Checklist (Weekly Audit)" storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} useRating />;
    case "weekly-deep-cleaning":
      return <SectionChecklistForm title="Weekly Deep Cleaning" sections={DEEP_CLEANING_SECTIONS} reportType="Deep Cleaning" storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} />;
    case "assistant-manager-checklist":
      return <SectionChecklistForm title="Assistant Manager Checklist" sections={ASST_MGR_SECTIONS} reportType="Assistant Manager Checklist" storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} useRating />;
    case "store-manager-checklist":
      return <SectionChecklistForm title="Store Evaluation Checklist" sections={STORE_MGR_SECTIONS} reportType="Store Manager Checklist" storeCode={storeCode} storeName={storeName} positionLabel={positionLabel} onBack={onBack} />;
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
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `manager-checklist-${storeCode}`,
    { name: "", date: new Date().toISOString().split("T")[0], tasks: OPS_TASKS.map(() => ({ rating: 0, isNA: false, comment: "" })), comments: "" }
  );
  const { name, date, tasks, comments } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDate = (v: string) => setDraft((d) => ({ ...d, date: v }));
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
        reportDate: date,
        data: { tasks: OPS_TASKS.map((t, i) => ({ task: t.en, taskFr: t.fr, rating: tasks[i].rating, isNA: tasks[i].isNA, comment: tasks[i].comment })), comments, submittedVia: `Public - ${positionLabel}` },
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
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
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

function SectionChecklistForm({ title, sections, reportType, storeCode, storeName, positionLabel, onBack, useRating }: {
  title: string; sections: { title: string; items: string[] }[]; reportType: string; storeCode: string; storeName: string; positionLabel: string; onBack: () => void; useRating?: boolean;
}) {
  const initData = sections.map((s) => s.items.map(() => useRating ? { rating: 0, comment: "" } : { checked: false }));
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `${reportType}-${storeCode}`,
    { name: "", date: new Date().toISOString().split("T")[0], data: initData, comments: "" }
  );
  const { name, date, data, comments } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDate = (v: string) => setDraft((d) => ({ ...d, date: v }));
  const setData = (fn: (prev: any[][]) => any[][]) => setDraft((d) => ({ ...d, data: fn(d.data) }));
  const setComments = (v: string) => setDraft((d) => ({ ...d, comments: v }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
        reportDate: date,
        data: { sections: sections.map((s, si) => ({ title: s.title, items: s.items.map((item, ii) => ({ item, ...data[si][ii] })) })), comments, submittedVia: `Public - ${positionLabel}` },
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
          <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        </CardContent>
      </Card>
      <Badge variant="outline" className="text-lg px-4 py-2 border-[#faa600] text-[#faa600]">Score: {totalScore}{useRating ? " / 5" : ""}</Badge>
      {sections.map((section, si) => (
        <Card key={si}>
          <CardHeader><CardTitle className="text-base">{section.title}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {section.items.map((item, ii) => (
              <div key={ii} className="space-y-2">
                {useRating ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="text-sm flex-1">{item}</p>
                    <StarRating value={(data[si][ii] as any).rating} onChange={(v) => setData((p) => p.map((s, sj) => sj === si ? s.map((d, dj) => dj === ii ? { ...d, rating: v } : d) : s))} size="sm" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Checkbox checked={(data[si][ii] as any).checked} onCheckedChange={(c) => setData((p) => p.map((s, sj) => sj === si ? s.map((d, dj) => dj === ii ? { ...d, checked: !!c } : d) : s))} />
                    <span className="text-sm">{item}</span>
                  </div>
                )}
              </div>
            ))}
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

function WasteReportForm({ storeCode, storeName, positionLabel, onBack }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void }) {
  const initBagels = Object.fromEntries(WASTE_BAGEL_TYPES.map((t) => [t, { leftover: "", waste: "" }]));
  const initPastries = Object.fromEntries(PASTRY_TYPES.map((t) => [t, { leftover: "", waste: "" }]));
  const initCk = Object.fromEntries(CK_ITEMS.map((t) => [t, { leftover: "", waste: "" }]));
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `waste-report-${storeCode}`,
    { name: "", date: new Date().toISOString().split("T")[0], bagels: initBagels, pastries: initPastries, ckItems: initCk }
  );
  const { name, date, bagels, pastries, ckItems } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDate = (v: string) => setDraft((d) => ({ ...d, date: v }));
  const setBagels = (v: Record<string, { leftover: string; waste: string }>) => setDraft((d) => ({ ...d, bagels: v }));
  const setPastries = (v: Record<string, { leftover: string; waste: string }>) => setDraft((d) => ({ ...d, pastries: v }));
  const setCkItems = (v: Record<string, { leftover: string; waste: string }>) => setDraft((d) => ({ ...d, ckItems: v }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    await submitWithDuplicateCheck(
      { submitterName: name.trim(), reportType: "Leftovers & Waste", location: storeName, reportDate: date, data: { bagels, pastries, ckItems, submittedVia: `Public - ${positionLabel}` } },
      () => { setSubmitted(true); clearDraft(); toast.success("Waste report submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  const renderSection = (sectionTitle: string, items: string[], data: Record<string, { leftover: string; waste: string }>, setData: (d: Record<string, { leftover: string; waste: string }>) => void) => (
    <Card>
      <CardHeader><CardTitle className="text-base">{sectionTitle}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 items-center mb-2">
          <span className="text-xs font-medium text-muted-foreground">Item</span>
          <span className="text-xs font-medium text-muted-foreground text-center">Leftover</span>
          <span className="text-xs font-medium text-muted-foreground text-center">Waste</span>
        </div>
        {items.map((item) => (
          <div key={item} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center py-1">
            <span className="text-sm">{item}</span>
            <Input type="number" min="0" placeholder="0" value={data[item]?.leftover || ""} onChange={(e) => setData({ ...data, [item]: { ...data[item], leftover: e.target.value } })} className="h-8 text-center text-sm" />
            <Input type="number" min="0" placeholder="0" value={data[item]?.waste || ""} onChange={(e) => setData({ ...data, [item]: { ...data[item], waste: e.target.value } })} className="h-8 text-center text-sm" />
          </div>
        ))}
      </CardContent>
    </Card>
  );

  if (submitted) return <SuccessScreen message={`Waste report for ${storeName} submitted.`} onNew={() => { setSubmitted(false); setBagels(Object.fromEntries(WASTE_BAGEL_TYPES.map((t) => [t, { leftover: "", waste: "" }]))); setPastries(Object.fromEntries(PASTRY_TYPES.map((t) => [t, { leftover: "", waste: "" }]))); setCkItems(Object.fromEntries(CK_ITEMS.map((t) => [t, { leftover: "", waste: "" }]))); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Leftovers & Waste Report" subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </CardContent></Card>
      {renderSection("Bagels", WASTE_BAGEL_TYPES, bagels, setBagels)}
      {renderSection("Pastries", PASTRY_TYPES, pastries, setPastries)}
      {renderSection("CK Items", CK_ITEMS, ckItems, setCkItems)}
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

function WeeklyScorecardForm({ storeCode, storeName, positionLabel, onBack }: { storeCode: string; storeName: string; positionLabel: string; onBack: () => void }) {
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `weekly-scorecard-${storeCode}`,
    { managerName: "", weekOf: "", totalSales: "", labourCost: "", foodCost: "", customerCount: "", notes: "" }
  );
  const { managerName, weekOf, totalSales, labourCost, foodCost, customerCount, notes } = draft;
  const setManagerName = (v: string) => setDraft((d) => ({ ...d, managerName: v }));
  const setWeekOf = (v: string) => setDraft((d) => ({ ...d, weekOf: v }));
  const setTotalSales = (v: string) => setDraft((d) => ({ ...d, totalSales: v }));
  const setLabourCost = (v: string) => setDraft((d) => ({ ...d, labourCost: v }));
  const setFoodCost = (v: string) => setDraft((d) => ({ ...d, foodCost: v }));
  const setCustomerCount = (v: string) => setDraft((d) => ({ ...d, customerCount: v }));
  const setNotes = (v: string) => setDraft((d) => ({ ...d, notes: v }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const handleSubmit = async () => {
    if (!managerName.trim() || !weekOf) { toast.error("Please fill required fields"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName: managerName.trim(), reportType: "weekly-scorecard", location: storeCode, reportDate: weekOf,
        data: { weekOf, totalSales, labourCost, foodCost, customerCount, notes, submittedVia: `Public - ${positionLabel}` },
        totalScore: totalSales ? `$${parseFloat(totalSales).toFixed(0)}` : undefined,
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Scorecard submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Weekly Scorecard for ${storeName} submitted.`} onNew={() => { setSubmitted(false); setManagerName(""); setWeekOf(""); setTotalSales(""); setLabourCost(""); setFoodCost(""); setCustomerCount(""); setNotes(""); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Weekly Scorecard" subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Store Location</Label>
          <Input value={storeName} disabled className="bg-muted" />
        </div>
        <div className="space-y-1.5">
          <Label>Manager Name *</Label>
          <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="Enter your name" />
        </div>
        <div className="space-y-1.5">
          <Label>Week Of *</Label>
          <Input type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} />
        </div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-4">
        <h3 className="font-serif text-lg font-semibold">Weekly Numbers</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Total Sales ($)</Label><Input type="number" value={totalSales} onChange={(e) => setTotalSales(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-1.5"><Label>Labour Cost ($)</Label><Input type="number" value={labourCost} onChange={(e) => setLabourCost(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-1.5"><Label>Food Cost ($)</Label><Input type="number" value={foodCost} onChange={(e) => setFoodCost(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-1.5"><Label>Customer Count</Label><Input type="number" value={customerCount} onChange={(e) => setCustomerCount(e.target.value)} placeholder="0" /></div>
        </div>
      </CardContent></Card>
      <Card><CardContent className="pt-6 space-y-3">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any additional notes..." />
      </CardContent></Card>
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
  const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const { value: draft, setValue: setDraft, clearDraft, draftButton } = useDraft(
    `bagel-orders-${storeCode}`,
    { name: "", date: new Date().toISOString().split("T")[0], orders: BAGEL_TYPES.map(() => DAYS.map(() => "")) }
  );
  const { name, date, orders } = draft;
  const setName = (v: string) => setDraft((d) => ({ ...d, name: v }));
  const setDate = (v: string) => setDraft((d) => ({ ...d, date: v }));
  const setOrders = (fn: (prev: string[][]) => string[][]) => setDraft((d) => ({ ...d, orders: fn(d.orders) }));
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { submitWithDuplicateCheck, duplicateDialog } = useDuplicateCheck();

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error("Please enter your name"); return; }
    await submitWithDuplicateCheck(
      {
        submitterName: name.trim(), reportType: "Bagel Orders", location: storeName, reportDate: date,
        data: { orders: BAGEL_TYPES.map((type, i) => ({ type, quantities: Object.fromEntries(DAYS.map((d, j) => [d, orders[i][j]])) })), submittedVia: `Public - ${positionLabel}` },
      },
      () => { setSubmitted(true); clearDraft(); toast.success("Bagel orders submitted!"); },
      (msg) => toast.error(msg),
      setSubmitting,
    );
  };

  if (submitted) return <SuccessScreen message={`Bagel orders for ${storeName} submitted.`} onNew={() => { setSubmitted(false); setOrders(() => BAGEL_TYPES.map(() => DAYS.map(() => ""))); }} onBack={onBack} />;

  return (
    <PublicFormLayout title="Bagel Orders" subtitle={`${positionLabel} — ${storeName}`} onBack={onBack}>
      <Card><CardContent className="pt-6 space-y-4">
        <div className="space-y-2"><Label>Your Name *</Label><Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="space-y-2"><Label>Week Starting</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </CardContent></Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Order Quantities by Day</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
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
