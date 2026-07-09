import { useEffect } from "react";
import { Platform } from "react-native";

import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgCompareLayoutMode } from "../types";
import type { EcgProViewerCanvasMode, EcgProViewerDisplayMode, EcgProViewerLayoutPreset } from "./types";

export function useEcgProViewerShortcuts(input: {
  canvasMode: EcgProViewerCanvasMode;
  compareLayout: EcgCompareLayoutMode;
  controls: EcgViewerControls;
  onAiSidebarToggle?: () => void;
  onCanvasModeChange: (mode: EcgProViewerCanvasMode) => void;
  onCompareLayoutCycle?: () => void;
  onCompareToggle: () => void;
  onDisplayModeChange?: (mode: EcgProViewerDisplayMode) => void;
  onExportJson?: () => void;
  onLayoutPresetChange: (preset: EcgProViewerLayoutPreset) => void;
  onOverlayToggle?: () => void;
  onSnapshot?: () => void;
}) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

      if (event.key === "f" || event.key === "F") input.controls.toggleFullscreen();
      if (event.key === " ") {
        event.preventDefault();
        input.controls.togglePanMode();
      }
      if (event.key === "+" || event.key === "=") input.controls.zoomBy(0.15);
      if (event.key === "-" || event.key === "_") input.controls.zoomBy(-0.15);
      if (event.key === "0") input.controls.applyFit("width");
      if (event.key === "c" || event.key === "C") input.onCompareToggle();
      if (event.key === "o" || event.key === "O") input.onCompareLayoutCycle?.();
      if (event.key === "w" || event.key === "W") input.onCanvasModeChange(input.canvasMode === "waveform" ? "hybrid" : "waveform");
      if (event.key === "g" || event.key === "G") input.onDisplayModeChange?.("image-grid");
      if (event.key === "r" || event.key === "R") input.controls.resetView();
      if (event.key === "s" || event.key === "S") {
        if (!event.ctrlKey && !event.metaKey) input.onSnapshot?.();
      }
      if ((event.ctrlKey || event.metaKey) && (event.key === "e" || event.key === "E")) {
        event.preventDefault();
        input.onExportJson?.();
      }
      if (event.key === "a" || event.key === "A") input.onAiSidebarToggle?.();
      if (event.key === "l" || event.key === "L") input.onOverlayToggle?.();
      if (event.key === "1") input.onLayoutPresetChange("12-lead");
      if (event.key === "2") input.onLayoutPresetChange("rhythm");
      if (event.key === "3") input.onLayoutPresetChange("single");
      if (event.key === "ArrowLeft") input.controls.setTransform({ ...input.controls.transform, panX: input.controls.transform.panX - 24 });
      if (event.key === "ArrowRight") input.controls.setTransform({ ...input.controls.transform, panX: input.controls.transform.panX + 24 });
      if (event.key === "ArrowUp") input.controls.setTransform({ ...input.controls.transform, panY: input.controls.transform.panY - 24 });
      if (event.key === "ArrowDown") input.controls.setTransform({ ...input.controls.transform, panY: input.controls.transform.panY + 24 });
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [input]);
}
