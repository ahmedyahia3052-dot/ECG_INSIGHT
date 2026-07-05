import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { displayDimensions } from "./ecgViewerEngine";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  controls: EcgViewerControls;
  imageUrl?: string;
  onNavigate?: (panX: number, panY: number) => void;
};

export const EcgMiniNavigator = memo(function EcgMiniNavigator({ controls, onNavigate }: Props) {
  const viewport = controls.viewport;
  const rect = useMemo(() => displayDimensions(viewport), [viewport]);
  const navWidth = 132;
  const navHeight = 88;
  const scale = Math.min(navWidth / Math.max(rect.displayWidth, 1), navHeight / Math.max(rect.displayHeight, 1), 1);

  const thumbW = Math.max(rect.displayWidth * scale, 24);
  const thumbH = Math.max(rect.displayHeight * scale, 16);
  const visibleW = Math.min(viewport.containerWidth / controls.transform.zoom, rect.displayWidth) * scale;
  const visibleH = Math.min(viewport.containerHeight / controls.transform.zoom, rect.displayHeight) * scale;
  const centerX = thumbW / 2 - controls.transform.panX * scale / controls.transform.zoom;
  const centerY = thumbH / 2 - controls.transform.panY * scale / controls.transform.zoom;
  const viewportLeft = Math.max(0, Math.min(centerX - visibleW / 2, thumbW - visibleW));
  const viewportTop = Math.max(0, Math.min(centerY - visibleH / 2, thumbH - visibleH));

  return (
    <View pointerEvents="box-none" style={styles.host} testID="sprint17-ecg-mini-navigator">
      <Pressable
        onPress={(event) => {
          const offsetX = event.nativeEvent.locationX ?? thumbW / 2;
          const offsetY = event.nativeEvent.locationY ?? thumbH / 2;
          const imageX = offsetX / scale;
          const imageY = offsetY / scale;
          const panX = (rect.displayWidth / 2 - imageX) * controls.transform.zoom;
          const panY = (rect.displayHeight / 2 - imageY) * controls.transform.zoom;
          onNavigate?.(panX, panY);
          controls.setTransform({ ...controls.transform, panX, panY });
        }}
        style={[styles.frame, { height: navHeight, width: navWidth }]}
      >
        <View style={[styles.thumbnail, { height: thumbH, width: thumbW }]}>
          <View style={[styles.viewportRect, { height: visibleH, left: viewportLeft, top: viewportTop, width: visibleW }]} />
        </View>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.82)",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    overflow: "hidden",
  },
  host: {
    bottom: 12,
    position: "absolute",
    right: 12,
    zIndex: 24,
  },
  thumbnail: {
    backgroundColor: "#FFF7F7",
    borderColor: "#E36A6A",
    borderRadius: 4,
    borderWidth: 1,
    position: "relative",
  },
  viewportRect: {
    backgroundColor: "rgba(14,165,233,0.18)",
    borderColor: medicalTheme.primary,
    borderRadius: 2,
    borderWidth: 1,
    position: "absolute",
  },
});
