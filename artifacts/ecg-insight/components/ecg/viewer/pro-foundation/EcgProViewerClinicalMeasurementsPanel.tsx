import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ClinicalMeasurementSnapshot } from "@/services/clinicalMeasurementApi";

import type { EcgMeasurementWorkspace } from "../useEcgMeasurementWorkspace";
import type { EcgProViewerTheme } from "./types";
import { ECG_PRO_VIEWER_THEMES } from "./types";

type Props = {
  autoPending?: boolean;
  onAutoMeasure?: () => void;
  onSaveManual?: () => void;
  record?: ClinicalMeasurementSnapshot | null;
  savePending?: boolean;
  theme: EcgProViewerTheme;
  workspace?: EcgMeasurementWorkspace;
};

function formatValue(value: number | null | undefined, unit: string) {
  if (value === null || value === undefined) return "—";
  return `${Math.round(value)} ${unit}`;
}

function formatAxis(value: number | null | undefined) {
  if (value === null || value === undefined) return "AI pending";
  return `${Math.round(value)}°`;
}

export function EcgProViewerClinicalMeasurementsPanel({
  autoPending,
  onAutoMeasure,
  onSaveManual,
  record,
  savePending,
  theme,
}: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  const rows = useMemo(
    () => [
      { label: "Heart Rate", value: formatValue(record?.heartRate, "bpm") },
      { label: "RR", value: formatValue(record?.rrIntervalMs, "ms") },
      { label: "PR", value: formatValue(record?.prIntervalMs, "ms") },
      { label: "QRS", value: formatValue(record?.qrsDurationMs, "ms") },
      { label: "QT", value: formatValue(record?.qtIntervalMs, "ms") },
      { label: "QTc", value: formatValue(record?.qtcIntervalMs, "ms") },
      { label: "P Duration", value: formatValue(record?.pDurationMs, "ms") },
      { label: "ST Level", value: formatValue(record?.stLevelMm, "mm") },
      { label: "T Wave Duration", value: formatValue(record?.tWaveDurationMs, "ms") },
      { label: "P Axis", value: formatAxis(record?.pAxisDeg) },
      { label: "QRS Axis", value: formatAxis(record?.qrsAxisDeg) },
      { label: "T Axis", value: formatAxis(record?.tAxisDeg) },
      { label: "Electrical Axis", value: formatAxis(record?.electricalAxisDeg) },
    ],
    [record],
  );

  return (
    <View style={[styles.root, { backgroundColor: palette.panel, borderTopColor: palette.border }]} testID="sprint96-clinical-measurements-panel">
      <Text style={[styles.title, { color: palette.muted }]}>CLINICAL MEASUREMENTS</Text>
      <ScrollView contentContainerStyle={styles.body} horizontal showsHorizontalScrollIndicator={false}>
        {rows.map((row) => (
          <View key={row.label} style={[styles.chip, { borderColor: palette.border }]}>
            <Text style={[styles.chipLabel, { color: palette.muted }]}>{row.label}</Text>
            <Text style={[styles.chipValue, { color: palette.text }]}>{row.value}</Text>
          </View>
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={autoPending}
          onPress={onAutoMeasure}
          style={[styles.button, { backgroundColor: palette.border }]}
          testID="sprint96-auto-measurement"
        >
          {autoPending ? <ActivityIndicator color={palette.text} size="small" /> : null}
          <Text style={[styles.buttonText, { color: palette.text }]}>Auto Measure</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={savePending}
          onPress={onSaveManual}
          style={[styles.button, styles.buttonOutline, { borderColor: palette.border }]}
          testID="sprint96-save-manual-measurement"
        >
          {savePending ? <ActivityIndicator color={palette.text} size="small" /> : null}
          <Text style={[styles.buttonText, { color: palette.text }]}>Save Manual</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  body: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
  button: { alignItems: "center", borderRadius: 10, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", paddingVertical: 10 },
  buttonOutline: { backgroundColor: "transparent", borderWidth: 1 },
  buttonText: { fontSize: 12, fontWeight: "700" },
  chip: { borderRadius: 10, borderWidth: 1, minWidth: 108, paddingHorizontal: 10, paddingVertical: 8 },
  chipLabel: { fontSize: 10, fontWeight: "700" },
  chipValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  root: { borderTopWidth: 1 },
  title: { fontSize: 11, fontWeight: "800", letterSpacing: 1, paddingHorizontal: 12, paddingTop: 10 },
});
