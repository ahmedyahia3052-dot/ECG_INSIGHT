import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { loadEcgViewerCaseState, saveEcgViewerCaseState } from "./ecgViewerCaseState";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

/** Sprint 53.2 — persist zoom, pan, reading mode, and overlay per ECG case. */
export function useEcgViewerCaseState(
  caseId: string | undefined,
  controls: EcgViewerControls,
  options: {
    aiOverlay?: EcgAiOverlayWorkspace;
    diagnosticMode?: boolean;
    onEnterDiagnostic?: () => void;
    onExitDiagnostic?: () => void;
  } = {},
) {
  const hydratedRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !caseId) return;
    if (hydratedRef.current === caseId) return;
    hydratedRef.current = caseId;

    const saved = loadEcgViewerCaseState(caseId);
    if (!saved) {
      controls.applyFit("contain");
      return;
    }

    if (saved.adjustments) {
      controls.setAdjustments((current) => ({ ...current, ...saved.adjustments }));
    }
    if (saved.transform) {
      controls.setTransform(saved.transform);
    }
    if (saved.fitMode && saved.fitMode !== "none") {
      controls.applyFit(saved.fitMode);
    } else {
      controls.applyFit("contain");
    }
    if (saved.overlayEnabled !== undefined) {
      options.aiOverlay?.setSettings({ enabled: saved.overlayEnabled });
    }
    if (saved.overlayOpacity !== undefined) {
      options.aiOverlay?.setSettings({ opacity: saved.overlayOpacity });
    }
    if (saved.readingMode && !options.diagnosticMode) {
      options.onEnterDiagnostic?.();
    }
  }, [caseId, controls, options.aiOverlay, options.diagnosticMode, options.onEnterDiagnostic]);

  useEffect(() => {
    if (Platform.OS !== "web" || !caseId || hydratedRef.current !== caseId) return undefined;

    const scheduleSave = () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveEcgViewerCaseState(caseId, {
          adjustments: controls.adjustments,
          fitMode: controls.fitMode,
          overlayEnabled: options.aiOverlay?.present.settings.enabled,
          overlayOpacity: options.aiOverlay?.present.settings.opacity,
          readingMode: options.diagnosticMode,
          transform: controls.transform,
        });
      }, 400);
    };

    scheduleSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [
    caseId,
    controls.adjustments,
    controls.fitMode,
    controls.transform,
    options.aiOverlay?.present.settings.enabled,
    options.aiOverlay?.present.settings.opacity,
    options.diagnosticMode,
  ]);
}
