import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import type { EnterpriseStatusMetrics } from "./useEnterpriseStatusMetrics";

function StatusChip({ label, testID, value }: { label: string; testID?: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue} numberOfLines={1} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

/** Sprint 28 — enterprise status bar with clinical rendering telemetry. */
export function EcgEnterpriseStatusBar({
  apiStatus,
  canvasResolution,
  coordinates,
  cpuUsage,
  fps,
  gain,
  gpuRenderer,
  gridVisible,
  lead,
  memory,
  paperSpeed,
  patientName,
  renderMode,
  renderTimeMs,
  renderingMode,
  signalQuality,
  zoom,
}: {
  aiStatus?: string;
  apiStatus?: string;
  autoRefresh?: string;
  backendStatus?: EnterpriseStatusMetrics["backendStatus"];
  canvasResolution?: string;
  coordinates?: string;
  cpuUsage?: number;
  digitizationQuality?: string;
  fps?: number;
  gain?: number;
  gpuRenderer?: string;
  gridVisible?: boolean;
  lead?: string;
  memory?: { jsHeapMb?: number; jsHeapLimitMb?: number };
  monitorState?: string;
  paperSpeed?: number;
  patientName?: string;
  renderMode?: string;
  renderTimeMs?: number;
  renderingMode?: string;
  signalQuality?: string;
  transport?: string;
  zoom: number;
}) {
  const mode = renderMode ?? renderingMode ?? "SVG";
  const memLabel = memory?.jsHeapMb ? `${memory.jsHeapMb}MB` : "—";
  return (
    <View style={styles.bar} testID="sprint29-enterprise-status-bar" nativeID="sprint28-enterprise-status-bar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {patientName ? <StatusChip label="Patient" testID="sprint24-status-patient" value={patientName} /> : null}
        <StatusChip label="Zoom" testID="sprint17-status-zoom" value={`${Math.round(zoom * 100)}%`} />
        {lead ? <StatusChip label="Lead" testID="sprint17-status-lead" value={lead} /> : null}
        <StatusChip label="Gain" testID="sprint17-status-gain" value={`${gain ?? 10}`} />
        <StatusChip label="Speed" testID="sprint17-status-paper-speed" value={`${paperSpeed ?? 25}`} />
        <StatusChip label="Grid" testID="sprint28-status-grid" value={gridVisible === false ? "Off" : "On"} />
        {typeof fps === "number" ? <StatusChip label="FPS" testID="sprint17-status-fps" value={`${fps}`} /> : null}
        {gpuRenderer ? <StatusChip label="GPU" testID="sprint28-status-gpu" value={gpuRenderer} /> : null}
        {typeof cpuUsage === "number" ? <StatusChip label="CPU" testID="sprint28-status-cpu" value={`${cpuUsage}%`} /> : null}
        <StatusChip label="Mem" testID="sprint28-status-memory" value={memLabel} />
        {canvasResolution ? <StatusChip label="Canvas" testID="sprint28-status-canvas" value={canvasResolution} /> : null}
        {coordinates ? <StatusChip label="XY" testID="sprint29-status-coordinates" value={coordinates} /> : null}
        {typeof renderTimeMs === "number" ? <StatusChip label="Frame" testID="sprint28-status-frame" value={`${renderTimeMs}ms`} /> : null}
        <StatusChip label="Render" testID="sprint28-status-render-mode" value={mode} />
        {signalQuality ? <StatusChip label="Signal" testID="sprint28-status-signal-quality" value={signalQuality} /> : null}
        <StatusChip label="API" testID="sprint24-status-api" value={apiStatus ?? "Online"} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#06111F",
    borderColor: medicalTheme.border,
    borderRadius: 4,
    borderWidth: 1,
    height: ECG_WORKSTATION_VISUAL.statusBarHeight,
    justifyContent: "center",
    overflow: "hidden",
  },
  chip: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 6,
  },
  chipLabel: { color: medicalTheme.muted, fontSize: 8, fontWeight: "900" },
  chipValue: { color: medicalTheme.text, fontSize: 10, fontWeight: "900", maxWidth: 120 },
  row: { alignItems: "center", flexDirection: "row", gap: 6, paddingHorizontal: 6 },
});
