import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ECG_LIVE_MONITOR } from "./ecgLiveMonitorTokens";

export type MonitorAlarmState = {
  acquisitionStatus: "live" | "paused" | "frozen" | "review" | "no_signal";
  heartRate?: number;
  leadOff: boolean;
  noiseLevel: "low" | "medium" | "high";
  signalQualityLabel: string;
};

function toneForHr(hr?: number): "alarm" | "normal" {
  if (hr == null) return "normal";
  if (hr < 50 || hr > 120) return "alarm";
  return "normal";
}

export const EcgLiveMonitorAlarmBar = memo(function EcgLiveMonitorAlarmBar({ state }: { state: MonitorAlarmState }) {
  const hrTone = toneForHr(state.heartRate);
  const signalTone = state.noiseLevel === "high" || state.leadOff ? "alarm" : state.noiseLevel === "medium" ? "warn" : "normal";

  return (
    <View accessibilityRole="summary" style={styles.root} testID="sprint41-live-monitor-alarm-bar">
      <AlarmChip label="HR" testId="sprint41-alarm-hr" tone={hrTone} value={state.heartRate != null ? `${state.heartRate} BPM` : "--"} />
      <AlarmChip label="SIGNAL" testId="sprint41-alarm-signal" tone={signalTone} value={state.signalQualityLabel} />
      <AlarmChip label="LEAD" testId="sprint41-alarm-lead" tone={state.leadOff ? "alarm" : "normal"} value={state.leadOff ? "LEAD OFF" : "ATTACHED"} />
      <AlarmChip label="NOISE" testId="sprint41-alarm-noise" tone={state.noiseLevel === "high" ? "alarm" : "normal"} value={state.noiseLevel.toUpperCase()} />
      <AlarmChip
        label="ACQ"
        testId="sprint41-alarm-acq"
        tone={state.acquisitionStatus === "no_signal" ? "alarm" : state.acquisitionStatus === "live" ? "live" : "warn"}
        value={state.acquisitionStatus.replace("_", " ").toUpperCase()}
      />
    </View>
  );
});

function AlarmChip({
  label,
  testId,
  tone,
  value,
}: {
  label: string;
  testId: string;
  tone: "alarm" | "live" | "normal" | "warn";
  value: string;
}) {
  const colors = {
    alarm: { bg: "rgba(127,29,29,0.55)", border: "#F87171", text: "#FCA5A5" },
    live: { bg: "rgba(6,78,59,0.55)", border: "#22C55E", text: "#86EFAC" },
    normal: { bg: ECG_LIVE_MONITOR.overlay, border: ECG_LIVE_MONITOR.border, text: ECG_LIVE_MONITOR.statusText },
    warn: { bg: "rgba(120,53,15,0.45)", border: "#FACC15", text: "#FDE68A" },
  }[tone];

  return (
    <View accessibilityLabel={`${label} ${value}`} style={[styles.chip, { backgroundColor: colors.bg, borderColor: colors.border }]} testID={testId}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text numberOfLines={1} style={[styles.chipValue, { color: colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 4, borderWidth: 1, flex: 1, minWidth: 72, paddingHorizontal: 6, paddingVertical: 3 },
  chipLabel: { color: ECG_LIVE_MONITOR.statusMuted, fontSize: 8, fontWeight: "800", letterSpacing: 0.8 },
  chipValue: { fontSize: 10, fontWeight: "900", marginTop: 1 },
  root: { flex: 1, flexDirection: "row", flexWrap: "nowrap", gap: 4, paddingHorizontal: 0, paddingVertical: 0 },
});
