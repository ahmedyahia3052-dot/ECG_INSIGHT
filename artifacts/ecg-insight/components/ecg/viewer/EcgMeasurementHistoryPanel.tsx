import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

export const EcgMeasurementHistoryPanel = memo(function EcgMeasurementHistoryPanel({
  workspace,
}: {
  workspace: EcgMeasurementWorkspace;
}) {
  const history = workspace.present.measurementHistory.slice(0, 12);

  return (
    <View style={styles.root} testID="sprint34-measurement-history-panel">
      <Text style={styles.title}>Measurement History</Text>
      {history.length === 0 ? (
        <Text style={styles.empty}>No manual measurements recorded yet.</Text>
      ) : (
        history.map((entry) => (
          <View key={entry.id} style={styles.row}>
            <View style={styles.meta}>
              <Text style={styles.type}>{entry.measurementType}</Text>
              <Text style={styles.sub}>
                {entry.lead ?? "—"} · {new Date(entry.timestamp).toLocaleTimeString()} · {entry.doctor}
              </Text>
            </View>
            <Text style={styles.value}>{entry.value}</Text>
            <View style={styles.actions}>
              <Pressable onPress={() => workspace.renameHistory(entry.id, `${entry.measurementType}*`)}>
                <Text style={styles.action}>Rename</Text>
              </Pressable>
              <Pressable onPress={() => workspace.restoreHistory(entry.id)}>
                <Text style={styles.action}>Restore</Text>
              </Pressable>
              <Pressable onPress={() => workspace.deleteHistory(entry.id)}>
                <Text style={styles.actionDanger}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  action: { color: medicalTheme.primary, fontSize: 9, fontWeight: "700" },
  actionDanger: { color: medicalTheme.critical, fontSize: 9, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8 },
  empty: { color: medicalTheme.muted, fontSize: 10, fontStyle: "italic" },
  meta: { flex: 1, gap: 2 },
  root: { gap: 8 },
  row: {
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 8,
  },
  sub: { color: medicalTheme.muted, fontSize: 8, fontWeight: "600" },
  title: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900" },
  type: { color: medicalTheme.text, fontSize: 10, fontWeight: "800" },
  value: { color: medicalTheme.success, fontSize: 12, fontWeight: "800" },
});
