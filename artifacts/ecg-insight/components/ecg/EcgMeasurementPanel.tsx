import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { EcgClinicalMeasurements, EcgMeasurementItem } from "@/services/ecgProcessing";

type Props = {
  measurements?: EcgClinicalMeasurements | null;
  onSelect?: (item: EcgMeasurementItem) => void;
  selectedLabel?: string | null;
};

function rhythmLabel(rhythm: EcgClinicalMeasurements["rhythm"]) {
  return rhythm.replace(/_/g, " ");
}

function morphologyLabel(flag: string) {
  return flag.replace(/_/g, " ");
}

export function EcgMeasurementPanel({ measurements, onSelect, selectedLabel }: Props) {
  if (!measurements) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Clinical Measurements</Text>
        <Text style={styles.emptyText}>Digitize an ECG image to compute automated intervals, axis, and morphology.</Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Text style={styles.title}>Clinical Measurements</Text>
        <Badge label={`${Math.round(measurements.confidence * 100)}% confidence`} tone={measurements.confidence >= 0.7 ? "success" : "warning"} />
      </View>

      <View style={styles.summaryRow}>
        <SummaryChip label="Heart Rate" value={`${measurements.heartRate} bpm`} />
        <SummaryChip label="Rhythm" value={rhythmLabel(measurements.rhythm)} />
        <SummaryChip label="ST Dev" value={`${measurements.stDeviation} mm`} />
      </View>

      {measurements.morphology.length ? (
        <View style={styles.morphologyRow}>
          {measurements.morphology.map((flag) => (
            <Badge key={flag} label={morphologyLabel(flag)} tone="warning" />
          ))}
        </View>
      ) : null}

      <View style={styles.grid}>
        {measurements.measurements.map((item) => {
          const active = selectedLabel === item.label;
          return (
            <Pressable
              key={item.label}
              onPress={() => onSelect?.(item)}
              style={[styles.item, active && styles.itemActive, !item.highlight && styles.itemStatic]}
            >
              <Text style={styles.itemLabel}>{item.label}</Text>
              <Text style={styles.itemValue}>{item.value} {item.unit}</Text>
              {item.highlight ? <Text style={styles.itemHint}>Tap to highlight waveform</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "rgba(15,23,42,0.88)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minWidth: 120,
    padding: 10,
  },
  chipLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  chipValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "900", marginTop: 4 },
  empty: {
    backgroundColor: "rgba(15,23,42,0.82)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  emptyText: { color: medicalTheme.muted, fontSize: 13, lineHeight: 20 },
  emptyTitle: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  item: {
    backgroundColor: "rgba(15,23,42,0.88)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    minWidth: 150,
    padding: 12,
    width: "31%",
  },
  itemActive: { borderColor: medicalTheme.primary, backgroundColor: "rgba(56,189,248,0.12)" },
  itemHint: { color: medicalTheme.primary, fontSize: 10, fontWeight: "700" },
  itemLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  itemStatic: { opacity: 0.92 },
  itemValue: { color: medicalTheme.text, fontSize: 16, fontWeight: "900" },
  morphologyRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shell: { gap: 12 },
  summaryRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
