import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { saveSettings } from "@/lib/db";

interface SettingsState extends AppSettings {
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      updateSettings: async (updates) => {
        set((state) => {
          const next = { ...state, ...updates };
          // Persist to IndexedDB as well
          saveSettings(next as AppSettings);
          return next;
        });
      },

      resetSettings: async () => {
        set(DEFAULT_SETTINGS);
        await saveSettings(DEFAULT_SETTINGS);
      },
    }),
    { name: "report-generator-settings" }
  )
);
