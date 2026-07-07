import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { EcgLiveMonitorClinicalToolbar, exportMonitorCanvas } from "../EcgLiveMonitorClinicalToolbar";
import { EcgLiveMonitorControls } from "../EcgLiveMonitorControls";
import { EcgLiveMonitorLeadStrip } from "../EcgLiveMonitorLeadStrip";
import { ECG_LIVE_MONITOR } from "../ecgLiveMonitorTokens";
import type { MonitorLayoutMode } from "../monitorLayout";
import type { EcgLiveMonitorEngine } from "../useEcgLiveMonitorEngine";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgLeadId } from "../types";

export const EcgLiveMonitorFloatingPalette = memo(function EcgLiveMonitorFloatingPalette({
  autoHideEnabled,
  canvasRef,
  controls,
  customLeads,
  diagnosticMode,
  engine,
  exportFilename,
  layoutMode,
  measureMode,
  onAutoHideToggle,
  onCustomLeadsChange,
  onEnterDiagnostic,
  onLayoutModeChange,
  onLeadChange,
  onMeasureToggle,
  onResetView,
  onRhythmStripToggle,
  paletteVisible,
  revealPalette,
  selectedLead,
}: {
  autoHideEnabled: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  controls: EcgViewerControls;
  customLeads: EcgLeadId[];
  diagnosticMode: boolean;
  engine: EcgLiveMonitorEngine;
  exportFilename: string;
  layoutMode: MonitorLayoutMode;
  measureMode: boolean;
  onAutoHideToggle: () => void;
  onCustomLeadsChange: (leads: EcgLeadId[]) => void;
  onEnterDiagnostic?: () => void;
  onLayoutModeChange: (mode: MonitorLayoutMode) => void;
  onLeadChange: (lead: EcgLeadId) => void;
  onMeasureToggle: () => void;
  onResetView: () => void;
  onRhythmStripToggle: () => void;
  paletteVisible: boolean;
  revealPalette: () => void;
  selectedLead: EcgLeadId;
}) {
  const handleSnapshot = () => exportMonitorCanvas(canvasRef.current, exportFilename);

  if (!paletteVisible && autoHideEnabled) {
    return (
      <Pressable onPress={revealPalette} style={[styles.revealChip, diagnosticMode && styles.revealChipDiagnostic]} testID="sprint45-palette-reveal">
        <Text style={styles.revealText}>Controls</Text>
      </Pressable>
    );
  }

  return (
    <View
      pointerEvents="box-none"
      style={[styles.overlay, diagnosticMode && styles.overlayDiagnostic]}
      testID="sprint45-floating-palette"
    >
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>MONITOR CONTROLS</Text>
          <PrimaryButton label={autoHideEnabled ? "Pin Controls" : "Auto-hide"} onPress={onAutoHideToggle} variant="outline" />
          {!diagnosticMode && onEnterDiagnostic ? (
            <PrimaryButton label="Diagnostic Monitor" onPress={onEnterDiagnostic} variant="primary" />
          ) : null}
        </View>
        <EcgLiveMonitorLeadStrip
          compact
          customLeads={customLeads}
          layoutMode={layoutMode}
          onCustomLeadsChange={onCustomLeadsChange}
          onLayoutModeChange={onLayoutModeChange}
          onLeadChange={onLeadChange}
          onRhythmStripToggle={onRhythmStripToggle}
          rhythmStripMode={engine.rhythmStripMode}
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
  overlay: { bottom: 6, left: 6, pointerEvents: "box-none", position: "absolute", right: 6, zIndex: 40 },
  overlayDiagnostic: { bottom: 8 },
  panel: {
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 6,
    borderWidth: 1,
    gap: 2,
    maxHeight: 148,
    overflow: "hidden",
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  panelHeader: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 4, paddingHorizontal: 2 },
  panelTitle: { color: ECG_LIVE_MONITOR.statusMuted, flex: 1, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
  revealChip: {
    alignSelf: "center",
    backgroundColor: ECG_LIVE_MONITOR.overlay,
    borderColor: ECG_LIVE_MONITOR.border,
    borderRadius: 999,
    borderWidth: 1,
    bottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
    position: "absolute",
    zIndex: 40,
  },
  revealChipDiagnostic: { bottom: 10 },
  revealText: { color: ECG_LIVE_MONITOR.statusText, fontSize: 10, fontWeight: "800" },
});
