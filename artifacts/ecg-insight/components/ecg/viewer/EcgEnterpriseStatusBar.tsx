import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_SPACING, ECG_TYPOGRAPHY } from "./ecgSpacingTokens";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";

function StatusChip({ label, testID, value }: { label: string; testID?: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.chipValue} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

/** Sprint 35 — clinical status bar: Lead, Speed, Gain, Grid, Zoom, FPS, GPU, Memory. */
export const EcgEnterpriseStatusBar = memo(function EcgEnterpriseStatusBar({
  compact = false,
  coords,
  fps,
  gain,
  gpuRenderer,
  gridVisible,
  imageHeight,
  imageWidth,
  lead,
  memory,
  paperSpeed,
  zoom,
}: {
  compact?: boolean;
  coords?: { imageX: number; imageY: number; x: number; y: number } | null;
  fps?: number;
  gain?: number;
  gpuRenderer?: string;
  gridVisible?: boolean;
  imageHeight?: number;
  imageWidth?: number;
  lead?: string;
  memory?: { jsHeapMb?: number; jsHeapLimitMb?: number };
  paperSpeed?: number;
  zoom: number;
}) {
  const memLabel = memory?.jsHeapMb ? `${memory.jsHeapMb}MB` : "—";
  const gpuLabel = gpuRenderer ? (gpuRenderer.length > 18 ? `${gpuRenderer.slice(0, 16)}…` : gpuRenderer) : "—";

  return (
    <View style={[styles.bar, compact && styles.barCompact]} testID="sprint35-enterprise-status-bar" nativeID="sprint335-enterprise-status-bar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {lead ? <StatusChip label="Lead" testID="sprint17-status-lead" value={lead} /> : null}
        <StatusChip label="Speed" testID="sprint17-status-paper-speed" value={`${paperSpeed ?? 25}`} />
        <StatusChip label="Gain" testID="sprint17-status-gain" value={`${gain ?? 10}`} />
        <StatusChip label="Grid" testID="sprint35-status-grid" value={gridVisible ? "On" : "Off"} />
        <StatusChip label="Zoom" testID="sprint17-status-zoom" value={`${Math.round(zoom * 100)}%`} />
        {typeof fps === "number" ? <StatusChip label="FPS" testID="sprint17-status-fps" value={`${fps}`} /> : null}
        {coords ? <StatusChip label="X/Y" testID="sprint35-status-coords" value={`${Math.round(coords.imageX)},${Math.round(coords.imageY)}`} /> : null}
        {typeof imageWidth === "number" && typeof imageHeight === "number" ? (
          <StatusChip label="Image" testID="sprint35-status-image-size" value={`${Math.round(imageWidth)}×${Math.round(imageHeight)}`} />
        ) : null}
        <StatusChip label="GPU" testID="sprint28-status-gpu" value={gpuLabel} />
        <StatusChip label="Mem" testID="sprint28-status-memory" value={memLabel} />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.bgPanel,
    flexDirection: "row",
    height: ECG_WORKSTATION_VISUAL.statusBarHeight,
    overflow: "hidden",
  },
  barCompact: { backgroundColor: "rgba(6,10,15,0.92)" },
  chip: { alignItems: "center", flexDirection: "row", gap: ECG_SPACING.xs, paddingHorizontal: ECG_SPACING.sm },
  chipLabel: { ...ECG_TYPOGRAPHY.label, color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9 },
  chipValue: { ...ECG_TYPOGRAPHY.status, color: ECG_COCKPIT_COLORS.text, fontSize: 10, maxWidth: 96 },
  row: { alignItems: "center", flex: 1, flexDirection: "row", gap: ECG_SPACING.sm, paddingHorizontal: ECG_SPACING.sm },
});
