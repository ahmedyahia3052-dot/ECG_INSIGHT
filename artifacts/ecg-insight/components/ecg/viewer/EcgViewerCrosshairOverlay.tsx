import React, { memo } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";

/** Sprint 33 — smooth medical crosshair overlay. */
export const EcgViewerCrosshairOverlay = memo(function EcgViewerCrosshairOverlay({
  containerHeight,
  containerWidth,
  imageHeight,
  imageWidth,
  magnifierEnabled = false,
  pointer,
  showCrosshair = false,
  zoom = 1,
}: {
  containerHeight: number;
  containerWidth: number;
  imageHeight: number;
  imageWidth: number;
  magnifierEnabled?: boolean;
  pointer: { imageX: number; imageY: number; x: number; y: number } | null;
  showCrosshair?: boolean;
  zoom?: number;
}) {
  if (Platform.OS !== "web" || !pointer || (!showCrosshair && !magnifierEnabled)) return null;

  const lensSize = 108;
  const lensLeft = Math.min(Math.max(pointer.x + 12, 6), Math.max(containerWidth - lensSize - 6, 6));
  const lensTop = Math.min(Math.max(pointer.y + 12, 6), Math.max(containerHeight - lensSize - 6, 6));
  const bgX = pointer.imageX * zoom * 2 - lensSize / 2;
  const bgY = pointer.imageY * zoom * 2 - lensSize / 2;

  return (
    <View nativeID="sprint25-viewer-crosshair" pointerEvents="none" style={styles.root} testID="sprint25-viewer-crosshair">
      {showCrosshair ? (
        <>
          <View style={[styles.lineV, { left: pointer.x }]} />
          <View style={[styles.lineH, { top: pointer.y }]} />
          <View style={[styles.dot, { left: pointer.x - 2.5, top: pointer.y - 2.5 }]} />
        </>
      ) : null}
      {magnifierEnabled && imageWidth > 0 && imageHeight > 0 ? (
        <View
          style={[styles.lens, { height: lensSize, left: lensLeft, top: lensTop, width: lensSize }]}
          testID="sprint25-viewer-magnifier"
        >
          <View
            style={[
              styles.lensInner,
              {
                backgroundPosition: `${-bgX}px ${-bgY}px`,
                backgroundSize: `${imageWidth * zoom * 2}px ${imageHeight * zoom * 2}px`,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  dot: {
    backgroundColor: ECG_COCKPIT_COLORS.accent,
    borderRadius: 999,
    height: 5,
    position: "absolute",
    width: 5,
  },
  lens: {
    borderColor: ECG_COCKPIT_COLORS.accent,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    position: "absolute",
  },
  lensInner: {
    backgroundColor: ECG_COCKPIT_COLORS.bgDeep,
    height: "100%",
    width: "100%",
  },
  lineH: {
    backgroundColor: "rgba(20,221,230,0.45)",
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
  lineV: {
    backgroundColor: "rgba(20,221,230,0.45)",
    bottom: 0,
    position: "absolute",
    top: 0,
    width: 1,
  },
  root: { ...StyleSheet.absoluteFillObject, zIndex: 40 },
});
