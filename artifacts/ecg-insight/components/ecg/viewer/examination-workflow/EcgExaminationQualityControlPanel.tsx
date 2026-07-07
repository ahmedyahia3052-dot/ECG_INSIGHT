import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "../ecgCockpitColors";
import type { ExaminationQualitySnapshot } from "./types";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export const EcgExaminationQualityControlPanel = memo(function EcgExaminationQualityControlPanel({
  loading,
  onRefresh,
  quality,
}: {
  loading?: boolean;
  onRefresh?: () => void;
  quality?: ExaminationQualitySnapshot;
}) {
  return (
    <View testID="sprint48-examination-quality-control">
      <View style={styles.header}>
        <Text style={styles.title}>Quality Control</Text>
        {onRefresh ? (
          <Pressable onPress={onRefresh} style={styles.button} testID="sprint48-refresh-quality">
            <Text style={styles.buttonLabel}>{loading ? "Refreshing…" : "Refresh"}</Text>
          </Pressable>
        ) : null}
      </View>
      {quality ? (
        <>
          <Metric label="ECG Quality" value={`${quality.ecgQualityScore}% (${quality.overallTier})`} />
          <Metric label="Signal Quality" value={`${quality.signalQuality}%`} />
          <Metric label="Lead Completeness" value={`${quality.leadCompleteness}%`} />
          <Metric label="Noise Score" value={`${quality.noiseScore}%`} />
          <Metric label="Baseline Quality" value={`${quality.baselineQuality}%`} />
          <View style={styles.recs}>
            <Text style={styles.recTitle}>Auto Recommendations</Text>
            {quality.autoRecommendations.map((item) => (
              <Text key={item} style={styles.recItem}>
                • {item}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <Text style={styles.empty}>Run quality assessment after digitization.</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  button: {
    borderColor: ECG_COCKPIT_COLORS.accentMuted,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  buttonLabel: { color: ECG_COCKPIT_COLORS.accent, fontSize: 9, fontWeight: "900" },
  empty: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, fontWeight: "700", marginTop: 6 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  metric: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderRadius: 3,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  metricLabel: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9, fontWeight: "800" },
  metricValue: { color: ECG_COCKPIT_COLORS.text, fontSize: 10, fontWeight: "900" },
  recItem: { color: ECG_COCKPIT_COLORS.text, fontSize: 9, fontWeight: "700", lineHeight: 13, marginTop: 3 },
  recTitle: { color: ECG_COCKPIT_COLORS.accent, fontSize: 9, fontWeight: "900", marginTop: 8 },
  recs: { marginTop: 2 },
  title: { color: ECG_COCKPIT_COLORS.accent, fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
});
