import { Feather } from "@expo/vector-icons";
import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { CLINICAL_MEASUREMENT_PRESETS } from "./ecgMeasurementEngine";
import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import { EcgWorkstationTooltip } from "./EcgWorkstationTooltip";
import type { EcgAnnotationKind, EcgCaliperKind } from "./measurementTypes";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

type ToolbarAction = {
  active?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  testID?: string;
};

function ToolbarButton({ action }: { action: ToolbarAction }) {
  return (
    <EcgWorkstationTooltip label={action.label}>
      <Pressable
        accessibilityLabel={action.label}
        accessibilityRole="button"
        disabled={!action.onPress}
        onPress={action.onPress}
        style={({ hovered, pressed }) => [
          styles.btn,
          action.active && styles.btnActive,
          hovered && styles.btnHover,
          pressed && styles.btnPressed,
        ]}
        testID={action.testID}
      >
        <Feather color={action.active ? ECG_COCKPIT_COLORS.bgDeep : ECG_COCKPIT_COLORS.accent} name={action.icon} size={12} />
      </Pressable>
    </EcgWorkstationTooltip>
  );
}

/** Sprint 34 — measurement floating toolbar (canvas overlay, idle auto-collapse). */
export const EcgMeasurementFloatingToolbar = memo(function EcgMeasurementFloatingToolbar({
  workspace,
}: {
  workspace: EcgMeasurementWorkspace;
}) {
  const [visible, setVisible] = useState(true);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const caliperKind = workspace.activeCaliperKind.current;
  const annotationKind = workspace.activeAnnotationKind.current;
  const snap = workspace.present.snapSettings;

  const bumpVisibility = useCallback(() => {
    setVisible(true);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setVisible(false), ECG_WORKSTATION_VISUAL.panelAutoHideDelayMs);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const onMove = () => bumpVisibility();
    window.addEventListener("mousemove", onMove);
    bumpVisibility();
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [bumpVisibility]);

  const setCaliper = (kind: EcgCaliperKind) => {
    workspace.activeCaliperKind.current = kind;
    workspace.setToolMode("caliper");
  };

  const setAnnotation = (kind: EcgAnnotationKind) => {
    workspace.activeAnnotationKind.current = kind;
    workspace.setToolMode("annotation");
  };

  const actions: ToolbarAction[] = [
    {
      active: workspace.present.toolMode === "select",
      icon: "mouse-pointer",
      label: "Pointer",
      onPress: () => workspace.setToolMode("select"),
      testID: "sprint34-measure-pointer",
    },
    {
      active: caliperKind === "horizontal",
      icon: "minus",
      label: "Horizontal Caliper",
      onPress: () => setCaliper("horizontal"),
      testID: "sprint34-measure-horizontal",
    },
    {
      active: caliperKind === "vertical",
      icon: "maximize-2",
      label: "Vertical Caliper",
      onPress: () => setCaliper("vertical"),
      testID: "sprint34-measure-vertical",
    },
    {
      active: caliperKind === "angle",
      icon: "compass",
      label: "Angle",
      onPress: () => setCaliper("angle"),
      testID: "sprint34-measure-angle",
    },
    {
      active: caliperKind === "distance",
      icon: "move",
      label: "Distance",
      onPress: () => setCaliper("distance"),
      testID: "sprint34-measure-distance",
    },
    {
      active: caliperKind === "crosshair",
      icon: "crosshair",
      label: "Crosshair",
      onPress: () => setCaliper("crosshair"),
      testID: "sprint42-measure-crosshair",
    },
    {
      active: caliperKind === "reference",
      icon: "bookmark",
      label: "Reference Caliper",
      onPress: () => setCaliper("reference"),
      testID: "sprint42-measure-reference",
    },
    {
      icon: "trash-2",
      label: "Delete",
      onPress: workspace.removeSelected,
      testID: "sprint34-measure-delete",
    },
    {
      icon: "rotate-ccw",
      label: "Undo",
      onPress: workspace.canUndo ? workspace.undo : undefined,
      testID: "sprint34-measure-undo",
    },
    {
      icon: "rotate-cw",
      label: "Redo",
      onPress: workspace.canRedo ? workspace.redo : undefined,
      testID: "sprint34-measure-redo",
    },
    {
      active: snap.snapToGrid || snap.snapToWave || snap.snapToBaseline,
      icon: "crosshair",
      label: "Snap",
      onPress: () => workspace.toggleSnapSetting("snapToWave"),
      testID: "sprint34-measure-snap",
    },
    {
      active: !!workspace.present.selectedCaliperId && workspace.present.calipers.some((item) => item.id === workspace.present.selectedCaliperId && item.locked),
      icon: "lock",
      label: "Lock",
      onPress: () => {
        const id = workspace.present.selectedCaliperId;
        if (id) workspace.toggleCaliperLock(id);
      },
      testID: "sprint34-measure-lock",
    },
    {
      active: annotationKind === "text",
      icon: "type",
      label: "Text Annotation",
      onPress: () => setAnnotation("text"),
      testID: "sprint34-measure-text",
    },
    {
      active: annotationKind === "arrow",
      icon: "arrow-up-right",
      label: "Arrow",
      onPress: () => setAnnotation("arrow"),
      testID: "sprint34-measure-arrow",
    },
    {
      icon: "settings",
      label: "Settings",
      onPress: () => workspace.toggleSnapSetting("multiLeadSync"),
      testID: "sprint34-measure-settings",
    },
  ];

  const presetActions = CLINICAL_MEASUREMENT_PRESETS.slice(0, 4).map((preset) => ({
    active: workspace.present.activeMeasurementKind === preset.kind,
    icon: "activity" as const,
    label: preset.label,
    onPress: () => workspace.selectMeasurementPreset(preset),
    testID: `sprint34-measure-preset-${preset.label.toLowerCase()}`,
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.root, !visible && styles.rootHidden]}
      testID="sprint34-measurement-floating-toolbar"
    >
      <View style={styles.panel}>
        {[...actions.slice(0, 5), ...presetActions.slice(0, 2), ...actions.slice(5)].map((action) => (
          <ToolbarButton key={action.label} action={action} />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    backgroundColor: "rgba(8,18,32,0.92)",
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  btnActive: { backgroundColor: ECG_COCKPIT_COLORS.accent },
  btnHover: { borderColor: ECG_COCKPIT_COLORS.accent },
  btnPressed: { opacity: 0.85 },
  panel: {
    backgroundColor: "rgba(6,14,26,0.88)",
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "column",
    gap: 4,
    padding: 4,
  },
  root: {
    bottom: 72,
    left: 12,
    opacity: 1,
    position: "absolute",
    zIndex: 40,
  },
  rootHidden: { opacity: 0.12 },
});
