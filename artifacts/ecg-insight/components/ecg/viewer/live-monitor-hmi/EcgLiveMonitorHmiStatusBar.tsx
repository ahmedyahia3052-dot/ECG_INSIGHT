import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { EcgLiveMonitorHospitalHud } from "../live-monitor-v2/EcgLiveMonitorHospitalHud";
import type { MonitorAlarmState } from "../EcgLiveMonitorAlarmBar";
import { ECG_LIVE_MONITOR, ECG_LIVE_MONITOR_TYPO } from "../ecgLiveMonitorTokens";
import type { EcgLiveMonitorEngine } from "../useEcgLiveMonitorEngine";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { MonitorTelemetry } from "../live-monitor-v2/useMonitorTelemetry";
import { HMI_COLORS } from "./ecgLiveMonitorHmiTokens";

function IdentityCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.identityCell}>
      <Text style={styles.identityLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.identityValue}>
        {value}
      </Text>
    </View>
  );
}

/** Sprint 49 — ICU-grade top status bar with patient identity + acquisition telemetry. */
export const EcgLiveMonitorHmiStatusBar = memo(function EcgLiveMonitorHmiStatusBar({
  age,
  alarmState,
  controls,
  engine,
  filterLabel,
  fps,
  heartRate,
  hospital,
  isolatedLead,
  mrn,
  onReview,
  patientName,
  recordingTime,
  rhythm,
  samplingRate,
  sex,
  signalQuality,
  telemetry,
}: {
  age?: number;
  alarmState: MonitorAlarmState;
  controls: EcgViewerControls;
  engine: EcgLiveMonitorEngine;
  filterLabel: string;
  fps?: number;
  heartRate?: number;
  hospital?: string;
  isolatedLead?: string | null;
  mrn?: string;
  onReview?: () => void;
  patientName: string;
  recordingTime?: string;
  rhythm?: string;
  samplingRate?: string;
  sex?: string;
  signalQuality?: string;
  telemetry: MonitorTelemetry;
}) {
  const alarmTone = alarmState.leadOff || alarmState.noiseLevel === "high" ? "ALARM" : alarmState.acquisitionStatus === "live" ? "NORMAL" : "ADVISORY";

  return (
    <View style={styles.root} testID="sprint49-hmi-status-bar">
      <View style={styles.telemetryWrap}>
        <ScrollView horizontal contentContainerStyle={styles.identityScroll} showsHorizontalScrollIndicator={false}>
          <Text style={styles.liveBadge}>● LIVE</Text>
          <IdentityCell label="PATIENT" value={patientName} />
          <IdentityCell label="MRN" value={mrn ?? "—"} />
          <IdentityCell label="AGE" value={age != null ? `${age}` : "—"} />
          <IdentityCell label="SEX" value={sex ?? "—"} />
          <IdentityCell label="HOSPITAL" value={hospital ?? "ECG Insight"} />
          <IdentityCell label="REC" value={recordingTime ?? telemetry.clock} />
        </ScrollView>
        <EcgLiveMonitorHospitalHud
          alarmState={alarmState}
          controls={controls}
          engine={engine}
          filterLabel={filterLabel}
          fps={fps}
          heartRate={heartRate}
          isolatedLead={isolatedLead}
          patientId={mrn ?? patientName}
          rhythm={rhythm}
          signalQuality={signalQuality}
          telemetry={telemetry}
        />
        <View style={styles.extraMetrics}>
          <Text style={styles.extraMetric}>SAMPLING {samplingRate ?? "500 Hz"}</Text>
          <Text style={[styles.extraMetric, alarmTone === "ALARM" && styles.alarmMetric]} testID="sprint49-alarm-status">
            ALARM {alarmTone}
          </Text>
        </View>
      </View>
      {onReview ? (
        <View style={styles.actions} testID="sprint37-live-monitor-header">
          <PrimaryButton label="Review" onPress={onReview} variant="outline" />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  actions: { paddingHorizontal: 4, paddingVertical: 2 },
  alarmMetric: { color: ECG_LIVE_MONITOR.alarm },
  extraMetric: { color: HMI_COLORS.railMuted, fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  extraMetrics: { alignItems: "flex-end", gap: 2, justifyContent: "center", paddingRight: 6 },
  identityCell: { marginRight: 8, maxWidth: 100, minWidth: 44 },
  identityLabel: { ...ECG_LIVE_MONITOR_TYPO.label, color: ECG_LIVE_MONITOR.statusMuted, fontSize: 7 },
  identityScroll: { alignItems: "center", flexDirection: "row", gap: 4, paddingHorizontal: 4, paddingVertical: 2 },
  identityValue: { ...ECG_LIVE_MONITOR_TYPO.metric, color: ECG_LIVE_MONITOR.statusText, fontSize: 9 },
  liveBadge: { color: ECG_LIVE_MONITOR.phosphor, fontSize: 9, fontWeight: "900", letterSpacing: 1, marginRight: 4 },
  root: { alignItems: "center", backgroundColor: ECG_LIVE_MONITOR.background, flexDirection: "row", flexShrink: 0 },
  telemetryWrap: { flex: 1, flexDirection: "row", minHeight: 28 },
});
