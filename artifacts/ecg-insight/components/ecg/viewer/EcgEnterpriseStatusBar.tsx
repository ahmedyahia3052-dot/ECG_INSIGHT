import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

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

/** Sprint 33.5 — simplified doctor status bar; developer metrics gated. */
export const EcgEnterpriseStatusBar = memo(function EcgEnterpriseStatusBar({
  apiStatus,
  canvasResolution,
  coordinates,
  cpuUsage,
  developerMode = false,
  fps,
  gain,
  gpuRenderer,
  lead,
  memory,
  onToggleDeveloperMode,
  paperSpeed,
  renderMode,
  renderTimeMs,
  signalQuality,
  zoom,
}: {
  apiStatus?: string;
  canvasResolution?: string;
  coordinates?: string;
  cpuUsage?: number;
  developerMode?: boolean;
  fps?: number;
  gain?: number;
  gpuRenderer?: string;
  lead?: string;
  memory?: { jsHeapMb?: number; jsHeapLimitMb?: number };
  onToggleDeveloperMode?: () => void;
  paperSpeed?: number;
  renderMode?: string;
  renderTimeMs?: number;
  signalQuality?: string;
  zoom: number;
}) {
  const memLabel = memory?.jsHeapMb ? `${memory.jsHeapMb}MB` : "—";
  return (
    <View style={styles.bar} testID="sprint335-enterprise-status-bar" nativeID="sprint28-enterprise-status-bar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {lead ? <StatusChip label="Lead" testID="sprint17-status-lead" value={lead} /> : null}
        <StatusChip label="Speed" testID="sprint17-status-paper-speed" value={`${paperSpeed ?? 25}`} />
        <StatusChip label="Gain" testID="sprint17-status-gain" value={`${gain ?? 10}`} />
        <StatusChip label="Zoom" testID="sprint17-status-zoom" value={`${Math.round(zoom * 100)}%`} />
        {signalQuality ? <StatusChip label="Quality" testID="sprint32-status-quality" value={signalQuality} /> : null}
        {developerMode ? (
          <>
            {typeof fps === "number" ? <StatusChip label="FPS" testID="sprint17-status-fps" value={`${fps}`} /> : null}
            {typeof cpuUsage === "number" ? <StatusChip label="CPU" testID="sprint28-status-cpu" value={`${cpuUsage}%`} /> : null}
            {gpuRenderer ? <StatusChip label="GPU" testID="sprint28-status-gpu" value={gpuRenderer} /> : null}
            <StatusChip label="Mem" testID="sprint28-status-memory" value={memLabel} />
            {canvasResolution ? <StatusChip label="Canvas" testID="sprint28-status-canvas" value={canvasResolution} /> : null}
            {coordinates ? <StatusChip label="XY" testID="sprint29-status-coordinates" value={coordinates} /> : null}
            {typeof renderTimeMs === "number" ? <StatusChip label="Frame" testID="sprint28-status-frame" value={`${renderTimeMs}ms`} /> : null}
            {renderMode ? <StatusChip label="Render" testID="sprint28-status-render-mode" value={renderMode} /> : null}
            <StatusChip label="API" testID="sprint24-status-api" value={apiStatus ?? "Online"} />
          </>
        ) : null}
      </ScrollView>
      <Pressable accessibilityLabel="Toggle developer metrics" onPress={onToggleDeveloperMode} style={styles.devToggle} testID="sprint32-dev-mode-toggle">
        <Text style={[styles.devToggleLabel, developerMode && styles.devToggleLabelActive]}>{developerMode ? "DEV" : "DR"}</Text>
      </Pressable>
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
  chip: { alignItems: "center", flexDirection: "row", gap: ECG_SPACING.xs, paddingHorizontal: ECG_SPACING.md },
  chipLabel: { ...ECG_TYPOGRAPHY.label, color: ECG_COCKPIT_COLORS.textMuted },
  chipValue: { ...ECG_TYPOGRAPHY.status, color: ECG_COCKPIT_COLORS.text, maxWidth: 120 },
  devToggle: {
    borderColor: ECG_COCKPIT_COLORS.border,
    borderLeftWidth: 1,
    paddingHorizontal: ECG_SPACING.md,
    paddingVertical: ECG_SPACING.xs,
  },
  devToggleLabel: { ...ECG_TYPOGRAPHY.caption, color: ECG_COCKPIT_COLORS.textMuted },
  devToggleLabelActive: { color: ECG_COCKPIT_COLORS.accent },
  row: { alignItems: "center", flex: 1, flexDirection: "row", gap: ECG_SPACING.md, paddingHorizontal: ECG_SPACING.sm },
});
