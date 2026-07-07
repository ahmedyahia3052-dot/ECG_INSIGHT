import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { DiagnosticPanelId } from "./types";

const PANELS: Array<{ id: DiagnosticPanelId; label: string }> = [
  { id: "live-measurements", label: "Live" },
  { id: "intervals", label: "Intervals" },
  { id: "axis", label: "Axis" },
  { id: "rhythm", label: "Rhythm" },
  { id: "morphology", label: "Morphology" },
  { id: "st-analysis", label: "ST" },
  { id: "ai-findings", label: "AI" },
  { id: "differential", label: "Differential" },
  { id: "recommendations", label: "Recs" },
  { id: "clinical-notes", label: "Notes" },
];

export const EcgDiagnosticPanelsRibbon = memo(function EcgDiagnosticPanelsRibbon({
  activePanel,
  onSelectPanel,
}: {
  activePanel: DiagnosticPanelId;
  onSelectPanel: (panel: DiagnosticPanelId) => void;
}) {
  return (
    <View style={styles.root} testID="sprint46-diagnostic-panels-ribbon">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {PANELS.map((panel) => {
          const active = activePanel === panel.id;
          return (
            <Pressable
              key={panel.id}
              accessibilityRole="button"
              onPress={() => onSelectPanel(panel.id)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`sprint46-panel-${panel.id}`}
            >
              <Text style={[styles.label, active && styles.labelActive]}>{panel.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "rgba(15,23,42,0.72)",
    borderColor: "rgba(51,65,85,0.8)",
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: "rgba(34,197,94,0.18)",
    borderColor: "#22C55E",
  },
  label: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  labelActive: {
    color: "#ECFDF5",
  },
  root: {
    backgroundColor: "rgba(2,6,23,0.88)",
    borderBottomColor: "rgba(51,65,85,0.55)",
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  row: {
    alignItems: "center",
  },
});
