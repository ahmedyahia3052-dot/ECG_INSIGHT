/** Sprint 37 — hospital bedside monitor visual tokens */
export const ECG_LIVE_MONITOR = {
  alarm: "#FACC15",
  background: "#010409",
  border: "#14532D",
  canvasBackground: "#020617",
  critical: "#F87171",
  gridMajor: "#064E3B",
  gridMinor: "#022C22",
  overlay: "rgba(2, 6, 23, 0.88)",
  phosphor: "#22C55E",
  statusMuted: "#64748B",
  statusText: "#86EFAC",
  waveform: "#22C55E",
} as const;

export const ECG_LIVE_MONITOR_TYPO = {
  label: { fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.2 },
  metric: { fontSize: 13, fontWeight: "900" as const, letterSpacing: 0.6 },
  title: { fontSize: 14, fontWeight: "900" as const, letterSpacing: 1.4 },
};
