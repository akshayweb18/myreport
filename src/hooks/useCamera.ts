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
      if (isMounted.current) setIsActive(true);
    } catch (err: unknown) {
      if (isMounted.current) setError(err instanceof Error ? err.message : "Camera not accessible");
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
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 1.0);
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
