import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EcgCrosshairTelemetry } from "./clinical-visualization/types";

export const EcgClinicalCrosshairPanel = memo(function EcgClinicalCrosshairPanel({
  telemetry,
  visible,
}: {
  telemetry: EcgCrosshairTelemetry | null;
  visible: boolean;
}) {
  if (!visible || !telemetry) return null;
  return (
    <View pointerEvents="none" style={styles.panel} testID="sprint28-clinical-crosshair-panel">
      <Text style={styles.title}>Crosshair</Text>
      <Row label="Lead" value={telemetry.lead ?? "—"} />
      <Row label="Time" value={telemetry.timeLabel} />
      <Row label="Voltage" value={telemetry.voltageLabel} />
      <Row label="Sample" value={`#${telemetry.sampleIndex}`} />
      <Row label="X/Y" value={`${telemetry.x.toFixed(0)}, ${telemetry.y.toFixed(0)}`} />
    </View>
  );
});

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: medicalTheme.muted, fontSize: 9, fontWeight: "700", width: 52 },
  panel: {
    backgroundColor: "rgba(6,17,31,0.88)",
    borderColor: "rgba(20,221,230,0.35)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
    right: 12,
    top: 12,
    zIndex: 30,
  },
  row: { alignItems: "center", flexDirection: "row", gap: 6 },
  title: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", marginBottom: 4 },
  value: { color: medicalTheme.text, fontFamily: "monospace", fontSize: 10, fontWeight: "700" },
});
