/**
 * Hinnawi Portal — Single public entry point (mobile-first app experience)
 *
 * Flow varies by position:
 *  - Ops Manager: Position → PIN → All-stores dashboard (pick store per checklist)
 *  - Store/Asst Manager: Position → Store → PIN → Store-scoped dashboard
 *  - Staff: Position → Store → Open access → Checklists only
 *
 * Store is LOCKED after selection (except Ops Manager who sees all).
 */
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Shield, Store, UserCheck, Users, Lock, Coffee,
  ChevronRight, ChevronLeft, MapPin, ShieldCheck, ArrowLeft,
  ClipboardCheck, BarChart3, Star, Trash2, Wrench,
  GraduationCap, CircleDot, TrendingUp, Menu, X,
  FileText, DollarSign, Percent, Clock, CheckCircle2,
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
import { type ChecklistType, ALL_CHECKLISTS } from "@/lib/positionChecklists";
import { ChecklistForm } from "./PositionChecklists";
import { ScorecardContent } from "@/pages/OperationsScorecard";
import { StorePerformanceContent } from "@/pages/Stores";

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
  mobileIcon: React.ReactNode; // smaller icon for bottom nav
  type: "checklist" | "info";
  checklistType?: ChecklistType;
  infoContent?: string;
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
  requiresStore: boolean; // false for Ops Manager
  sidebarItems: SidebarItem[];
}

function si(id: string, label: string, Icon: any, type: "checklist" | "info", extra?: { checklistType?: ChecklistType; infoContent?: string }): SidebarItem {
  return {
    id, label,
    icon: <Icon className="w-[18px] h-[18px]" />,
    mobileIcon: <Icon className="w-5 h-5" />,
    type,
    ...extra,
  };
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
    requiresStore: false, // Ops Manager sees all stores
    sidebarItems: [
      si("scorecard", "Operations Scorecard", BarChart3, "info", { infoContent: "scorecard" }),
      si("store-perf", "Store Performance", TrendingUp, "info", { infoContent: "store-performance" }),
      si("ops-audit", "Ops. Mgr Weekly Audit", ClipboardCheck, "checklist", { checklistType: "ops-manager-checklist" }),
      si("bagel-orders", "Bagel Orders", CircleDot, "checklist", { checklistType: "bagel-orders" }),
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
    requiresStore: true,
    sidebarItems: [
      si("store-perf", "Store Performance", TrendingUp, "info", { infoContent: "store-performance" }),
      si("daily-checklist", "Store Mgr Daily Checklist", ClipboardCheck, "checklist", { checklistType: "manager-checklist" }),
      si("weekly-scorecard", "Weekly Scorecard", BarChart3, "checklist", { checklistType: "weekly-scorecard" }),
      si("performance-eval", "Performance Evaluation", Star, "checklist", { checklistType: "performance-evaluation" }),
      si("waste-report", "Leftovers & Waste", Trash2, "checklist", { checklistType: "waste-report" }),
      si("equipment", "Equipment & Maintenance", Wrench, "checklist", { checklistType: "equipment-maintenance" }),
      si("training", "Training Evaluation", GraduationCap, "checklist", { checklistType: "training-evaluation" }),
      si("bagel-orders", "Bagel Orders", CircleDot, "checklist", { checklistType: "bagel-orders" }),
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
    requiresStore: true,
    sidebarItems: [
      si("store-perf", "Store Performance", TrendingUp, "info", { infoContent: "store-performance" }),
      si("completed", "Completed Checklists", FileText, "info", { infoContent: "completed-checklists" }),
      si("equipment", "Equipment & Maintenance", Wrench, "checklist", { checklistType: "equipment-maintenance" }),
      si("training", "Training Evaluation", GraduationCap, "checklist", { checklistType: "training-evaluation" }),
      si("bagel-orders", "Bagel Orders", CircleDot, "checklist", { checklistType: "bagel-orders" }),
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
    requiresStore: true,
    sidebarItems: [
      si("waste-report", "Leftovers & Waste", Trash2, "checklist", { checklistType: "waste-report" }),
    ],
  },
];

// ─── Store definitions (for Ops Manager all-stores view) ─────────

const ALL_STORES: { code: string; name: string; shortName: string; color: string }[] = [
  { code: "pk", name: "President Kennedy", shortName: "PK", color: "#D4A853" },
  { code: "mk", name: "Mackay", shortName: "MK", color: "#3B82F6" },
  { code: "ontario", name: "Ontario", shortName: "ON", color: "#10B981" },
  { code: "tunnel", name: "Cathcart (Tunnel)", shortName: "TN", color: "#F97316" },
];

// ─── Main Portal Component ───────────────────────────────────────

export default function Portal() {
  const [step, setStep] = useState<PortalStep>("position");
  const [selectedPosition, setSelectedPosition] = useState<PositionDef | null>(null);
  const [selectedStore, setSelectedStore] = useState<StoreInfo | null>(null);
  const [activeSidebarItem, setActiveSidebarItem] = useState<string | null>(null);

  const handlePositionSelect = (pos: PositionDef) => {
    setSelectedPosition(pos);
    if (pos.requiresStore) {
      setStep("store");
    } else if (pos.requiresPin) {
      // Ops Manager: skip store, go to PIN
      setStep("pin");
    } else {
      setStep("dashboard");
      if (pos.sidebarItems[0]) setActiveSidebarItem(pos.sidebarItems[0].id);
    }
  };

  const handleStoreSelect = (store: StoreInfo) => {
    setSelectedStore(store);
    if (selectedPosition?.requiresPin) {
      setStep("pin");
    } else {
      setStep("dashboard");
      if (selectedPosition?.sidebarItems[0]) setActiveSidebarItem(selectedPosition.sidebarItems[0].id);
    }
  };

  const handlePinVerified = () => {
    setStep("dashboard");
    if (selectedPosition?.sidebarItems[0]) setActiveSidebarItem(selectedPosition.sidebarItems[0].id);
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
        storeName={selectedStore?.storeName}
        onVerified={handlePinVerified}
        onBack={() => {
          if (selectedPosition?.requiresStore) {
            setStep("store");
            setSelectedStore(null);
          } else {
            setStep("position");
            setSelectedPosition(null);
          }
        }}
      />
    );
  }

  return (
    <PortalDashboard
      position={selectedPosition!}
      store={selectedStore}
      activeSidebarItem={activeSidebarItem}
      onSidebarItemSelect={setActiveSidebarItem}
      onLogout={() => {
        setStep("position");
        setSelectedPosition(null);
        setSelectedStore(null);
        setActiveSidebarItem(null);
      }}
    />
  );
}

// ─── Step 1: Position Selection ──────────────────────────────────

function PositionSelect({ onSelect }: { onSelect: (pos: PositionDef) => void }) {
  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4 safe-area-inset">
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
                "hover:shadow-lg active:scale-[0.97]",
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
        const list = data?.result?.data?.json
          ?.map((s: any) => ({ storeCode: s.storeCode, storeName: s.storeName })) || [];
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4 safe-area-inset">
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
                    <SelectTrigger className="h-12 text-base">
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
                  <Button variant="outline" onClick={onBack} className="flex-1 h-12">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  <Button
                    onClick={handleContinue}
                    disabled={!selectedCode}
                    className="flex-1 h-12 bg-[#faa600] hover:bg-[#e09500] text-white text-base"
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
  storeName?: string;
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4 safe-area-inset">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg bg-gradient-to-br", position.gradient)}>
            <span className="text-white">{position.icon}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hinnawi Portal</h1>
          <p className="text-sm text-muted-foreground">
            {position.label}{storeName ? ` — ${storeName}` : ""}
          </p>
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
              <Button variant="outline" onClick={onBack} className="flex-1 h-12">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleVerify}
                disabled={verifying || pin.join("").length < 4}
                className="flex-1 h-12 bg-[#faa600] hover:bg-[#e09500] text-white"
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
  onLogout,
}: {
  position: PositionDef;
  store: StoreInfo | null; // null for Ops Manager
  activeSidebarItem: string | null;
  onSidebarItemSelect: (id: string) => void;
  onLogout: () => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const activeItem = position.sidebarItems.find((i) => i.id === activeSidebarItem);

  // For Ops Manager checklist forms — they need to pick a store
  const [opsChecklistStore, setOpsChecklistStore] = useState<StoreInfo | null>(null);

  const handleNavClick = (id: string) => {
    onSidebarItemSelect(id);
    setSidebarOpen(false);
    // Reset ops checklist store when switching items
    setOpsChecklistStore(null);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — desktop always visible, mobile slide-in */}
      <aside
        className={cn(
          "fixed lg:relative z-50 flex flex-col h-full transition-transform duration-300 ease-out w-[280px] lg:w-[260px] shrink-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ background: "linear-gradient(180deg, #2C1810 0%, #1C1210 100%)" }}
      >
        {/* Logo + close on mobile */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0" style={{ background: "#D4A853" }}>
            <Coffee className="w-5 h-5 text-[#1C1210]" />
          </div>
          <div className="overflow-hidden flex-1">
            <h1 className="text-sm font-semibold text-[#FFF8ED] tracking-wide truncate">Hinnawi Portal</h1>
            <p className="text-[10px] text-[#A8A29E] tracking-widest uppercase">{position.label}</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white/50 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Store badge (locked) — only for non-Ops Manager */}
        {store && (
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

        {/* All stores badge for Ops Manager */}
        {!store && position.slug === "operations-manager" && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#D4A853]" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-[#78716C] uppercase tracking-wider">Viewing</p>
                <p className="text-xs text-[#FFF8ED] font-medium">All 4 Stores</p>
              </div>
              <Shield className="w-3 h-3 text-indigo-400" />
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto">
          <p className="px-3 pt-3 pb-1.5 text-[10px] text-[#78716C] uppercase tracking-[0.15em] font-medium">
            Your Tools
          </p>
          <div className="space-y-0.5">
            {position.sidebarItems.map((item) => {
              const isActive = activeSidebarItem === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative text-left",
                    isActive
                      ? "bg-[#D4A853]/15 text-[#D4A853]"
                      : "text-[#A8A29E] hover:text-[#FFF8ED] hover:bg-white/5"
                  )}
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#D4A853]" />
                  )}
                  <span className={cn("shrink-0", isActive && "text-[#D4A853]")}>{item.icon}</span>
                  <span className="text-[13px] font-medium truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[#A8A29E] hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
            <span className="text-[13px] font-medium">Switch Position</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-background shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg hover:bg-muted">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold truncate">{activeItem?.label || "Hinnawi Portal"}</h2>
            <p className="text-[10px] text-muted-foreground">
              {store ? store.storeName : "All Stores"} · {position.label}
            </p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {activeItem ? (
            <PortalContent
              item={activeItem}
              position={position}
              store={store}
              opsChecklistStore={opsChecklistStore}
              onOpsChecklistStoreSelect={setOpsChecklistStore}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground p-4 text-center">
              Select an item from the menu to get started
            </div>
          )}
        </main>

        {/* Mobile bottom tab bar — show first 5 items max */}
        <nav className="lg:hidden flex items-center justify-around border-t border-border bg-background shrink-0 pb-safe">
          {position.sidebarItems.slice(0, 5).map((item) => {
            const isActive = activeSidebarItem === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-2 min-w-0 flex-1 transition-colors",
                  isActive ? "text-[#D4A853]" : "text-muted-foreground"
                )}
              >
                {item.mobileIcon}
                <span className="text-[9px] font-medium truncate w-full text-center leading-tight">
                  {item.label.split(" ").slice(0, 2).join(" ")}
                </span>
              </button>
            );
          })}
          {position.sidebarItems.length > 5 && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center gap-0.5 py-2 px-2 min-w-0 flex-1 text-muted-foreground"
            >
              <Menu className="w-5 h-5" />
              <span className="text-[9px] font-medium">More</span>
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

// ─── Content Router ──────────────────────────────────────────────

function PortalContent({
  item,
  position,
  store,
  opsChecklistStore,
  onOpsChecklistStoreSelect,
}: {
  item: SidebarItem;
  position: PositionDef;
  store: StoreInfo | null;
  opsChecklistStore: StoreInfo | null;
  onOpsChecklistStoreSelect: (s: StoreInfo | null) => void;
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
    // Ops Manager needs to pick a store for checklists
    if (!store && position.slug === "operations-manager") {
      if (!opsChecklistStore) {
        return (
          <OpsStorePickerForChecklist
            checklistLabel={item.label}
            onSelect={onOpsChecklistStoreSelect}
          />
        );
      }
      return (
        <div>
          {/* Store indicator bar */}
          <div className="flex items-center gap-2 px-4 sm:px-6 py-3 bg-indigo-50 border-b border-indigo-200">
            <MapPin className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">
              Submitting for: {opsChecklistStore.storeName}
            </span>
            <button
              onClick={() => onOpsChecklistStoreSelect(null)}
              className="ml-auto text-xs text-indigo-600 hover:text-indigo-800 underline"
            >
              Change store
            </button>
          </div>
          <PortalChecklistPage
            checklistType={item.checklistType}
            store={opsChecklistStore}
            positionLabel={position.label}
          />
        </div>
      );
    }

    return (
      <PortalChecklistPage
        checklistType={item.checklistType}
        store={store!}
        positionLabel={position.label}
      />
    );
  }

  return <div className="p-8 text-muted-foreground">Content not available</div>;
}

// ─── Ops Manager: Store Picker for Checklists ───────────────────

function OpsStorePickerForChecklist({
  checklistLabel,
  onSelect,
}: {
  checklistLabel: string;
  onSelect: (store: StoreInfo) => void;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[600px] mx-auto space-y-6">
      <div className="text-center space-y-2">
        <ClipboardCheck className="w-10 h-10 text-indigo-600 mx-auto" />
        <h2 className="text-xl font-serif text-foreground">{checklistLabel}</h2>
        <p className="text-sm text-muted-foreground">
          Select which store this checklist is for:
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ALL_STORES.map((s) => (
          <button
            key={s.code}
            onClick={() => onSelect({ storeCode: s.code, storeName: s.name })}
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-indigo-300 hover:bg-indigo-50/50 transition-all active:scale-[0.97]"
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: s.color }}>
              {s.shortName}
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.shortName}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Info Pages ──────────────────────────────────────────────────

function PortalInfoPage({
  pageId,
  store,
  position,
}: {
  pageId: string;
  store: StoreInfo | null;
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

  const isOpsManager = position.slug === "operations-manager";
  const isStoreManager = position.slug === "store-manager";
  const isAsstManager = position.slug === "assistant-manager";

  // Normalize location codes
  const LOCATION_NORMALIZE: Record<string, string> = {
    "President Kennedy": "PK", "president kennedy": "PK", "pk": "PK",
    "Mackay": "MK", "mackay": "MK", "mk": "MK",
    "Ontario": "ON", "ontario": "ON", "on": "ON",
    "Cathcart (Tunnel)": "TN", "Tunnel": "TN", "tunnel": "TN", "tn": "TN",
  };

  const normalizedReports = useMemo(() => reports.map(r => ({
    ...r,
    normalizedLocation: LOCATION_NORMALIZE[r.location] || r.location,
  })), [reports]);

  // Filter to store if locked
  const filteredReports = useMemo(() => {
    if (!store) return normalizedReports; // Ops Manager sees all
    const storeCode = (store.storeCode || "").toUpperCase();
    const storeName = store.storeName;
    return normalizedReports.filter(r =>
      r.normalizedLocation === storeCode ||
      r.normalizedLocation === storeName ||
      r.location === storeName ||
      r.location === store.storeCode
    );
  }, [normalizedReports, store]);

  if (pageId === "scorecard") {
    return (
      <div className="max-w-[1400px]">
        <ScorecardContent />
      </div>
    );
  }

  if (pageId === "store-performance") {
    // Ops Manager sees all stores; Store/Asst Manager sees only their store
    const storeId = store?.storeCode || undefined;
    return (
      <div className="max-w-[1400px]">
        <StorePerformanceContent storeFilter={storeId} />
      </div>
    );
  }

  if (pageId === "completed-checklists") {
    return (
      <PortalCompletedChecklists
        reports={filteredReports}
        loading={loading}
        store={store}
      />
    );
  }

  return <div className="p-8 text-muted-foreground">Page not found</div>;
}

// ─── Operations Scorecard (for Ops Manager) ─────────────────────

function PortalScorecard({ reports, loading }: { reports: any[]; loading: boolean }) {
  const storeGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    ALL_STORES.forEach(s => { groups[s.shortName] = []; });
    reports.forEach(r => {
      const loc = r.normalizedLocation;
      if (groups[loc]) groups[loc].push(r);
    });
    return groups;
  }, [reports]);

  // Waste metrics
  const wasteByStore = useMemo(() => {
    const result: Record<string, { total: number; reports: number }> = {};
    ALL_STORES.forEach(s => { result[s.shortName] = { total: 0, reports: 0 }; });
    reports.forEach(r => {
      if (!r.reportType?.includes("waste") && r.reportType !== "waste-report" && r.reportType !== "Leftovers & Waste") return;
      const loc = r.normalizedLocation;
      if (result[loc]) {
        result[loc].reports++;
        // Parse total from reportData if available
        try {
          const data = typeof r.reportData === "string" ? JSON.parse(r.reportData) : r.reportData;
          if (data?.totalItems) result[loc].total += data.totalItems;
        } catch { /* ignore */ }
      }
    });
    return result;
  }, [reports]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif text-foreground">Operations Scorecard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of operational scores and audit results across all stores.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading data...</div>
      ) : (
        <>
          {/* Store score cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ALL_STORES.map(s => {
              const reps = storeGroups[s.shortName] || [];
              const audits = reps.filter(r =>
                r.reportType?.includes("ops-manager") ||
                r.reportType?.includes("Audit") ||
                r.reportType?.includes("Weekly Audit")
              );
              const latestAudit = audits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
              const scored = reps.filter(r => r.totalScore);
              const avgScore = scored.length > 0
                ? scored.reduce((sum, r) => sum + parseFloat(r.totalScore || "0"), 0) / scored.length
                : 0;

              return (
                <Card key={s.shortName} className="border-l-4" style={{ borderLeftColor: s.color }}>
                  <CardContent className="pt-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: s.color }}>
                          {s.shortName}
                        </div>
                        <h3 className="font-semibold">{s.name}</h3>
                      </div>
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
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Reports</p>
                        <p className="font-bold text-lg">{reps.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Avg Score</p>
                        <p className="font-bold text-lg">{avgScore ? avgScore.toFixed(1) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Audits</p>
                        <p className="font-bold text-lg">{audits.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Waste metrics */}
          <div>
            <h2 className="text-lg font-serif text-foreground mb-3">Leftovers & Waste</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {ALL_STORES.map(s => {
                const w = wasteByStore[s.shortName];
                const isHigh = w.total > 15;
                const isWarning = w.total > 8;
                return (
                  <Card key={s.shortName} className={cn(
                    "border-l-4",
                    isHigh ? "border-l-red-500 bg-red-50/50" :
                    isWarning ? "border-l-amber-500 bg-amber-50/50" :
                    "border-l-emerald-500"
                  )} style={!isHigh && !isWarning ? { borderLeftColor: s.color } : {}}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{s.shortName}</span>
                        <Trash2 className={cn("w-4 h-4", isHigh ? "text-red-500" : isWarning ? "text-amber-500" : "text-muted-foreground")} />
                      </div>
                      <p className={cn("text-2xl font-bold", isHigh ? "text-red-600" : isWarning ? "text-amber-600" : "text-foreground")}>
                        {w.total || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">{w.reports} report{w.reports !== 1 ? "s" : ""}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Alerts */}
          {(() => {
            const alerts: { store: string; message: string; severity: "critical" | "warning" | "info" }[] = [];
            ALL_STORES.forEach(s => {
              const reps = storeGroups[s.shortName] || [];
              const audits = reps.filter(r => r.reportType?.includes("ops-manager") || r.reportType?.includes("Audit"));
              if (audits.length === 0) {
                alerts.push({ store: s.shortName, message: `${s.name} has no audit on record`, severity: "critical" });
              }
              const w = wasteByStore[s.shortName];
              if (w.total > 15) {
                alerts.push({ store: s.shortName, message: `${s.name} waste is critically high (${w.total} items)`, severity: "critical" });
              } else if (w.total > 8) {
                alerts.push({ store: s.shortName, message: `${s.name} waste is elevated (${w.total} items)`, severity: "warning" });
              }
              if (w.reports === 0) {
                alerts.push({ store: s.shortName, message: `${s.name} has no waste reports`, severity: "warning" });
              }
            });

            if (alerts.length === 0) return null;

            return (
              <div>
                <h2 className="text-lg font-serif text-foreground mb-3">Alerts</h2>
                <div className="space-y-2">
                  {alerts.map((a, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm",
                      a.severity === "critical" ? "bg-red-50 border-red-200 text-red-800" :
                      a.severity === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" :
                      "bg-blue-50 border-blue-200 text-blue-800"
                    )}>
                      {a.severity === "critical" ? <X className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0" />}
                      <span>{a.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

// ─── Store Performance ──────────────────────────────────────────

function PortalStorePerformance({
  reports,
  allReports,
  loading,
  store,
  isOpsManager,
  isStoreManager,
}: {
  reports: any[];
  allReports: any[];
  loading: boolean;
  store: StoreInfo | null;
  isOpsManager: boolean;
  isStoreManager: boolean;
}) {
  // For Ops Manager: show all stores summary
  // For Store/Asst Manager: show their store only

  const recentReports = useMemo(() =>
    reports
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 20),
    [reports]
  );

  const thisWeekReports = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return reports.filter(r => new Date(r.createdAt) >= weekAgo);
  }, [reports]);

  const scored = useMemo(() => reports.filter(r => r.totalScore), [reports]);
  const avgScore = scored.length > 0
    ? scored.reduce((s, r) => s + parseFloat(r.totalScore || "0"), 0) / scored.length
    : 0;

  // Report type breakdown
  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach(r => {
      const type = r.reportType || "Unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [reports]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif text-foreground">Store Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {store
            ? `Performance data for ${store.storeName}.`
            : "Performance data across all stores."}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading data...</div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Total Reports</p>
                </div>
                <p className="text-2xl font-bold">{reports.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">This Week</p>
                </div>
                <p className="text-2xl font-bold">{thisWeekReports.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Avg Score</p>
                </div>
                <p className="text-2xl font-bold">{avgScore ? avgScore.toFixed(1) : "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Checklist Types</p>
                </div>
                <p className="text-2xl font-bold">{typeBreakdown.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Labour data for Store Manager */}
          {isStoreManager && store && (
            <LabourCard storeCode={store.storeCode} storeName={store.storeName} />
          )}

          {/* Ops Manager: all stores overview */}
          {isOpsManager && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_STORES.map(s => {
                const storeReps = allReports.filter(r => r.normalizedLocation === s.shortName);
                const storeScored = storeReps.filter(r => r.totalScore);
                const storeAvg = storeScored.length > 0
                  ? storeScored.reduce((sum, r) => sum + parseFloat(r.totalScore || "0"), 0) / storeScored.length
                  : 0;
                return (
                  <Card key={s.shortName} className="border-l-4" style={{ borderLeftColor: s.color }}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded flex items-center justify-center text-white text-xs font-bold" style={{ background: s.color }}>
                          {s.shortName}
                        </div>
                        <span className="font-medium text-sm">{s.name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Reports</p>
                          <p className="font-bold">{storeReps.length}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Avg Score</p>
                          <p className="font-bold">{storeAvg ? storeAvg.toFixed(1) : "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">This Week</p>
                          <p className="font-bold">
                            {storeReps.filter(r => new Date(r.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Checklist type breakdown */}
          {typeBreakdown.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Checklist Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {typeBreakdown.map(([type, count]) => {
                    const info = ALL_CHECKLISTS[type as ChecklistType];
                    return (
                      <div key={type} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                        <span className="text-sm">{info?.label || type}</span>
                        <span className="text-sm font-mono font-medium bg-muted px-2 py-0.5 rounded">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent reports table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent>
              {recentReports.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No reports yet.</p>
              ) : (
                <div className="overflow-x-auto -mx-6">
                  <table className="w-full text-sm min-w-[500px]">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 pl-6 font-medium text-muted-foreground">Date</th>
                        {!store && <th className="pb-2 font-medium text-muted-foreground">Store</th>}
                        <th className="pb-2 font-medium text-muted-foreground">Type</th>
                        <th className="pb-2 font-medium text-muted-foreground">By</th>
                        <th className="pb-2 pr-6 font-medium text-muted-foreground text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReports.map((r) => {
                        const info = ALL_CHECKLISTS[r.reportType as ChecklistType];
                        return (
                          <tr key={r.id} className="border-b border-border/40">
                            <td className="py-2.5 pl-6">{new Date(r.createdAt).toLocaleDateString()}</td>
                            {!store && <td className="py-2.5">{r.normalizedLocation}</td>}
                            <td className="py-2.5">{info?.label || r.reportType}</td>
                            <td className="py-2.5">{r.submitterName || "—"}</td>
                            <td className="py-2.5 pr-6 text-right font-mono">
                              {r.totalScore ? parseFloat(r.totalScore).toFixed(1) : "—"}
                            </td>
                          </tr>
                        );
                      })}
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

// ─── Labour Card (for Store Manager) ────────────────────────────

function LabourCard({ storeCode, storeName }: { storeCode: string; storeName: string }) {
  // Try to fetch labour data from the data context via API
  // For now, show a placeholder that connects to the existing data
  const [labourData, setLabourData] = useState<{
    revenue: number;
    labourCost: number;
    labourPercent: number;
    target: number;
  } | null>(null);

  useEffect(() => {
    // Attempt to fetch from the Clover/data endpoint
    (async () => {
      try {
        const res = await fetch("/api/trpc/clover.labourSummary");
        const data = await res.json();
        const allLabour = data?.result?.data?.json || [];
        const storeLabour = allLabour.find((l: any) =>
          l.store === storeCode || l.store === storeName.toLowerCase()
        );
        if (storeLabour) {
          setLabourData({
            revenue: storeLabour.revenue || 0,
            labourCost: storeLabour.labourCost || 0,
            labourPercent: storeLabour.labourPercent || 0,
            target: storeLabour.target || 30,
          });
        }
      } catch {
        // Labour data not available — that's ok
      }
    })();
  }, [storeCode, storeName]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#D4A853]" />
          Labour Overview — {storeName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {labourData ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Revenue</p>
              <p className="text-xl font-bold font-mono">${(labourData.revenue / 1000).toFixed(1)}K</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Labour Cost</p>
              <p className={cn("text-xl font-bold font-mono", labourData.labourPercent > labourData.target ? "text-red-600" : "text-foreground")}>
                ${(labourData.labourCost / 1000).toFixed(1)}K
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Labour %</p>
              <p className={cn("text-xl font-bold font-mono", labourData.labourPercent > labourData.target ? "text-red-600" : "text-emerald-600")}>
                {labourData.labourPercent.toFixed(1)}%
              </p>
              <p className="text-[10px] text-muted-foreground">Target: {labourData.target}%</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Labour data will appear here once Clover POS is connected.</p>
            <p className="text-xs mt-1">Contact your operations manager to set up the integration.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Completed Checklists (for Assistant Manager) ───────────────

function PortalCompletedChecklists({
  reports,
  loading,
  store,
}: {
  reports: any[];
  loading: boolean;
  store: StoreInfo | null;
}) {
  const sorted = useMemo(() =>
    [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reports]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif text-foreground">Completed Checklists</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {store ? `All completed checklists for ${store.storeName}.` : "All completed checklists."}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No completed checklists yet.</p>
            <p className="text-xs mt-1">Submissions will appear here once checklists are filled out.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((r) => {
            const info = ALL_CHECKLISTS[r.reportType as ChecklistType];
            return (
              <Card key={r.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{info?.label || r.reportType}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {r.submitterName || "Unknown"} · {r.normalizedLocation || r.location}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()} at {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    {r.totalScore && (
                      <span className="text-sm font-mono font-bold bg-muted px-2 py-1 rounded shrink-0">
                        {parseFloat(r.totalScore).toFixed(1)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
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
  return (
    <div className="min-h-full bg-gradient-to-br from-amber-50/30 to-orange-50/30">
      <ChecklistForm
        key={checklistType + store.storeCode}
        type={checklistType}
        storeCode={store.storeCode}
        storeName={store.storeName}
        positionLabel={positionLabel}
        onBack={() => {
          // In portal mode, "back" is handled by the sidebar — the success screen stays
        }}
      />
    </div>
  );
}
