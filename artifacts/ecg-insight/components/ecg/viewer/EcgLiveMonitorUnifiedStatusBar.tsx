import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { EcgLiveMonitorAlarmBar, type MonitorAlarmState } from "./EcgLiveMonitorAlarmBar";
import { ECG_LIVE_MONITOR, ECG_LIVE_MONITOR_TYPO } from "./ecgLiveMonitorTokens";
import type { EcgLiveMonitorEngine } from "./useEcgLiveMonitorEngine";
import type { EcgViewerControls } from "./useEcgViewerControls";

function Metric({ label, tone = "normal", value }: { label: string; tone?: "alarm" | "live" | "muted" | "normal"; value: string }) {
  const color =
    tone === "alarm" ? ECG_LIVE_MONITOR.alarm : tone === "live" ? ECG_LIVE_MONITOR.phosphor : tone === "muted" ? ECG_LIVE_MONITOR.statusMuted : ECG_LIVE_MONITOR.statusText;
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text numberOfLines={1} style={[styles.metricValue, { color }]}>
        {value}
      </Text>
    </View>
  );
}

/** Single compact row: alarm chips + transport metrics (replaces separate alarm + status panels). */
export const EcgLiveMonitorUnifiedStatusBar = memo(function EcgLiveMonitorUnifiedStatusBar({
  alarmState,
  controls,
  engine,
  fps,
  heartRate,
  rhythm,
  signalQuality,
}: {
  alarmState: MonitorAlarmState;
  controls: EcgViewerControls;
  engine: EcgLiveMonitorEngine;
  fps?: number;
  heartRate?: number;
  rhythm?: string;
  signalQuality?: string;
}) {
  const playbackLabel = engine.frozen ? "FROZEN" : engine.isPlaying ? "LIVE" : "PAUSED";
  const hrTone = heartRate != null && (heartRate < 50 || heartRate > 120) ? "alarm" : "normal";

  return (
    <View style={styles.root} testID="sprint41-live-monitor-unified-status">
      <View style={styles.alarmWrap}>
        <EcgLiveMonitorAlarmBar state={alarmState} />
      </View>
      <ScrollView horizontal contentContainerStyle={styles.metricRow} showsHorizontalScrollIndicator={false} testID="sprint37-live-monitor-status">
        <Metric label="HR" tone={hrTone} value={`${heartRate ?? "--"} BPM`} />
        <Metric label="RHYTHM" value={rhythm ?? "Pending"} />
        <Metric label="SIGNAL" value={signalQuality ?? "Unknown"} />
        <Metric label="GAIN" value={`${controls.grid.gain} mm/mV`} />
        <Metric label="SPD" value={`${controls.grid.speed} mm/s`} />
        <Metric label="PLAY" tone={engine.isPlaying ? "live" : "muted"} value={playbackLabel} />
        {engine.reviewMode ? <Metric label="MODE" tone="live" value="REVIEW" /> : null}
        {engine.layoutMode !== "single" ? <Metric label="LAY" tone="live" value={engine.layoutMode.toUpperCase()} /> : null}
        {engine.rhythmStripMode ? <Metric label="STR" tone="live" value={String(engine.rhythmStripLead)} /> : null}
        {fps != null ? <Metric label="FPS" tone={fps >= 55 ? "live" : "alarm"} value={`${fps}`} /> : null}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  alarmWrap: { flexShrink: 0 },
  metric: {
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 4,
    borderWidth: 1,
    minWidth: 64,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  metricLabel: { ...ECG_LIVE_MONITOR_TYPO.label, color: ECG_LIVE_MONITOR.statusMuted, fontSize: 8 },
  metricRow: { alignItems: "center", flexDirection: "row", gap: 4, paddingRight: 4 },
  metricValue: { ...ECG_LIVE_MONITOR_TYPO.metric, fontSize: 10, marginTop: 1 },
  root: {
    backgroundColor: ECG_LIVE_MONITOR.background,
    borderBottomColor: ECG_LIVE_MONITOR.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
});
