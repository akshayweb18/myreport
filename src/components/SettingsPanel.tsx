"use client";
import { useSettingsStore } from "@/stores/settingsStore";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Trash2, Database, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useUploadStore } from "@/stores/uploadStore";

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const settings = useSettingsStore();
  const { queue } = useUploadStore();

  const handleClearCache = async () => {
    if (confirm("Clear local cache? Photos not synced to cloud will be lost!")) {
      // Basic clear for demo purposes
      indexedDB.deleteDatabase("ReportGeneratorDB");
      toast.success("Cache cleared. Reloading...");
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 safe-top">
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Appearance */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Appearance</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
             <div className="p-4 flex items-center justify-between border-b border-border">
                <span className="text-sm font-medium">Theme</span>
                <div className="flex bg-muted rounded-lg p-1">
                   <button onClick={() => setTheme("light")} className={`p-1.5 rounded-md ${theme === "light" ? "bg-background shadow" : "text-muted-foreground"}`}><Sun className="w-4 h-4" /></button>
                   <button onClick={() => setTheme("system")} className={`p-1.5 rounded-md ${theme === "system" ? "bg-background shadow" : "text-muted-foreground"}`}><Monitor className="w-4 h-4" /></button>
                   <button onClick={() => setTheme("dark")} className={`p-1.5 rounded-md ${theme === "dark" ? "bg-background shadow" : "text-muted-foreground"}`}><Moon className="w-4 h-4" /></button>
                </div>
             </div>
          </div>
        </section>

        {/* Sync & Storage */}
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Sync & Storage</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
             <div className="p-4 flex items-center justify-between border-b border-border">
                <div className="flex items-center gap-3">
                   <UploadCloud className="w-5 h-5 text-blue-500" />
                   <div>
                     <div className="text-sm font-medium">Upload Queue</div>
                     <div className="text-xs text-muted-foreground">{queue.length} items pending</div>
                   </div>
                </div>
             </div>
             <button onClick={handleClearCache} className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors text-destructive">
                <Trash2 className="w-5 h-5" />
                <div>
                   <div className="text-sm font-medium">Clear Local Cache</div>
                   <div className="text-xs opacity-70">Free up device storage</div>
                </div>
             </button>
          </div>
        </section>

        {/* App Info */}
        <section className="text-center pt-8 pb-4">
           <div className="w-12 h-12 bg-primary rounded-xl mx-auto mb-3 flex items-center justify-center text-white font-bold text-xl">R</div>
           <h3 className="font-semibold text-foreground">Report Generator PWA</h3>
           <p className="text-xs text-muted-foreground mt-1">Version 1.0.0</p>
        </section>

      </div>
    </div>
  );
}
