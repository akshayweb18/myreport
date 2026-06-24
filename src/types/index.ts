// ============================================================
// Report Generator PWA - Core Type Definitions
// ============================================================

/** Sync status for photos between local IndexedDB and Firebase */
export type SyncStatus = "pending" | "uploading" | "synced" | "error";

/** Available slide layout configurations */
export type LayoutType = 1 | 2 | 3 | 4 | 5 | 6 | 8 | 12 | "custom";

/** Report orientation */
export type Orientation = "landscape" | "portrait";

/** Export format */
export type ExportFormat = "pptx" | "pdf";

// ============================================================
// Photo Types
// ============================================================

export interface PhotoMetadata {
  id: string;
  title: string;
  comment: string;
  category?: string;
  location?: string;
  createdAt: number; // timestamp
  imageUrl?: string; // Firebase Storage URL
  thumbnailUrl?: string;
  localBlobUrl?: string; // local ObjectURL for display
  syncStatus: SyncStatus;
  order: number;
  selected?: boolean;
}

/** Photo stored in IndexedDB with image blob */
export interface PhotoRecord extends PhotoMetadata {
  imageBlob: Blob;
  thumbnailBlob?: Blob;
}

// ============================================================
// Report Types
// ============================================================

export interface ReportInfo {
  reportName: string;
  projectName: string;
  clientName: string;
  inspectorName: string;
  reportDate: string;
  companyLogo?: string; // base64 or URL
  companyLogoBlob?: Blob;
}

export interface SlideConfig {
  id: string;
  layout: LayoutType;
  photoIds: string[];
  notes?: string;
  customRows?: number;
  customCols?: number;
}

export interface ReportDraft {
  id: string;
  info: ReportInfo;
  slides: SlideConfig[];
  orientation: Orientation;
  format: ExportFormat;
  createdAt: number;
  updatedAt: number;
}

// ============================================================
// Layout Types
// ============================================================

export interface LayoutConfig {
  type: LayoutType;
  label: string;
  rows: number;
  cols: number;
  maxPhotos: number;
  icon?: string;
}

/** Predefined layout configurations */
export const LAYOUT_CONFIGS: LayoutConfig[] = [
  { type: 1, label: "1 Photo", rows: 1, cols: 1, maxPhotos: 1 },
  { type: 2, label: "2 Photos", rows: 1, cols: 2, maxPhotos: 2 },
  { type: 3, label: "3 Photos", rows: 1, cols: 3, maxPhotos: 3 },
  { type: 4, label: "4 Photos", rows: 2, cols: 2, maxPhotos: 4 },
  { type: 5, label: "5 Photos", rows: 2, cols: 3, maxPhotos: 5 },
  { type: 6, label: "6 Photos", rows: 2, cols: 3, maxPhotos: 6 },
  { type: 8, label: "8 Photos", rows: 4, cols: 2, maxPhotos: 8 },
  { type: 12, label: "12 Photos", rows: 4, cols: 3, maxPhotos: 12 },
];

// ============================================================
// Settings Types
// ============================================================

export interface AppSettings {
  theme: "light" | "dark" | "system";
  defaultLayout: LayoutType;
  defaultOrientation: Orientation;
  imageQuality: number; // 0.1 to 1
  maxImageWidth: number;
  showWatermark: boolean;
  watermarkText: string;
  companyName: string;
  companyLogo?: string;
  autoSave: boolean;
  autoUpload: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  defaultLayout: 6,
  defaultOrientation: "portrait",
  imageQuality: 0.8,
  maxImageWidth: 1920,
  showWatermark: false,
  watermarkText: "",
  companyName: "",
  autoSave: true,
  autoUpload: true,
};

// ============================================================
// Upload Queue Types
// ============================================================

export interface UploadTask {
  id: string;
  photoId: string;
  status: "queued" | "uploading" | "completed" | "failed";
  progress: number;
  retryCount: number;
  error?: string;
}

// ============================================================
// UI State Types
// ============================================================

export type AppView =
  | "dashboard"
  | "camera"
  | "gallery"
  | "report-builder"
  | "layout-selector"
  | "slide-preview"
  | "export"
  | "settings";

export interface NavigationState {
  currentView: AppView;
  previousView?: AppView;
}
