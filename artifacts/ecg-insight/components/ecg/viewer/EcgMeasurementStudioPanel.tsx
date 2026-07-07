import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { EcgMeasurementsPanel } from "./EcgMeasurementsPanel";
import type { EcgClinicalFindingsModel } from "./types";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

function StudioMetric({
  confidence,
  label,
  source,
  value,
}: {
  confidence?: string;
  label: string;
  source?: string;
  value: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      {source ? <Text style={styles.metricSource}>{source}</Text> : null}
      <Text style={styles.metricValue}>{value}</Text>
      {confidence ? <Text style={styles.metricConfidence}>{confidence}</Text> : null}
    </View>
  );
}

export const EcgMeasurementStudioPanel = memo(function EcgMeasurementStudioPanel({
  digitalEcg,
  findings,
  workspace,
}: {
  digitalEcg?: DigitalEcg | null;
  findings: EcgClinicalFindingsModel;
  workspace: EcgMeasurementWorkspace;
}) {
  const engine = digitalEcg?.measurementEngine;
  const calibrationConfidence =
    digitalEcg?.calibration?.confidence != null ? `${Math.round(digitalEcg.calibration.confidence * 100)}% engine confidence` : undefined;
  const stMm = engine?.stDeviation ?? engine?.amplitudes?.stDeviationMm;
  const stDisplay = stMm != null ? `${stMm > 0 ? "+" : ""}${Number(stMm).toFixed(1)} mm` : findings.prInterval.value === "Pending" ? "Pending" : stMm != null ? String(stMm) : "Pending";

  return (
    <View style={styles.root} testID="sprint30-measurement-studio">
      <Text style={styles.title}>Measurement Studio</Text>
      <View style={styles.grid}>
        <StudioMetric confidence={calibrationConfidence} label="Heart Rate" source={findings.heartRate.source} value={findings.heartRate.value} />
        <StudioMetric label="PR" source={findings.prInterval.source} value={findings.prInterval.value} />
        <StudioMetric label="QRS" source={findings.qrsDuration.source} value={findings.qrsDuration.value} />
        <StudioMetric label="QT" source={findings.qtInterval.source} value={findings.qtInterval.value} />
        <StudioMetric label="QTc" source={findings.qtcInterval.source} value={findings.qtcInterval.value} />
        <StudioMetric label="RR" source={digitalEcg ? "Digital ECG" : "Pending"} value={digitalEcg?.measurements?.rrIntervalMs != null ? `${Math.round(digitalEcg.measurements.rrIntervalMs)} ms` : "Pending"} />
        <StudioMetric label="Axis" source={findings.axis.source} value={findings.axis.value} />
        <StudioMetric label="ST Deviation" source={engine ? "Digital ECG" : "Pending"} value={stDisplay} />
        <StudioMetric label="P Duration" source={engine ? "Digital ECG" : "Pending"} value={engine?.intervals?.pWaveDurationMs != null ? `${Math.round(engine.intervals.pWaveDurationMs)} ms` : "Pending"} />
        <StudioMetric label="T Wave" source={engine ? "Digital ECG" : "Pending"} value={engine?.amplitudes?.tWaveAmplitudeMv != null ? `${engine.amplitudes.tWaveAmplitudeMv.toFixed(2)} mV` : "Pending"} />
        <StudioMetric label="Voltage" source={engine ? "Digital ECG" : "Pending"} value={engine?.amplitudes?.qrsAmplitudeMv != null ? `${engine.amplitudes.qrsAmplitudeMv.toFixed(2)} mV` : "Pending"} />
      </View>
      <Text style={styles.section}>Manual Correction</Text>
      <EcgMeasurementsPanel workspace={workspace} />
      <Text style={styles.audit}>Audit history and manual overrides are persisted with auto-save.</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  audit: { color: medicalTheme.muted, fontSize: 9, fontStyle: "italic" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: {
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "47%",
    gap: 2,
    minWidth: 120,
    padding: 8,
  },
  metricConfidence: { color: medicalTheme.success, fontSize: 8, fontWeight: "700" },
  metricLabel: { color: medicalTheme.muted, fontSize: 9, fontWeight: "800" },
  metricSource: { color: medicalTheme.muted, fontSize: 8, fontWeight: "600" },
  metricValue: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  root: { gap: 10 },
  section: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900" },
  title: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900" },
});
