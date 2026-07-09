export type UiPresentationMode = "legacy" | "bolt";

const STORAGE_KEY = "ecg-ui-presentation-mode";

function readEnvMode(): UiPresentationMode | null {
  const value = process.env.EXPO_PUBLIC_UI_MODE?.toLowerCase();
  if (value === "bolt") return "bolt";
  if (value === "legacy") return "legacy";
  return null;
}

let runtimeMode: UiPresentationMode | null = null;

export function getUiPresentationMode(): UiPresentationMode {
  if (runtimeMode) return runtimeMode;
  const envMode = readEnvMode();
  if (envMode) return envMode;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    if (stored === "bolt" || stored === "legacy") return stored;
  }
  return "legacy";
}

export function setUiPresentationMode(mode: UiPresentationMode) {
  runtimeMode = mode;
  if (typeof globalThis !== "undefined" && "localStorage" in globalThis) {
    globalThis.localStorage.setItem(STORAGE_KEY, mode);
  }
}

export function isBoltUiEnabled() {
  return getUiPresentationMode() === "bolt";
}

export function isLegacyUiEnabled() {
  return getUiPresentationMode() === "legacy";
}

/** Select presentation component based on migration mode without changing backend contracts. */
export function selectPresentation<TLegacy, TBolt>(legacy: TLegacy, bolt: TBolt): TLegacy | TBolt {
  return isBoltUiEnabled() ? bolt : legacy;
}
