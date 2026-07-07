import { Feather } from "@expo/vector-icons";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_ENTERPRISE_DESIGN } from "./ecgEnterpriseDesignTokens";
import { ECG_SPACING } from "./ecgSpacingTokens";
import { EcgWorkstationTooltip } from "./EcgWorkstationTooltip";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type PaletteAction = {
  active?: boolean;
  description?: string;
  disabled?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  shortcut?: string;
  testID?: string;
};

function PaletteButton({ action }: { action: PaletteAction }) {
  return (
    <EcgWorkstationTooltip description={action.description} label={action.label} shortcut={action.shortcut}>
      <Pressable
        accessibilityLabel={action.label}
        accessibilityRole="button"
        disabled={action.disabled || !action.onPress}
        onPress={action.onPress}
        style={({ hovered, pressed }) => [
          styles.btn,
          action.active && styles.btnActive,
          hovered && styles.btnHover,
          pressed && styles.btnPressed,
          action.disabled && styles.btnDisabled,
        ]}
        testID={action.testID}
      >
        <Feather color={action.active ? ECG_COCKPIT_COLORS.bgDeep : ECG_COCKPIT_COLORS.accent} name={action.icon} size={12} />
      </Pressable>
    </EcgWorkstationTooltip>
  );
}

/** Sprint 33.5 — vertical floating palette with idle auto-hide. */
export const EcgFloatingToolPalette = memo(function EcgFloatingToolPalette({
  controls,
  diagnosticMode = false,
  onEnterDiagnostic,
  onToggleCrosshair,
  onToggleLeftPanel,
  onToggleMagnifier,
  onToggleRightPanel,
  showCrosshair = false,
  showMagnifier = false,
  workspace,
}: {
  controls: EcgViewerControls;
  diagnosticMode?: boolean;
  onEnterDiagnostic?: () => void;
  onToggleCrosshair?: () => void;
  onToggleLeftPanel?: () => void;
  onToggleMagnifier?: () => void;
  onToggleRightPanel?: () => void;
  showCrosshair?: boolean;
  showMagnifier?: boolean;
  workspace?: EcgMeasurementWorkspace;
}) {
  const measureActive = workspace?.present.toolMode === "caliper" || workspace?.present.toolMode === "measurement";
  const [visible, setVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpVisibility = useCallback(() => {
    setVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!diagnosticMode) {
      idleTimerRef.current = setTimeout(() => setVisible(false), ECG_WORKSTATION_VISUAL.panelAutoHideDelayMs);
    }
  }, [diagnosticMode]);

  useEffect(() => {
    if (diagnosticMode) {
      setVisible(true);
      return undefined;
    }
    bumpVisibility();
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    window.addEventListener("mousemove", bumpVisibility);
    return () => {
      window.removeEventListener("mousemove", bumpVisibility);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [bumpVisibility, diagnosticMode]);

  const actions: PaletteAction[] = [
    { description: "Increase ECG magnification.", icon: "zoom-in", label: "Zoom In", onPress: () => controls.zoomBy(0.2), shortcut: "Ctrl++" },
    { description: "Decrease ECG magnification.", icon: "zoom-out", label: "Zoom Out", onPress: () => controls.zoomBy(-0.2), shortcut: "Ctrl+-" },
    { description: "Automatically fit ECG into available viewport.", icon: "maximize-2", label: "Fit Image", onPress: () => controls.applyFit("hero"), shortcut: "F" },
    { description: "Reset pan, zoom, and re-fit the tracing.", icon: "refresh-cw", label: "Reset View", onPress: () => { controls.resetView(); controls.applyFit("hero"); }, shortcut: "Ctrl+R" },
    { active: controls.panMode === "active", description: "Drag to move the ECG image.", icon: "move", label: "Pan", onPress: controls.togglePanMode },
    { active: measureActive, description: "Toggle manual measurement mode.", icon: "sliders", label: "Measure", onPress: () => workspace?.setToolMode(measureActive ? "select" : "measurement") },
    { active: workspace?.present.toolMode === "caliper", description: "Place caliper measurement anchors.", icon: "maximize", label: "Caliper", onPress: () => workspace?.setToolMode("caliper") },
    { active: showCrosshair, description: "Show precision crosshair cursor.", icon: "crosshair", label: "Crosshair", onPress: onToggleCrosshair, testID: "sprint25-toggle-crosshair" },
    { active: showMagnifier, description: "Magnify area under cursor.", icon: "search", label: "Magnifier", onPress: onToggleMagnifier, testID: "sprint25-toggle-magnifier" },
    { active: controls.grid.visible, description: "Toggle ECG paper grid overlay.", icon: "grid", label: "Grid", onPress: controls.toggleGrid },
    { description: "Rotate tracing 90 degrees.", icon: "rotate-cw", label: "Rotate", onPress: controls.rotate },
    { description: "Show or hide left clinical summary.", icon: "menu", label: "Left Panel", onPress: onToggleLeftPanel, testID: "sprint22-toggle-left-panel" },
    { description: "Show or hide right clinical panel.", icon: "columns", label: "Right Panel", onPress: onToggleRightPanel, testID: "sprint22-toggle-right-panel" },
    { description: "Enter diagnostic fullscreen mode.", icon: "maximize", label: "Fullscreen", onPress: onEnterDiagnostic, shortcut: "F11", testID: "sprint29-diagnostic-mode" },
  ];

  if (!visible && !diagnosticMode) return null;

  return (
    <View pointerEvents="box-none" style={[styles.host, diagnosticMode && styles.hostDiagnostic]} testID="sprint335-floating-tool-palette">
      <View style={styles.palette}>
        {actions.map((action) => (
          <PaletteButton action={action} key={action.label} />
        ))}
      </View>
    </View>
  );
});

const size = ECG_WORKSTATION_VISUAL.floatingToolSize;

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    backgroundColor: "rgba(16,24,32,0.88)",
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: ECG_ENTERPRISE_DESIGN.radius.sm,
    borderWidth: 1,
    height: size,
    justifyContent: "center",
    transitionDuration: "150ms",
    width: size,
  } as never,
  btnActive: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderColor: ECG_COCKPIT_COLORS.accent },
  btnDisabled: { opacity: 0.4 },
  btnHover: { borderColor: ECG_COCKPIT_COLORS.accentMuted },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.95 }] },
  host: {
    left: ECG_SPACING.sm,
    pointerEvents: "box-none",
    position: "absolute",
    top: ECG_SPACING.sm,
    zIndex: 45,
  },
  hostDiagnostic: { top: 36 },
  palette: {
    backgroundColor: "rgba(6,10,15,0.82)",
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: ECG_ENTERPRISE_DESIGN.radius.sm,
    borderWidth: 1,
    flexDirection: "column",
    gap: ECG_SPACING.xs,
    padding: ECG_SPACING.xs,
  },
});
