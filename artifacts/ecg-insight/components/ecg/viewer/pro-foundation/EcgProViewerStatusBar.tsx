import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { resolveGridSpacing } from "../ecgCalibrationMath";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgProViewerPointer, EcgProViewerTheme } from "./types";
import { ECG_PRO_VIEWER_THEMES } from "./types";

type Props = {
  controls: EcgViewerControls;
  fps?: number;
  pointer: EcgProViewerPointer;
  theme: EcgProViewerTheme;
};

export function EcgProViewerStatusBar({ controls, fps = 0, pointer, theme }: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  const spacing = resolveGridSpacing(controls.grid);
  const zoomPct = Math.round(controls.transform.zoom * 100);
  const pointerLabel = pointer
    ? `X ${Math.round(pointer.imageX)} · Y ${Math.round(pointer.imageY)}`
    : "Move pointer over canvas";

  return (
    <View style={[styles.root, { backgroundColor: palette.toolbar, borderTopColor: palette.border }]} testID="sprint95-ecg-pro-viewer-status">
      <Text style={[styles.item, { color: palette.text }]} testID="sprint95-status-zoom">Zoom {zoomPct}%</Text>
      <Text style={[styles.item, { color: palette.muted }]} testID="sprint95-status-pointer">{pointerLabel}</Text>
      <Text style={[styles.item, { color: palette.muted }]} testID="sprint95-status-paper">
        {controls.grid.speed} mm/s · {controls.grid.gain} mm/mV · grid {spacing.toFixed(1)} px
      </Text>
      <Text style={[styles.item, { color: palette.muted }]} testID="sprint95-status-fps">FPS {Math.round(fps)}</Text>
      <Text style={[styles.item, { color: palette.muted }]} testID="sprint95-status-canvas">
        Canvas {Math.round(controls.viewport.containerWidth)} × {Math.round(controls.viewport.containerHeight)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { fontSize: 12, fontWeight: "600" },
  root: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
