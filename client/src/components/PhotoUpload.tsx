/**
 * PhotoUpload — Reusable photo capture/upload component for checklist forms.
 * Supports camera capture and photo library on mobile, file picker on desktop.
 * Uploads to S3 via /api/public/upload-photo and returns URLs.
 */
import { useState, useRef, useCallback } from "react";
import { Camera, ImagePlus, X, Loader2, RotateCcw, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export interface UploadedPhoto {
  id: string;
  url: string;
  fileName: string;
  status: "uploading" | "success" | "error";
  previewUrl?: string;
  error?: string;
}

interface PhotoUploadProps {
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  maxPhotos?: number;
  label?: string;
  sectionLabel?: string;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 12);
}

async function uploadPhotoToServer(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const resp = await fetch("/api/public/upload-photo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            base64,
            fileName: file.name,
            contentType: file.type,
          }),
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: "Upload failed" }));
          throw new Error(err.error || "Upload failed");
        }
        const data = await resp.json();
        resolve(data.url);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function PhotoUpload({
  photos,
  onChange,
  maxPhotos = 10,
  label = "Photos",
  sectionLabel,
}: PhotoUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Use a ref to always have the latest photos for async callbacks
  const photosRef = useRef(photos);
  photosRef.current = photos;

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      const remaining = maxPhotos - photosRef.current.length;
      const filesToProcess = Array.from(files).slice(0, remaining);

      // Create pending entries with local preview
      const newPhotos: UploadedPhoto[] = filesToProcess.map((file) => ({
        id: generateId(),
        url: "",
        fileName: file.name,
        status: "uploading" as const,
        previewUrl: URL.createObjectURL(file),
      }));

      const updated = [...photosRef.current, ...newPhotos];
      onChange(updated);

      // Upload each file sequentially
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        const photoId = newPhotos[i].id;
        try {
          const url = await uploadPhotoToServer(file);
          const latest = photosRef.current.map((p) =>
            p.id === photoId ? { ...p, url, status: "success" as const } : p
          );
          onChange(latest);
        } catch (err) {
          const latest = photosRef.current.map((p) =>
            p.id === photoId
              ? {
                  ...p,
                  status: "error" as const,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : p
          );
          onChange(latest);
        }
      }
    },
    [onChange, maxPhotos]
  );

  const removePhoto = useCallback(
    (id: string) => {
      const photo = photosRef.current.find((p) => p.id === id);
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl);
      onChange(photosRef.current.filter((p) => p.id !== id));
    },
    [onChange]
  );

  const retryPhoto = useCallback(
    async (id: string) => {
      const photo = photosRef.current.find((p) => p.id === id);
      if (!photo || !photo.previewUrl) return;

      onChange(
        photosRef.current.map((p) =>
          p.id === id ? { ...p, status: "uploading" as const, error: undefined } : p
        )
      );

      try {
        const resp = await fetch(photo.previewUrl);
        const blob = await resp.blob();
        const file = new File([blob], photo.fileName, { type: blob.type });
        const url = await uploadPhotoToServer(file);
        const latest = photosRef.current.map((p) =>
          p.id === id ? { ...p, url, status: "success" as const } : p
        );
        onChange(latest);
      } catch (err) {
        const latest = photosRef.current.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "error" as const,
                error: err instanceof Error ? err.message : "Upload failed",
              }
            : p
        );
        onChange(latest);
      }
    },
    [onChange]
  );

  const canAddMore = photos.length < maxPhotos;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {sectionLabel ? `${sectionLabel} — ${label}` : label}
        </label>
        <span className="text-xs text-muted-foreground">
          {photos.length}/{maxPhotos}
        </span>
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted group"
            >
              <img
                src={photo.previewUrl || photo.url}
                alt={photo.fileName}
                className="w-full h-full object-cover"
              />

              {/* Loading overlay */}
              {photo.status === "uploading" && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}

              {/* Error overlay */}
              {photo.status === "error" && (
                <div className="absolute inset-0 bg-red-500/40 flex flex-col items-center justify-center gap-1">
                  <span className="text-white text-[10px] font-medium">Failed</span>
                  <button
                    type="button"
                    onClick={() => retryPhoto(photo.id)}
                    className="p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              )}

              {/* Actions overlay */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {photo.status === "success" && (
                  <button
                    type="button"
                    onClick={() => setPreviewUrl(photo.url || photo.previewUrl || null)}
                    className="p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                  >
                    <ZoomIn className="w-3 h-3 text-white" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="p-1 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload buttons */}
      {canAddMore && (
        <div className="flex gap-2">
          {/* Camera button */}
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed",
              "border-border hover:border-[#D4A853]/50 hover:bg-[#D4A853]/5 transition-colors",
              "text-sm text-muted-foreground hover:text-foreground"
            )}
          >
            <Camera className="w-4 h-4" />
            <span>Camera</span>
          </button>

          {/* Gallery button */}
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed",
              "border-border hover:border-[#D4A853]/50 hover:bg-[#D4A853]/5 transition-colors",
              "text-sm text-muted-foreground hover:text-foreground"
            )}
          >
            <ImagePlus className="w-4 h-4" />
            <span>Gallery</span>
          </button>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      )}

      {/* Full-size preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Full size preview"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * PhotoGallery — Read-only display of uploaded photos (for report detail views)
 */
export function PhotoGallery({ photos, label }: { photos: string[]; label?: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  if (!photos || photos.length === 0) return null;

  return (
    <div className="space-y-2">
      {label && (
        <h4 className="text-sm font-medium text-foreground">{label}</h4>
      )}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setPreviewUrl(url)}
            className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted hover:ring-2 hover:ring-[#D4A853]/50 transition-all cursor-pointer"
          >
            <img
              src={url}
              alt={`Photo ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Full size preview"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
