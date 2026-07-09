import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { EcgViewerComparisonDto } from "@/services/ecgViewerApi";

import { formatCompareMetric } from "./compareMetricLabels";
import { ECG_PRO_VIEWER_THEMES, type EcgProViewerTheme } from "./types";

type Props = {
  baselineCaseId?: string;
  comparison: EcgViewerComparisonDto | null;
  theme: EcgProViewerTheme;
};

function trendColor(direction: "down" | "stable" | "up" | undefined, palette: (typeof ECG_PRO_VIEWER_THEMES)["dark"]) {
  if (direction === "up") return "#F97316";
  if (direction === "down") return "#38BDF8";
  return palette.muted;
}

export function EcgProViewerComparisonPanel({ baselineCaseId, comparison, theme }: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  if (!comparison) {
    return (
      <View style={[styles.root, { backgroundColor: palette.panel, borderColor: palette.border }]} testID="sprint101-ecg-pro-viewer-comparison-panel">
        <Text style={{ color: palette.muted }}>Select a baseline case tab to compare measurements.</Text>
      </View>
    );
  }

  const deltaEntries = Object.entries(comparison.deltas);

  return (
    <View style={[styles.root, { backgroundColor: palette.panel, borderColor: palette.border }]} testID="sprint101-ecg-pro-viewer-comparison-panel">
      <Text style={[styles.title, { color: palette.text }]}>Comparison vs {baselineCaseId ?? comparison.baselineCaseId ?? "baseline"}</Text>
      {deltaEntries.length ? (
        <View style={styles.grid}>
          {deltaEntries.map(([metric, delta]) => {
            const direction = comparison.trendDirection[metric] ?? "stable";
            const current = comparison.current[metric];
            const baseline = comparison.baseline[metric];
            return (
              <View key={metric} style={[styles.metric, { borderColor: palette.border }]}>
                <Text style={[styles.metricLabel, { color: palette.muted }]}>{formatCompareMetric(metric, delta).split(":")[0]}</Text>
                <Text style={[styles.metricDelta, { color: trendColor(direction, palette) }]}>
                  {delta > 0 ? "+" : ""}
                  {Number.isInteger(delta) ? delta : delta.toFixed(1)}
                </Text>
                <Text style={[styles.metricBaseline, { color: palette.muted }]}>
                  {baseline ?? "—"} → {current ?? "—"} ({direction})
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={{ color: palette.muted }}>No delta metrics returned.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { borderRadius: 10, borderWidth: 1, minWidth: 140, padding: 10 },
  metricBaseline: { fontSize: 10, marginTop: 4 },
  metricDelta: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  metricLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  root: { borderRadius: 12, borderWidth: 1, gap: 8, margin: 12, padding: 12 },
  title: { fontSize: 13, fontWeight: "800" },
});
