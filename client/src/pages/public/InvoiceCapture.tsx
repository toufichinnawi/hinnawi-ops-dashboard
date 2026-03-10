/**
 * Invoice Capture — Portal component for photographing and verifying delivery invoices
 * Flow: Take photo → OCR auto-fill → Review/edit → Verify → Submit
 */
import { useState, useRef } from "react";
import { Camera, Upload, Loader2, CheckCircle2, ArrowLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const KNOWN_VENDORS = [
  "Gordon/GFS",
  "Dube Loiselle",
  "Costco",
  "Fernando",
  "JG Rive Sud",
  "Other",
];

interface LineItem {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
}

interface InvoiceCapturePortalProps {
  storeCode: string;
  storeName: string;
  onBack: () => void;
}

type Step = "capture" | "processing" | "review" | "success";

export default function InvoiceCapturePortal({ storeCode, storeName, onBack }: InvoiceCapturePortalProps) {
  const [step, setStep] = useState<Step>("capture");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoKey, setPhotoKey] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form fields (populated by OCR)
  const [vendorName, setVendorName] = useState("");
  const [customVendor, setCustomVendor] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [subtotal, setSubtotal] = useState<string>("");
  const [tax, setTax] = useState<string>("");
  const [total, setTotal] = useState<string>("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [verified, setVerified] = useState(false);
  const [ocrRawData, setOcrRawData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Full = e.target?.result as string;
      setPhotoPreview(base64Full);
      setStep("processing");

      try {
        const base64Data = base64Full.split(",")[1];
        const res = await fetch("/api/public/invoices/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64: base64Data,
            fileName: file.name,
            contentType: file.type,
          }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        setPhotoUrl(data.photoUrl);
        setPhotoKey(data.photoKey);

        if (data.ocrData) {
          setOcrRawData(data.ocrData);
          if (data.ocrData.vendorName) {
            const matched = KNOWN_VENDORS.find(
              (v) => v.toLowerCase() === data.ocrData.vendorName.toLowerCase()
            );
            if (matched && matched !== "Other") {
              setVendorName(matched);
            } else {
              setVendorName("Other");
              setCustomVendor(data.ocrData.vendorName);
            }
          }
          if (data.ocrData.invoiceNumber) setInvoiceNumber(data.ocrData.invoiceNumber);
          if (data.ocrData.invoiceDate) setInvoiceDate(data.ocrData.invoiceDate);
          if (data.ocrData.lineItems?.length) setLineItems(data.ocrData.lineItems);
          if (data.ocrData.subtotal != null) setSubtotal(String(data.ocrData.subtotal));
          if (data.ocrData.tax != null) setTax(String(data.ocrData.tax));
          if (data.ocrData.total != null) setTotal(String(data.ocrData.total));
          toast.success("Invoice data extracted successfully");
        } else {
          toast.info("Photo uploaded — please fill in the details manually");
        }
        setStep("review");
      } catch (err) {
        console.error("Upload error:", err);
        toast.error("Failed to upload photo. Please try again.");
        setStep("capture");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    const finalVendor = vendorName === "Other" ? customVendor : vendorName;
    if (!finalVendor) {
      toast.error("Please select a vendor");
      return;
    }
    if (!verifiedBy.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!verified) {
      toast.error("Please check the verification box");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/public/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeCode,
          vendorName: finalVendor,
          invoiceNumber: invoiceNumber || null,
          invoiceDate: invoiceDate || null,
          lineItems: lineItems.length > 0 ? lineItems : null,
          subtotal: subtotal ? parseFloat(subtotal) : null,
          tax: tax ? parseFloat(tax) : null,
          total: total ? parseFloat(total) : null,
          photoUrl,
          photoKey,
          ocrRawData,
          verifiedBy: verifiedBy.trim(),
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Invoice submitted successfully!");
      setStep("success");
    } catch (err) {
      console.error("Submit error:", err);
      toast.error("Failed to submit invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("capture");
    setPhotoPreview(null);
    setPhotoUrl("");
    setPhotoKey("");
    setVendorName("");
    setCustomVendor("");
    setInvoiceNumber("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    setLineItems([]);
    setSubtotal("");
    setTax("");
    setTotal("");
    setVerifiedBy("");
    setNotes("");
    setVerified(false);
    setOcrRawData(null);
  };

  // ─── Capture Step ───
  if (step === "capture") {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold">Invoice Capture</h2>
            <p className="text-sm text-muted-foreground">{storeName}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          Take a clear photo of the delivery invoice. The system will automatically extract the vendor, items, and totals.
        </div>

        <div className="space-y-3">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <Button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full h-32 flex flex-col gap-2 bg-[#1C1210] hover:bg-[#2a1e1a] text-white"
            size="lg"
          >
            <Camera className="w-8 h-8" />
            <span className="text-lg font-medium">Take Photo</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            variant="outline"
            className="w-full h-16 flex gap-2"
            size="lg"
          >
            <Upload className="w-5 h-5" />
            <span>Upload from Gallery</span>
          </Button>
        </div>
      </div>
    );
  }

  // ─── Processing Step ───
  if (step === "processing") {
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[400px] gap-4">
        {photoPreview && (
          <img src={photoPreview} alt="Invoice" className="w-48 h-48 object-cover rounded-xl opacity-50" />
        )}
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A853]" />
        <div className="text-center">
          <p className="font-medium">Processing Invoice...</p>
          <p className="text-sm text-muted-foreground">Uploading photo and extracting data</p>
        </div>
      </div>
    );
  }

  // ─── Success Step ───
  if (step === "success") {
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-semibold">Invoice Submitted!</h3>
        <p className="text-muted-foreground text-center">
          The invoice has been verified and saved. Accounting will be able to review it.
        </p>
        <div className="flex gap-3 mt-4">
          <Button onClick={resetForm} className="bg-[#1C1210] hover:bg-[#2a1e1a] text-white">
            Scan Another Invoice
          </Button>
          <Button onClick={onBack} variant="outline">
            Back to Menu
          </Button>
        </div>
      </div>
    );
  }

  // ─── Review Step ───
  return (
    <div className="max-w-lg mx-auto p-4 space-y-5 pb-24">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep("capture")} className="p-2 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-semibold">Review Invoice</h2>
          <p className="text-sm text-muted-foreground">Verify the extracted data below</p>
        </div>
      </div>

      {photoPreview && (
        <div className="relative">
          <img src={photoPreview} alt="Invoice" className="w-full max-h-48 object-contain rounded-xl border" />
          <button
            onClick={() => { setStep("capture"); setPhotoPreview(null); }}
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow hover:bg-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Vendor *</Label>
        <Select value={vendorName} onValueChange={setVendorName}>
          <SelectTrigger>
            <SelectValue placeholder="Select vendor" />
          </SelectTrigger>
          <SelectContent>
            {KNOWN_VENDORS.map((v) => (
              <SelectItem key={v} value={v}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {vendorName === "Other" && (
          <Input
            placeholder="Enter vendor name"
            value={customVendor}
            onChange={(e) => setCustomVendor(e.target.value)}
            className="mt-1"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Invoice #</Label>
          <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
      </div>

      {lineItems.length > 0 && (
        <div className="space-y-2">
          <Label>Line Items (from OCR)</Label>
          <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
            {lineItems.map((item, i) => (
              <div key={i} className="px-3 py-2 text-sm flex justify-between">
                <span className="flex-1 truncate">{item.description}</span>
                <span className="text-muted-foreground ml-2">
                  {item.quantity != null && `${item.quantity}x `}
                  {item.total != null ? `$${item.total.toFixed(2)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label>Subtotal</Label>
          <Input type="number" step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} placeholder="$0.00" />
        </div>
        <div className="space-y-1.5">
          <Label>Tax</Label>
          <Input type="number" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} placeholder="$0.00" />
        </div>
        <div className="space-y-1.5">
          <Label>Total</Label>
          <Input type="number" step="0.01" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="$0.00" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Your Name *</Label>
        <Input
          value={verifiedBy}
          onChange={(e) => setVerifiedBy(e.target.value)}
          placeholder="Enter your full name"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any discrepancies or comments..."
          rows={2}
        />
      </div>

      <label className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50">
        <input
          type="checkbox"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
          className="mt-0.5 w-5 h-5 accent-[#D4A853]"
        />
        <span className="text-sm">
          I, <strong>{verifiedBy || "___"}</strong>, verify that this invoice is correct and the items have been received.
        </span>
      </label>

      <Button
        onClick={handleSubmit}
        disabled={submitting || !verified || !verifiedBy.trim() || !(vendorName === "Other" ? customVendor : vendorName)}
        className="w-full h-12 bg-[#1C1210] hover:bg-[#2a1e1a] text-white"
        size="lg"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          "Submit Verified Invoice"
        )}
      </Button>
    </div>
  );
}
