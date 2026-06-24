"use client";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, Trash2, MapPin, Tag, Copy, Share2, FileText, RotateCw } from "lucide-react";
import { usePhotosStore } from "@/stores/photosStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useUploadStore } from "@/stores/uploadStore";
import type { PhotoMetadata } from "@/types";
import { generateId, rotateImageBlob, createThumbnail } from "@/lib/imageUtils";
import { getPhoto } from "@/lib/db";
import { toast } from "sonner";

interface Props {
  photo: PhotoMetadata;
  onClose: () => void;
}

export function PhotoEditor({ photo: initialPhoto, onClose }: Props) {
  const { updatePhotoMeta, updatePhotoBlobs, removePhoto, addPhoto } = usePhotosStore();
  const storePhoto = usePhotosStore(state => state.photos.find(p => p.id === initialPhoto.id));
  const photo = storePhoto || initialPhoto;
  
  const { enqueue } = useUploadStore();
  const [title, setTitle] = useState(photo.title);
  const [comment, setComment] = useState(photo.comment);
  const [category, setCategory] = useState(photo.category || "");
  const [isRotating, setIsRotating] = useState(false);

  const handleSave = async () => {
    await updatePhotoMeta(photo.id, { title, comment, category });
    toast.success("Photo details saved");
    onClose();
  };

  const handleDelete = async () => {
    if (confirm("Delete this photo?")) {
      await removePhoto(photo.id);
      toast.success("Photo deleted");
      onClose();
    }
  };

  const handleDuplicate = async () => {
    try {
      const record = await getPhoto(photo.id);
      if (!record) throw new Error("Original not found");
      
      const newId = generateId();
      await addPhoto({
        ...record,
        id: newId,
        title: `${record.title} (Copy)`,
        createdAt: Date.now(),
        syncStatus: "pending",
        imageUrl: undefined, // Must re-upload
      });
      toast.success("Photo duplicated");
      onClose();
    } catch {
      toast.error("Failed to duplicate photo");
    }
  };

  const handleRotate = async () => {
    try {
      setIsRotating(true);
      const toastId = toast.loading("Rotating image...");
      
      const record = await getPhoto(photo.id);
      if (!record || !record.imageBlob) throw new Error("Image data not found");
      
      // Rotate the main blob
      const rotatedBlob = await rotateImageBlob(record.imageBlob);
      // Re-generate thumbnail from rotated blob
      const newThumbnail = await createThumbnail(rotatedBlob);
      
      // Update IndexedDB & Zustand store
      await updatePhotoBlobs(photo.id, rotatedBlob, newThumbnail);
      
      // Re-queue upload for the new rotated image
      enqueue(photo.id, rotatedBlob, `reports/photos/${photo.id}.jpg`);
      
      toast.success("Image rotated", { id: toastId });
    } catch (err) {
      toast.error("Failed to rotate image");
      console.error(err);
    } finally {
      setIsRotating(false);
    }
  };

  const handleShare = async () => {
    try {
      if (photo.localBlobUrl) {
        const response = await fetch(photo.localBlobUrl);
        const blob = await response.blob();
        const file = new File([blob], `${title || "photo"}.jpg`, { type: "image/jpeg" });
        
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: title,
            ...(comment ? { text: comment } : {}),
            files: [file],
          });
        } else {
          if (photo.imageUrl) {
            const text = encodeURIComponent(`*${title}*\n${comment || ""}\n${photo.imageUrl}`);
            window.open(`https://wa.me/?text=${text}`, "_blank");
          } else {
            toast.error("File sharing not supported on this device. Wait for upload to share link.");
          }
        }
      } else if (photo.imageUrl) {
        const text = encodeURIComponent(`*${title}*\n${comment || ""}\n${photo.imageUrl}`);
        window.open(`https://wa.me/?text=${text}`, "_blank");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        toast.error("Failed to share photo");
      }
    }
  };

  const handleQuickPPT = async () => {
    try {
      toast.loading("Generating PPT...", { id: "quick-ppt" });
      const { createDraft, buildSlides } = useReportsStore.getState();
      const draft = await createDraft({
        reportName: title || "Quick Report",
        projectName: "",
        inspectorName: "",
        clientName: "",
        reportDate: new Date().toLocaleDateString(),
      });
      // Layout 1 is usually 1 photo per slide (or similar)
      buildSlides([photo.id], 1);
      
      setTimeout(async () => {
        const { generatePPTX } = await import("@/lib/pptExporter");
        const meta = usePhotosStore.getState().photos.find((p) => p.id === photo.id) || photo;
        const map = new Map([[photo.id, meta]]);
        const currentDraft = useReportsStore.getState().activeDraft;
        if (currentDraft) {
           await generatePPTX(currentDraft, map);
           toast.success("PPT Downloaded!", { id: "quick-ppt" });
        }
      }, 500);
    } catch (e) {
      toast.error("Failed to generate PPT", { id: "quick-ppt" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-slide-right">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border bg-background/95 backdrop-blur safe-top">
        <button onClick={onClose} className="p-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-sm">Edit Details</h2>
        <button onClick={handleSave} className="text-primary font-medium text-sm">Save</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Image Preview ── */}
        <div className="bg-[#1e1e1e] w-full relative flex items-center justify-center p-4 min-h-[300px]">
          {photo.localBlobUrl && (
             <img 
               src={photo.localBlobUrl} 
               alt={photo.title} 
               className={`max-w-full max-h-[50vh] object-contain rounded-md shadow-lg transition-opacity duration-300 ${isRotating ? "opacity-50" : "opacity-100"}`} 
             />
          )}
          {isRotating && (
             <div className="absolute inset-0 flex items-center justify-center">
               <RotateCw className="w-8 h-8 text-white animate-spin drop-shadow-md" />
             </div>
          )}
        </div>

        {/* ── Form ── */}
        <div className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="e.g. Column Reinforcement"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comment</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all resize-none"
              placeholder="Add remarks or observations..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="e.g. Structural, Civil, Defect"
              />
            </div>
          </div>
          
          {photo.location && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-xl">
               <MapPin className="w-4 h-4" />
               <span>{photo.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="border-t border-border bg-background p-4 safe-bottom grid grid-cols-5 gap-2">
        <button onClick={handleDelete} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-destructive/10 text-destructive font-medium text-[10px]">
          <Trash2 className="w-4 h-4" /> Delete
        </button>
        <button onClick={handleRotate} disabled={isRotating} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-orange-500/10 text-orange-600 font-medium text-[10px] disabled:opacity-50">
          <RotateCw className="w-4 h-4" /> Rotate
        </button>
        <button onClick={handleQuickPPT} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-500/10 text-blue-600 font-medium text-[10px]">
          <FileText className="w-4 h-4" /> PPTX
        </button>
        <button onClick={handleShare} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-green-500/10 text-green-600 font-medium text-[10px]">
          <Share2 className="w-4 h-4" /> Share
        </button>
        <button onClick={handleDuplicate} className="flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium text-[10px]">
          <Copy className="w-4 h-4" /> Copy
        </button>
      </div>
    </div>
  );
}
