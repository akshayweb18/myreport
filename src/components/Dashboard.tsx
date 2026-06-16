"use client";
import { useEffect } from "react";
import { Images, FileText, Plus, Cloud, CloudOff, HardDrive } from "lucide-react";
import { usePhotosStore } from "@/stores/photosStore";
import { useReportsStore } from "@/stores/reportsStore";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { AppView } from "@/types";
import { formatBytes } from "@/lib/imageUtils";

interface Props {
  onNavigate: (v: AppView) => void;
}

export function Dashboard({ onNavigate }: Props) {
  const { photos, loadPhotos } = usePhotosStore();
  const { drafts, loadDrafts } = useReportsStore();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    loadPhotos();
    loadDrafts();
  }, []);

  const syncedCount = photos.filter((p) => p.syncStatus === "synced").length;
  const pendingCount = photos.filter((p) => p.syncStatus === "pending" || p.syncStatus === "uploading").length;
  const totalBytes = photos.length * 800 * 1024; // rough estimate

  const stats = [
    { label: "Photos", value: photos.length, icon: Images, color: "text-blue-500", bg: "bg-blue-500/10", action: () => onNavigate("gallery") },
    { label: "Reports", value: drafts.length, icon: FileText, color: "text-emerald-500", bg: "bg-emerald-500/10", action: () => onNavigate("report-builder") },
    { label: "Drafts", value: drafts.filter(d => d.slides.length === 0).length, icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10", action: () => onNavigate("report-builder") },
    { label: "Storage", value: formatBytes(totalBytes), icon: HardDrive, color: "text-purple-500", bg: "bg-purple-500/10", action: () => {} },
  ];

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      {/* ── Hero Header ── */}
      <div className="gradient-hero px-5 pt-14 pb-8">
        <div className="flex items-center justify-between mb-1">
          <div>
            <p className="text-xs text-blue-300/70 font-medium uppercase tracking-widest">Report Generator</p>
            <h1 className="text-2xl font-bold text-white mt-1">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-0.5">{photos.length} Photos · {drafts.length} Reports</p>
          </div>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isOnline ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
            {isOnline ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
            {isOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-5">
        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <button
                key={stat.label}
                onClick={stat.action}
                className="card-hover bg-card rounded-2xl p-4 text-left border border-border shadow-sm"
              >
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </button>
            );
          })}
        </div>

        {/* ── Quick Actions ── */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => onNavigate("camera")}
              className="flex items-center gap-4 p-4 rounded-2xl gradient-primary text-white shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-base">Capture Photos</div>
                <div className="text-xs text-white/70">Open camera & start shooting</div>
              </div>
            </button>

            <button
              onClick={() => onNavigate("report-builder")}
              className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border shadow-sm card-hover"
            >
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">Create Report</div>
                <div className="text-xs text-muted-foreground">Select photos → generate PPT</div>
              </div>
            </button>
          </div>
        </div>

        {/* ── Sync Status ── */}
        {pendingCount > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">Syncing {pendingCount} photos</span>
            </div>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Photos will upload automatically when connected</p>
          </div>
        )}

        {/* ── Recent Photos ── */}
        {photos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Photos</h2>
              <button onClick={() => onNavigate("gallery")} className="text-xs text-primary font-medium">View all</button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(-6).reverse().map((photo) => (
                <div
                  key={photo.id}
                  className="aspect-square rounded-xl overflow-hidden bg-muted relative cursor-pointer"
                  onClick={() => onNavigate("gallery")}
                >
                  {photo.localBlobUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.localBlobUrl} alt={photo.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="skeleton w-full h-full" />
                  )}
                  {photo.syncStatus !== "synced" && (
                    <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty State ── */}
        {photos.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Images className="w-10 h-10 text-primary/50" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No photos yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Tap the camera button to start capturing</p>
            <button
              onClick={() => onNavigate("camera")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full gradient-primary text-white text-sm font-medium shadow-lg"
            >
              <Plus className="w-4 h-4" /> Capture First Photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
