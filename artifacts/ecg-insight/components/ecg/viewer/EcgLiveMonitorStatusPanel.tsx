import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ECG_LIVE_MONITOR, ECG_LIVE_MONITOR_TYPO } from "./ecgLiveMonitorTokens";
import type { EcgLiveMonitorEngine } from "./useEcgLiveMonitorEngine";
import type { EcgViewerControls } from "./useEcgViewerControls";

export const EcgLiveMonitorStatusPanel = memo(function EcgLiveMonitorStatusPanel({
  compact = false,
  controls,
  engine,
  fps,
  heartRate,
  rhythm,
  signalQuality,
}: {
  compact?: boolean;
  controls: EcgViewerControls;
  engine: EcgLiveMonitorEngine;
  fps?: number;
  heartRate?: number;
  rhythm?: string;
  signalQuality?: string;
}) {
  const playbackLabel = engine.frozen ? "FROZEN" : engine.isPlaying ? "LIVE" : "PAUSED";
  const recordLabel = engine.recording ? "REC ●" : "STBY";

  return (
    <View style={[styles.root, compact && styles.rootCompact]} testID="sprint37-live-monitor-status">
      <StatusCell compact={compact} label="HR" tone={heartRate != null && (heartRate < 50 || heartRate > 120) ? "alarm" : "normal"} value={`${heartRate ?? "--"} BPM`} />
      <StatusCell compact={compact} label="RHYTHM" value={rhythm ?? "Pending"} />
      <StatusCell compact={compact} label="SIGNAL" value={signalQuality ?? "Unknown"} />
      <StatusCell compact={compact} label="GAIN" value={`${controls.grid.gain} mm/mV`} />
      <StatusCell compact={compact} label="SPEED" value={`${controls.grid.speed} mm/s`} />
      <StatusCell compact={compact} label="GRID" value={controls.grid.visible ? "ON" : "OFF"} />
      <StatusCell compact={compact} label="ZOOM" value={`${Math.round(controls.transform.zoom * 100)}%`} />
      <StatusCell compact={compact} label="PLAYBACK" tone={engine.isPlaying ? "live" : "muted"} value={playbackLabel} />
      <StatusCell compact={compact} label="RECORD" tone={engine.recording ? "alarm" : "muted"} value={recordLabel} />
      {!compact && fps != null ? <StatusCell label="FPS" tone={fps >= 55 ? "live" : "alarm"} value={`${fps}`} /> : null}
      {!compact ? <StatusCell label="LOOP" value={engine.loop ? "ON" : "OFF"} /> : null}
      {!compact && engine.rhythmStripMode ? <StatusCell label="MODE" value="RHYTHM STRIP" tone="live" /> : null}
    </View>
  );
});

function StatusCell({
  compact,
  label,
  tone = "normal",
  value,
}: {
  compact?: boolean;
  label: string;
  tone?: "alarm" | "live" | "muted" | "normal";
  value: string;
}) {
  const valueColor =
    tone === "alarm" ? ECG_LIVE_MONITOR.alarm : tone === "live" ? ECG_LIVE_MONITOR.phosphor : tone === "muted" ? ECG_LIVE_MONITOR.statusMuted : ECG_LIVE_MONITOR.statusText;

  return (
    <View style={[styles.cell, compact && styles.cellCompact]}>
      <Text style={styles.label}>{label}</Text>
      <Text numberOfLines={1} style={[styles.value, compact && styles.valueCompact, { color: valueColor }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 88,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  cellCompact: { minWidth: 72, paddingHorizontal: 8, paddingVertical: 6 },
  label: { ...ECG_LIVE_MONITOR_TYPO.label, color: ECG_LIVE_MONITOR.statusMuted },
  root: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  rootCompact: { gap: 6, paddingHorizontal: 8, paddingVertical: 6 },
  value: { ...ECG_LIVE_MONITOR_TYPO.metric, color: ECG_LIVE_MONITOR.statusText, marginTop: 2 },
  valueCompact: { fontSize: 11 },
});
