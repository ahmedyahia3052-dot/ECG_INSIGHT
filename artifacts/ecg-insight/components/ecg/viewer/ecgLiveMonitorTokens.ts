/** Sprint 37 — hospital bedside monitor visual tokens */
export const ECG_LIVE_MONITOR = {
  alarm: "#FACC15",
  background: "#010409",
  border: "#14532D",
  canvasBackground: "#020617",
  critical: "#F87171",
  gridMajor: "#108758",
  gridMinor: "#0A4D3A",
  overlay: "rgba(2, 6, 23, 0.88)",
  phosphor: "#22C55E",
  statusMuted: "#64748B",
  statusText: "#86EFAC",
  waveform: "#22C55E",
  chromeCompact: 32,
  canvasViewportRatio: 0.93,
} as const;

export const ECG_LIVE_MONITOR_TYPO = {
  label: { fontSize: 9, fontWeight: "800" as const, letterSpacing: 0.8 },
  metric: { fontSize: 11, fontWeight: "900" as const, letterSpacing: 0.4 },
  title: { fontSize: 12, fontWeight: "900" as const, letterSpacing: 1.1 },
};
