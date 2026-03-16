/**
 * Invoice Capture — Unified multi-page flow
 * Flow: Add page(s) → "Analyze Invoice" → AI extracts from ALL pages → Review/edit → Submit
 * No single vs multi-page toggle — same flow whether 1 page or 10.
 */
import { useState, useRef, useCallback } from "react";
import {
  Camera, Upload, Loader2, CheckCircle2, ArrowLeft, X, Plus,
  Image, GripVertical, Sparkles, FileText,
} from "lucide-react";
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

interface PhotoEntry {
  preview: string;
  url: string;
  key: string;
}

interface InvoiceCapturePortalProps {
  storeCode: string;
  storeName: string;
  onBack: () => void;
}

type Step = "capture" | "uploading" | "analyzing" | "review" | "success";

export default function InvoiceCapturePortal({ storeCode, storeName, onBack }: InvoiceCapturePortalProps) {
  const [step, setStep] = useState<Step>("capture");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Form fields (populated by AI analysis)
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

  // Upload a single photo to S3 (no OCR yet)
  const uploadPhoto = async (file: File): Promise<PhotoEntry | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large (max 10MB)");
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Full = e.target?.result as string;
        try {
          const base64Data = base64Full.split(",")[1];
          const res = await fetch("/api/public/invoices/upload-photo", {
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
          resolve({
            preview: base64Full,
            url: data.photoUrl,
            key: data.photoKey,
          });
        } catch (err) {
          console.error("Upload error:", err);
          toast.error("Failed to upload photo. Please try again.");
          resolve(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Handle adding a photo (first or subsequent)
  const handleAddPhoto = useCallback(async (file: File) => {
    setUploadingPhoto(true);
    const result = await uploadPhoto(file);
    if (result) {
      setPhotos((prev) => [...prev, result]);
      toast.success(`Page ${photos.length + 1} added`);
    }
    setUploadingPhoto(false);
  }, [photos.length]);

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Move photo up/down for reordering
  const movePhoto = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= photos.length) return;
    setPhotos((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
  };

  // Analyze all pages with AI
  const handleAnalyze = async () => {
    if (photos.length === 0) {
      toast.error("Please add at least one page");
      return;
    }
    setStep("analyzing");
    try {
      const imageUrls = photos.map((p) => p.url);
      const res = await fetch("/api/public/invoices/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrls }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Analysis failed");

      const ocrData = data.ocrData;
      setOcrRawData(ocrData);

      if (ocrData) {
        if (ocrData.vendorName) {
          const matched = KNOWN_VENDORS.find(
            (v) => v.toLowerCase() === ocrData.vendorName.toLowerCase()
          );
          if (matched && matched !== "Other") {
            setVendorName(matched);
          } else {
            setVendorName("Other");
            setCustomVendor(ocrData.vendorName);
          }
        }
        if (ocrData.invoiceNumber) setInvoiceNumber(ocrData.invoiceNumber);
        if (ocrData.invoiceDate) setInvoiceDate(ocrData.invoiceDate);
        if (ocrData.lineItems?.length) setLineItems(ocrData.lineItems);
        if (ocrData.subtotal != null) setSubtotal(String(ocrData.subtotal));
        if (ocrData.tax != null) setTax(String(ocrData.tax));
        if (ocrData.total != null) setTotal(String(ocrData.total));
        toast.success(`Invoice analyzed — ${photos.length} page${photos.length > 1 ? "s" : ""} processed`);
      } else {
        toast.info("Analysis complete — please fill in the details manually");
      }
      setStep("review");
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error("Failed to analyze invoice. Please try again.");
      setStep("capture");
    }
  };

  const handleSubmit = async () => {
    const finalVendor = vendorName === "Other" ? customVendor : vendorName;
    if (!finalVendor) {
      toast.error("Please select a vendor");
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error("Invoice number is required");
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
      const photoUrls = photos.map((p) => ({ url: p.url, key: p.key }));
      const res = await fetch("/api/public/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeCode,
          vendorName: finalVendor,
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate: invoiceDate || null,
          lineItems: lineItems.length > 0 ? lineItems : null,
          subtotal: subtotal ? parseFloat(subtotal) : null,
          tax: tax ? parseFloat(tax) : null,
          total: total ? parseFloat(total) : null,
          photoUrl: photos[0].url,
          photoUrls,
          photoKey: photos[0].key,
          ocrRawData,
          verifiedBy: verifiedBy.trim(),
          notes: notes || null,
          category: "cogs",
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
    setPhotos([]);
    setUploadingPhoto(false);
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

  // ─── Capture Step: Add pages, then analyze ───
  if (step === "capture") {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold">Invoice Capture</h2>
            <p className="text-sm text-muted-foreground">{storeName} — Cost of Goods Sold</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          <strong>How it works:</strong> Take photos of each page of the invoice, then tap <strong>"Analyze Invoice"</strong>. The AI will read all pages together and extract the details automatically.
        </div>

        {/* Photo thumbnails filmstrip */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Pages Added ({photos.length})
            </Label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((photo, i) => (
                <div
                  key={i}
                  className="relative flex-shrink-0 w-[100px] h-[130px] rounded-lg overflow-hidden border-2 border-border bg-white shadow-sm group"
                >
                  <img
                    src={photo.preview}
                    alt={`Page ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* Page number badge */}
                  <div className="absolute top-0 left-0 bg-[#1C1210]/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-br-lg">
                    {i + 1}
                  </div>
                  {/* Reorder + delete controls */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-0.5">
                      {i > 0 && (
                        <button
                          onClick={() => movePhoto(i, i - 1)}
                          className="p-0.5 text-white/80 hover:text-white"
                          title="Move left"
                        >
                          <GripVertical className="w-3 h-3 rotate-90" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => removePhoto(i)}
                      className="p-0.5 text-red-300 hover:text-red-400"
                      title="Remove page"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Always-visible delete on mobile */}
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-0 right-0 p-1 bg-red-500/80 text-white rounded-bl-lg md:hidden"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {/* Uploading placeholder */}
              {uploadingPhoto && (
                <div className="flex-shrink-0 w-[100px] h-[130px] rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add page buttons */}
        <div className="space-y-3">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) handleAddPhoto(e.target.files[0]);
              e.target.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (files) {
                Array.from(files).forEach((f) => handleAddPhoto(f));
              }
              e.target.value = "";
            }}
          />

          {photos.length === 0 ? (
            <>
              {/* First photo — big prominent buttons */}
              <Button
                onClick={() => cameraInputRef.current?.click()}
                className="w-full h-28 flex flex-col gap-2 bg-[#1C1210] hover:bg-[#2a1e1a] text-white"
                size="lg"
                disabled={uploadingPhoto}
              >
                <Camera className="w-7 h-7" />
                <span className="text-base font-medium">Take Photo of Invoice</span>
              </Button>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full h-14 flex gap-2"
                size="lg"
                disabled={uploadingPhoto}
              >
                <Upload className="w-5 h-5" />
                <span>Upload from Gallery</span>
              </Button>
            </>
          ) : (
            <>
              {/* Subsequent pages — smaller "add more" buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => cameraInputRef.current?.click()}
                  variant="outline"
                  className="h-12 flex gap-2"
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  <span className="text-sm">Add Page</span>
                </Button>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="h-12 flex gap-2"
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span className="text-sm">Upload Page</span>
                </Button>
              </div>

              {/* Analyze button */}
              <Button
                onClick={handleAnalyze}
                className="w-full h-14 bg-[#D4A853] hover:bg-[#c49a48] text-[#1C1210] font-semibold text-base"
                size="lg"
                disabled={uploadingPhoto}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Analyze Invoice ({photos.length} page{photos.length > 1 ? "s" : ""})
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── Uploading Step ───
  if (step === "uploading") {
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A853]" />
        <div className="text-center">
          <p className="font-medium">Uploading Photos...</p>
          <p className="text-sm text-muted-foreground">Please wait while we upload your pages</p>
        </div>
      </div>
    );
  }

  // ─── Analyzing Step ───
  if (step === "analyzing") {
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="relative">
          <Sparkles className="w-10 h-10 text-[#D4A853] animate-pulse" />
        </div>
        <div className="text-center">
          <p className="font-medium text-lg">Analyzing Invoice...</p>
          <p className="text-sm text-muted-foreground mt-1">
            AI is reading {photos.length} page{photos.length > 1 ? "s" : ""} and extracting data
          </p>
          <p className="text-xs text-muted-foreground mt-3">This may take a few seconds</p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-2" />
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
          The invoice ({photos.length} page{photos.length > 1 ? "s" : ""}) has been recorded as <strong>Cost of Goods Sold</strong> and saved.
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

      {/* Photo Gallery */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Pages ({photos.length})</Label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {photos.map((photo, i) => (
            <div key={i} className="relative flex-shrink-0 w-20 h-24 rounded-lg overflow-hidden border">
              <img src={photo.preview} alt={`Page ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute top-0 left-0 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-br">
                {i + 1}
              </div>
            </div>
          ))}
        </div>
      </div>

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
          <Label>Invoice # *</Label>
          <Input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            placeholder="Required"
            className={!invoiceNumber.trim() ? "border-red-300" : ""}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Date</Label>
          <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
        </div>
      </div>

      {lineItems.length > 0 && (
        <div className="space-y-2">
          <Label>Line Items ({lineItems.length} extracted)</Label>
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

      {/* COGS Category Label */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200">
        <Image className="w-4 h-4 text-blue-600" />
        <span className="text-sm text-blue-800">
          This invoice will be recorded as <strong>Cost of Goods Sold (COGS)</strong>
        </span>
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
        disabled={submitting || !verified || !verifiedBy.trim() || !invoiceNumber.trim() || !(vendorName === "Other" ? customVendor : vendorName)}
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
