/**
 * Hinnawi Portal — Single public entry point
 *
 * Flow:
 *  1. Select position (4 cards)
 *  2. Select store (locked after selection)
 *  3. Enter position PIN (staff skips this)
 *  4. Role-scoped sidebar with assigned pages/checklists
 *
 * Store is LOCKED — cannot be changed after selection.
 */
import { useState, useRef, useEffect } from "react";
import {
  Shield, Store, UserCheck, Users, Lock, Coffee,
  ChevronRight, ChevronLeft, MapPin, ShieldCheck, ArrowLeft,
  ClipboardCheck, BarChart3, Star, Trash2, Wrench,
  GraduationCap, CircleDot, TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { type ChecklistType } from "@/lib/positionChecklists";
import { ChecklistForm } from "./PositionChecklists";

// ─── Types ───────────────────────────────────────────────────────

interface StoreInfo {
  storeCode: string;
  storeName: string;
}

type PortalStep = "position" | "store" | "pin" | "dashboard";

// ─── Sidebar Item Definitions ────────────────────────────────────

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  type: "checklist" | "info";
  checklistType?: ChecklistType;
  infoContent?: string; // identifier for info pages
}

interface PositionDef {
  slug: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  gradient: string;
  requiresPin: boolean;
  sidebarItems: SidebarItem[];
}

const POSITIONS: PositionDef[] = [
  {
    slug: "operations-manager",
    label: "Operations Manager",
    icon: <Shield className="w-6 h-6" />,
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    gradient: "from-indigo-500 to-indigo-600",
    requiresPin: true,
    sidebarItems: [
      { id: "scorecard", label: "Operations Scorecard", icon: <BarChart3 className="w-[18px] h-[18px]" />, type: "info", infoContent: "scorecard" },
      { id: "store-perf", label: "Store Performance", icon: <TrendingUp className="w-[18px] h-[18px]" />, type: "info", infoContent: "store-performance" },
      { id: "ops-audit", label: "Ops. Mgr Weekly Audit", icon: <ClipboardCheck className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "ops-manager-checklist" },
      { id: "bagel-orders", label: "Bagel Orders", icon: <CircleDot className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "bagel-orders" },
    ],
  },
  {
    slug: "store-manager",
    label: "Store Manager",
    icon: <Store className="w-6 h-6" />,
    color: "text-[#D4A853]",
    bg: "bg-[#D4A853]/5",
    border: "border-[#D4A853]/30",
    gradient: "from-[#D4A853] to-[#c49843]",
    requiresPin: true,
    sidebarItems: [
      { id: "store-perf", label: "Store Performance", icon: <TrendingUp className="w-[18px] h-[18px]" />, type: "info", infoContent: "store-performance" },
      { id: "daily-checklist", label: "Store Mgr Daily Checklist", icon: <ClipboardCheck className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "manager-checklist" },
      { id: "weekly-scorecard", label: "Weekly Scorecard", icon: <BarChart3 className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "weekly-scorecard" },
      { id: "performance-eval", label: "Performance Evaluation", icon: <Star className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "performance-evaluation" },
      { id: "waste-report", label: "Leftovers & Waste", icon: <Trash2 className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "waste-report" },
      { id: "equipment", label: "Equipment & Maintenance", icon: <Wrench className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "equipment-maintenance" },
      { id: "training", label: "Training Evaluation", icon: <GraduationCap className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "training-evaluation" },
      { id: "bagel-orders", label: "Bagel Orders", icon: <CircleDot className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "bagel-orders" },
    ],
  },
  {
    slug: "assistant-manager",
    label: "Assistant Manager",
    icon: <UserCheck className="w-6 h-6" />,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    gradient: "from-emerald-500 to-emerald-600",
    requiresPin: true,
    sidebarItems: [
      { id: "equipment", label: "Equipment & Maintenance", icon: <Wrench className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "equipment-maintenance" },
      { id: "training", label: "Training Evaluation", icon: <GraduationCap className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "training-evaluation" },
      { id: "bagel-orders", label: "Bagel Orders", icon: <CircleDot className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "bagel-orders" },
    ],
  },
  {
    slug: "staff",
    label: "Staff",
    icon: <Users className="w-6 h-6" />,
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    gradient: "from-sky-500 to-sky-600",
    requiresPin: false,
    sidebarItems: [
      { id: "waste-report", label: "Leftovers & Waste", icon: <Trash2 className="w-[18px] h-[18px]" />, type: "checklist", checklistType: "waste-report" },
    ],
  },
];

// ─── Main Portal Component ───────────────────────────────────────

export default function Portal() {
  const [step, setStep] = useState<PortalStep>("position");
  const [selectedPosition, setSelectedPosition] = useState<PositionDef | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);
  const [activeSidebarItem, setActiveSidebarItem] = useState<string | null>(null);

  const handlePositionSelect = (pos: PositionDef) => {
    setSelectedPosition(pos);
    setStep("store");
  };

  const handleStoreSelect = (store: StoreInfo) => {
    setSelectedStore(store);
    if (selectedPosition?.requiresPin) {
      setStep("pin");
    } else {
      setStep("dashboard");
      if (selectedPosition?.sidebarItems[0]) {
        setActiveSidebarItem(selectedPosition.sidebarItems[0].id);
      }
    }
  };

  const handlePinVerified = () => {
    setStep("dashboard");
    if (selectedPosition?.sidebarItems[0]) {
      setActiveSidebarItem(selectedPosition.sidebarItems[0].id);
    }
  };

  if (step === "position") {
    return <PositionSelect onSelect={handlePositionSelect} />;
  }

  if (step === "store") {
    return (
      <StoreSelect
        position={selectedPosition!}
        onSelect={handleStoreSelect}
        onBack={() => { setStep("position"); setSelectedPosition(null); }}
      />
    );
  }

  if (step === "pin") {
    return (
      <PinEntry
        position={selectedPosition!}
        storeName={selectedStore!.storeName}
        onVerified={handlePinVerified}
        onBack={() => { setStep("store"); setSelectedStore(null); }}
      />
    );
  }

  return (
    <PortalDashboard
      position={selectedPosition!}
      store={selectedStore!}
      activeSidebarItem={activeSidebarItem}
      onSidebarItemSelect={setActiveSidebarItem}
    />
  );
}

// ─── Step 1: Position Selection ──────────────────────────────────

function PositionSelect({ onSelect }: { onSelect: (pos: PositionDef) => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#faa600] flex items-center justify-center mx-auto shadow-lg">
            <Coffee className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hinnawi Portal</h1>
          <p className="text-sm text-muted-foreground">Select your position to continue</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {POSITIONS.map((pos) => (
            <button
              key={pos.slug}
              onClick={() => onSelect(pos)}
              className={cn(
                "relative overflow-hidden rounded-xl border-2 p-5 text-left transition-all duration-200",
                "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
                pos.bg, pos.border
              )}
            >
              <div className={cn("absolute top-0 left-0 right-0 h-1 bg-gradient-to-r", pos.gradient)} />
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", pos.bg, pos.color)}>
                  {pos.icon}
                </div>
                <div className="flex-1">
                  <h3 className={cn("font-semibold text-base", pos.color)}>{pos.label}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {pos.requiresPin ? "PIN required" : "Open access"}
                    </span>
                  </div>
                </div>
                <ChevronRight className={cn("w-5 h-5", pos.color)} />
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Ask your manager if you're unsure which position to select.
        </p>
      </div>
    </div>
  );
}

// ─── Step 2: Store Selection ─────────────────────────────────────

function StoreSelect({
  position,
  onSelect,
  onBack,
}: {
  position: PositionDef;
  onSelect: (store: StoreInfo) => void;
  onBack: () => void;
}) {
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCode, setSelectedCode] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/trpc/storePins.stores");
        const data = await res.json();
        const list = data?.result?.data?.json || [];
        setStores(list);
        if (list.length > 0) setSelectedCode(list[0].storeCode);
      } catch {
        toast.error("Failed to load stores");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleContinue = () => {
    const store = stores.find((s) => s.storeCode === selectedCode);
    if (store) onSelect(store);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg bg-gradient-to-br", position.gradient)}>
            <span className="text-white">{position.icon}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hinnawi Portal</h1>
          <p className="text-sm text-muted-foreground">{position.label}</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-center">Select Your Store</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-pulse text-[#faa600] text-sm font-medium">Loading stores...</div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    <MapPin className="inline h-3.5 w-3.5 mr-1" />
                    Which store are you at?
                  </Label>
                  <Select value={selectedCode} onValueChange={setSelectedCode}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose store..." />
                    </SelectTrigger>
                    <SelectContent>
                      {stores.map((s) => (
                        <SelectItem key={s.storeCode} value={s.storeCode}>
                          {s.storeName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200">
                  <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Your store will be <strong>locked</strong> after selection and cannot be changed.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={onBack} className="flex-1">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedCode}
                    className="flex-1 bg-[#faa600] hover:bg-[#e09500] text-white"
                  >
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Step 3: PIN Entry ───────────────────────────────────────────

function PinEntry({
  position,
  storeName,
  onVerified,
  onBack,
}: {
  position: PositionDef;
  storeName: string;
  onVerified: () => void;
  onBack: () => void;
}) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    const newPin = [...pin];
    for (let i = 0; i < 4; i++) newPin[i] = pasted[i] || "";
    setPin(newPin);
    inputRefs.current[Math.min(pasted.length, 3)]?.focus();
  };

  const handleVerify = async () => {
    const fullPin = pin.join("");
    if (fullPin.length < 4) { toast.error("Please enter the full 4-digit PIN"); return; }
    setVerifying(true);
    try {
      const res = await fetch("/api/trpc/positionPins.verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { positionSlug: position.slug, pin: fullPin } }),
      });
      const data = await res.json();
      if (data?.result?.data?.json?.valid) {
        toast.success("PIN verified!");
        onVerified();
      } else {
        toast.error("Incorrect PIN. Please try again.");
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg bg-gradient-to-br", position.gradient)}>
            <span className="text-white">{position.icon}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hinnawi Portal</h1>
          <p className="text-sm text-muted-foreground">{position.label} — {storeName}</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-center">Enter Your Position PIN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-xs text-center text-muted-foreground">
              Enter the 4-digit PIN assigned to <strong>{position.label}</strong>
            </p>
            <div className="flex gap-3 justify-center" onPaste={handlePaste}>
              {pin.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 focus:border-[#faa600] focus:ring-[#faa600]"
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onBack} className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verifying || pin.join("").length < 4}
                className="flex-1 bg-[#faa600] hover:bg-[#e09500] text-white"
              >
                {verifying ? "Verifying..." : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" /> Verify PIN
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Ask your manager for the position PIN if you don't have it.
        </p>
      </div>
    </div>
  );
}

// ─── Step 4: Role-Scoped Dashboard ──────────────────────────────

function PortalDashboard({
  position,
  store,
  activeSidebarItem,
  onSidebarItemSelect,
}: {
  position: PositionDef;
  store: StoreInfo;
  activeSidebarItem: string | null;
  onSidebarItemSelect: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const activeItem = position.sidebarItems.find((i) => i.id === activeSidebarItem);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "relative flex flex-col transition-all duration-300 ease-out shrink-0",
          collapsed ? "w-[68px]" : "w-[260px]"
        )}
        style={{ background: "linear-gradient(180deg, #2C1810 0%, #1C1210 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: "#D4A853" }}>
            <Coffee className="w-5 h-5 text-[#1C1210]" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-semibold text-[#FFF8ED] tracking-wide truncate">Hinnawi Portal</h1>
              <p className="text-[10px] text-[#A8A29E] tracking-widest uppercase">{position.label}</p>
            </div>
          )}
        </div>

        {/* Store badge (locked) */}
        {!collapsed && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#D4A853]" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#78716C] uppercase tracking-wider">Store (Locked)</p>
                <p className="text-xs text-[#FFF8ED] font-medium truncate">{store.storeName}</p>
              </div>
              <Lock className="w-3 h-3 text-[#78716C]" />
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          {!collapsed && (
            <p className="px-3 pt-3 pb-1.5 text-[10px] text-[#78716C] uppercase tracking-[0.15em] font-medium">
              Your Tools
            </p>
          )}
          {collapsed && <div className="h-2" />}
          <div className="space-y-0.5">
            {position.sidebarItems.map((item) => {
              const isActive = activeSidebarItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSidebarItemSelect(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 relative text-left",
                    isActive
                      ? "bg-[#D4A853]/15 text-[#D4A853]"
                      : "text-[#A8A29E] hover:text-[#FFF8ED] hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#D4A853]" />
                  )}
                  <span className={cn("shrink-0", isActive && "text-[#D4A853]")}>{item.icon}</span>
                  {!collapsed && (
                    <span className="text-[13px] font-medium truncate">{item.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[#2C1810] border border-[#D4A853]/30 flex items-center justify-center text-[#D4A853] hover:bg-[#D4A853] hover:text-[#1C1210] transition-colors z-10"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {activeItem ? (
          <PortalContent
            item={activeItem}
            position={position}
            store={store}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an item from the sidebar
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Content Router ──────────────────────────────────────────────

function PortalContent({
  item,
  position,
  store,
}: {
  item: SidebarItem;
  position: PositionDef;
  store: StoreInfo;
}) {
  if (item.type === "info") {
    return (
      <PortalInfoPage
        pageId={item.infoContent!}
        store={store}
        position={position}
      />
    );
  }

  if (item.type === "checklist" && item.checklistType) {
    return (
      <PortalChecklistPage
        checklistType={item.checklistType}
        store={store}
        positionLabel={position.label}
      />
    );
  }

  return <div className="p-8 text-muted-foreground">Content not available</div>;
}

// ─── Info Pages (Scorecard, Store Performance) ───────────────────

function PortalInfoPage({
  pageId,
  store,
  position,
}: {
  pageId: string;
  store: StoreInfo;
  position: PositionDef;
}) {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/trpc/reports.all");
        const data = await res.json();
        setReports(data?.result?.data?.json || []);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const isStoreManager = position.slug === "store-manager";

  if (pageId === "scorecard") {
    // Show a summary of recent scores per store
    const storeGroups: Record<string, any[]> = {};
    reports.forEach((r) => {
      if (!storeGroups[r.location]) storeGroups[r.location] = [];
      storeGroups[r.location].push(r);
    });

    return (
      <div className="p-6 lg:p-8 max-w-[1200px] space-y-6">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Operations Scorecard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of operational scores and audit results.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading data...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(storeGroups).map(([loc, reps]) => {
              const audits = reps.filter((r) => r.reportType?.includes("Audit") || r.reportType?.includes("ops-manager"));
              const latestAudit = audits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              const avgScore = reps.filter((r) => r.totalScore).reduce((sum, r) => sum + parseFloat(r.totalScore || "0"), 0) / Math.max(reps.filter((r) => r.totalScore).length, 1);

              return (
                <Card key={loc} className="border-l-4 border-l-[#D4A853]">
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">{loc}</h3>
                      {latestAudit ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                          <ShieldCheck className="w-3 h-3" /> Audited
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          No Audit
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Total Reports</p>
                        <p className="font-bold text-lg">{reps.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Avg Score</p>
                        <p className="font-bold text-lg">{avgScore ? avgScore.toFixed(1) : "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {Object.keys(storeGroups).length === 0 && (
              <div className="col-span-2 text-center py-12 text-muted-foreground">
                No reports submitted yet. Start by filling out checklists.
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (pageId === "store-performance") {
    // For store managers, filter to their store only
    const filteredReports = isStoreManager
      ? reports.filter((r) => r.location === store.storeCode || r.location === store.storeName)
      : reports;

    const recentReports = filteredReports
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20);

    return (
      <div className="p-6 lg:p-8 max-w-[1200px] space-y-6">
        <div>
          <h1 className="text-2xl font-serif text-foreground">Store Performance</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isStoreManager
              ? `Performance data for ${store.storeName} only.`
              : "Performance data across all stores."}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading data...</div>
        ) : (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Reports</p>
                  <p className="text-2xl font-bold">{filteredReports.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold">
                    {filteredReports.filter((r) => {
                      const d = new Date(r.createdAt);
                      const now = new Date();
                      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                      return d >= weekAgo;
                    }).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                  <p className="text-2xl font-bold">
                    {(() => {
                      const scored = filteredReports.filter((r) => r.totalScore);
                      if (scored.length === 0) return "—";
                      return (scored.reduce((s, r) => s + parseFloat(r.totalScore || "0"), 0) / scored.length).toFixed(1);
                    })()}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3 text-center">
                  <p className="text-xs text-muted-foreground">Types</p>
                  <p className="text-2xl font-bold">
                    {new Set(filteredReports.map((r) => r.reportType)).size}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent reports table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {recentReports.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No reports yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium text-muted-foreground">Date</th>
                          {!isStoreManager && <th className="pb-2 font-medium text-muted-foreground">Store</th>}
                          <th className="pb-2 font-medium text-muted-foreground">Type</th>
                          <th className="pb-2 font-medium text-muted-foreground">Submitted By</th>
                          <th className="pb-2 font-medium text-muted-foreground text-right">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentReports.map((r) => (
                          <tr key={r.id} className="border-b border-border/40">
                            <td className="py-2.5">{new Date(r.createdAt).toLocaleDateString()}</td>
                            {!isStoreManager && <td className="py-2.5">{r.location}</td>}
                            <td className="py-2.5">{r.reportType}</td>
                            <td className="py-2.5">{r.submitterName || "—"}</td>
                            <td className="py-2.5 text-right font-mono">
                              {r.totalScore ? parseFloat(r.totalScore).toFixed(1) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return <div className="p-8 text-muted-foreground">Page not found</div>;
}

// ─── Checklist Page (renders the form from PositionChecklists) ───

function PortalChecklistPage({
  checklistType,
  store,
  positionLabel,
}: {
  checklistType: ChecklistType;
  store: StoreInfo;
  positionLabel: string;
}) {
  // Key forces re-mount when switching between checklists
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/30 to-orange-50/30">
      <ChecklistForm
        key={checklistType}
        type={checklistType}
        storeCode={store.storeCode}
        storeName={store.storeName}
        positionLabel={positionLabel}
        onBack={() => {
          // In portal mode, "back" just shows a success message — they stay in the sidebar
          // The ChecklistForm's own success screen handles this
        }}
      />
    </div>
  );
}
