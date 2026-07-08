import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  controls: EcgViewerControls;
  onExit: () => void;
  workspace?: EcgMeasurementWorkspace;
};

function ToolBtn({
  active,
  icon,
  label,
  onPress,
  testID,
}: {
  active?: boolean;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ hovered, pressed }) => [styles.btn, active && styles.btnActive, hovered && styles.btnHover, pressed && styles.btnPressed]}
      testID={testID}
    >
      <Feather color={active ? ECG_COCKPIT_COLORS.bgDeep : "#E2E8F0"} name={icon} size={14} />
      <Text style={[styles.btnLabel, active && styles.btnLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Sprint 53.2 — true reading mode: ECG + measurements + calipers + zoom + exit only. */
export const EcgReadingModeChrome = memo(function EcgReadingModeChrome({ controls, onExit, workspace }: Props) {
  const caliperActive = workspace?.present.toolMode === "caliper";
  const measureActive = workspace?.present.toolMode === "measurement";

  return (
    <View pointerEvents="box-none" style={styles.root} testID="sprint532-reading-mode">
      <View pointerEvents="none" style={styles.vignette} testID="sprint532-reading-vignette" />
      <View style={styles.toolbar} testID="sprint532-reading-toolbar">
        <ToolBtn icon="minimize-2" label="Exit Reading" onPress={onExit} testID="sprint532-reading-exit" />
        <View style={styles.divider} />
        <ToolBtn icon="zoom-in" label="Zoom +" onPress={() => controls.zoomBy(0.12)} testID="sprint532-reading-zoom-in" />
        <ToolBtn icon="zoom-out" label="Zoom −" onPress={() => controls.zoomBy(-0.12)} testID="sprint532-reading-zoom-out" />
        <ToolBtn icon="square" label="Fit" onPress={() => controls.applyFit("contain")} testID="sprint532-reading-fit" />
        <ToolBtn icon="maximize" label="100%" onPress={() => controls.applyFit("100")} testID="sprint532-reading-100" />
        <ToolBtn icon="zoom-in" label="200%" onPress={() => controls.applyFit("200")} testID="sprint532-reading-200" />
        <View style={styles.divider} />
        <ToolBtn
          active={caliperActive}
          icon="slash"
          label="Calipers"
          onPress={() => workspace?.setToolMode(caliperActive ? "select" : "caliper")}
          testID="sprint532-reading-calipers"
        />
        <ToolBtn
          active={measureActive}
          icon="sliders"
          label="Measure"
          onPress={() => workspace?.setToolMode(measureActive ? "select" : "measurement")}
          testID="sprint532-reading-measure"
        />
      </View>
      {Platform.OS === "web" ? (
        <Text pointerEvents="none" style={styles.hint}>
          ESC · Exit · Wheel · Zoom · Shift+Drag · Zoom Area · Double-click · Fit/200%
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.82)",
    borderColor: "rgba(148,163,184,0.35)",
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 8,
  },
  btnActive: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderColor: ECG_COCKPIT_COLORS.accent },
  btnHover: { borderColor: ECG_COCKPIT_COLORS.accent },
  btnLabel: { color: "#CBD5E1", fontSize: 10, fontWeight: "700" },
  btnLabelActive: { color: ECG_COCKPIT_COLORS.bgDeep },
  btnPressed: { opacity: 0.88 },
  divider: { backgroundColor: "rgba(148,163,184,0.25)", height: 24, width: 1 },
  hint: {
    alignSelf: "center",
    bottom: 6,
    color: "rgba(148,163,184,0.75)",
    fontSize: 9,
    fontWeight: "600",
    position: "absolute",
  },
  root: { ...StyleSheet.absoluteFillObject, zIndex: 80 },
  toolbar: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(2,6,14,0.92)",
    borderColor: "rgba(34,197,94,0.25)",
    borderRadius: 8,
    borderWidth: 1,
    bottom: 28,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    maxWidth: "96%",
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: "absolute",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
});
