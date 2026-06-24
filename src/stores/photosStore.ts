import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PhotoMetadata, PhotoRecord } from "@/types";
import {
  savePhoto,
  getAllPhotos,
  updatePhoto,
  deletePhoto,
  bulkDeletePhotos,
  getPhoto,
} from "@/lib/db";

interface PhotosState {
  photos: PhotoMetadata[];
  selectedIds: Set<string>;
  searchQuery: string;
  filterCategory: string;
  isLoading: boolean;
  // Actions
  loadPhotos: () => Promise<void>;
  addPhoto: (photo: PhotoRecord) => Promise<void>;
  updatePhotoMeta: (id: string, updates: Partial<PhotoMetadata>) => Promise<void>;
  updatePhotoBlobs: (id: string, imageBlob: Blob, thumbnailBlob: Blob) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
  bulkRemove: (ids: string[]) => Promise<void>;
  toggleSelect: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  reorderPhotos: (ids: string[]) => Promise<void>;
  setSearchQuery: (q: string) => void;
  setFilterCategory: (cat: string) => void;
  getFilteredPhotos: () => PhotoMetadata[];
}

export const usePhotosStore = create<PhotosState>()((set, get) => ({
  photos: [],
  selectedIds: new Set(),
  searchQuery: "",
  filterCategory: "",
  isLoading: false,

  loadPhotos: async () => {
    set({ isLoading: true });
    const records = await getAllPhotos();
    const photos: PhotoMetadata[] = records.map((record) => {
      const { imageBlob, thumbnailBlob, localBlobUrl, ...meta } = record;
      // Stale blob URLs from previous sessions must be ignored.
      // We generate a fresh URL from the stored blobs.
      const blobToUse = thumbnailBlob || imageBlob;
      const freshBlobUrl = blobToUse ? URL.createObjectURL(blobToUse) : undefined;
      
      return {
        ...meta,
        localBlobUrl: freshBlobUrl || localBlobUrl,
      };
    });
    set({ photos, isLoading: false });
  },

  addPhoto: async (photo: PhotoRecord) => {
    const blobUrl = URL.createObjectURL(photo.imageBlob);
    const meta: PhotoMetadata = {
      id: photo.id,
      title: photo.title,
      comment: photo.comment,
      category: photo.category,
      location: photo.location,
      createdAt: photo.createdAt,
      imageUrl: photo.imageUrl,
      thumbnailUrl: photo.thumbnailUrl,
      localBlobUrl: blobUrl,
      syncStatus: photo.syncStatus,
      order: photo.order,
    };
    
    // Optimistic UI update
    set((state) => ({ photos: [meta, ...state.photos] }));
    
    // Background save to IndexedDB
    await savePhoto(photo);
  },

  updatePhotoMeta: async (id, updates) => {
    await updatePhoto(id, updates);
    set((state) => ({
      photos: state.photos.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    }));
  },

  updatePhotoBlobs: async (id, imageBlob, thumbnailBlob) => {
    const photo = get().photos.find((p) => p.id === id);
    if (photo?.localBlobUrl) URL.revokeObjectURL(photo.localBlobUrl);
    
    const newBlobUrl = URL.createObjectURL(imageBlob);
    await updatePhoto(id, { imageBlob, thumbnailBlob, syncStatus: "pending" });
    
    set((state) => ({
      photos: state.photos.map((p) => 
        p.id === id ? { ...p, localBlobUrl: newBlobUrl, syncStatus: "pending" } : p
      ),
    }));
  },

  removePhoto: async (id) => {
    // Revoke blob URL to free memory
    const photo = get().photos.find((p) => p.id === id);
    if (photo?.localBlobUrl) URL.revokeObjectURL(photo.localBlobUrl);
    await deletePhoto(id);
    set((state) => ({
      photos: state.photos.filter((p) => p.id !== id),
      selectedIds: new Set([...state.selectedIds].filter((sid) => sid !== id)),
    }));
  },

  bulkRemove: async (ids) => {
    const idsSet = new Set(ids);
    get().photos.forEach((p) => {
      if (idsSet.has(p.id) && p.localBlobUrl) URL.revokeObjectURL(p.localBlobUrl);
    });
    await bulkDeletePhotos(ids);
    set((state) => ({
      photos: state.photos.filter((p) => !idsSet.has(p.id)),
      selectedIds: new Set([...state.selectedIds].filter((id) => !idsSet.has(id))),
    }));
  },

  toggleSelect: (id) => {
    set((state) => {
      const next = new Set(state.selectedIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selectedIds: next };
    });
  },

  selectAll: () => {
    set((state) => ({ selectedIds: new Set(state.photos.map((p) => p.id)) }));
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  reorderPhotos: async (ids) => {
    const updates = ids.map((id, index) =>
      updatePhoto(id, { order: index })
    );
    await Promise.all(updates);
    set((state) => {
      const orderMap = new Map(ids.map((id, i) => [id, i]));
      const reordered = [...state.photos].sort(
        (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
      );
      return { photos: reordered };
    });
  },

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setFilterCategory: (filterCategory) => set({ filterCategory }),

  getFilteredPhotos: () => {
    const { photos, searchQuery, filterCategory } = get();
    return photos.filter((p) => {
      const matchesSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.comment.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !filterCategory || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  },
}));
