import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, medicalTheme, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import type { EcgClinicalFindingsModel, EcgClinicalFindingField } from "./types";

export const EcgClinicalFindingsPanel = memo(function EcgClinicalFindingsPanel({ findings }: { findings: EcgClinicalFindingsModel }) {
  const rows = [
    findings.heartRate,
    findings.prInterval,
    findings.qrsDuration,
    findings.qtInterval,
    findings.qtcInterval,
    findings.axis,
    findings.rhythm,
    findings.interpretation,
    findings.confidence,
  ];

  return (
    <View testID="sprint13-ecg-clinical-findings-panel">
      <Card style={styles.card}>
      <SectionHeader subtitle="Case-backed clinical readouts with measurement override pipeline" title="Clinical Findings" />
      {rows.map((row) => (
        <FindingRow key={row.label} row={row} />
      ))}
      </Card>
    </View>
  );
});

function FindingRow({ row }: { row: EcgClinicalFindingField }) {
  return (
    <View accessibilityRole="text" style={styles.row}>
      <Text style={styles.label}>{row.label}</Text>
      <Text style={[styles.value, row.source === "pending" && styles.pending]}>{row.value}</Text>
      <Text style={styles.source}>{row.source === "measurement" ? "Calibrated measurement" : row.source === "case" ? "Case record" : "Pending pipeline"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, marginBottom: 10 },
  label: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  pending: { color: medicalTheme.muted, fontStyle: "italic" },
  row: {
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  source: { color: medicalTheme.muted, fontSize: 10, fontWeight: "600" },
  value: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
});
