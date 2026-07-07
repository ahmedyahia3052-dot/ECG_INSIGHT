import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { EcgLiveMonitorAlarmBar, type MonitorAlarmState } from "../EcgLiveMonitorAlarmBar";
import { ECG_LIVE_MONITOR, ECG_LIVE_MONITOR_TYPO } from "../ecgLiveMonitorTokens";
import type { EcgLiveMonitorEngine } from "../useEcgLiveMonitorEngine";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { MonitorTelemetry } from "./useMonitorTelemetry";

function HudCell({ label, tone = "normal", value }: { label: string; tone?: "alarm" | "live" | "muted" | "normal"; value: string }) {
  const color =
    tone === "alarm" ? ECG_LIVE_MONITOR.alarm : tone === "live" ? ECG_LIVE_MONITOR.phosphor : tone === "muted" ? ECG_LIVE_MONITOR.statusMuted : ECG_LIVE_MONITOR.statusText;
  return (
    <View style={styles.cell}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text numberOfLines={1} style={[styles.cellValue, { color }]}>
        {value}
      </Text>
    </View>
  );
}

/** Compact hospital acquisition HUD — real case/patient/telemetry data only. */
export const EcgLiveMonitorHospitalHud = memo(function EcgLiveMonitorHospitalHud({
  alarmState,
  controls,
  engine,
  filterLabel,
  fps,
  heartRate,
  isolatedLead,
  patientId,
  rhythm,
  signalQuality,
  telemetry,
}: {
  alarmState: MonitorAlarmState;
  controls: EcgViewerControls;
  engine: EcgLiveMonitorEngine;
  filterLabel: string;
  fps?: number;
  heartRate?: number;
  isolatedLead?: string | null;
  patientId: string;
  rhythm?: string;
  signalQuality?: string;
  telemetry: MonitorTelemetry;
}) {
  const playbackLabel = engine.frozen ? "FROZEN" : engine.isPlaying ? "LIVE" : "PAUSED";
  const hrTone = heartRate != null && (heartRate < 50 || heartRate > 120) ? "alarm" : "normal";
  const recordLabel = engine.recording ? "REC ●" : "STBY";
  const batteryLabel = telemetry.batteryLevel != null ? `${telemetry.batteryLevel}%` : "AC";
  const leadLabel = isolatedLead ?? (engine.layoutMode === "single" ? engine.rhythmStripLead : engine.layoutMode.toUpperCase());

  return (
    <View style={styles.root} testID="sprint45-hospital-hud">
      <View style={styles.alarmRow}>
        <EcgLiveMonitorAlarmBar state={alarmState} />
      </View>
      <ScrollView horizontal contentContainerStyle={styles.metricRow} showsHorizontalScrollIndicator={false} testID="sprint37-live-monitor-status">
        <HudCell label="HR" tone={hrTone} value={`${heartRate ?? "--"} BPM`} />
        <HudCell label="RHYTHM" value={rhythm ?? "Pending"} />
        <HudCell label="GAIN" value={`${controls.grid.gain} mm/mV`} />
        <HudCell label="SPEED" value={`${controls.grid.speed} mm/s`} />
        <HudCell label="FILTER" value={filterLabel} />
        <HudCell label="LEAD" value={String(leadLabel)} />
        <HudCell label="SIGNAL" value={signalQuality ?? "Unknown"} />
        <HudCell label="NOISE" tone={alarmState.noiseLevel === "high" ? "alarm" : "normal"} value={alarmState.noiseLevel.toUpperCase()} />
        <HudCell label="BATTERY" value={batteryLabel} />
        <HudCell label="CONN" tone={telemetry.connection === "online" ? "live" : "muted"} value={telemetry.connection.toUpperCase()} />
        <HudCell label="REC" tone={engine.recording ? "alarm" : "muted"} value={recordLabel} />
        <HudCell label="TIME" value={telemetry.clock} />
        <HudCell label="PATIENT" value={patientId} />
        <HudCell label="PLAY" tone={engine.isPlaying ? "live" : "muted"} value={playbackLabel} />
        {engine.reviewMode ? <HudCell label="MODE" tone="live" value="REVIEW" /> : null}
        {fps != null ? <HudCell label="FPS" tone={fps >= 55 ? "live" : "alarm"} value={`${fps}`} /> : null}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  alarmRow: { flexShrink: 0, maxWidth: "42%" },
  cell: {
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 3,
    borderWidth: 1,
    minWidth: 58,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cellLabel: { ...ECG_LIVE_MONITOR_TYPO.label, color: ECG_LIVE_MONITOR.statusMuted, fontSize: 7 },
  cellValue: { ...ECG_LIVE_MONITOR_TYPO.metric, fontSize: 9, marginTop: 1 },
  metricRow: { alignItems: "center", flex: 1, flexDirection: "row", gap: 3, paddingLeft: 4 },
  root: {
    backgroundColor: ECG_LIVE_MONITOR.background,
    borderBottomColor: ECG_LIVE_MONITOR.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexShrink: 0,
    gap: 4,
    minHeight: 28,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});
