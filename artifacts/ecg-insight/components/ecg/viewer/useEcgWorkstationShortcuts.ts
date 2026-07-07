import { useEffect } from "react";
import { Platform } from "react-native";

import type { EcgWorkstationViewMode } from "./types";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

/** Sprint 52 — hospital workstation keyboard shortcuts (no monitor playback in workspace). */
export function useEcgWorkstationShortcuts(input: {
  controls: EcgViewerControls;
  diagnosticMode?: boolean;
  onEnterDiagnostic?: () => void;
  onExitDiagnostic?: () => void;
  onExportPdf?: () => void;
  onOpenCases?: () => void;
  onOpenCommandPalette?: () => void;
  onSave?: () => void;
  onUpload?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  viewMode?: EcgWorkstationViewMode;
  workspace?: EcgMeasurementWorkspace;
}) {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable) return;

      if (event.key === "Escape") {
        if (input.diagnosticMode) {
          event.preventDefault();
          input.onExitDiagnostic?.();
          return;
        }
        if (input.controls.fullscreen) {
          event.preventDefault();
          input.controls.toggleFullscreen();
        }
        return;
      }

      if (event.key === "F11") {
        event.preventDefault();
        input.onEnterDiagnostic?.();
        return;
      }

      if (event.ctrlKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        input.onOpenCommandPalette?.();
        return;
      }
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
      if (event.ctrlKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        input.onSave?.();
        return;
      }
      if (event.ctrlKey && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        input.controls.zoomBy(0.2);
        return;
      }
      if (event.ctrlKey && event.key === "-") {
        event.preventDefault();
        input.controls.zoomBy(-0.2);
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        input.controls.resetView();
        input.controls.applyFit("hero");
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        input.onExportPdf?.();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "e") {
        event.preventDefault();
        input.onExportPdf?.();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "a") {
        event.preventDefault();
        input.onViewModeChange?.("ai-review");
        return;
      }
      if (!event.ctrlKey && !event.metaKey && event.code === "Space") {
        if (input.controls.isPanActive) return;
        event.preventDefault();
        input.controls.togglePanMode();
        return;
      }
      if (!event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        input.controls.toggleGrid();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    input.controls,
    input.diagnosticMode,
    input.onEnterDiagnostic,
    input.onExitDiagnostic,
    input.onExportPdf,
    input.onOpenCases,
    input.onOpenCommandPalette,
    input.onSave,
    input.onUpload,
    input.onViewModeChange,
    input.viewMode,
    input.workspace,
  ]);
}
