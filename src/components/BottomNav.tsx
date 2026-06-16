"use client";
import { Home, Images, FileText, Settings, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppView } from "@/types";

interface Props {
  current: AppView;
  onChange: (v: AppView) => void;
}

const NAV_ITEMS = [
  { id: "dashboard" as AppView, label: "Home", icon: Home },
  { id: "gallery" as AppView, label: "Photos", icon: Images },
  { id: "camera" as AppView, label: "", icon: Camera },
  { id: "report-builder" as AppView, label: "Reports", icon: FileText },
  { id: "settings" as AppView, label: "Settings", icon: Settings },
];

export function BottomNav({ current, onChange }: Props) {
  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isCamera = item.id === "camera";
          const isActive = current === item.id;

          if (isCamera) {
            return (
              <button
                key={item.id}
                onClick={() => onChange(item.id)}
                className="relative -mt-6 flex items-center justify-center w-14 h-14 rounded-full gradient-primary shadow-lg shadow-primary/40 active:scale-95 transition-transform duration-100"
                aria-label="Open Camera"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-label={item.label}
            >
              <Icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} />
              <span className={cn("text-[10px] font-medium", isActive && "font-semibold")}>{item.label}</span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
