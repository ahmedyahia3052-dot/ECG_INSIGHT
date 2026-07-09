import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { EcgViewerComparisonDto } from "@/services/ecgViewerApi";

import { ECG_PRO_VIEWER_THEMES, type EcgProViewerTheme } from "./types";

type Props = {
  baselineCaseId?: string;
  comparison: EcgViewerComparisonDto | null;
  theme: EcgProViewerTheme;
};

export function EcgProViewerComparisonPanel({ baselineCaseId, comparison, theme }: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  if (!comparison) {
    return (
      <View style={[styles.root, { backgroundColor: palette.panel, borderColor: palette.border }]} testID="sprint95-ecg-pro-viewer-comparison-panel">
        <Text style={{ color: palette.muted }}>Select a baseline case tab to compare measurements.</Text>
      </View>
    );
  }

  const deltaEntries = Object.entries(comparison.deltas);

  return (
    <View style={[styles.root, { backgroundColor: palette.panel, borderColor: palette.border }]} testID="sprint95-ecg-pro-viewer-comparison-panel">
      <Text style={[styles.title, { color: palette.text }]}>Comparison vs {baselineCaseId ?? comparison.baselineCaseId ?? "baseline"}</Text>
      {deltaEntries.length ? (
        deltaEntries.map(([metric, delta]) => (
          <Text key={metric} style={{ color: palette.muted, fontSize: 12 }}>
            {metric}: {delta > 0 ? "+" : ""}{delta} ({comparison.trendDirection[metric] ?? "stable"})
          </Text>
        ))
      ) : (
        <Text style={{ color: palette.muted }}>No delta metrics returned.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { borderRadius: 12, borderWidth: 1, gap: 6, margin: 12, padding: 12 },
  title: { fontSize: 13, fontWeight: "800" },
});
