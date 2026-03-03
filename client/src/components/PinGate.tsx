import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Lock, ShieldCheck, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Store {
  storeCode: string;
  storeName: string;
}

interface PinGateProps {
  positionLabel: string;
  positionSlug: string;
  onVerified: (
    storeCode: string,
    storeName: string
  ) => void;
}

/**
 * Two-step gate:
 *  Step 1 — Enter the position PIN (unique per position)
 *  Step 2 — Select which store you're working at
 */
export default function PinGate({
  positionLabel,
  positionSlug,
  onVerified,
}: PinGateProps) {
  const [step, setStep] = useState<"pin" | "store">("pin");
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [pin, setPin] = useState(["", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first PIN input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, []);

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
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
    for (let i = 0; i < 4; i++) {
      newPin[i] = pasted[i] || "";
    }
    setPin(newPin);
    const focusIndex = Math.min(pasted.length, 3);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyPin = async () => {
    const fullPin = pin.join("");
    if (fullPin.length < 4) {
      toast.error("Please enter the full 4-digit PIN");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/trpc/positionPins.verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            positionSlug,
            pin: fullPin,
          },
        }),
      });
      const data = await res.json();
      if (data?.result?.data?.json?.valid) {
        toast.success("PIN verified!");
        // Load stores for step 2
        setLoading(true);
        try {
          const storeRes = await fetch("/api/trpc/storePins.stores");
          const storeData = await storeRes.json();
          const storeList = storeData?.result?.data?.json || [];
          setStores(storeList);
          if (storeList.length > 0) {
            setSelectedStore(storeList[0].storeCode);
          }
        } catch {
          toast.error("Failed to load stores");
        } finally {
          setLoading(false);
        }
        setStep("store");
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

  const handleSelectStore = () => {
    if (!selectedStore) {
      toast.error("Please select a store");
      return;
    }
    const store = stores.find((s) => s.storeCode === selectedStore);
    onVerified(selectedStore, store?.storeName || selectedStore);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#faa600] flex items-center justify-center mx-auto shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hinnawi Portal
          </h1>
          <p className="text-sm text-muted-foreground">
            {positionLabel} Checklists
          </p>
        </div>

        {step === "pin" && (
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-center">
                Enter Your Position PIN
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-xs text-center text-muted-foreground">
                Enter the 4-digit PIN assigned to <strong>{positionLabel}</strong>
              </p>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Position PIN</Label>
                <div className="flex gap-3 justify-center" onPaste={handlePaste}>
                  {pin.map((digit, i) => (
                    <Input
                      key={i}
                      ref={(el) => {
                        inputRefs.current[i] = el;
                      }}
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
              </div>

              <Button
                onClick={handleVerifyPin}
                disabled={verifying || pin.join("").length < 4}
                className="w-full h-11 bg-[#faa600] hover:bg-[#e09500] text-white font-medium"
              >
                {verifying ? (
                  "Verifying..."
                ) : (
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Verify PIN
                  </span>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === "store" && (
          <Card className="shadow-lg border-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-center">
                Select Your Store
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-pulse text-[#faa600] text-sm font-medium">
                    Loading stores...
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      <MapPin className="inline h-3.5 w-3.5 mr-1" />
                      Which store are you at?
                    </Label>
                    <Select value={selectedStore} onValueChange={setSelectedStore}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose store..." />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store.storeCode} value={store.storeCode}>
                            {store.storeName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    onClick={handleSelectStore}
                    disabled={!selectedStore}
                    className="w-full h-11 bg-[#faa600] hover:bg-[#e09500] text-white font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Open Checklists
                    </span>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-center text-muted-foreground">
          {step === "pin"
            ? "Ask your manager for the position PIN if you don't have it."
            : "Select the store you are currently working at."}
        </p>
      </div>
    </div>
  );
}
