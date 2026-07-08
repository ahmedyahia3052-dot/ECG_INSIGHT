import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_SPACING } from "./ecgSpacingTokens";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type ToolItem = {
  active?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  testID?: string;
};

function ToolSection({ items, title }: { items: ToolItem[]; title: string }) {
  return (
    <View style={styles.section} testID={`sprint53-tool-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.toolGrid}>
        {items.map((item) => (
          <Pressable
            accessibilityLabel={item.label}
            accessibilityRole="button"
            disabled={!item.onPress}
            key={item.label}
            onPress={item.onPress}
            style={({ hovered, pressed }) => [
              styles.toolBtn,
              item.active && styles.toolBtnActive,
              hovered && styles.toolBtnHover,
              pressed && styles.toolBtnPressed,
            ]}
            testID={item.testID}
          >
            <Feather color={item.active ? ECG_COCKPIT_COLORS.bgDeep : ECG_COCKPIT_COLORS.accent} name={item.icon} size={13} />
            <Text numberOfLines={1} style={[styles.toolLabel, item.active && styles.toolLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Canvas tools docked in the left sidebar — no floating overlap. */
export const EcgWorkspaceLeftToolSections = memo(function EcgWorkspaceLeftToolSections({
  controls,
  onEnterDiagnostic,
  onToggleCrosshair,
  onToggleMagnifier,
  showCrosshair = false,
  showMagnifier = false,
  workspace,
}: {
  controls: EcgViewerControls;
  onEnterDiagnostic?: () => void;
  onToggleCrosshair?: () => void;
  onToggleMagnifier?: () => void;
  showCrosshair?: boolean;
  showMagnifier?: boolean;
  workspace?: EcgMeasurementWorkspace;
}) {
  const navigation: ToolItem[] = [
    {
      active: workspace?.present.toolMode === "select",
      icon: "mouse-pointer",
      label: "Pointer",
      onPress: () => workspace?.setToolMode("select"),
      testID: "sprint53-tool-pointer",
    },
    {
      active: controls.panMode === "active",
      icon: "move",
      label: "Pan",
      onPress: controls.togglePanMode,
      testID: "sprint53-tool-pan",
    },
    {
      icon: "zoom-in",
      label: "Zoom In",
      onPress: () => controls.zoomBy(0.2),
      testID: "sprint53-tool-zoom-in",
    },
    {
      icon: "zoom-out",
      label: "Zoom Out",
      onPress: () => controls.zoomBy(-0.2),
      testID: "sprint53-tool-zoom-out",
    },
  ];

  const measurement: ToolItem[] = [
    {
      active: workspace?.present.toolMode === "caliper",
      icon: "maximize",
      label: "Calipers",
      onPress: () => workspace?.setToolMode("caliper"),
      testID: "sprint53-tool-calipers",
    },
    {
      active: workspace?.present.toolMode === "measurement",
      icon: "sliders",
      label: "Measure",
      onPress: () => workspace?.setToolMode("measurement"),
      testID: "sprint53-tool-measure",
    },
    {
      active: workspace?.present.toolMode === "annotation",
      icon: "edit-3",
      label: "Annotate",
      onPress: () => workspace?.setToolMode("annotation"),
      testID: "sprint53-tool-annotate",
    },
  ];

  const view: ToolItem[] = [
    {
      active: controls.grid.visible,
      icon: "grid",
      label: "Grid",
      onPress: controls.toggleGrid,
      testID: "sprint53-tool-grid",
    },
    {
      active: showCrosshair,
      icon: "crosshair",
      label: "Crosshair",
      onPress: onToggleCrosshair,
      testID: "sprint53-tool-crosshair",
    },
    {
      active: showMagnifier,
      icon: "search",
      label: "Magnifier",
      onPress: onToggleMagnifier,
      testID: "sprint53-tool-magnifier",
    },
    {
      icon: "rotate-cw",
      label: "Rotate",
      onPress: controls.rotate,
      testID: "sprint53-tool-rotate",
    },
    {
      icon: "refresh-cw",
      label: "Reset View",
      onPress: () => {
        controls.resetView();
        controls.applyFit("hero");
      },
      testID: "sprint53-tool-reset",
    },
    {
      icon: "maximize",
      label: "Full Screen",
      onPress: onEnterDiagnostic,
      testID: "sprint53-tool-fullscreen",
    },
  ];

  return (
    <View style={styles.root} testID="sprint53-left-tool-sections">
      <ToolSection items={navigation} title="Navigation" />
      <ToolSection items={measurement} title="Measurement" />
      <ToolSection items={view} title="View" />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { gap: ECG_SPACING.sm },
  section: { gap: ECG_SPACING.xs },
  sectionTitle: {
    color: ECG_COCKPIT_COLORS.accent,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  toolBtn: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  toolBtnActive: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderColor: ECG_COCKPIT_COLORS.accent },
  toolBtnHover: { borderColor: ECG_COCKPIT_COLORS.accentMuted },
  toolBtnPressed: { opacity: 0.9 },
  toolGrid: { gap: 4 },
  toolLabel: { color: ECG_COCKPIT_COLORS.text, flex: 1, fontSize: 11, fontWeight: "600" },
  toolLabelActive: { color: ECG_COCKPIT_COLORS.bgDeep },
});
