"use client";
import { useState, useMemo } from "react";
import { usePhotosStore } from "@/stores/photosStore";
import { Search, Filter, Trash2, Edit3, Image as ImageIcon, MapPin, CheckCircle2, Camera, FileText } from "lucide-react";
import type { PhotoMetadata, AppView, LayoutType } from "@/types";
import { formatDate } from "@/lib/imageUtils";
import { useReportsStore } from "@/stores/reportsStore";
import { toast } from "sonner";

interface Props {
  onNavigate: (v: AppView) => void;
  onEditPhoto: (photo: PhotoMetadata) => void;
}

export function PhotoGallery({ onNavigate, onEditPhoto }: Props) {
  const { photos, selectedIds, toggleSelect, selectAll, clearSelection, bulkRemove, searchQuery, setSearchQuery, filterCategory, setFilterCategory, getFilteredPhotos } = usePhotosStore();
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [layout, setLayout] = useState<LayoutType>(4);
  const [isExporting, setIsExporting] = useState(false);

  const filteredPhotos = getFilteredPhotos();
  
  const categories = useMemo(() => {
    const cats = new Set(photos.map(p => p.category).filter(Boolean));
    return Array.from(cats);
  }, [photos]);

  const handlePhotoClick = (photo: PhotoMetadata) => {
    if (isSelectionMode) {
      toggleSelect(photo.id);
    } else {
      onEditPhoto(photo);
    }
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.size} photos?`)) {
      bulkRemove(Array.from(selectedIds));
      setIsSelectionMode(false);
    }
  };

  const handleBulkPPT = async () => {
    try {
      toast.loading("Generating presentation...", { id: "bulk-ppt" });
      setIsExporting(true);
      
      const { createDraft, buildSlides } = useReportsStore.getState();
      await createDraft({
        reportName: `Gallery Export ${new Date().toLocaleDateString().replace(/\//g, "-")}`,
        projectName: "",
        inspectorName: "",
        clientName: "",
        reportDate: new Date().toLocaleDateString(),
      });
      
      buildSlides(Array.from(selectedIds), layout);
      
      setTimeout(async () => {
        const { generatePPTX } = await import("@/lib/pptExporter");
        const map = new Map(photos.map((p) => [p.id, p]));
        const currentDraft = useReportsStore.getState().activeDraft;
        if (currentDraft) {
           await generatePPTX(currentDraft, map);
           toast.success("PPT Downloaded!", { id: "bulk-ppt" });
        }
        setIsExporting(false);
        setIsSelectionMode(false);
        clearSelection();
      }, 500);

    } catch (err) {
      toast.error("Failed to generate report", { id: "bulk-ppt" });
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background pb-20">
      {/* ── Header & Search ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pb-3 safe-top">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold">Gallery</h1>
          {isSelectionMode ? (
            <div className="flex gap-2">
              <button onClick={handleBulkDelete} disabled={selectedIds.size === 0} className="text-destructive text-sm font-medium disabled:opacity-50">Delete</button>
              <button onClick={() => { setIsSelectionMode(false); clearSelection(); }} className="text-muted-foreground text-sm font-medium">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setIsSelectionMode(true)} className="text-primary text-sm font-medium">Select</button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search photos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted border-none rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="flex overflow-x-auto gap-2 mt-3 pb-1 scrollbar-none">
            <button
              onClick={() => setFilterCategory("")}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${!filterCategory ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat as string}
                onClick={() => setFilterCategory(cat as string)}
                className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${filterCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {cat as string}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Selection Action Bar ── */}
      {isSelectionMode && (
        <div className="bg-primary/5 px-4 py-2 flex items-center justify-between text-sm">
          <span>{selectedIds.size} selected</span>
          <button onClick={selectAll} className="text-primary font-medium">Select All</button>
        </div>
      )}

      {/* ── Grid ── */}
      <div className="p-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 flex-1 overflow-y-auto">
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            onClick={() => handlePhotoClick(photo)}
            className={`photo-card group ${selectedIds.has(photo.id) ? "selected" : ""}`}
          >
            {/* Square card — image shown at natural orientation via object-contain */}
            <div className="aspect-square bg-muted relative overflow-hidden">
              {photo.localBlobUrl ? (
                <img
                  src={photo.localBlobUrl}
                  alt={photo.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground/30" /></div>
              )}
              
              {/* Sync Status Indicator */}
              <div className="absolute top-2 left-2 flex gap-1">
                {photo.syncStatus === "synced" ? (
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white/50 shadow-sm" title="Synced" />
                ) : photo.syncStatus === "uploading" ? (
                   <div className="w-2.5 h-2.5 rounded-full bg-blue-500 border border-white/50 shadow-sm animate-pulse" title="Uploading" />
                ) : (
                   <div className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white/50 shadow-sm" title="Pending" />
                )}
              </div>

              {isSelectionMode && (
                <div className="absolute top-2 right-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedIds.has(photo.id) ? "bg-primary border-primary text-white" : "border-white/80 bg-black/20"}`}>
                    {selectedIds.has(photo.id) && <CheckCircle2 className="w-3 h-3" />}
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 bg-card">
              <h3 className="font-semibold text-xs truncate" title={photo.title}>{photo.title}</h3>
              <p className="text-[10px] text-muted-foreground truncate">{formatDate(photo.createdAt)}</p>
              {photo.comment && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{photo.comment}</p>}
            </div>
          </div>
        ))}
      </div>

      {filteredPhotos.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
           <ImageIcon className="w-12 h-12 mb-3 opacity-20" />
           <p className="font-medium">No photos found</p>
           {searchQuery && <p className="text-sm mt-1">Try adjusting your search or filters.</p>}
        </div>
      )}

      {/* ── Camera FAB ── */}
      {!isSelectionMode && (
        <button
          onClick={() => onNavigate("camera")}
          className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-30"
        >
          <Camera className="w-6 h-6" />
        </button>
      )}

      {/* ── Quick PPT Actions FAB ── */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 bg-background/95 backdrop-blur border border-border rounded-2xl shadow-2xl p-3 z-30 animate-slide-up">
           <div className="flex items-center justify-between mb-3 px-1">
             <span className="text-xs font-bold uppercase text-muted-foreground tracking-wide">Quick PPT Layout</span>
             <div className="flex gap-2">
               {[1, 2, 3, 4].map(num => (
                 <button 
                   key={num}
                   onClick={() => setLayout(num as LayoutType)} 
                   className={`w-9 h-9 rounded-lg flex items-center justify-center border font-bold transition-colors ${layout === num ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-muted border-transparent text-muted-foreground hover:bg-muted/80'}`}
                 >
                   {num}
                 </button>
               ))}
             </div>
           </div>
           <button 
             onClick={handleBulkPPT} 
             disabled={isExporting} 
             className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-70"
           >
             <FileText className="w-5 h-5" />
             {isExporting ? "Generating..." : "Generate PPT"}
           </button>
        </div>
      )}
    </div>
  );
}
