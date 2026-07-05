import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EnterpriseStatusMetrics } from "./useEnterpriseStatusMetrics";

function StatusChip({ label, testID, value }: { label: string; testID?: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

export function EcgEnterpriseStatusBar({
  aiStatus,
  backendStatus,
  coordinates,
  digitizationQuality,
  fps,
  gain,
  gpuRenderer,
  lead,
  memory,
  monitorState,
  paperSpeed,
  renderTimeMs,
  signalQuality,
  transport,
  zoom,
}: {
  aiStatus?: string;
  backendStatus?: EnterpriseStatusMetrics["backendStatus"];
  coordinates?: string;
  digitizationQuality?: string;
  fps?: number;
  gain?: number;
  gpuRenderer?: string;
  lead?: string;
  memory?: { jsHeapMb?: number; jsHeapLimitMb?: number };
  monitorState?: string;
  paperSpeed?: number;
  renderTimeMs?: number;
  signalQuality?: string;
  transport?: string;
  zoom: number;
}) {
  const memoryLabel =
    memory?.jsHeapMb != null ? `${memory.jsHeapMb}${memory.jsHeapLimitMb ? `/${memory.jsHeapLimitMb}` : ""} MB` : "N/A";

  return (
    <View style={styles.bar} testID="sprint21-enterprise-status-bar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <StatusChip label="Zoom" testID="sprint17-status-zoom" value={`${Math.round(zoom * 100)}%`} />
        {lead ? <StatusChip label="Lead" testID="sprint17-status-lead" value={lead} /> : null}
        <StatusChip label="Speed" testID="sprint17-status-paper-speed" value={`${paperSpeed ?? 25} mm/s`} />
        <StatusChip label="Gain" testID="sprint17-status-gain" value={`${gain ?? 10} mm/mV`} />
        {typeof fps === "number" ? <StatusChip label="FPS" testID="sprint17-status-fps" value={`${fps}`} /> : null}
        <StatusChip label="GPU" testID="sprint21-status-gpu" value={gpuRenderer ?? "Canvas"} />
        <StatusChip label="Memory" testID="sprint21-status-memory" value={memoryLabel} />
        <StatusChip label="Render" testID="sprint21-status-render" value={`${renderTimeMs ?? 0} ms`} />
        {signalQuality ? <StatusChip label="Signal" testID="sprint17-status-signal" value={signalQuality} /> : null}
        {digitizationQuality ? <StatusChip label="Digitize" testID="sprint17-status-digitization" value={digitizationQuality} /> : null}
        {coordinates ? <StatusChip label="Coords" testID="sprint17-status-coords" value={coordinates} /> : null}
        {monitorState ? <StatusChip label="Monitor" testID="sprint19-status-monitor" value={monitorState} /> : null}
        <StatusChip label="AI" testID="sprint21-status-ai" value={aiStatus ?? "Idle"} />
        <StatusChip label="Backend" testID="sprint21-status-backend" value={backendStatus === "healthy" ? "Online" : backendStatus === "checking" ? "Checking" : "Offline"} />
        <StatusChip label="Transport" testID="sprint21-status-transport" value={transport ?? "REST"} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#06111F",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
  },
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: "rgba(30,58,74,0.65)",
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 72,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipLabel: { color: medicalTheme.muted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  chipValue: { color: medicalTheme.text, fontSize: 11, fontWeight: "900", marginTop: 1 },
  row: { alignItems: "center", gap: 8, paddingHorizontal: 8, paddingVertical: 6 },
});
