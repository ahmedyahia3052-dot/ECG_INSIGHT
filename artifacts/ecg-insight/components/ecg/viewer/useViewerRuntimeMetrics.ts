import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export type ViewerPointerCoords = {
  imageX: number;
  imageY: number;
  x: number;
  y: number;
};

export function useViewerRuntimeMetrics(onFpsUpdate?: (fps: number) => void) {
  const [fps, setFps] = useState(60);
  const [pointer, setPointer] = useState<ViewerPointerCoords | null>(null);
  const frameTimes = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  const trackFrame = useCallback(() => {
    if (Platform.OS !== "web") return;
    const now = performance.now();
    frameTimes.current.push(now);
    if (frameTimes.current.length > 30) frameTimes.current.shift();
    if (frameTimes.current.length >= 2) {
      const elapsed = frameTimes.current[frameTimes.current.length - 1]! - frameTimes.current[0]!;
      const frames = frameTimes.current.length - 1;
      if (elapsed > 0) {
        const nextFps = Math.round((frames / elapsed) * 1000);
        setFps(nextFps);
        onFpsUpdate?.(nextFps);
      }
    }
    rafRef.current = requestAnimationFrame(trackFrame);
  }, [onFpsUpdate]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    rafRef.current = requestAnimationFrame(trackFrame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [trackFrame]);

  const updatePointer = useCallback((next: ViewerPointerCoords | null) => {
    setPointer(next);
  }, []);

  return { fps, pointer, updatePointer };
}

export function estimateImageDpi(imageWidth: number, imageHeight: number, zoom: number) {
  if (!imageWidth || !imageHeight) return undefined;
  const longEdge = Math.max(imageWidth, imageHeight);
  const effective = Math.round(longEdge * zoom);
  if (effective >= 3200) return 600;
  if (effective >= 2400) return 300;
  if (effective >= 1200) return 150;
  return 96;
}
