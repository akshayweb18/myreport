import { create } from "zustand";
import type { UploadTask } from "@/types";
import { storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import {
  addToUploadQueue,
  getUploadQueue,
  updateUploadTask,
  removeFromUploadQueue,
} from "@/lib/db";
import { updatePhoto } from "@/lib/db";
import { usePhotosStore } from "./photosStore";

interface UploadState {
  queue: UploadTask[];
  isProcessing: boolean;
  loadQueue: () => Promise<void>;
  enqueue: (photoId: string, blob: Blob, path: string) => Promise<void>;
  processQueue: () => Promise<void>;
}

export const useUploadStore = create<UploadState>()((set, get) => ({
  queue: [],
  isProcessing: false,

  loadQueue: async () => {
    const queue = await getUploadQueue();
    set({ queue });
  },

  enqueue: async (photoId, blob, path) => {
    const task: UploadTask = {
      id: `upload_${photoId}`,
      photoId,
      status: "queued",
      progress: 0,
      retryCount: 0,
    };
    await addToUploadQueue(task);
    set((state) => ({ queue: [...state.queue, task] }));

    // Store blob reference for later upload
    (uploadBlobCache as Map<string, Blob>).set(photoId, blob);
    uploadPathCache.set(photoId, path);

    // Trigger processing
    get().processQueue();
  },

  processQueue: async () => {
    if (get().isProcessing) return;
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;

    set({ isProcessing: true });

    const pending = get().queue.filter(
      (t) => t.status === "queued" || (t.status === "failed" && t.retryCount < 3)
    );

    for (const task of pending) {
      const blob = (uploadBlobCache as Map<string, Blob>).get(task.photoId);
      const path = uploadPathCache.get(task.photoId);
      if (!blob || !path) continue;

      try {
        // Mark uploading
        await updateUploadTask(task.id, { status: "uploading" });
        set((state) => ({
          queue: state.queue.map((t) =>
            t.id === task.id ? { ...t, status: "uploading" } : t
          ),
        }));

        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, blob);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            "state_changed",
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              set((state) => ({
                queue: state.queue.map((t) =>
                  t.id === task.id ? { ...t, progress } : t
                ),
              }));
            },
            reject,
            resolve
          );
        });

        const downloadUrl = await getDownloadURL(storageRef);

        // Update photo record with firebase URL
        await updatePhoto(task.photoId, {
          imageUrl: downloadUrl,
          syncStatus: "synced",
        });

        usePhotosStore.getState().updatePhotoMeta(task.photoId, {
          imageUrl: downloadUrl,
          syncStatus: "synced",
        });

        await removeFromUploadQueue(task.id);
        (uploadBlobCache as Map<string, Blob>).delete(task.photoId);
        uploadPathCache.delete(task.photoId);

        set((state) => ({
          queue: state.queue.filter((t) => t.id !== task.id),
        }));
      } catch (error) {
        const retryCount = task.retryCount + 1;
        await updateUploadTask(task.id, {
          status: "failed",
          retryCount,
          error: String(error),
        });
        set((state) => ({
          queue: state.queue.map((t) =>
            t.id === task.id ? { ...t, status: "failed", retryCount } : t
          ),
        }));
      }
    }

    set({ isProcessing: false });
  },
}));

// In-memory blob cache (not persisted, blobs are re-captured if needed)
const uploadBlobCache = new Map<string, Blob>();
const uploadPathCache = new Map<string, string>();
