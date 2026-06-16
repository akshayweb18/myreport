import Dexie, { type Table } from "dexie";
import type { PhotoRecord, ReportDraft, AppSettings, UploadTask } from "@/types";

/**
 * IndexedDB database schema using Dexie
 * Provides offline-first storage for photos, drafts, settings, and upload queue
 */
class ReportDB extends Dexie {
  photos!: Table<PhotoRecord>;
  drafts!: Table<ReportDraft>;
  settings!: Table<AppSettings & { id: string }>;
  uploadQueue!: Table<UploadTask>;

  constructor() {
    super("ReportGeneratorDB");

    this.version(1).stores({
      photos: "id, title, category, syncStatus, createdAt, order",
      drafts: "id, createdAt, updatedAt",
      settings: "id",
      uploadQueue: "id, photoId, status",
    });
  }
}

export const reportDB = new ReportDB();

// ============================================================
// Photo Operations
// ============================================================

export async function savePhoto(photo: PhotoRecord): Promise<void> {
  await reportDB.photos.put(photo);
}

export async function getPhoto(id: string): Promise<PhotoRecord | undefined> {
  return reportDB.photos.get(id);
}

export async function getAllPhotos(): Promise<PhotoRecord[]> {
  return reportDB.photos.orderBy("order").toArray();
}

export async function updatePhoto(
  id: string,
  updates: Partial<PhotoRecord>
): Promise<void> {
  await reportDB.photos.update(id, updates);
}

export async function deletePhoto(id: string): Promise<void> {
  await reportDB.photos.delete(id);
}

export async function bulkDeletePhotos(ids: string[]): Promise<void> {
  await reportDB.photos.bulkDelete(ids);
}

// ============================================================
// Draft Operations
// ============================================================

export async function saveDraft(draft: ReportDraft): Promise<void> {
  await reportDB.drafts.put(draft);
}

export async function getDraft(id: string): Promise<ReportDraft | undefined> {
  return reportDB.drafts.get(id);
}

export async function getAllDrafts(): Promise<ReportDraft[]> {
  return reportDB.drafts.orderBy("updatedAt").reverse().toArray();
}

export async function deleteDraft(id: string): Promise<void> {
  await reportDB.drafts.delete(id);
}

// ============================================================
// Settings Operations
// ============================================================

export async function getSettings(): Promise<AppSettings | undefined> {
  const record = await reportDB.settings.get("global");
  if (!record) return undefined;
  const { id: _, ...settings } = record;
  return settings as AppSettings;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await reportDB.settings.put({ ...settings, id: "global" });
}

// ============================================================
// Upload Queue Operations
// ============================================================

export async function addToUploadQueue(task: UploadTask): Promise<void> {
  await reportDB.uploadQueue.put(task);
}

export async function getUploadQueue(): Promise<UploadTask[]> {
  return reportDB.uploadQueue.where("status").anyOf(["queued", "failed"]).toArray();
}

export async function updateUploadTask(
  id: string,
  updates: Partial<UploadTask>
): Promise<void> {
  await reportDB.uploadQueue.update(id, updates);
}

export async function removeFromUploadQueue(id: string): Promise<void> {
  await reportDB.uploadQueue.delete(id);
}
