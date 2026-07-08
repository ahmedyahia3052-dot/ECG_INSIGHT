/**
 * Sprint 78 — Workspace layout manager (panel geometry contract).
 * Persists layout keys compatible with EcgViewerResizableWorkspace.
 */

import {
  clampLeftPanelWidth,
  clampRightPanelWidth,
  responsiveLeftPanelWidth,
} from "@/components/ecg/viewer/ecgWorkstationVisualTokens";

export type WorkspacePanelLayout = {
  autoHidePanels?: boolean;
  bottomSize?: number;
  leftCollapsed?: boolean;
  leftPinned?: boolean;
  leftSize?: number;
  rightCollapsed?: boolean;
  rightPinned?: boolean;
  rightSize?: number;
};

export const WORKSPACE_LAYOUT_STORAGE_KEY = "ecg-insight:ecg-workspace-panel-layout-v11";

export function defaultWorkspaceLayout(viewportWidth = 1920): WorkspacePanelLayout {
  return {
    autoHidePanels: false,
    leftCollapsed: false,
    leftPinned: true,
    leftSize: responsiveLeftPanelWidth(viewportWidth),
    rightCollapsed: viewportWidth < 1200,
    rightPinned: true,
    rightSize: clampRightPanelWidth(320),
  };
}

export function normalizeWorkspaceLayout(layout: WorkspacePanelLayout, viewportWidth = 1920): WorkspacePanelLayout {
  return {
    ...defaultWorkspaceLayout(viewportWidth),
    ...layout,
    leftSize: clampLeftPanelWidth(layout.leftSize ?? responsiveLeftPanelWidth(viewportWidth)),
    rightSize: clampRightPanelWidth(layout.rightSize ?? 320),
  };
}

export function loadWorkspaceLayoutFromStorage(): WorkspacePanelLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkspacePanelLayout;
  } catch {
    return null;
  }
}

export function saveWorkspaceLayoutToStorage(layout: WorkspacePanelLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore quota errors.
  }
}
