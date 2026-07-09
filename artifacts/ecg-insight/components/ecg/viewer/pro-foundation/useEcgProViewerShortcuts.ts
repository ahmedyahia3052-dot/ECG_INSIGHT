import { useEffect } from "react";
import { Platform } from "react-native";

import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgProViewerCanvasMode, EcgProViewerLayoutPreset } from "./types";

export function useEcgProViewerShortcuts(input: {
  canvasMode: EcgProViewerCanvasMode;
  controls: EcgViewerControls;
  onCanvasModeChange: (mode: EcgProViewerCanvasMode) => void;
  onCompareToggle: () => void;
  onLayoutPresetChange: (preset: EcgProViewerLayoutPreset) => void;
}) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;

      if (event.key === "f" || event.key === "F") {
        input.controls.toggleFullscreen();
      }
      if (event.key === " ") {
        event.preventDefault();
        input.controls.togglePanMode();
      }
      if (event.key === "+" || event.key === "=") {
        input.controls.zoomBy(0.15);
      }
      if (event.key === "-" || event.key === "_") {
        input.controls.zoomBy(-0.15);
      }
      if (event.key === "c" || event.key === "C") {
        input.onCompareToggle();
      }
      if (event.key === "w" || event.key === "W") {
        input.onCanvasModeChange(input.canvasMode === "waveform" ? "hybrid" : "waveform");
      }
      if (event.key === "1") input.onLayoutPresetChange("12-lead");
      if (event.key === "2") input.onLayoutPresetChange("rhythm");
      if (event.key === "3") input.onLayoutPresetChange("single");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [input]);
}
