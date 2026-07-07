import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

const IDLE_MS = 4500;

export function useMonitorPaletteVisibility(autoHideEnabled: boolean) {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = useCallback(() => {
    setVisible(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (autoHideEnabled) {
      timerRef.current = setTimeout(() => setVisible(false), IDLE_MS);
    }
  }, [autoHideEnabled]);

  useEffect(() => {
    if (!autoHideEnabled) {
      setVisible(true);
      return undefined;
    }
    reveal();
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;

    const onActivity = () => reveal();
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("touchstart", onActivity);

    return () => {
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("touchstart", onActivity);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoHideEnabled, reveal]);

  return { paletteVisible: visible, revealPalette: reveal };
}
