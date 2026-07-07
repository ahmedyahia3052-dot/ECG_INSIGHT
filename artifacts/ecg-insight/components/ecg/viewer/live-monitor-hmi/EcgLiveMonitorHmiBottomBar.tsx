import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { EcgLiveMonitorControls } from "../EcgLiveMonitorControls";
import { ECG_LIVE_MONITOR } from "../ecgLiveMonitorTokens";
import type { EcgLiveMonitorEngine } from "../useEcgLiveMonitorEngine";
import type { EcgViewerControls } from "../useEcgViewerControls";
import { HMI_COLORS } from "./ecgLiveMonitorHmiTokens";

export const EcgLiveMonitorHmiBottomBar = memo(function EcgLiveMonitorHmiBottomBar({
  collapsed,
  controls,
  durationMs,
  engine,
  onAutoHideToggle,
  onCollapseToggle,
  onEnterDiagnostic,
  onResetView,
  palettePinned,
}: {
  collapsed: boolean;
  controls: EcgViewerControls;
  durationMs: number;
  engine: EcgLiveMonitorEngine;
  onAutoHideToggle: () => void;
  onCollapseToggle: () => void;
  onEnterDiagnostic?: () => void;
  onResetView: () => void;
  palettePinned: boolean;
}) {
  if (collapsed) {
    return (
      <Pressable onPress={onCollapseToggle} style={styles.collapsedBar} testID="sprint45-floating-palette">
        <Text style={styles.collapsedLabel} testID="sprint45-palette-reveal">
          Timeline · Controls
        </Text>
      </Pressable>
    );
  }

  const progress = durationMs > 0 ? Math.round((engine.playheadMs / durationMs) * 100) : 0;

  return (
    <View style={styles.root} testID="sprint45-floating-palette">
      <View style={styles.timelineRow} testID="sprint49-hmi-bottom-bar">
        <Text style={styles.timelineLabel}>TIMELINE</Text>
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${Math.max(4, progress)}%` }]} />
        </View>
        <Text style={styles.timeLabel}>{progress}%</Text>
        <PrimaryButton label={palettePinned ? "Auto-hide" : "Pin"} onPress={onAutoHideToggle} variant="outline" />
        {onEnterDiagnostic ? <PrimaryButton label="Diagnostic Monitor" onPress={onEnterDiagnostic} variant="primary" /> : null}
        <Pressable onPress={onCollapseToggle} style={styles.hideBtn}>
          <Text style={styles.hideLabel}>Hide</Text>
        </Pressable>
      </View>
      <View style={styles.controlsRow}>
        <PrimaryButton label="Zoom −" onPress={() => controls.zoomBy(-1)} variant="outline" />
        <PrimaryButton label="Zoom +" onPress={() => controls.zoomBy(1)} variant="outline" />
        <PrimaryButton label={`Scale ${controls.grid.gain} mm/mV`} onPress={controls.cycleGain} variant="outline" />
        <PrimaryButton label={`Speed ${controls.grid.speed}`} onPress={() => controls.setGrid((c) => ({ ...c, speed: c.speed === 25 ? 50 : 25 }))} variant="outline" />
        <EcgLiveMonitorControls
          compact
          controls={controls}
          engine={engine}
          filterLabel={engine.filter}
          onFilterCycle={engine.cycleFilter}
          onResetView={onResetView}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  collapsedBar: {
    alignItems: "center",
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderTopColor: HMI_COLORS.panelBorder,
    borderTopWidth: 1,
    paddingVertical: 4,
  },
  collapsedLabel: { color: HMI_COLORS.railText, fontSize: 9, fontWeight: "800" },
  controlsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, paddingHorizontal: 6, paddingVertical: 2 },
  hideBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  hideLabel: { color: HMI_COLORS.railMuted, fontSize: 9, fontWeight: "800" },
  root: {
    backgroundColor: HMI_COLORS.panelBg,
    borderTopColor: HMI_COLORS.panelBorder,
    borderTopWidth: 1,
    flexShrink: 0,
  },
  timeLabel: { color: HMI_COLORS.railText, fontSize: 9, fontWeight: "900", minWidth: 32 },
  timelineLabel: { color: HMI_COLORS.railMuted, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  timelineRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 6, paddingTop: 4 },
  track: { backgroundColor: "#0A1628", borderRadius: 999, flex: 1, height: 6, minWidth: 80, overflow: "hidden" },
  trackFill: { backgroundColor: ECG_LIVE_MONITOR.phosphor, height: "100%" },
});
