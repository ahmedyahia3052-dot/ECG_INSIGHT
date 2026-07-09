import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgProViewerCanvasMode, EcgProViewerDisplayMode, EcgProViewerLayoutPreset, EcgProViewerTheme } from "./types";
import { ECG_PRO_VIEWER_THEMES } from "./types";

type Props = {
  canvasMode: EcgProViewerCanvasMode;
  controls: EcgViewerControls;
  displayMode: EcgProViewerDisplayMode;
  layoutPreset: EcgProViewerLayoutPreset;
  onCanvasModeChange: (mode: EcgProViewerCanvasMode) => void;
  onDisplayModeChange: (mode: EcgProViewerDisplayMode) => void;
  onLayoutPresetChange: (preset: EcgProViewerLayoutPreset) => void;
  theme: EcgProViewerTheme;
  workspace?: EcgMeasurementWorkspace;
};

function ToolItem({
  active,
  icon,
  label,
  onPress,
  palette,
  testID,
}: {
  active?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  palette: (typeof ECG_PRO_VIEWER_THEMES)["dark"];
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.item, { borderColor: palette.border, backgroundColor: active ? palette.border : "transparent" }]}
      testID={testID}
    >
      <Feather color={palette.text} name={icon} size={16} />
      <Text style={[styles.itemText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export function EcgProViewerToolsPanel({
  canvasMode,
  controls,
  displayMode,
  layoutPreset,
  onCanvasModeChange,
  onDisplayModeChange,
  onLayoutPresetChange,
  theme,
  workspace,
}: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  const toolMode = workspace?.present.toolMode ?? "select";
  return (
    <View style={[styles.root, { backgroundColor: palette.panel, borderRightColor: palette.border }]} testID="sprint96-ecg-pro-viewer-tools">
      <Text style={[styles.title, { color: palette.muted }]}>TOOLS</Text>
      <ScrollView contentContainerStyle={styles.list}>
        <ToolItem active={layoutPreset === "12-lead"} icon="grid" label="12-Lead" onPress={() => onLayoutPresetChange("12-lead")} palette={palette} testID="sprint95-tool-layout-12-lead" />
        <ToolItem active={layoutPreset === "rhythm"} icon="activity" label="Rhythm" onPress={() => onLayoutPresetChange("rhythm")} palette={palette} testID="sprint95-tool-layout-rhythm" />
        <ToolItem active={layoutPreset === "single"} icon="target" label="Focus" onPress={() => onLayoutPresetChange("single")} palette={palette} testID="sprint95-tool-layout-focus" />
        <ToolItem active={layoutPreset === "3x4"} icon="layout" label="3x4" onPress={() => onLayoutPresetChange("3x4")} palette={palette} testID="sprint95-tool-layout-3x4" />
        <ToolItem active={layoutPreset === "6x2"} icon="columns" label="6x2" onPress={() => onLayoutPresetChange("6x2")} palette={palette} testID="sprint95-tool-layout-6x2" />
        <ToolItem icon="move" label="Pan" onPress={controls.togglePanMode} palette={palette} testID="sprint95-tool-pan" />
        <ToolItem icon="grid" label={controls.grid.visible ? "Hide Grid" : "Show Grid"} onPress={controls.toggleGrid} palette={palette} />
        <ToolItem icon="sun" label="Grid Opacity" onPress={controls.cycleGridOpacity} palette={palette} />
        <ToolItem icon="rotate-cw" label="Rotate" onPress={controls.rotate} palette={palette} />
        <ToolItem icon="refresh-cw" label="Reset View" onPress={controls.resetView} palette={palette} />
        <ToolItem active={canvasMode === "image"} icon="image" label="Image" onPress={() => onCanvasModeChange("image")} palette={palette} testID="sprint95-tool-canvas-image" />
        <ToolItem active={canvasMode === "waveform"} icon="trending-up" label="Waveform" onPress={() => onCanvasModeChange("waveform")} palette={palette} testID="sprint95-tool-canvas-waveform" />
        <ToolItem active={canvasMode === "hybrid"} icon="layers" label="Hybrid" onPress={() => onCanvasModeChange("hybrid")} palette={palette} testID="sprint95-tool-canvas-hybrid" />
        <ToolItem icon="image" label="Original" onPress={() => onDisplayModeChange("image")} palette={palette} testID="sprint95-view-image" />
        <ToolItem icon="grid" label="Grid Only" onPress={() => onDisplayModeChange("grid")} palette={palette} testID="sprint95-view-grid" />
        <ToolItem icon="layers" label="Image + Grid" onPress={() => onDisplayModeChange("image-grid")} palette={palette} testID="sprint95-view-combined" />
        <Text style={[styles.caption, { color: palette.muted }]}>Mode: {displayMode} · {canvasMode}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  caption: { fontSize: 11, marginTop: 8 },
  item: { alignItems: "center", borderRadius: 12, borderWidth: 1, gap: 6, paddingHorizontal: 8, paddingVertical: 10 },
  itemText: { fontSize: 11, fontWeight: "700", textAlign: "center" },
  list: { gap: 10, padding: 10 },
  root: { borderRightWidth: 1, width: 92 },
  title: { fontSize: 11, fontWeight: "800", letterSpacing: 1, paddingHorizontal: 10, paddingTop: 12 },
});
