import React, { memo } from "react";
import { Platform, StyleSheet, View } from "react-native";

/** Sprint 25 — crosshair cursor and magnifier lens overlay for ECG viewer. */
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

  const lensSize = 120;
  const lensLeft = Math.min(Math.max(pointer.x + 16, 8), Math.max(containerWidth - lensSize - 8, 8));
  const lensTop = Math.min(Math.max(pointer.y + 16, 8), Math.max(containerHeight - lensSize - 8, 8));
  const bgX = pointer.imageX * zoom * 2 - lensSize / 2;
  const bgY = pointer.imageY * zoom * 2 - lensSize / 2;

  return (
    <View nativeID="sprint25-viewer-crosshair" pointerEvents="none" style={styles.root} testID="sprint25-viewer-crosshair">
      {showCrosshair ? (
        <>
          <View style={[styles.lineV, { left: pointer.x }]} />
          <View style={[styles.lineH, { top: pointer.y }]} />
          <View style={[styles.dot, { left: pointer.x - 3, top: pointer.y - 3 }]} />
        </>
      ) : null}
      {magnifierEnabled && imageWidth > 0 && imageHeight > 0 ? (
        <View
          style={[
            styles.lens,
            {
              height: lensSize,
              left: lensLeft,
              top: lensTop,
              width: lensSize,
            },
          ]}
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
    backgroundColor: "#22C55E",
    borderRadius: 999,
    height: 6,
    position: "absolute",
    width: 6,
  },
  lens: {
    borderColor: "#22C55E",
    borderRadius: 999,
    borderWidth: 2,
    overflow: "hidden",
    position: "absolute",
    shadowColor: "#22C55E",
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  lensInner: {
    backgroundColor: "#020617",
    height: "100%",
    width: "100%",
  },
  lineH: {
    backgroundColor: "rgba(34,197,94,0.55)",
    height: 1,
    left: 0,
    position: "absolute",
    right: 0,
  },
  lineV: {
    backgroundColor: "rgba(34,197,94,0.55)",
    bottom: 0,
    position: "absolute",
    top: 0,
    width: 1,
  },
  root: { ...StyleSheet.absoluteFillObject, zIndex: 40 },
});
