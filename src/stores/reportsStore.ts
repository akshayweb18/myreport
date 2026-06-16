import { create } from "zustand";
import type { ReportDraft, ReportInfo, SlideConfig, Orientation, ExportFormat, LayoutType, PhotoMetadata } from "@/types";
import { LAYOUT_CONFIGS } from "@/types";
import { saveDraft, getAllDrafts, deleteDraft } from "@/lib/db";
import { v4 as uuid } from "uuid";

interface ReportsState {
  drafts: ReportDraft[];
  activeDraft: ReportDraft | null;
  selectedPhotoIds: string[];
  isExporting: boolean;
  exportProgress: number;

  loadDrafts: () => Promise<void>;
  createDraft: (info: ReportInfo) => Promise<ReportDraft>;
  updateDraftInfo: (updates: Partial<ReportInfo>) => void;
  saveDraftNow: () => Promise<void>;
  removeDraft: (id: string) => Promise<void>;
  setActiveDraft: (draft: ReportDraft | null) => void;
  setSelectedPhotos: (ids: string[]) => void;

  // Slide management
  buildSlides: (photoIds: string[], layout: LayoutType, customRows?: number, customCols?: number) => void;
  updateSlide: (slideId: string, updates: Partial<SlideConfig>) => void;
  reorderSlides: (slideIds: string[]) => void;
  addSlideNotes: (slideId: string, notes: string) => void;
  changeSlideLayout: (slideId: string, layout: LayoutType) => void;

  setOrientation: (o: Orientation) => void;
  setFormat: (f: ExportFormat) => void;
  setExporting: (v: boolean, progress?: number) => void;
}

export const useReportsStore = create<ReportsState>()((set, get) => ({
  drafts: [],
  activeDraft: null,
  selectedPhotoIds: [],
  isExporting: false,
  exportProgress: 0,

  loadDrafts: async () => {
    const drafts = await getAllDrafts();
    set({ drafts });
  },

  createDraft: async (info) => {
    const draft: ReportDraft = {
      id: uuid(),
      info,
      slides: [],
      orientation: "landscape",
      format: "pptx",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveDraft(draft);
    set((state) => ({ drafts: [draft, ...state.drafts], activeDraft: draft }));
    return draft;
  },

  updateDraftInfo: (updates) => {
    set((state) => {
      if (!state.activeDraft) return state;
      return {
        activeDraft: {
          ...state.activeDraft,
          info: { ...state.activeDraft.info, ...updates },
          updatedAt: Date.now(),
        },
      };
    });
  },

  saveDraftNow: async () => {
    const { activeDraft } = get();
    if (!activeDraft) return;
    await saveDraft({ ...activeDraft, updatedAt: Date.now() });
  },

  removeDraft: async (id) => {
    await deleteDraft(id);
    set((state) => ({
      drafts: state.drafts.filter((d) => d.id !== id),
      activeDraft: state.activeDraft?.id === id ? null : state.activeDraft,
    }));
  },

  setActiveDraft: (draft) => set({ activeDraft: draft }),
  setSelectedPhotos: (selectedPhotoIds) => set({ selectedPhotoIds }),

  buildSlides: (photoIds, layout, customRows, customCols) => {
    const config = LAYOUT_CONFIGS.find((c) => c.type === layout);
    let perSlide = 6;

    if (layout === "custom" && customRows && customCols) {
      perSlide = customRows * customCols;
    } else if (config) {
      perSlide = config.maxPhotos;
    }

    const slides: SlideConfig[] = [];
    for (let i = 0; i < photoIds.length; i += perSlide) {
      slides.push({
        id: uuid(),
        layout,
        photoIds: photoIds.slice(i, i + perSlide),
        customRows,
        customCols,
      });
    }

    set((state) => {
      if (!state.activeDraft) return state;
      return { activeDraft: { ...state.activeDraft, slides, updatedAt: Date.now() } };
    });
  },

  updateSlide: (slideId, updates) => {
    set((state) => {
      if (!state.activeDraft) return state;
      return {
        activeDraft: {
          ...state.activeDraft,
          slides: state.activeDraft.slides.map((s) =>
            s.id === slideId ? { ...s, ...updates } : s
          ),
          updatedAt: Date.now(),
        },
      };
    });
  },

  reorderSlides: (slideIds) => {
    set((state) => {
      if (!state.activeDraft) return state;
      const slideMap = new Map(state.activeDraft.slides.map((s) => [s.id, s]));
      const slides = slideIds.map((id) => slideMap.get(id)!).filter(Boolean);
      return { activeDraft: { ...state.activeDraft, slides, updatedAt: Date.now() } };
    });
  },

  addSlideNotes: (slideId, notes) => {
    get().updateSlide(slideId, { notes });
  },

  changeSlideLayout: (slideId, layout) => {
    get().updateSlide(slideId, { layout });
  },

  setOrientation: (orientation) => {
    set((state) => {
      if (!state.activeDraft) return state;
      return { activeDraft: { ...state.activeDraft, orientation } };
    });
  },

  setFormat: (format) => {
    set((state) => {
      if (!state.activeDraft) return state;
      return { activeDraft: { ...state.activeDraft, format } };
    });
  },

  setExporting: (isExporting, exportProgress = 0) => set({ isExporting, exportProgress }),
}));
