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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 4096 }, height: { ideal: 2160 } },
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

      const sourceW = video.videoWidth;
      const sourceH = video.videoHeight;
      const displayW = video.clientWidth;
      const displayH = video.clientHeight;

      const sourceAspect = sourceW / sourceH;
      const displayAspect = displayW / displayH;

      let drawW = sourceW;
      let drawH = sourceH;
      let offsetX = 0;
      let offsetY = 0;

      if (sourceAspect > displayAspect) {
        // Source is wider than display: crop sides
        drawW = sourceH * displayAspect;
        offsetX = (sourceW - drawW) / 2;
      } else {
        // Source is taller than display: crop top/bottom
        drawH = sourceW / displayAspect;
        offsetY = (sourceH - drawH) / 2;
      }

      const canvas = document.createElement("canvas");
      canvas.width = drawW;
      canvas.height = drawH;
      
      canvas.getContext("2d")?.drawImage(
        video, 
        offsetX, offsetY, drawW, drawH,
        0, 0, drawW, drawH
      );
      
      // JPEG encoding is ~10x faster than PNG, making the camera shutter strictly instantaneous
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
