import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { isAutoFitMode } from "./ecgAutoFitEngine";
import type { EcgViewerControls } from "./useEcgViewerControls";
import type { EcgViewerFitMode } from "./types";

/** Sprint 53.2 — recalculate auto-fit on layout changes (resize, rails, panels). */
export function useEcgAutoFit(
  controls: EcgViewerControls,
  triggers: {
    fitMode?: EcgViewerFitMode;
    leftCollapsed?: boolean;
    leftVisible?: boolean;
    readingMode?: boolean;
    rightCollapsed?: boolean;
    rightVisible?: boolean;
  } = {},
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;

    const refit = () => {
      const c = controlsRef.current;
      const mode = c.fitMode === "none" ? "contain" : c.fitMode;
      if (!isAutoFitMode(mode)) return;
      c.applyFit(mode);
    };

    const scheduleRefit = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(refit, 80);
    };

    window.addEventListener("resize", scheduleRefit);
    const visualViewport = window.visualViewport;
    visualViewport?.addEventListener("resize", scheduleRefit);
    visualViewport?.addEventListener("scroll", scheduleRefit);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      window.removeEventListener("resize", scheduleRefit);
      visualViewport?.removeEventListener("resize", scheduleRefit);
      visualViewport?.removeEventListener("scroll", scheduleRefit);
    };
  }, []);

  useEffect(() => {
    const c = controlsRef.current;
    const mode = c.fitMode === "none" ? "contain" : c.fitMode;
    if (!isAutoFitMode(mode)) return;
    const timer = setTimeout(() => c.applyFit(mode), 60);
    return () => clearTimeout(timer);
  }, [
    triggers.fitMode,
    triggers.leftCollapsed,
    triggers.leftVisible,
    triggers.readingMode,
    triggers.rightCollapsed,
    triggers.rightVisible,
  ]);
}
