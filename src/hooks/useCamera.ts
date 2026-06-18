"use client";
import { useRef, useState, useCallback, useEffect } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      // Removed height constraint to allow device to dictate aspect ratio natively
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 4096 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Camera not accessible");
    }
  }, [facingMode]);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsActive(false);
  }, []);

  const capture = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current;
      if (!video) return resolve(null);

      const vw = video.videoWidth;   // raw camera sensor width (almost always landscape)
      const vh = video.videoHeight;  // raw camera sensor height

      // Detect how the user is physically holding the device.
      // screen.orientation.angle: 0/180 = portrait, 90/270 = landscape.
      // Fallback to deprecated window.orientation for older iOS Safari.
      const angle: number =
        (typeof screen !== "undefined" && screen.orientation?.angle != null)
          ? screen.orientation.angle
          : (typeof window !== "undefined"
            ? ((window as unknown as { orientation?: number }).orientation ?? 0)
            : 0);

      // Mobile rear camera sensors are landscape (vw > vh).
      // The video element is CSS-rotated by the browser to look correct on screen,
      // but canvas.drawImage always uses raw sensor pixels.
      // → Portrait hold (angle 0/180) + landscape sensor = we must rotate -90°
      // → Landscape hold (angle 90/270) + landscape sensor = use as-is
      const devicePortrait = angle === 0 || Math.abs(angle) === 180;
      const sensorIsLandscape = vw >= vh;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);

      if (sensorIsLandscape && devicePortrait) {
        // Bake a -90° rotation so the saved image is portrait
        canvas.width = vh;
        canvas.height = vw;
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.drawImage(video, -vw / 2, -vh / 2, vw, vh);
      } else {
        // Landscape hold OR sensor already portrait → save as-is
        canvas.width = vw;
        canvas.height = vh;
        ctx.drawImage(video, 0, 0, vw, vh);
      }

      // JPEG encoding is ~10x faster than PNG
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95);
    });
  }, []);

  const flipCamera = useCallback(() => {
    stop();
    setFacingMode((f) => (f === "environment" ? "user" : "environment"));
  }, [stop]);

  useEffect(() => {
    if (facingMode && isActive) start();
  }, [facingMode]);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, isActive, error, start, stop, capture, flipCamera, facingMode };
}
