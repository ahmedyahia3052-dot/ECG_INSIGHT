import { useEffect } from "react";
import { Platform } from "react-native";

import type { EcgWorkstationViewMode } from "./types";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

export function useEcgWorkstationShortcuts(input: {
  controls: EcgViewerControls;
  onOpenCases?: () => void;
  onUpload?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  workspace?: EcgMeasurementWorkspace;
}) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;

      if (event.ctrlKey && event.key.toLowerCase() === "o") {
        event.preventDefault();
        input.onOpenCases?.();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "u") {
        event.preventDefault();
        input.onUpload?.();
        return;
      }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        input.onViewModeChange?.("monitor");
        return;
      }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        input.onViewModeChange?.("report");
        return;
      }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        input.onViewModeChange?.("ai-review");
        return;
      }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        input.controls.toggleGrid();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [input.controls, input.onOpenCases, input.onUpload, input.onViewModeChange, input.workspace]);
}
