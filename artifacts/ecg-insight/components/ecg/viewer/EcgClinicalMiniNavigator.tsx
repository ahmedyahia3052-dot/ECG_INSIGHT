import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EcgViewerControls } from "./useEcgViewerControls";

export const EcgClinicalMiniNavigator = memo(function EcgClinicalMiniNavigator({
  controls,
  height,
  width,
}: {
  controls: EcgViewerControls;
  height: number;
  width: number;
}) {
  const navW = 140;
  const navH = 56;
  const scale = Math.min(navW / Math.max(width, 1), navH / Math.max(height, 1));
  const thumbW = width * scale;
  const thumbH = height * scale;
  const visibleW = Math.min(width / controls.transform.zoom, width) * scale;
  const visibleH = Math.min(height / controls.transform.zoom, height) * scale;
  const centerX = thumbW / 2 - (controls.transform.panX * scale) / controls.transform.zoom;
  const centerY = thumbH / 2 - (controls.transform.panY * scale) / controls.transform.zoom;
  const left = Math.max(0, Math.min(centerX - visibleW / 2, thumbW - visibleW));
  const top = Math.max(0, Math.min(centerY - visibleH / 2, thumbH - visibleH));

  return (
    <View pointerEvents="box-none" style={styles.host} testID="sprint28-clinical-mini-navigator">
      <Pressable
        onPress={(event) => {
          const x = event.nativeEvent.locationX ?? navW / 2;
          const y = event.nativeEvent.locationY ?? navH / 2;
          const panX = (thumbW / 2 - x) * (controls.transform.zoom / scale);
          const panY = (thumbH / 2 - y) * (controls.transform.zoom / scale);
          controls.setTransform({ ...controls.transform, panX, panY });
        }}
        style={[styles.frame, { height: navH, width: navW }]}
      >
        <View style={[styles.thumb, { height: thumbH, width: thumbW }]}>
          <View style={[styles.viewport, { height: visibleH, left, top, width: visibleW }]} />
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    backgroundColor: "rgba(4,14,26,0.82)",
    borderColor: "rgba(20,221,230,0.35)",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  host: { bottom: 52, position: "absolute", right: 12, zIndex: 28 },
  thumb: {
    backgroundColor: "rgba(8,22,37,0.9)",
    borderColor: "rgba(20,221,230,0.2)",
    borderRadius: 4,
    borderWidth: 1,
    position: "relative",
  },
  viewport: {
    backgroundColor: "rgba(20,221,230,0.14)",
    borderColor: medicalTheme.primary,
    borderRadius: 2,
    borderWidth: 1,
    position: "absolute",
  },
});
