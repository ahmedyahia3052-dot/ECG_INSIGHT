import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ECG_LIVE_MONITOR, ECG_LIVE_MONITOR_TYPO } from "../ecgLiveMonitorTokens";
import type { MonitorIntervalMetrics } from "./computeMonitorIntervals";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.cell}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

/** Sprint 50 — Philips/GE-style interval HUD overlay. */
export const EcgLiveMonitorProHud = memo(function EcgLiveMonitorProHud({
  audioMode,
  battery,
  filter,
  fps,
  gain,
  heartRate,
  intervals,
  noise,
  recording,
  samplingRate,
  signalQuality,
  speed,
  timestamp,
}: {
  audioMode?: string;
  battery?: string;
  filter: string;
  fps?: number;
  gain: number;
  heartRate?: number;
  intervals: MonitorIntervalMetrics;
  noise?: string;
  recording?: boolean;
  samplingRate?: string;
  signalQuality?: string;
  speed: number;
  timestamp: string;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.row}
      showsHorizontalScrollIndicator={false}
      testID="sprint50-pro-hud"
    >
      <Metric label="HR" value={`${heartRate ?? "--"} bpm`} />
      <Metric label="RR" value={intervals.rrMs != null ? `${intervals.rrMs} ms` : "--"} />
      <Metric label="PR" value={intervals.prMs != null ? `${intervals.prMs} ms` : "--"} />
      <Metric label="QRS" value={intervals.qrsMs != null ? `${intervals.qrsMs} ms` : "--"} />
      <Metric label="QT" value={intervals.qtMs != null ? `${intervals.qtMs} ms` : "--"} />
      <Metric label="QTc" value={intervals.qtcMs != null ? `${intervals.qtcMs} ms` : "--"} />
      <Metric label="RATE" value={samplingRate ?? "500 Hz"} />
      <Metric label="SPEED" value={`${speed} mm/s`} />
      <Metric label="GAIN" value={`${gain} mm/mV`} />
      <Metric label="FILTER" value={filter} />
      <Metric label="REC" value={recording ? "● ON" : "OFF"} />
      <Metric label="SIG" value={signalQuality ?? "--"} />
      <Metric label="NOISE" value={noise ?? "--"} />
      <Metric label="BAT" value={battery ?? "AC"} />
      <Metric label="TIME" value={timestamp} />
      {audioMode ? <Metric label="AUDIO" value={audioMode} /> : null}
      {fps != null ? <Metric label="FPS" value={`${fps}`} /> : null}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  cell: {
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 3,
    borderWidth: 1,
    marginRight: 3,
    minWidth: 52,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  label: { ...ECG_LIVE_MONITOR_TYPO.label, color: ECG_LIVE_MONITOR.statusMuted, fontSize: 7 },
  row: { alignItems: "center", flexDirection: "row", paddingHorizontal: 4, paddingVertical: 2 },
  value: { ...ECG_LIVE_MONITOR_TYPO.metric, color: ECG_LIVE_MONITOR.statusText, fontSize: 9, marginTop: 1 },
});

export const EcgLiveMonitorAudioControls = memo(function EcgLiveMonitorAudioControls({
  alarmVolume,
  audioEnabled,
  mode,
  onCycleMode,
  onToggleEnabled,
  onToggleMute,
  profileLabel,
  volume,
}: {
  alarmVolume: number;
  audioEnabled: boolean;
  mode: string;
  onCycleMode: () => void;
  onToggleEnabled: () => void;
  onToggleMute: () => void;
  profileLabel?: string;
  volume: number;
}) {
  return (
    <View style={audioStyles.root} testID="sprint50-audio-controls">
      <Pressable onPress={onCycleMode} style={audioStyles.chip}>
        <Text style={audioStyles.chipText}>Audio {mode}</Text>
      </Pressable>
      <Pressable onPress={onToggleMute} style={audioStyles.chip}>
        <Text style={audioStyles.chipText}>{volume > 0 ? "Mute" : "Unmute"}</Text>
      </Pressable>
      <Pressable onPress={onToggleEnabled} style={audioStyles.chip}>
        <Text style={audioStyles.chipText}>{audioEnabled ? "Disable" : "Enable"}</Text>
      </Pressable>
      {profileLabel ? (
        <View style={audioStyles.chip}>
          <Text style={audioStyles.chipText}>Profile {profileLabel}</Text>
        </View>
      ) : null}
      <View style={audioStyles.chip}>
        <Text style={audioStyles.chipText}>Vol {Math.round(volume * 100)}%</Text>
      </View>
      <View style={audioStyles.chip}>
        <Text style={audioStyles.chipText}>Alarm {Math.round(alarmVolume * 100)}%</Text>
      </View>
    </View>
  );
});

const audioStyles = StyleSheet.create({
  chip: {
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipText: { color: ECG_LIVE_MONITOR.statusText, fontSize: 9, fontWeight: "800" },
  root: { flexDirection: "row", flexWrap: "wrap", gap: 4, paddingHorizontal: 4, paddingVertical: 2 },
});
