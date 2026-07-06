import { Feather } from "@expo/vector-icons";
import React, { memo, useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { ECG_ENTERPRISE_DESIGN } from "./ecgEnterpriseDesignTokens";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type PaletteAction = {
  active?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
};

function PaletteButton({ action }: { action: PaletteAction }) {
  return (
    <Pressable
      accessibilityLabel={action.label}
      onPress={action.onPress}
      style={({ hovered, pressed }) => [
        styles.btn,
        action.active && styles.btnActive,
        (hovered || pressed) && styles.btnHover,
      ]}
      {...(Platform.OS === "web" ? ({ title: action.label } as never) : {})}
    >
      <Feather color={action.active ? "#03131B" : medicalTheme.primary} name={action.icon} size={14} />
    </Pressable>
  );
}

/** Sprint 29 — auto-hide floating tool palette for frequent viewer actions. */
export const EcgFloatingToolPalette = memo(function EcgFloatingToolPalette({
  controls,
  diagnosticMode = false,
  forceVisible = false,
  onToggleCrosshair,
  showCrosshair = false,
  workspace,
}: {
  controls: EcgViewerControls;
  diagnosticMode?: boolean;
  forceVisible?: boolean;
  onToggleCrosshair?: () => void;
  showCrosshair?: boolean;
  workspace?: EcgMeasurementWorkspace;
}) {
  const [visible, setVisible] = useState(false);
  const measureActive = workspace?.present.toolMode === "caliper" || workspace?.present.toolMode === "measurement";

  useEffect(() => {
    if (diagnosticMode || forceVisible) setVisible(true);
  }, [diagnosticMode, forceVisible]);

  const actions: PaletteAction[] = [
    { icon: "zoom-in", label: "Zoom In", onPress: () => controls.zoomBy(0.2) },
    { icon: "zoom-out", label: "Zoom Out", onPress: () => controls.zoomBy(-0.2) },
    { icon: "maximize-2", label: "Fit", onPress: () => controls.applyFit("width") },
    { icon: "move", label: "Pan", onPress: controls.togglePanMode, active: controls.panMode === "active" },
    { icon: "sliders", label: "Measure", onPress: () => workspace?.setToolMode(measureActive ? "select" : "measurement"), active: measureActive },
    { icon: "maximize", label: "Caliper", onPress: () => workspace?.setToolMode("caliper"), active: workspace?.present.toolMode === "caliper" },
    { icon: "rotate-cw", label: "Rotate", onPress: controls.rotate },
    { icon: "sun", label: "Brightness", onPress: () => controls.adjustBrightness(8) },
    { icon: "sliders", label: "Contrast", onPress: () => controls.adjustContrast(8) },
    { active: showCrosshair, icon: "crosshair", label: "Crosshair", onPress: onToggleCrosshair },
    { icon: "refresh-cw", label: "Reset", onPress: controls.resetView },
  ];

  const showPalette = diagnosticMode || forceVisible || visible;

  return (
    <View pointerEvents="box-none" style={styles.host} testID="sprint29-floating-tool-palette">
      {!showPalette ? (
        <Pressable onPress={() => setVisible(true)} style={styles.peek} testID="sprint29-floating-palette-peek">
          <Feather color={medicalTheme.primary} name="tool" size={14} />
        </Pressable>
      ) : (
        <View style={styles.palette}>
          {actions.map((action) => (
            <PaletteButton action={action} key={action.label} />
          ))}
        </View>
      )}
    </View>
  );
});

const size = ECG_WORKSTATION_VISUAL.toolbarButtonSize - 4;

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    backgroundColor: ECG_ENTERPRISE_DESIGN.color.surface,
    borderColor: medicalTheme.border,
    borderRadius: ECG_ENTERPRISE_DESIGN.radius.sm,
    borderWidth: 1,
    height: size,
    justifyContent: "center",
    width: size,
  },
  btnActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  btnHover: { borderColor: medicalTheme.primary },
  host: {
    bottom: ECG_WORKSTATION_VISUAL.statusBarHeight + 12,
    pointerEvents: "box-none",
    position: "absolute",
    right: 8,
    zIndex: 45,
  },
  palette: {
    backgroundColor: "rgba(6,17,31,0.94)",
    borderColor: medicalTheme.border,
    borderRadius: ECG_ENTERPRISE_DESIGN.radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    maxWidth: 220,
    padding: 6,
  },
  peek: {
    alignItems: "center",
    backgroundColor: "rgba(6,17,31,0.88)",
    borderColor: medicalTheme.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 32,
    justifyContent: "center",
    opacity: 0.72,
    width: 32,
  },
});
