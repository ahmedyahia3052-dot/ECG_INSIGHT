import type { EcgImageAdjustments, EcgViewerFitMode, EcgViewerTransform } from "./types";

export type EcgViewerCaseState = {
  adjustments?: Partial<EcgImageAdjustments>;
  fitMode?: EcgViewerFitMode;
  overlayEnabled?: boolean;
  overlayOpacity?: number;
  readingMode?: boolean;
  transform?: EcgViewerTransform;
  version: 1;
};

const STORAGE_PREFIX = "ecg-viewer-case-state:";

function storageKey(caseId: string) {
  return `${STORAGE_PREFIX}${caseId}`;
}

export function loadEcgViewerCaseState(caseId: string): EcgViewerCaseState | null {
  if (typeof window === "undefined" || !caseId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(caseId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EcgViewerCaseState;
    if (parsed?.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveEcgViewerCaseState(caseId: string, state: Omit<EcgViewerCaseState, "version">) {
  if (typeof window === "undefined" || !caseId) return;
  try {
    window.localStorage.setItem(storageKey(caseId), JSON.stringify({ ...state, version: 1 } satisfies EcgViewerCaseState));
  } catch {
    // ignore quota errors
  }
}

export function clearEcgViewerCaseState(caseId: string) {
  if (typeof window === "undefined" || !caseId) return;
  window.localStorage.removeItem(storageKey(caseId));
}
