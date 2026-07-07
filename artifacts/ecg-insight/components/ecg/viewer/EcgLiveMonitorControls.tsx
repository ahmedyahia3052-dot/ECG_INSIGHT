import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { ECG_LIVE_MONITOR } from "./ecgLiveMonitorTokens";
import type { EcgLiveMonitorEngine } from "./useEcgLiveMonitorEngine";
import type { EcgViewerControls } from "./useEcgViewerControls";

export const EcgLiveMonitorControls = memo(function EcgLiveMonitorControls({
  controls,
  engine,
  floating = false,
  onEnterDiagnostic,
  onResetView,
}: {
  controls: EcgViewerControls;
  engine: EcgLiveMonitorEngine;
  floating?: boolean;
  onEnterDiagnostic?: () => void;
  onResetView?: () => void;
}) {
  return (
    <View style={[styles.root, floating && styles.rootFloating]} testID="sprint37-live-monitor-controls">
      <ControlGroup label="Transport">
        <PrimaryButton label={engine.isPlaying ? "Pause" : "Play"} onPress={engine.togglePlay} variant="primary" />
        <PrimaryButton label={engine.frozen ? "Resume" : "Freeze"} onPress={() => (engine.frozen ? engine.resume() : engine.setFrozen(true))} variant="outline" />
        <PrimaryButton label={engine.reviewMode ? "Exit Review" : "Review Mode"} onPress={engine.toggleReviewMode} variant={engine.reviewMode ? "primary" : "outline"} />
        <PrimaryButton label={engine.recording ? "Stop Rec" : "Record"} onPress={engine.toggleRecord} variant={engine.recording ? "danger" : "outline"} />
        <PrimaryButton label={engine.loop ? "Loop On" : "Loop Off"} onPress={() => engine.setLoop(!engine.loop)} variant="outline" />
      </ControlGroup>
      <ControlGroup label="Navigate">
        <PrimaryButton label="Jump Start" onPress={engine.jumpToStart} variant="outline" />
        <PrimaryButton label="Jump End" onPress={engine.jumpToEnd} variant="outline" />
        <PrimaryButton label="Frame −" onPress={engine.frameStepBackward} variant="outline" />
        <PrimaryButton label="Frame +" onPress={engine.frameStepForward} variant="outline" />
        <PrimaryButton label="Beat −" onPress={engine.previousBeat} variant="outline" />
        <PrimaryButton label="Beat +" onPress={engine.nextBeat} variant="outline" />
      </ControlGroup>
      <ControlGroup label="Signal">
        <PrimaryButton label="Speed 25" onPress={() => { controls.setGrid((c) => ({ ...c, speed: 25 })); engine.setPaperSpeed(25); }} variant={controls.grid.speed === 25 ? "primary" : "outline"} />
        <PrimaryButton label="Speed 50" onPress={() => { controls.setGrid((c) => ({ ...c, speed: 50 })); engine.setPaperSpeed(50); }} variant={controls.grid.speed === 50 ? "primary" : "outline"} />
        <PrimaryButton label="Gain 5" onPress={() => controls.setGrid((c) => ({ ...c, gain: 5 }))} variant={controls.grid.gain === 5 ? "primary" : "outline"} />
        <PrimaryButton label="Gain 10" onPress={() => controls.setGrid((c) => ({ ...c, gain: 10 }))} variant={controls.grid.gain === 10 ? "primary" : "outline"} />
        <PrimaryButton label="Gain 20" onPress={() => controls.setGrid((c) => ({ ...c, gain: 20 }))} variant={controls.grid.gain === 20 ? "primary" : "outline"} />
        <PrimaryButton label={controls.grid.visible ? "Grid On" : "Grid Off"} onPress={controls.toggleGrid} variant="outline" />
        {onResetView ? <PrimaryButton label="Reset View" onPress={onResetView} variant="outline" /> : null}
      </ControlGroup>
      {onEnterDiagnostic ? (
        <ControlGroup label="Display">
          <PrimaryButton label="Diagnostic Monitor" onPress={onEnterDiagnostic} variant="primary" />
        </ControlGroup>
      ) : null}
      <Text style={styles.hint}>Space Play · F Freeze · V Review · R Record · L Loop · ESC Exit · ± Zoom · Arrows Navigate</Text>
    </View>
  );
});

function ControlGroup({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <ScrollView horizontal contentContainerStyle={styles.groupRow} showsHorizontalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 4 },
  groupLabel: { color: ECG_LIVE_MONITOR.statusMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  groupRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { color: ECG_LIVE_MONITOR.statusMuted, fontSize: 10, fontWeight: "700", paddingTop: 4 },
  root: {
    backgroundColor: ECG_LIVE_MONITOR.canvasBackground,
    borderTopColor: ECG_LIVE_MONITOR.border,
    borderTopWidth: 1,
    gap: 8,
    padding: 12,
  },
  rootFloating: {
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 12,
    borderWidth: 1,
    bottom: 16,
    left: 16,
    maxWidth: 960,
    position: "absolute",
    right: 16,
    zIndex: 20,
  },
});
