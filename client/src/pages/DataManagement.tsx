// Design: "Golden Hour Operations" — Refined Editorial
// Data Management: Upload MYR CSV exports, manage uploaded data, view parsing results
import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import {
  Upload, FileText, Trash2, CheckCircle2, AlertTriangle, XCircle,
  Database, RefreshCw, HardDrive, Info,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useData } from "@/contexts/DataContext";
import { parseCSV, type ReportType } from "@/lib/csv-parser";
import { stores } from "@/lib/data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const reportTypeLabels: Record<ReportType, string> = {
  net: "Net / Sales Report",
  breakdown: "Breakdown Report",
  labour: "Labour Report",
  unknown: "Unknown Format",
};

const reportTypeColors: Record<ReportType, string> = {
  net: "bg-emerald-100 text-emerald-700",
  breakdown: "bg-blue-100 text-blue-700",
  labour: "bg-amber-100 text-amber-700",
  unknown: "bg-red-100 text-red-700",
};

export default function DataManagement() {
  const { uploads, addUpload, removeUpload, clearAllUploads, lastUpdated, hasLiveData } = useData();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedStore, setSelectedStore] = useState(stores[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    async (file: File) => {
      const storeName = stores.find((s) => s.id === selectedStore)?.name ?? selectedStore;

      const text = await file.text();
      const result = parseCSV(text, file.name, storeName);

      addUpload(result);

      if (result.error) {
        toast.error("Upload issue", { description: result.error });
      } else {
        toast.success("Data uploaded", {
          description: `${reportTypeLabels[result.type]} for ${storeName} processed successfully.`,
        });
      }
    },
    [selectedStore, addUpload]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setIsProcessing(true);
      for (const file of Array.from(files)) {
        if (file.name.endsWith(".csv") || file.type === "text/csv") {
          await processFile(file);
        } else {
          toast.error("Invalid file", { description: `${file.name} is not a CSV file.` });
        }
      }
      setIsProcessing(false);
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#D4A853] uppercase tracking-[0.2em] font-medium">Data Integration</p>
            <h2 className="text-2xl font-serif text-foreground mt-1">Data Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Upload CSV exports from MYR POS to populate the dashboard with real data
            </p>
          </div>
          {hasLiveData && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-emerald-700 font-medium">Live Data Active</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* How It Works */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#D4A853]" />
            <h3 className="font-serif text-base text-foreground">How It Works</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4A853]/10 flex items-center justify-center shrink-0 text-sm font-serif text-[#D4A853]">1</div>
              <div>
                <p className="text-sm font-medium text-foreground">Export from MYR</p>
                <p className="text-xs text-muted-foreground mt-0.5">Log into your MYR back office, go to Reports, select the report type and date range, then click "Export CSV".</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4A853]/10 flex items-center justify-center shrink-0 text-sm font-serif text-[#D4A853]">2</div>
              <div>
                <p className="text-sm font-medium text-foreground">Select Store & Upload</p>
                <p className="text-xs text-muted-foreground mt-0.5">Choose which store the data belongs to, then drag and drop the CSV file below. The parser will auto-detect the report type.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#D4A853]/10 flex items-center justify-center shrink-0 text-sm font-serif text-[#D4A853]">3</div>
              <div>
                <p className="text-sm font-medium text-foreground">Dashboard Updates</p>
                <p className="text-xs text-muted-foreground mt-0.5">All dashboard pages will automatically update with the real data. Upload data for all 4 stores for the most complete view.</p>
              </div>
            </div>
          </div>
          {/* Sample Files */}
          <div className="mt-4 pt-3 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Try with sample files</p>
            <div className="flex flex-wrap gap-2">
              <a href="/sample-net-report.csv" download className="text-xs text-[#D4A853] hover:underline px-2 py-1 rounded bg-[#D4A853]/5 border border-[#D4A853]/20">Net Report</a>
              <a href="/sample-labour-report.csv" download className="text-xs text-[#D4A853] hover:underline px-2 py-1 rounded bg-[#D4A853]/5 border border-[#D4A853]/20">Labour Report</a>
              <a href="/sample-breakdown-report.csv" download className="text-xs text-[#D4A853] hover:underline px-2 py-1 rounded bg-[#D4A853]/5 border border-[#D4A853]/20">Breakdown Report</a>
            </div>
          </div>
        </motion.div>

        {/* Store Selector + Upload Zone */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Store Selector */}
          <div className="bg-card rounded-xl border border-border/60 p-5">
            <h3 className="font-serif text-base text-foreground mb-3">Select Store</h3>
            <div className="space-y-2">
              {stores.map((store) => {
                const storeUploads = uploads.filter((u) =>
                  u.storeName.toLowerCase().includes(store.name.toLowerCase()) ||
                  u.storeName.toLowerCase() === store.shortName.toLowerCase()
                );
                return (
                  <button
                    key={store.id}
                    onClick={() => setSelectedStore(store.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-all text-left",
                      selectedStore === store.id
                        ? "border-[#D4A853] bg-[#D4A853]/5 ring-1 ring-[#D4A853]/30"
                        : "border-border/60 hover:border-border"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ background: store.color }} />
                      <div>
                        <p className="text-sm font-medium text-foreground">{store.name}</p>
                        <p className="text-[10px] text-muted-foreground">{store.shortName}</p>
                      </div>
                    </div>
                    {storeUploads.length > 0 && (
                      <span className="text-[10px] font-mono bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                        {storeUploads.length} file{storeUploads.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Supported Reports */}
            <div className="mt-5 pt-4 border-t border-border/60">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Supported Report Types</p>
              <div className="space-y-1.5">
                {[
                  { label: "Net Report", desc: "Sales totals by date" },
                  { label: "Breakdown Report", desc: "Items sold with quantities" },
                  { label: "Labour Report", desc: "Employee hours & costs" },
                ].map((r) => (
                  <div key={r.label} className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="text-foreground">{r.label}</span>
                    <span className="text-muted-foreground">— {r.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upload Zone */}
          <div className="lg:col-span-2">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "relative rounded-xl border-2 border-dashed p-10 text-center transition-all cursor-pointer",
                isDragging
                  ? "border-[#D4A853] bg-[#D4A853]/5"
                  : "border-border/60 hover:border-[#D4A853]/50 hover:bg-muted/30",
                isProcessing && "pointer-events-none opacity-60"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
              <div className="flex flex-col items-center gap-3">
                {isProcessing ? (
                  <RefreshCw className="w-10 h-10 text-[#D4A853] animate-spin" />
                ) : (
                  <Upload className="w-10 h-10 text-[#D4A853]/60" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {isProcessing ? "Processing..." : "Drop CSV files here or click to browse"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploading for: <span className="font-medium text-[#D4A853]">{stores.find((s) => s.id === selectedStore)?.name}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Accepts .csv files exported from MYR Back Office
                  </p>
                </div>
              </div>
            </div>

            {/* Data Freshness */}
            {lastUpdated && (
              <div className="mt-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <HardDrive className="w-3 h-3" />
                  Data stored locally in your browser
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">
                  Last updated: {new Date(lastUpdated).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Uploaded Files List */}
        {uploads.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 overflow-hidden">
            <div className="p-5 border-b border-border/60 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg text-foreground">Uploaded Data</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{uploads.length} file{uploads.length > 1 ? "s" : ""} uploaded</p>
              </div>
              <button
                onClick={() => {
                  clearAllUploads();
                  toast.info("All data cleared", { description: "Dashboard will show demo data until new files are uploaded." });
                }}
                className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            </div>
            <div className="divide-y divide-border/40">
              {uploads.map((upload) => (
                <div key={upload.fileName} className="px-5 py-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{upload.fileName}</p>
                        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", reportTypeColors[upload.type])}>
                          {reportTypeLabels[upload.type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{upload.storeName}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(upload.uploadedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </span>
                        {upload.error && (
                          <span className="flex items-center gap-1 text-[10px] text-red-500">
                            <AlertTriangle className="w-3 h-3" />
                            {upload.error}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Summary stats */}
                    {upload.net && (
                      <div className="text-right">
                        <p className="text-xs font-mono text-foreground">${upload.net.totalSales.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{upload.net.totalOrders} orders</p>
                      </div>
                    )}
                    {upload.labour && (
                      <div className="text-right">
                        <p className="text-xs font-mono text-foreground">${upload.labour.totalCost.toLocaleString()}</p>
                        <p className="text-[10px] text-muted-foreground">{upload.labour.totalHours.toFixed(0)} hours</p>
                      </div>
                    )}
                    {upload.breakdown && (
                      <div className="text-right">
                        <p className="text-xs font-mono text-foreground">{upload.breakdown.items.length} items</p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        removeUpload(upload.fileName);
                        toast.info("File removed");
                      }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {uploads.length === 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-card rounded-xl border border-border/60 p-10 text-center">
            <Database className="w-12 h-12 text-muted-foreground/30 mx-auto" />
            <h3 className="font-serif text-lg text-foreground mt-4">No Data Uploaded Yet</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              The dashboard is currently showing demo data. Upload CSV exports from your MYR POS back office to see your real sales and labour figures.
            </p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
