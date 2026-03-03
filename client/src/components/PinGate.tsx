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
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Store {
  storeCode: string;
  storeName: string;
}

interface PinGateProps {
  positionLabel: string;
  onVerified: (
    storeCode: string,
    storeName: string
  ) => void;
}

export default function PinGate({
  positionLabel,
  onVerified,
}: PinGateProps) {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] =
    useState("");
  const [pin, setPin] = useState([
    "",
    "",
    "",
    "",
  ]);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(true);
  const inputRefs = useRef<
    (HTMLInputElement | null)[]
  >([]);

  useEffect(() => {
    fetch("/api/trpc/storePins.stores")
      .then((res) => res.json())
      .then((data) => {
        const storeList =
          data?.result?.data?.json || [];
        setStores(storeList);
        if (storeList.length > 0) {
          setSelectedStore(
            storeList[0].storeCode
          );
        }
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load stores");
        setLoading(false);
      });
  }, []);

  const handlePinChange = (
    index: number,
    value: string
  ) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent
  ) => {
    if (
      e.key === "Backspace" &&
      !pin[index] &&
      index > 0
    ) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (
    e: React.ClipboardEvent
  ) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 4);
    const newPin = [...pin];
    for (let i = 0; i < 4; i++) {
      newPin[i] = pasted[i] || "";
    }
    setPin(newPin);
    const focusIndex = Math.min(
      pasted.length,
      3
    );
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async () => {
    const fullPin = pin.join("");
    if (fullPin.length < 4) {
      toast.error(
        "Please enter the full 4-digit PIN"
      );
      return;
    }
    if (!selectedStore) {
      toast.error("Please select a store");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch(
        "/api/trpc/storePins.verify",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            json: {
              storeCode: selectedStore,
              pin: fullPin,
            },
          }),
        }
      );
      const data = await res.json();
      if (data?.result?.data?.json?.valid) {
        const store = stores.find(
          (s) => s.storeCode === selectedStore
        );
        onVerified(
          selectedStore,
          store?.storeName || selectedStore
        );
      } else {
        toast.error(
          "Incorrect PIN. Please try again."
        );
        setPin(["", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch {
      toast.error(
        "Verification failed. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="animate-pulse text-[#faa600] text-lg font-medium">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-[#faa600] flex items-center justify-center mx-auto shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hinnawi Operations
          </h1>
          <p className="text-sm text-muted-foreground">
            {positionLabel} Checklists
          </p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-base text-center">
              Enter Store PIN to Continue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Select Your Store
              </Label>
              <Select
                value={selectedStore}
                onValueChange={setSelectedStore}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose store..." />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem
                      key={store.storeCode}
                      value={store.storeCode}
                    >
                      {store.storeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Store PIN
              </Label>
              <div
                className="flex gap-3 justify-center"
                onPaste={handlePaste}
              >
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
                    onChange={(e) =>
                      handlePinChange(
                        i,
                        e.target.value
                      )
                    }
                    onKeyDown={(e) =>
                      handleKeyDown(i, e)
                    }
                    className="w-14 h-14 text-center text-2xl font-bold border-2 focus:border-[#faa600] focus:ring-[#faa600]"
                  />
                ))}
              </div>
            </div>

            <Button
              onClick={handleVerify}
              disabled={
                verifying ||
                pin.join("").length < 4
              }
              className="w-full h-11 bg-[#faa600] hover:bg-[#e09500] text-white font-medium"
            >
              {verifying ? (
                "Verifying..."
              ) : (
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Unlock Checklists
                </span>
              )}
            </Button>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Ask your manager for the store PIN if
          you don't have it.
        </p>
      </div>
    </div>
  );
}
