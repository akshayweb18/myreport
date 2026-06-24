"use client";
import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Dashboard } from "@/components/Dashboard";
import { CameraCapture } from "@/components/CameraCapture";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PhotoEditor } from "@/components/PhotoEditor";
import { ReportBuilder } from "@/components/ReportBuilder";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useUploadStore } from "@/stores/uploadStore";
import type { AppView, PhotoMetadata } from "@/types";
import { Loader2 } from "lucide-react";

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  const [currentView, setCurrentView] = useState<AppView>("dashboard");
  const [editingPhoto, setEditingPhoto] = useState<PhotoMetadata | null>(null);
  const { loadQueue } = useUploadStore();

  useEffect(() => {
    loadQueue();
    setIsMounted(true);
  }, [loadQueue]);

  if (!isMounted) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="flex-1 flex flex-col bg-background relative w-full max-w-md mx-auto min-h-[100dvh] shadow-2xl overflow-hidden sm:border-x sm:border-border">
      
      {/* ── Main Views ── */}
      {currentView === "dashboard" && <Dashboard onNavigate={handleNavigate} />}
      {currentView === "gallery" && <PhotoGallery onNavigate={handleNavigate} onEditPhoto={(p) => setEditingPhoto(p)} />}
      {currentView === "report-builder" && <ReportBuilder onNavigate={handleNavigate} />}
      {currentView === "settings" && <SettingsPanel />}

      {/* ── Overlays ── */}
      {currentView === "camera" && (
        <CameraCapture onClose={() => setCurrentView("gallery")} />
      )}
      
      {editingPhoto && (
        <PhotoEditor photo={editingPhoto} onClose={() => setEditingPhoto(null)} />
      )}

      {/* ── Navigation ── */}
      {currentView !== "camera" && (
        <BottomNav current={currentView} onChange={handleNavigate} />
      )}
      
    </div>
  );
}
