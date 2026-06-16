"use client";
import { useRef, useState, useEffect } from "react";
import { X, RotateCcw, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { usePhotosStore } from "@/stores/photosStore";
import { useUploadStore } from "@/stores/uploadStore";
import { compressImage, createThumbnail, generateId, getCurrentLocation } from "@/lib/imageUtils";
import type { PhotoRecord } from "@/types";
import { toast } from "sonner";

interface Props { onClose: () => void; }

export function CameraCapture({ onClose }: Props) {
  const { videoRef, isActive, error, start, stop, capture, flipCamera, facingMode } = useCamera();
  const { addPhoto } = usePhotosStore();
  const { enqueue } = useUploadStore();
  const [capturing, setCapturing] = useState(false);
  const [capturedCount, setCapturedCount] = useState(0);
  const [recentThumb, setRecentThumb] = useState<string | null>(null);
  const captureCountRef = useRef(0);

  useEffect(() => {
    start();
  }, [start]);

  const handleCapture = async () => {
    if (capturing) return;
    setCapturing(true);

    try {
      const blob = await capture();
      if (!blob) return;

      const thumbnail = await createThumbnail(blob);
      // Compress the raw 4K PNG to a high-quality 1920px JPEG to ensure lightning-fast uploads
      const compressed = await compressImage(blob, 1920, 0.85);

      const location = await getCurrentLocation();
      const id = generateId();
      const now = Date.now();
      captureCountRef.current += 1;

      const photo: PhotoRecord = {
        id,
        title: `Photo ${captureCountRef.current}`,
        comment: "",
        location,
        createdAt: now,
        syncStatus: "pending",
        order: now,
        imageBlob: compressed,
        thumbnailBlob: thumbnail,
      };

      await addPhoto(photo);

      // Queue upload
      enqueue(id, compressed, `reports/photos/${id}.jpg`);

      // Show thumbnail flash
      const thumbUrl = URL.createObjectURL(thumbnail);
      setRecentThumb(thumbUrl);
      setTimeout(() => {
        URL.revokeObjectURL(thumbUrl);
        setRecentThumb(null);
      }, 1800);

      setCapturedCount((c) => c + 1);
      toast.success("Photo captured!");
    } catch {
      toast.error("Failed to capture photo");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
      {/* ── Top bar ── */}
      <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-4 pt-12 pb-4 bg-gradient-to-b from-black/70 to-transparent safe-top">
        <button onClick={onClose} className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
        {capturedCount > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/80 backdrop-blur">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-semibold text-white">{capturedCount} captured</span>
          </div>
        )}
        <button onClick={flipCamera} className="w-10 h-10 rounded-full glass flex items-center justify-center">
          <RotateCcw className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* ── Camera View ── */}
      <div className="flex-1 relative overflow-hidden">
        {!isActive && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center">
              <Zap className="w-9 h-9 text-white/30" />
            </div>
            <p className="text-white/50 text-sm">Starting camera…</p>
            <button
              onClick={start}
              className="mt-2 px-6 py-3 rounded-full gradient-primary text-white text-sm font-semibold"
            >
              Allow Camera
            </button>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white/70 text-sm text-center px-8">{error}</p>
            <button onClick={start} className="px-6 py-3 rounded-full bg-white/10 text-white text-sm">Retry</button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={async () => { if (!isActive) await start(); }}
          className="w-full h-full object-cover"
          style={{ display: isActive ? "block" : "none" }}
        />

        {/* Viewfinder corners */}
        {isActive && (
          <div className="absolute inset-8 pointer-events-none">
            {["top-0 left-0 border-t border-l", "top-0 right-0 border-t border-r", "bottom-0 left-0 border-b border-l", "bottom-0 right-0 border-b border-r"].map((cls, i) => (
              <div key={i} className={`absolute w-8 h-8 border-2 border-white/60 ${cls} rounded-sm`} />
            ))}
          </div>
        )}
      </div>

      {/* ── Bottom Controls ── */}
      <div className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-8 px-8 pb-14 pt-8 bg-gradient-to-t from-black/80 to-transparent safe-bottom">
        {/* Recent thumbnail */}
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/10 border border-white/20">
          {recentThumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={recentThumb} alt="last" className="w-full h-full object-cover animate-scale-in" />
          )}
        </div>

        {/* Shutter */}
        <button
          onClick={handleCapture}
          disabled={!isActive || capturing}
          className="relative flex items-center justify-center w-20 h-20 disabled:opacity-50"
          aria-label="Capture photo"
        >
          <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-pulse-ring" />
          <div className={`w-20 h-20 rounded-full border-4 border-white transition-transform duration-100 ${capturing ? "scale-90 bg-white/20" : "bg-white"}`} />
        </button>

        {/* Done button */}
        <button
          onClick={() => { stop(); onClose(); }}
          className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center"
        >
          <CheckCircle className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Auto-start camera handled in useEffect */}
    </div>
  );
}
