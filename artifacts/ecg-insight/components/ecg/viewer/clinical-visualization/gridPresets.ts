import type { EcgGridPreset } from "./types";

export type GridPresetColors = {
  background: string;
  label: string;
  major: string;
  majorWidth: number;
  minor: string;
  minorWidth: number;
};

export const GRID_PRESET_COLORS: Record<EcgGridPreset, GridPresetColors> = {
  "classic-paper": {
    background: "#FFFDF8",
    label: "#991B1B",
    major: "rgba(220, 38, 38, 0.55)",
    majorWidth: 1,
    minor: "rgba(220, 38, 38, 0.25)",
    minorWidth: 0.5,
  },
  "hospital-black": {
    background: "#0A0A0A",
    label: "#86EFAC",
    major: "rgba(34, 197, 94, 0.45)",
    majorWidth: 1,
    minor: "rgba(34, 197, 94, 0.2)",
    minorWidth: 0.5,
  },
  "dark-blue": {
    background: "#0B1220",
    label: "#93C5FD",
    major: "rgba(59, 130, 246, 0.5)",
    majorWidth: 1,
    minor: "rgba(59, 130, 246, 0.22)",
    minorWidth: 0.5,
  },
  "dark-gray": {
    background: "#111827",
    label: "#D1D5DB",
    major: "rgba(156, 163, 175, 0.45)",
    majorWidth: 1,
    minor: "rgba(156, 163, 175, 0.2)",
    minorWidth: 0.5,
  },
};

export const GRID_PRESET_LABELS: Record<EcgGridPreset, string> = {
  "classic-paper": "Classic ECG Paper",
  "dark-blue": "Dark Blue",
  "dark-gray": "Dark Gray",
  "hospital-black": "Hospital Black",
};

export function cycleGridPreset(current: EcgGridPreset): EcgGridPreset {
  const order: EcgGridPreset[] = ["classic-paper", "hospital-black", "dark-blue", "dark-gray"];
  const index = order.indexOf(current);
  return order[(index + 1) % order.length]!;
}

export function gridColorsForPreset(preset: EcgGridPreset, opacity: number, highContrast: boolean) {
  const base = GRID_PRESET_COLORS[preset];
  const boost = highContrast ? 1.35 : 1;
  return {
    ...base,
    major: base.major.replace(/[\d.]+\)$/, `${Math.min(1, opacity * 0.65 * boost)})`),
    minor: base.minor.replace(/[\d.]+\)$/, `${Math.min(1, opacity * 0.35 * boost)})`),
  };
}
