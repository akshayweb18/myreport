import imageCompression from "browser-image-compression";

/**
 * Compress image blob to reduce upload size and improve performance
 */
export async function compressImage(
  blob: Blob,
  maxWidthOrHeight = 1920,
  quality = 0.8
): Promise<Blob> {
  const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
  const compressed = await imageCompression(file, {
    maxSizeMB: 2,
    maxWidthOrHeight,
    useWebWorker: true,  // Run in web worker - never blocks main UI thread
    initialQuality: quality,
    fileType: "image/jpeg",
  });
  return compressed;
}

/**
 * Ultra-fast thumbnail using canvas (no library overhead).
 * ~50ms vs ~500ms for browser-image-compression.
 */
export function fastThumbnail(blob: Blob, size = 400): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(size / img.naturalWidth, size / img.naturalHeight, 1);
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        0.75
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img load failed")); };
    img.src = url;
  });
}

/**
 * Create a small thumbnail blob for gallery display
 */
export async function createThumbnail(blob: Blob): Promise<Blob> {
  return fastThumbnail(blob, 400);
}

/**
 * Convert a Blob to a Base64 string (used for PPT embedding)
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert Base64 data URL to plain base64 string (strip mime header)
 */
export function base64ToData(dataUrl: string): string {
  return dataUrl.split(",")[1];
}

/**
 * Convert a File/Blob to an object URL for display
 */
export function createObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

/**
 * Revoke an object URL to free memory
 */
export function revokeObjectUrl(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Generate a unique ID using crypto
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Format a timestamp to readable date string
 */
export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Get current GPS location (if permitted)
 */
export function getCurrentLocation(): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve("");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve(`${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`);
      },
      () => resolve(""),
      { timeout: 5000 }
    );
  });
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Rotate an image blob by 90 degrees clockwise
 */
export function rotateImageBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas context unavailable"));
        return;
      }
      
      // Rotate 90 degrees clockwise
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error("Canvas toBlob failed"));
      }, blob.type || "image/jpeg", 0.95);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image failed to load for rotation"));
    };
    img.src = url;
  });
}
