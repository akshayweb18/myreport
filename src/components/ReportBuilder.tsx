"use client";
import { useState } from "react";
import { ArrowRight, FileText, CheckCircle2 } from "lucide-react";
import { usePhotosStore } from "@/stores/photosStore";
import { useReportsStore } from "@/stores/reportsStore";
import { generatePPTX } from "@/lib/pptExporter";
import type { LayoutType, AppView } from "@/types";
import { LAYOUT_CONFIGS } from "@/types";
import { toast } from "sonner";

interface Props {
  onNavigate: (v: AppView) => void;
}

export function ReportBuilder({ onNavigate }: Props) {
  const { photos } = usePhotosStore();
  const { createDraft, activeDraft, buildSlides, setExporting } = useReportsStore();
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  
  // Form State
  const [reportName, setReportName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [inspectorName, setInspectorName] = useState("");
  
  const [layout, setLayout] = useState<LayoutType>(6);

  const handleNext = async () => {
        if (step === 1) {
      if (selectedPhotos.size === 0) {
        toast.error("Please select at least one photo");
        return;
      }
      setStep(2);
    } else {
      // Step 2 -> Generate
      try {
        toast.loading("Generating presentation...", { id: "export" });
        setExporting(true);
        
        const draft = await createDraft({
          reportName: `Report ${new Date().toLocaleDateString().replace(/\//g, "-")}`,
          projectName: "",
          inspectorName: "",
          clientName: "",
          reportDate: new Date().toLocaleDateString(),
        });
        
        buildSlides(Array.from(selectedPhotos), layout);
        
        // Let state update
        setTimeout(async () => {
          const map = new Map(photos.map((p) => [p.id, p]));
          const currentDraft = useReportsStore.getState().activeDraft;
          if (currentDraft) {
             await generatePPTX(currentDraft, map);
             toast.success("Report downloaded successfully!", { id: "export" });
          }
          setExporting(false);
          onNavigate("dashboard");
        }, 500);

      } catch (err) {
        toast.error("Failed to generate report", { id: "export" });
        setExporting(false);
      }
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedPhotos);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedPhotos(next);
  };

  return (
    <div className="flex flex-col h-full bg-background pb-20">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 safe-top">
        <h1 className="text-xl font-bold">Create Report</h1>
        <div className="flex items-center gap-2 mt-2">
           <div className={`flex-1 h-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
           <div className={`flex-1 h-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {step === 1 ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Select Photos</h2>
                <span className="text-xs font-medium text-primary">{selectedPhotos.size} selected</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => toggleSelect(photo.id)}
                    className={`aspect-square rounded-lg bg-muted relative overflow-hidden border-2 transition-all ${selectedPhotos.has(photo.id) ? "border-primary" : "border-transparent"}`}
                  >
                    {photo.localBlobUrl && <img src={photo.localBlobUrl} alt="" className="w-full h-full object-cover" />}
                    {selectedPhotos.has(photo.id) && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-white">
                        <CheckCircle2 className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
             <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Slide Layout</h2>
             <div className="grid grid-cols-2 gap-3">
               {LAYOUT_CONFIGS.map((conf) => (
                 <button
                   key={conf.type}
                   onClick={() => setLayout(conf.type)}
                   className={`p-4 rounded-xl border text-left transition-all ${layout === conf.type ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card border-border hover:border-primary/40"}`}
                 >
                   <div className="font-semibold text-sm mb-1">{conf.label}</div>
                   <div className="text-xs text-muted-foreground">{conf.rows}x{conf.cols} Grid</div>
                 </button>
               ))}
             </div>
             
             <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">Preview Generation</h3>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                  This will generate a PowerPoint presentation with {selectedPhotos.size} photos organized into {Math.ceil(selectedPhotos.size / (LAYOUT_CONFIGS.find(c => c.type === layout)?.maxPhotos || 6))} slides.
                </p>
             </div>
          </div>
        )}
      </div>

      <div className="border-t border-border p-4 bg-background safe-bottom">
        <button
          onClick={handleNext}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full gradient-primary text-white font-semibold text-sm shadow-lg shadow-primary/30"
        >
          {step === 1 ? "Next Step" : "Generate PPTX"} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
