import React, { memo, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Card, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import { CALIPER_COLORS, CLINICAL_MEASUREMENT_PRESETS } from "./ecgMeasurementEngine";
import { MEASUREMENT_KIND_LABELS, type EcgClinicalMeasurement } from "./measurementTypes";
import { STANDARD_ECG_LEADS } from "./types";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

type Props = {
  workspace: EcgMeasurementWorkspace;
};

export const EcgMeasurementsPanel = memo(function EcgMeasurementsPanel({ workspace }: Props) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "value" | "timestamp">("timestamp");

  const rows = useMemo(() => {
    const filtered = workspace.present.measurements.filter((item) => {
      if (item.hidden) return false;
      const haystack = `${item.name} ${item.type} ${item.lead ?? ""} ${item.operator} ${item.comments ?? ""}`.toLowerCase();
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
      {/* sprint14-ecg-measurements-panel retained for regression markers */}
      <View style={styles.fill} testID="sprint15-ecg-measurements-panel">
      <Card style={styles.card}>
        <SectionHeader
          subtitle="Professional clinical calipers with PR, QRS, QT, QTc, RR, PP, ST, and custom measurements synchronized to paper speed and gain."
          title="Clinical Measurements"
        />

        <Text style={styles.sectionLabel}>Caliper Geometry</Text>
        <View style={styles.toolbar}>
          <PrimaryButton label="Horizontal" onPress={() => { workspace.activeCaliperKind.current = "horizontal"; workspace.setToolMode("caliper"); }} variant="outline" />
          <PrimaryButton label="Vertical" onPress={() => { workspace.activeCaliperKind.current = "vertical"; workspace.setToolMode("caliper"); }} variant="outline" />
          <PrimaryButton label="Dual" onPress={() => { workspace.activeCaliperKind.current = "dual"; workspace.setToolMode("caliper"); }} variant="outline" />
          <PrimaryButton label="Multi" onPress={() => { workspace.activeCaliperKind.current = "multi"; workspace.setToolMode("caliper"); }} variant="outline" />
          <PrimaryButton label="Angle" onPress={() => { workspace.activeCaliperKind.current = "angle"; workspace.setToolMode("caliper"); }} variant="outline" />
          <PrimaryButton label="Distance" onPress={() => { workspace.activeCaliperKind.current = "distance"; workspace.setToolMode("caliper"); }} variant="outline" />
          <PrimaryButton label="Finish Multi" onPress={() => workspace.finishMultiCaliper()} variant="outline" />
        </View>

        <Text style={styles.sectionLabel}>Measurement Type</Text>
        <View style={styles.toolbar}>
          {CLINICAL_MEASUREMENT_PRESETS.map((preset) => (
            <PrimaryButton
              key={preset.kind}
              label={preset.label}
              onPress={() => workspace.selectMeasurementPreset(preset)}
              variant={workspace.present.activeMeasurementKind === preset.kind ? "primary" : "outline"}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Lead</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leadRow}>
          {[...STANDARD_ECG_LEADS, "Rhythm Strip" as const].map((lead) => (
            <PrimaryButton
              key={lead}
              label={lead}
              onPress={() => workspace.setActiveLead(lead)}
              variant={workspace.present.activeLead === lead ? "primary" : "outline"}
            />
          ))}
        </ScrollView>

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
          <Text style={[styles.headerCell, styles.nameCol]}>Measurement</Text>
          <Text style={styles.headerCell}>Value</Text>
          <Text style={styles.headerCell}>Reference</Text>
          <Text style={styles.headerCell}>Lead</Text>
        </View>

        <ScrollView style={styles.list} nestedScrollEnabled>
          {rows.length ? rows.map((item) => <MeasurementRow key={item.id} item={item} workspace={workspace} />) : (
            <Text style={styles.placeholder}>
              Select a clinical measurement type and drag calipers on the ECG image. Measurements update instantly and persist with the case workspace.
            </Text>
          )}
        </ScrollView>

        <View style={styles.historyRow}>
          <PrimaryButton disabled={!workspace.canUndo} label="Undo" onPress={workspace.undo} variant="outline" />
          <PrimaryButton disabled={!workspace.canRedo} label="Redo" onPress={workspace.redo} variant="outline" />
        </View>
      </Card>
    </View>
    </View>
  );
});

function MeasurementRow({ item, workspace }: { item: EcgClinicalMeasurement; workspace: EcgMeasurementWorkspace }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [comments, setComments] = useState(item.comments ?? "");
  const selected = workspace.present.selectedMeasurementId === item.id;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => workspace.jumpToMeasurement(item.id)}
      style={[styles.row, selected && styles.rowSelected]}
      testID={`sprint14-measurement-row-${item.kind}`}
    >
      <View style={styles.rowMain}>
        {editing ? (
          <TextInput
            autoFocus
            onChangeText={setName}
            onSubmitEditing={() => {
              workspace.renameMeasurement(item.id, name);
              setEditing(false);
            }}
            style={styles.nameInput}
            value={name}
          />
        ) : (
          <Text style={styles.name}>{item.name}</Text>
        )}
        <Text style={styles.meta}>{MEASUREMENT_KIND_LABELS[item.kind]}</Text>
        <Text style={styles.meta}>Start ({Math.round(item.start.x)}, {Math.round(item.start.y)}) → End ({Math.round(item.end.x)}, {Math.round(item.end.y)})</Text>
        <Text style={styles.meta}>{item.referenceRange ?? "—"}</Text>
        <Text style={styles.meta}>{item.clinicalSignificance ?? "Manual measurement recorded for clinician review."}</Text>
        <Text style={styles.meta}>AI: {item.aiInterpretation ?? "Awaiting AI interpretation"}</Text>
        <Text style={styles.meta}>{new Date(item.timestamp).toLocaleString()} · {item.createdBy ?? item.operator}</Text>
        <TextInput
          accessibilityLabel="Measurement comments"
          multiline
          onChangeText={(value) => {
            setComments(value);
            workspace.updateMeasurementComments(item.id, value);
          }}
          placeholder="Comments"
          style={styles.comments}
          value={comments}
        />
        <Text style={styles.meta}>Confidence: {item.confidence == null ? "Awaiting AI Analysis" : `${item.confidence}%`}</Text>
      </View>
      <Text style={styles.value}>{`${item.value} ${item.unit}`}</Text>
      <Text style={styles.amplitude}>{item.durationMs != null ? `${item.durationMs} ms` : item.amplitudeMv != null ? `${item.amplitudeMv} mV` : "—"}</Text>
      <Text style={styles.lead}>{item.lead ?? "—"}</Text>
      <View style={styles.colorRow}>
        {CALIPER_COLORS.map((color) => (
          <Pressable
            key={color}
            onPress={() => workspace.setCaliperColor(item.caliperId, color)}
            style={[styles.colorSwatch, { backgroundColor: color }]}
          />
        ))}
      </View>
      <View style={styles.actions}>
        <PrimaryButton label="Rename" onPress={() => setEditing(true)} variant="outline" />
        <PrimaryButton label="Hide" onPress={() => workspace.toggleMeasurementHidden(item.id)} variant="outline" />
        <PrimaryButton label="Duplicate" onPress={() => workspace.duplicateMeasurement(item.id)} variant="outline" />
        <PrimaryButton label="Lock" onPress={() => workspace.toggleCaliperLock(item.caliperId)} variant="outline" />
        <PrimaryButton label="Delete" onPress={() => workspace.deleteMeasurement(item.id)} variant="outline" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  amplitude: { color: medicalTheme.text, fontSize: 12, fontWeight: "700", minWidth: 64 },
  card: { flex: 1, gap: 8, marginBottom: 10 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  colorSwatch: { borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, height: 18, width: 18 },
  comments: {
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    color: medicalTheme.text,
    fontSize: 12,
    marginTop: 6,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  fill: { flex: 1 },
  headerCell: { color: medicalTheme.muted, flex: 1, fontSize: 11, fontWeight: "800" },
  headerRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  historyRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  lead: { color: medicalTheme.text, fontSize: 12, fontWeight: "700", width: 48 },
  leadRow: { flexDirection: "row", flexWrap: "nowrap", gap: 6 },
  list: { maxHeight: 420 },
  meta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "600" },
  name: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  nameCol: { flex: 2 },
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
  rowSelected: { borderColor: medicalTheme.primary, borderWidth: 2 },
  search: {
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    color: medicalTheme.text,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sectionLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800", marginTop: 4, textTransform: "uppercase" },
  sortRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  value: { color: medicalTheme.primary, fontSize: 14, fontWeight: "900", minWidth: 72 },
});
