import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import { MEASUREMENT_KIND_LABELS, type EcgClinicalMeasurement } from "./measurementTypes";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

type Props = {
  workspace: EcgMeasurementWorkspace;
};

export function EcgMeasurementsPanel({ workspace }: Props) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "value" | "timestamp">("timestamp");

  const rows = useMemo(() => {
    const filtered = workspace.present.measurements.filter((item) => {
      if (item.hidden) return false;
      const haystack = `${item.name} ${item.type} ${item.lead ?? ""} ${item.operator}`.toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    });
    return filtered.sort((left, right) => {
      if (sortBy === "name") return left.name.localeCompare(right.name);
      if (sortBy === "value") return right.value - left.value;
      return right.timestamp.localeCompare(left.timestamp);
    });
  }, [query, sortBy, workspace.present.measurements]);

  return (
    <View style={styles.fill} testID="sprint13-ecg-measurements-panel">
      <Card style={styles.card}>
        <SectionHeader subtitle="PR Interval, QRS Duration, QT Interval, QTc, RR Interval, PP Interval, ST Elevation, Heart Rate, P Wave Duration, T Wave Duration" title="Measurements" />
        <View style={styles.toolbar}>
          <PrimaryButton label="Horizontal" onPress={() => { workspace.activeCaliperKind.current = "horizontal"; workspace.setToolMode("caliper"); }} variant="outline" />
          <PrimaryButton label="Vertical" onPress={() => { workspace.activeCaliperKind.current = "vertical"; workspace.setToolMode("caliper"); }} variant="outline" />
          <PrimaryButton label="Dual" onPress={() => { workspace.activeCaliperKind.current = "dual"; workspace.setToolMode("caliper"); }} variant="outline" />
          <PrimaryButton label="Arrow" onPress={() => { workspace.activeAnnotationKind.current = "arrow"; workspace.setToolMode("annotation"); }} variant="outline" />
          <PrimaryButton label="Text" onPress={() => { workspace.activeAnnotationKind.current = "text"; workspace.setToolMode("annotation"); }} variant="outline" />
          <PrimaryButton label="Freehand" onPress={() => { workspace.activeAnnotationKind.current = "freehand"; workspace.setToolMode("annotation"); }} variant="outline" />
        </View>
        <TextInput
          accessibilityLabel="Search measurements"
          onChangeText={setQuery}
          placeholder="Search measurements"
          style={styles.search}
          value={query}
        />
        <View style={styles.sortRow}>
          <PrimaryButton label="Sort Name" onPress={() => setSortBy("name")} variant={sortBy === "name" ? "primary" : "outline"} />
          <PrimaryButton label="Sort Value" onPress={() => setSortBy("value")} variant={sortBy === "value" ? "primary" : "outline"} />
          <PrimaryButton label="Sort Time" onPress={() => setSortBy("timestamp")} variant={sortBy === "timestamp" ? "primary" : "outline"} />
        </View>
        <View accessibilityRole="summary" style={styles.headerRow}>
          <Text style={styles.headerCell}>Name</Text>
          <Text style={styles.headerCell}>Value</Text>
          <Text style={styles.headerCell}>Lead</Text>
        </View>
        {rows.length ? rows.map((item) => (
          <MeasurementRow key={item.id} item={item} workspace={workspace} />
        )) : (
          <Text style={styles.placeholder}>Place calipers on the ECG image to create measurements. Calibration follows the active paper speed and gain.</Text>
        )}
        <View style={styles.historyRow}>
          <PrimaryButton disabled={!workspace.canUndo} label="Undo" onPress={workspace.undo} variant="outline" />
          <PrimaryButton disabled={!workspace.canRedo} label="Redo" onPress={workspace.redo} variant="outline" />
        </View>
      </Card>
    </View>
  );
}

function MeasurementRow({ item, workspace }: { item: EcgClinicalMeasurement; workspace: EcgMeasurementWorkspace }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  return (
    <Pressable accessibilityRole="button" onPress={() => workspace.jumpToMeasurement(item.id)} style={styles.row}>
      <View style={styles.rowMain}>
        {editing ? (
          <TextInput autoFocus onChangeText={setName} onSubmitEditing={() => { workspace.renameMeasurement(item.id, name); setEditing(false); }} style={styles.nameInput} value={name} />
        ) : (
          <Text style={styles.name}>{item.name}</Text>
        )}
        <Text style={styles.meta}>{MEASUREMENT_KIND_LABELS[item.kind]}</Text>
        <Text style={styles.meta}>{new Date(item.timestamp).toLocaleString()}</Text>
        <Text style={styles.meta}>{item.operator}</Text>
        <Text style={styles.meta}>{item.readouts.smallBoxes ? `${item.readouts.smallBoxes} sb / ${item.readouts.largeBoxes ?? 0} lb` : ""}</Text>
      </View>
      <Text style={styles.value}>{item.value} {item.unit}</Text>
      <Text style={styles.lead}>{item.lead ?? "—"}</Text>
      <View style={styles.actions}>
        <PrimaryButton label="Rename" onPress={() => setEditing(true)} variant="outline" />
        <PrimaryButton label="Hide" onPress={() => workspace.toggleMeasurementHidden(item.id)} variant="outline" />
        <PrimaryButton label="Duplicate" onPress={() => workspace.duplicateMeasurement(item.id)} variant="outline" />
        <PrimaryButton label="Lock" onPress={() => workspace.updateCaliper(item.caliperId, { locked: true })} variant="outline" />
        <PrimaryButton label="Delete" onPress={() => workspace.deleteMeasurement(item.id)} variant="outline" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  card: { gap: 8, marginBottom: 10 },
  fill: { flex: 1 },
  headerCell: { color: medicalTheme.muted, flex: 1, fontSize: 11, fontWeight: "800" },
  headerRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  historyRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  lead: { color: medicalTheme.text, fontSize: 12, fontWeight: "700", width: 48 },
  meta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "600" },
  name: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  nameInput: {
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    color: medicalTheme.text,
    fontSize: 13,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  placeholder: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  row: {
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    padding: 10,
  },
  rowMain: { flex: 1, gap: 2 },
  scroll: { gap: 8, paddingBottom: 12 },
  search: {
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    color: medicalTheme.text,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  value: { color: medicalTheme.primary, fontSize: 14, fontWeight: "900", minWidth: 72 },
});
