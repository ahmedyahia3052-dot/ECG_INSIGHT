import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { EcgLiveMonitorClinicalToolbar, exportMonitorCanvas } from "../EcgLiveMonitorClinicalToolbar";
import { EcgLiveMonitorLeadStrip } from "../EcgLiveMonitorLeadStrip";
import { ECG_LIVE_MONITOR } from "../ecgLiveMonitorTokens";
import type { MonitorComparisonPreset, MonitorLayoutMode, RhythmStripWindow } from "../monitorLayout";
import type { EcgLiveMonitorEngine } from "../useEcgLiveMonitorEngine";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgLeadId } from "../types";
import { HMI_COLORS } from "./ecgLiveMonitorHmiTokens";

function RailButton({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.railBtn}>
      <Text style={styles.railBtnLabel}>{label}</Text>
    </Pressable>
  );
}

export const EcgLiveMonitorHmiLeftRail = memo(function EcgLiveMonitorHmiLeftRail({
  canvasRef,
  collapsed,
  comparisonPreset,
  controls,
  customLeads,
  engine,
  exportFilename,
  layoutMode,
  measureMode,
  onCollapseToggle,
  onComparisonPreset,
  onCustomLeadsChange,
  onFocusLead,
  onLayoutModeChange,
  onLeadChange,
  onMeasureToggle,
  onResetView,
  onRhythmStripToggle,
  onRhythmWindowChange,
  rhythmStripWindowSec,
  selectedLead,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  collapsed: boolean;
  comparisonPreset?: MonitorComparisonPreset;
  controls: EcgViewerControls;
  customLeads: EcgLeadId[];
  engine: EcgLiveMonitorEngine;
  exportFilename: string;
  layoutMode: MonitorLayoutMode;
  measureMode: boolean;
  onCollapseToggle: () => void;
  onComparisonPreset?: (preset: MonitorComparisonPreset) => void;
  onCustomLeadsChange: (leads: EcgLeadId[]) => void;
  onFocusLead?: (lead: EcgLeadId) => void;
  onLayoutModeChange: (mode: MonitorLayoutMode) => void;
  onLeadChange: (lead: EcgLeadId) => void;
  onMeasureToggle: () => void;
  onResetView: () => void;
  onRhythmStripToggle: () => void;
  onRhythmWindowChange?: (seconds: RhythmStripWindow) => void;
  rhythmStripWindowSec?: RhythmStripWindow;
  selectedLead: EcgLeadId;
}) {
  const handleSnapshot = () => exportMonitorCanvas(canvasRef.current, exportFilename);

  if (collapsed) {
    return (
      <View style={styles.collapsedRoot} testID="sprint49-hmi-left-rail">
        <Pressable onPress={onCollapseToggle} style={styles.collapseToggle}>
          <Text style={styles.collapseGlyph}>›</Text>
        </Pressable>
        <RailButton label="Lead" onPress={onCollapseToggle} />
        <RailButton label="Flt" onPress={onCollapseToggle} />
        <RailButton label="Cap" onPress={handleSnapshot} />
      </View>
    );
  }

  return (
    <View style={styles.root} testID="sprint49-hmi-left-rail">
      <View style={styles.header}>
        <Text style={styles.title}>ACQUISITION</Text>
        <Pressable onPress={onCollapseToggle} style={styles.collapseToggle}>
          <Text style={styles.collapseGlyph}>‹</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <EcgLiveMonitorLeadStrip
          compact
          comparisonPreset={comparisonPreset}
          customLeads={customLeads}
          layoutMode={layoutMode}
          onComparisonPreset={onComparisonPreset}
          onCustomLeadsChange={onCustomLeadsChange}
          onFocusLead={onFocusLead}
          onLayoutModeChange={onLayoutModeChange}
          onLeadChange={onLeadChange}
          onRhythmStripToggle={onRhythmStripToggle}
          onRhythmWindowChange={onRhythmWindowChange}
          rhythmStripMode={engine.rhythmStripMode}
          rhythmStripWindowSec={rhythmStripWindowSec ?? engine.rhythmStripWindowSec}
          selectedLead={selectedLead}
        />
          <EcgLiveMonitorClinicalToolbar
            compact
            controls={controls}
            measureMode={measureMode}
            onExport={handleSnapshot}
            onMeasureToggle={onMeasureToggle}
            onPanToggle={controls.togglePanMode}
            onResetView={onResetView}
            onSnapshot={handleSnapshot}
            panActive={controls.panMode === "active"}
          />
        <View style={styles.quickActions}>
          <PrimaryButton label={measureMode ? "Calipers On" : "Calipers"} onPress={onMeasureToggle} variant={measureMode ? "primary" : "outline"} />
          <PrimaryButton label="Capture" onPress={handleSnapshot} variant="outline" />
          <PrimaryButton label={engine.recording ? "Stop Rec" : "Record"} onPress={engine.toggleRecord} variant={engine.recording ? "danger" : "outline"} />
          <PrimaryButton label={engine.frozen ? "Unfreeze" : "Freeze"} onPress={() => (engine.frozen ? engine.resume() : engine.setFrozen(true))} variant="outline" />
          <PrimaryButton label="Export" onPress={handleSnapshot} variant="outline" />
          <PrimaryButton label="Reset" onPress={onResetView} variant="outline" />
        </View>
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  body: { gap: 6, paddingBottom: 8, paddingHorizontal: 4 },
  collapseGlyph: { color: HMI_COLORS.railAccent, fontSize: 14, fontWeight: "900" },
  collapseToggle: { padding: 4 },
  collapsedRoot: {
    alignItems: "center",
    backgroundColor: HMI_COLORS.panelBg,
    borderRightColor: HMI_COLORS.panelBorder,
    borderRightWidth: 1,
    gap: 6,
    paddingVertical: 6,
    width: 36,
  },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingTop: 4 },
  quickActions: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  railBtn: {
    alignItems: "center",
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: HMI_COLORS.panelBorder,
    borderRadius: 3,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 6,
    width: 28,
  },
  railBtnLabel: { color: HMI_COLORS.railText, fontSize: 7, fontWeight: "900", textAlign: "center" },
  root: {
    backgroundColor: "rgba(1, 4, 9, 0.88)",
    borderRightColor: HMI_COLORS.panelBorder,
    borderRightWidth: 1,
    flex: 1,
    flexShrink: 0,
    minHeight: 0,
  },
  title: { color: HMI_COLORS.railMuted, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
});
