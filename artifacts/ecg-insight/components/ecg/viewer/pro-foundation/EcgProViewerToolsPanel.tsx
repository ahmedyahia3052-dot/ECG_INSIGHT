import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgProViewerDisplayMode, EcgProViewerTheme } from "./types";
import { ECG_PRO_VIEWER_THEMES } from "./types";

type Props = {
  controls: EcgViewerControls;
  displayMode: EcgProViewerDisplayMode;
  onDisplayModeChange: (mode: EcgProViewerDisplayMode) => void;
  theme: EcgProViewerTheme;
};

function ToolItem({
  icon,
  label,
  onPress,
  palette,
  testID,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  palette: (typeof ECG_PRO_VIEWER_THEMES)["dark"];
  testID?: string;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.item, { borderColor: palette.border }]} testID={testID}>
      <Feather color={palette.text} name={icon} size={16} />
      <Text style={[styles.itemText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export function EcgProViewerToolsPanel({ controls, displayMode, onDisplayModeChange, theme }: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  return (
    <View style={[styles.root, { backgroundColor: palette.panel, borderRightColor: palette.border }]} testID="sprint93-ecg-pro-viewer-tools">
      <Text style={[styles.title, { color: palette.muted }]}>TOOLS</Text>
      <ScrollView contentContainerStyle={styles.list}>
        <ToolItem icon="move" label="Pan" onPress={controls.togglePanMode} palette={palette} testID="sprint93-tool-pan" />
        <ToolItem icon="grid" label={controls.grid.visible ? "Hide Grid" : "Show Grid"} onPress={controls.toggleGrid} palette={palette} />
        <ToolItem icon="sun" label="Grid Opacity" onPress={controls.cycleGridOpacity} palette={palette} />
        <ToolItem icon="rotate-cw" label="Rotate" onPress={controls.rotate} palette={palette} />
        <ToolItem icon="refresh-cw" label="Reset View" onPress={controls.resetView} palette={palette} />
        <ToolItem icon="image" label="Original" onPress={() => onDisplayModeChange("image")} palette={palette} testID="sprint93-view-image" />
        <ToolItem icon="grid" label="Grid Only" onPress={() => onDisplayModeChange("grid")} palette={palette} testID="sprint93-view-grid" />
        <ToolItem icon="layers" label="Image + Grid" onPress={() => onDisplayModeChange("image-grid")} palette={palette} testID="sprint93-view-combined" />
        <Text style={[styles.caption, { color: palette.muted }]}>Mode: {displayMode}</Text>
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
