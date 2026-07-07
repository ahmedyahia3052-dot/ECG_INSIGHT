import { useCallback, useMemo, useState } from "react";

import type { EcgCompareLayoutMode, EcgWorkstationViewMode, EcgWorkspaceLayoutMode } from "./types";

export type WorkspaceLayoutPreset = {
  canvasTargetRatio: number;
  hideChrome: boolean;
  label: string;
  leftCollapsed: boolean;
  readingFullscreen: boolean;
  rightCollapsed: boolean;
  rightWidthRatio: number;
  showTeachingOverlays: boolean;
  viewMode?: EcgWorkstationViewMode;
  compareLayout?: EcgCompareLayoutMode;
};

const PRESETS: Record<EcgWorkspaceLayoutMode, WorkspaceLayoutPreset> = {
  classic: {
    canvasTargetRatio: 0.95,
    hideChrome: false,
    label: "Classic",
    leftCollapsed: false,
    readingFullscreen: false,
    rightCollapsed: true,
    rightWidthRatio: 0,
    showTeachingOverlays: false,
    viewMode: "image",
  },
  compare: {
    canvasTargetRatio: 0.92,
    hideChrome: false,
    label: "Compare",
    leftCollapsed: true,
    readingFullscreen: false,
    rightCollapsed: true,
    rightWidthRatio: 0,
    showTeachingOverlays: false,
    viewMode: "compare",
    compareLayout: "side-by-side",
  },
  dual: {
    canvasTargetRatio: 0.7,
    hideChrome: false,
    label: "Dual",
    leftCollapsed: false,
    readingFullscreen: false,
    rightCollapsed: false,
    rightWidthRatio: 0.3,
    showTeachingOverlays: false,
    viewMode: "image",
  },
  presentation: {
    canvasTargetRatio: 0.96,
    hideChrome: true,
    label: "Presentation",
    leftCollapsed: true,
    readingFullscreen: false,
    rightCollapsed: true,
    rightWidthRatio: 0,
    showTeachingOverlays: false,
    viewMode: "image",
  },
  reading: {
    canvasTargetRatio: 0.98,
    hideChrome: true,
    label: "Reading",
    leftCollapsed: true,
    readingFullscreen: true,
    rightCollapsed: true,
    rightWidthRatio: 0,
    showTeachingOverlays: false,
    viewMode: "image",
  },
  teaching: {
    canvasTargetRatio: 0.88,
    hideChrome: false,
    label: "Teaching",
    leftCollapsed: false,
    readingFullscreen: false,
    rightCollapsed: false,
    rightWidthRatio: 0.28,
    showTeachingOverlays: true,
    viewMode: "waveform",
  },
};

export function useEcgWorkspaceLayoutMode() {
  const [layoutMode, setLayoutModeState] = useState<EcgWorkspaceLayoutMode>("classic");

  const preset = useMemo(() => PRESETS[layoutMode], [layoutMode]);

  const setLayoutMode = useCallback((mode: EcgWorkspaceLayoutMode) => {
    setLayoutModeState(mode);
  }, []);

  return {
    layoutMode,
    preset,
    setLayoutMode,
  };
}

export function workspaceLayoutModes(): Array<{ id: EcgWorkspaceLayoutMode; label: string }> {
  return (Object.keys(PRESETS) as EcgWorkspaceLayoutMode[]).map((id) => ({ id, label: PRESETS[id].label }));
}
