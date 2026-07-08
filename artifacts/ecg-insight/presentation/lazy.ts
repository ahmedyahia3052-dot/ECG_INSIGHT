/**
 * Sprint 78 — Lazy-loaded presentation bundles for tree-shaking + code splitting.
 */

import { lazy } from "react";

/** Viewer domain — heavy workstation shell */
export const LazyEcgMonitorViewerFoundation = lazy(() =>
  import("@/components/ecg/viewer/EcgMonitorViewerFoundation").then((m) => ({ default: m.EcgMonitorViewerFoundation })),
);

/** Monitor domain — live hospital shell */
export const LazyEcgLiveMonitorShell = lazy(() =>
  import("@/components/ecg/viewer/EcgLiveMonitorShell").then((m) => ({ default: m.EcgLiveMonitorShell })),
);

export const LazyEcgLiveMonitorView = lazy(() =>
  import("@/components/ecg/viewer/EcgLiveMonitorView").then((m) => ({ default: m.EcgLiveMonitorView })),
);

/** Assistant domain */
export const LazyCopilotResizableWorkspace = lazy(() =>
  import("@/components/copilot/CopilotResizableWorkspace").then((m) => ({ default: m.CopilotResizableWorkspace })),
);

export const presentationLazyBundles = {
  assistant: LazyCopilotResizableWorkspace,
  monitorShell: LazyEcgLiveMonitorShell,
  monitorView: LazyEcgLiveMonitorView,
  viewerFoundation: LazyEcgMonitorViewerFoundation,
} as const;

export type PresentationLazyBundle = keyof typeof presentationLazyBundles;
