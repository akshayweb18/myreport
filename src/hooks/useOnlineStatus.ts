"use client";
import { useEffect, useState } from "react";
import { useUploadStore } from "@/stores/uploadStore";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const processQueue = useUploadStore((s) => s.processQueue);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      processQueue(); // flush upload queue when back online
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [processQueue]);

  return isOnline;
}
