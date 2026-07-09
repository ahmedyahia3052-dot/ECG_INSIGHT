import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgGridGain, EcgPaperSpeed } from "../types";
import type {
  EcgProViewerCanvasMode,
  EcgProViewerDisplayMode,
  EcgProViewerLayoutPreset,
  EcgProViewerLeadSelection,
  EcgProViewerTheme,
} from "./types";
import { ECG_PRO_VIEWER_THEMES } from "./types";
import { STANDARD_ECG_LEADS } from "../types";

type Props = {
  canvasMode: EcgProViewerCanvasMode;
  caseName?: string;
  compareEnabled: boolean;
  controls: EcgViewerControls;
  displayMode: EcgProViewerDisplayMode;
  imageUrl?: string;
  layoutPreset: EcgProViewerLayoutPreset;
  lead: EcgProViewerLeadSelection;
  onCanvasModeChange: (mode: EcgProViewerCanvasMode) => void;
  onCompareToggle: () => void;
  onDisplayModeChange: (mode: EcgProViewerDisplayMode) => void;
  onDownload: () => void;
  onLayoutPresetChange: (preset: EcgProViewerLayoutPreset) => void;
  onLeadChange: (lead: EcgProViewerLeadSelection) => void;
  onPrint: () => void;
  onThemeToggle: () => void;
  patientName?: string;
  studyDate?: string;
  theme: EcgProViewerTheme;
};

function ToolbarButton({
  active,
  disabled,
  icon,
  label,
  onPress,
  palette,
  testID,
}: {
  active?: boolean;
  disabled?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  palette: (typeof ECG_PRO_VIEWER_THEMES)["dark"];
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.toolBtn, { borderColor: palette.border, opacity: disabled ? 0.45 : 1 }, active && { backgroundColor: palette.border }]}
      testID={testID}
    >
      <Feather color={palette.text} name={icon} size={14} />
      <Text style={[styles.toolBtnText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export function EcgProViewerToolbar({
  canvasMode,
  caseName,
  compareEnabled,
  controls,
  displayMode,
  imageUrl,
  layoutPreset,
  lead,
  onCanvasModeChange,
  onCompareToggle,
  onDisplayModeChange,
  onDownload,
  onLayoutPresetChange,
  onLeadChange,
  onPrint,
  onThemeToggle,
  patientName,
  studyDate,
  theme,
}: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  const setSpeed = (speed: EcgPaperSpeed) => controls.setGrid({ ...controls.grid, speed });
  const setGain = (gain: EcgGridGain) => controls.setGrid({ ...controls.grid, gain });

  const cycleLead = () => {
    if (lead === "ALL") {
      onLeadChange(STANDARD_ECG_LEADS[0]);
      return;
    }
    const index = STANDARD_ECG_LEADS.indexOf(lead);
    onLeadChange(index >= STANDARD_ECG_LEADS.length - 1 ? "ALL" : STANDARD_ECG_LEADS[index + 1]!);
  };

  const requestFullscreen = () => {
    controls.toggleFullscreen();
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const root = document.querySelector('[data-testid="sprint95-ecg-pro-viewer-root"]');
      if (!document.fullscreenElement && root?.requestFullscreen) {
        void root.requestFullscreen();
      } else if (document.fullscreenElement) {
        void document.exitFullscreen();
      }
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.toolbar, borderBottomColor: palette.border }]} testID="sprint95-ecg-pro-viewer-toolbar">
      <View style={styles.meta}>
        <Text numberOfLines={1} style={[styles.caseName, { color: palette.text }]}>{caseName ?? "ECG Study"}</Text>
        <Text numberOfLines={1} style={[styles.metaSub, { color: palette.muted }]}>{patientName ?? "Patient"} · {studyDate ?? "Study date pending"}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.actions} horizontal showsHorizontalScrollIndicator={false}>
        <ToolbarButton active={layoutPreset === "12-lead"} icon="grid" label="12-Lead" onPress={() => onLayoutPresetChange("12-lead")} palette={palette} testID="sprint95-layout-12-lead" />
        <ToolbarButton active={layoutPreset === "rhythm"} icon="activity" label="Rhythm" onPress={() => onLayoutPresetChange("rhythm")} palette={palette} testID="sprint95-layout-rhythm" />
        <ToolbarButton active={layoutPreset === "single"} icon="target" label="Focus" onPress={() => { onLayoutPresetChange("single"); if (lead === "ALL") onLeadChange(STANDARD_ECG_LEADS[0]); }} palette={palette} testID="sprint95-layout-focus" />
        <ToolbarButton icon="filter" label={`Lead ${lead}`} onPress={cycleLead} palette={palette} testID="sprint95-lead-selector" />
        <ToolbarButton icon="zoom-in" label="Zoom +" onPress={() => controls.zoomBy(0.15)} palette={palette} />
        <ToolbarButton icon="zoom-out" label="Zoom −" onPress={() => controls.zoomBy(-0.15)} palette={palette} />
        <ToolbarButton icon="maximize" label="Fit Width" onPress={() => controls.applyFit("width")} palette={palette} testID="sprint95-fit-width" />
        <ToolbarButton icon="monitor" label="Fit Screen" onPress={() => controls.applyFit("hero")} palette={palette} testID="sprint95-fit-screen" />
        <ToolbarButton active={controls.grid.speed === 25} icon="activity" label="25 mm/s" onPress={() => setSpeed(25)} palette={palette} testID="sprint95-speed-25" />
        <ToolbarButton active={controls.grid.speed === 50} icon="activity" label="50 mm/s" onPress={() => setSpeed(50)} palette={palette} testID="sprint95-speed-50" />
        <ToolbarButton active={controls.grid.gain === 5} icon="bar-chart" label="5 mm/mV" onPress={() => setGain(5)} palette={palette} testID="sprint95-gain-5" />
        <ToolbarButton active={controls.grid.gain === 10} icon="bar-chart" label="10 mm/mV" onPress={() => setGain(10)} palette={palette} testID="sprint95-gain-10" />
        <ToolbarButton active={controls.grid.gain === 20} icon="bar-chart" label="20 mm/mV" onPress={() => setGain(20)} palette={palette} testID="sprint95-gain-20" />
        <ToolbarButton active={compareEnabled} icon="copy" label="Compare" onPress={onCompareToggle} palette={palette} testID="sprint95-compare-toggle" />
        <ToolbarButton active={canvasMode === "waveform"} icon="trending-up" label="Waveform" onPress={() => onCanvasModeChange(canvasMode === "waveform" ? "hybrid" : "waveform")} palette={palette} testID="sprint95-waveform-mode" />
        <ToolbarButton icon="image" label="Image" onPress={() => onDisplayModeChange("image")} palette={palette} active={displayMode === "image"} />
        <ToolbarButton icon="grid" label="Grid" onPress={() => onDisplayModeChange("grid")} palette={palette} active={displayMode === "grid"} />
        <ToolbarButton icon="layers" label="Image+Grid" onPress={() => onDisplayModeChange("image-grid")} palette={palette} active={displayMode === "image-grid"} />
        <ToolbarButton icon={theme === "dark" ? "sun" : "moon"} label={theme === "dark" ? "Light" : "Dark"} onPress={onThemeToggle} palette={palette} />
        <ToolbarButton icon="maximize-2" label="Fullscreen" onPress={requestFullscreen} palette={palette} testID="sprint95-fullscreen" />
        <ToolbarButton disabled={!imageUrl} icon="download" label="Download" onPress={onDownload} palette={palette} testID="sprint95-download" />
        <ToolbarButton disabled={!imageUrl} icon="printer" label="Print" onPress={onPrint} palette={palette} testID="sprint95-print" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "center", flexDirection: "row", gap: 8, paddingHorizontal: 8 },
  caseName: { fontSize: 15, fontWeight: "800" },
  meta: { gap: 2, maxWidth: 280, paddingHorizontal: 12, paddingVertical: 8 },
  metaSub: { fontSize: 12 },
  root: { borderBottomWidth: 1, gap: 4 },
  toolBtn: { alignItems: "center", borderRadius: 10, borderWidth: 1, flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
  toolBtnText: { fontSize: 12, fontWeight: "700" },
});
