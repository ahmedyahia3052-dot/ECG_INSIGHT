import React, { useMemo } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { ClinicalMeasurementSnapshot } from "@/services/clinicalMeasurementApi";

import { computeLiveMeasurements } from "../ecgLiveMeasurements";
import type { EcgMeasurementWorkspace } from "../useEcgMeasurementWorkspace";
import { buildClinicalMeasurementCards, type ClinicalMeasurementBundleSeed } from "./clinicalMeasurementCards";
import type { EcgProViewerTheme } from "./types";
import { ECG_PRO_VIEWER_THEMES } from "./types";

type Props = {
  autoPending?: boolean;
  bundleSeed?: ClinicalMeasurementBundleSeed | null;
  onAutoMeasure?: () => void;
  onSaveManual?: () => void;
  record?: ClinicalMeasurementSnapshot | null;
  savePending?: boolean;
  theme: EcgProViewerTheme;
  workspace?: EcgMeasurementWorkspace;
};

function ClinicalCard({
  abnormal,
  label,
  palette,
  source,
  unit,
  value,
}: {
  abnormal?: boolean;
  label: string;
  palette: (typeof ECG_PRO_VIEWER_THEMES)["dark"];
  source: string;
  unit: string;
  value: string;
}) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: abnormal ? "rgba(239,68,68,0.08)" : palette.panel,
          borderColor: abnormal ? "#EF4444" : palette.border,
        },
      ]}
    >
      <Text style={[styles.cardLabel, { color: palette.muted }]}>{label}</Text>
      <Text style={[styles.cardValue, { color: palette.text }]}>{value}</Text>
      <Text style={[styles.cardMeta, { color: palette.muted }]}>
        {source}
        {unit && value !== "—" && !value.includes(unit) ? ` · ${unit}` : ""}
      </Text>
    </View>
  );
}

export function EcgProViewerClinicalMeasurementsPanel({
  autoPending,
  bundleSeed,
  onAutoMeasure,
  onSaveManual,
  record,
  savePending,
  theme,
  workspace,
}: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  const live = useMemo(
    () => (workspace ? computeLiveMeasurements(workspace.present.calipers, workspace.present.grid) : null),
    [workspace, workspace?.present.calipers, workspace?.present.grid, workspace?.present.calipers.length],
  );
  const cards = useMemo(
    () => buildClinicalMeasurementCards({ bundleSeed, live, record }),
    [bundleSeed, live, record],
  );

  return (
    <View
      style={[styles.root, { backgroundColor: palette.panel, borderTopColor: palette.border }]}
      testID="sprint101-clinical-measurements-panel"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.muted }]}>CLINICAL MEASUREMENTS</Text>
        {live?.updatedAt ? (
          <Text style={[styles.updated, { color: palette.muted }]}>Live · {new Date(live.updatedAt).toLocaleTimeString()}</Text>
        ) : null}
      </View>
      <ScrollView contentContainerStyle={styles.grid} horizontal showsHorizontalScrollIndicator={false}>
        {cards.map((card) => (
          <ClinicalCard
            key={card.id}
            abnormal={card.abnormal}
            label={card.label}
            palette={palette}
            source={card.source}
            unit={card.unit}
            value={card.value}
          />
        ))}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={autoPending}
          onPress={onAutoMeasure}
          style={[styles.button, { backgroundColor: palette.border }]}
          testID="sprint101-auto-measurement"
        >
          {autoPending ? <ActivityIndicator color={palette.text} size="small" /> : null}
          <Text style={[styles.buttonText, { color: palette.text }]}>Auto Measure</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={savePending}
          onPress={onSaveManual}
          style={[styles.button, styles.buttonOutline, { borderColor: palette.border }]}
          testID="sprint101-save-manual-measurement"
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
  button: { alignItems: "center", borderRadius: 10, flex: 1, flexDirection: "row", gap: 6, justifyContent: "center", paddingVertical: 10 },
  buttonOutline: { backgroundColor: "transparent", borderWidth: 1 },
  buttonText: { fontSize: 12, fontWeight: "700" },
  card: { borderRadius: 12, borderWidth: 1, minWidth: 118, paddingHorizontal: 12, paddingVertical: 10 },
  cardLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  cardMeta: { fontSize: 10, marginTop: 4 },
  cardValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  grid: { gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 10 },
  root: { borderTopWidth: 1 },
  title: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  updated: { fontSize: 10, fontWeight: "600" },
});
