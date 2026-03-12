import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";

type ReportPayload = {
  submitterName: string;
  reportType: string;
  location: string;
  reportDate: string;
  data: any;
  totalScore?: string | null;
  overwrite?: boolean;
};

type DuplicateInfo = {
  message: string;
  existing: { submitterName: string; submittedAt: string };
  pendingPayload: ReportPayload;
  onSuccess: () => void;
  onError: (msg: string) => void;
  setSubmitting: (v: boolean) => void;
};

/**
 * Submit a report to the public endpoint.
 * When overwrite is false and a duplicate exists, the server returns 409.
 * When overwrite is true, it replaces the existing report.
 */
export async function submitReport(payload: ReportPayload) {
  const res = await fetch("/api/public/submit-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 409) {
    const body = await res.json();
    const err: any = new Error("Duplicate report");
    err.isDuplicate = true;
    err.duplicateMessage = body.message;
    err.existing = body.existing;
    throw err;
  }
  if (!res.ok) throw new Error("Failed to submit");
  return res.json();
}

/**
 * Hook that provides duplicate-aware submission.
 * First attempts with overwrite:false. If 409, shows a confirmation dialog.
 * User can confirm to overwrite or cancel.
 */
export function useDuplicateReportCheck() {
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateInfo | null>(null);

  async function submitWithCheck(
    payload: Omit<ReportPayload, "overwrite">,
    onSuccess: () => void,
    onError: (msg: string) => void,
    setSubmitting: (v: boolean) => void,
  ) {
    setSubmitting(true);
    try {
      await submitReport({ ...payload, overwrite: false });
      onSuccess();
      setSubmitting(false);
    } catch (err: any) {
      if (err?.isDuplicate) {
        setSubmitting(false);
        setDuplicateInfo({
          message: err.duplicateMessage,
          existing: err.existing,
          pendingPayload: { ...payload, overwrite: true },
          onSuccess,
          onError,
          setSubmitting,
        });
        return;
      }
      onError(err?.message || "Failed to submit");
      setSubmitting(false);
    }
  }

  async function confirmOverwrite() {
    if (!duplicateInfo) return;
    const { pendingPayload, onSuccess, onError, setSubmitting } = duplicateInfo;
    setDuplicateInfo(null);
    setSubmitting(true);
    try {
      await submitReport(pendingPayload);
      onSuccess();
    } catch {
      onError("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  const duplicateDialog = duplicateInfo ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDuplicateInfo(null)}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Duplicate Report Found</h3>
        </div>
        <p className="text-sm text-gray-600">{duplicateInfo.message}</p>
        {duplicateInfo.existing && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <p className="text-gray-700"><strong>Previously submitted by:</strong> {duplicateInfo.existing.submitterName}</p>
            {duplicateInfo.existing.submittedAt && (
              <p className="text-gray-500 mt-1">Submitted: {new Date(duplicateInfo.existing.submittedAt).toLocaleString()}</p>
            )}
          </div>
        )}
        <p className="text-sm text-gray-500">Do you want to overwrite the existing submission?</p>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={() => setDuplicateInfo(null)}>Cancel</Button>
          <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" onClick={confirmOverwrite}>Overwrite</Button>
        </div>
      </div>
    </div>
  ) : null;

  return { submitWithCheck, duplicateDialog };
}
