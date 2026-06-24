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

  const physicalPortraitRef = useRef(true);

  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma != null && e.beta != null) {
        // gamma is left/right tilt. > 45 means landscape.
        const isLandscape = Math.abs(e.gamma) > 45 && Math.abs(e.beta) < 45;
        physicalPortraitRef.current = !isLandscape;
      }
    };
    window.addEventListener("deviceorientation", handleOrientation);
    return () => window.removeEventListener("deviceorientation", handleOrientation);
  }, []);

  const capture = useCallback((): Promise<Blob | null> => {
    return new Promise<Blob | null>((resolve) => {
      const video = videoRef.current;
      if (!video) return resolve(null);

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const sensorIsLandscape = vw >= vh;

      // Use physical accelerometer data instead of screen orientation lock
      const devicePortrait = physicalPortraitRef.current;

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
