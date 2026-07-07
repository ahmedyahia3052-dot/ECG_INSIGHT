import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { displayDimensions } from "./ecgViewerEngine";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  controls: EcgViewerControls;
  imageUrl?: string;
  onNavigate?: (panX: number, panY: number) => void;
};

/** Sprint 32 — draggable viewport navigator; hidden when ECG fits entirely. */
export const EcgMiniNavigator = memo(function EcgMiniNavigator({ controls, imageUrl, onNavigate }: Props) {
  const viewport = controls.viewport;
  const rect = useMemo(() => displayDimensions(viewport), [viewport]);
  const navWidth = 128;
  const navHeight = 84;
  const scale = Math.min(navWidth / Math.max(rect.displayWidth, 1), navHeight / Math.max(rect.displayHeight, 1), 1);

  const thumbW = Math.max(rect.displayWidth * scale, 20);
  const thumbH = Math.max(rect.displayHeight * scale, 14);
  const visibleW = Math.min(viewport.containerWidth / controls.transform.zoom, rect.displayWidth) * scale;
  const visibleH = Math.min(viewport.containerHeight / controls.transform.zoom, rect.displayHeight) * scale;
  const centerX = thumbW / 2 - (controls.transform.panX * scale) / controls.transform.zoom;
  const centerY = thumbH / 2 - (controls.transform.panY * scale) / controls.transform.zoom;
  const viewportLeft = Math.max(0, Math.min(centerX - visibleW / 2, thumbW - visibleW));
  const viewportTop = Math.max(0, Math.min(centerY - visibleH / 2, thumbH - visibleH));

  const fitsEntirely = visibleW >= thumbW - 1 && visibleH >= thumbH - 1;
  const dragRef = useRef<{ startX: number; startY: number; startPanX: number; startPanY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const navigateTo = useCallback(
    (offsetX: number, offsetY: number) => {
      const imageX = offsetX / scale;
      const imageY = offsetY / scale;
      const panX = (rect.displayWidth / 2 - imageX) * controls.transform.zoom;
      const panY = (rect.displayHeight / 2 - imageY) * controls.transform.zoom;
      onNavigate?.(panX, panY);
      controls.setTransform({ ...controls.transform, panX, panY });
    },
    [controls, onNavigate, rect.displayHeight, rect.displayWidth, scale],
  );

  if (fitsEntirely || !viewport.containerWidth || !viewport.imageWidth) return null;

  return (
    <View pointerEvents="box-none" style={styles.host} testID="sprint32-ecg-mini-navigator">
      <View style={[styles.frame, { height: navHeight, width: navWidth }]}>
        {imageUrl ? (
          <Image resizeMode="cover" source={{ uri: imageUrl }} style={[styles.thumbImage, { height: thumbH, width: thumbW }]} />
        ) : (
          <View style={[styles.thumbFallback, { height: thumbH, width: thumbW }]} />
        )}
        <Pressable
          onPress={(event) => navigateTo(event.nativeEvent.locationX ?? thumbW / 2, event.nativeEvent.locationY ?? thumbH / 2)}
          style={StyleSheet.absoluteFill}
        />
        <View
          {...(Platform.OS === "web"
            ? ({
                onMouseDown: (event: MouseEvent) => {
                  event.stopPropagation();
                  event.preventDefault();
                  dragRef.current = {
                    startPanX: controls.transform.panX,
                    startPanY: controls.transform.panY,
                    startX: event.clientX,
                    startY: event.clientY,
                  };
                  setDragging(true);
                  const onMove = (moveEvent: MouseEvent) => {
                    if (!dragRef.current) return;
                    const dx = moveEvent.clientX - dragRef.current.startX;
                    const dy = moveEvent.clientY - dragRef.current.startY;
                    const panX = dragRef.current.startPanX - (dx / scale) * controls.transform.zoom;
                    const panY = dragRef.current.startPanY - (dy / scale) * controls.transform.zoom;
                    controls.setTransform({ ...controls.transform, panX, panY });
                  };
                  const onUp = () => {
                    dragRef.current = null;
                    setDragging(false);
                    window.removeEventListener("mousemove", onMove);
                    window.removeEventListener("mouseup", onUp);
                  };
                  window.addEventListener("mousemove", onMove);
                  window.addEventListener("mouseup", onUp);
                },
              } as never)
            : {})}
          style={[
            styles.viewportRect,
            dragging && styles.viewportRectDragging,
            { height: visibleH, left: viewportLeft, top: viewportTop, width: visibleW },
          ]}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    backgroundColor: "rgba(6,10,15,0.88)",
    borderColor: ECG_COCKPIT_COLORS.accentMuted,
    borderRadius: 4,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  host: {
    bottom: 8,
    position: "absolute",
    right: 8,
    zIndex: 24,
  },
  thumbFallback: { backgroundColor: "rgba(16,24,32,0.95)" },
  thumbImage: { borderRadius: 2, opacity: 0.55 },
  viewportRect: {
    backgroundColor: "rgba(20,221,230,0.14)",
    borderColor: ECG_COCKPIT_COLORS.accent,
    borderRadius: 2,
    borderWidth: 1,
    cursor: "grab",
    position: "absolute",
  } as never,
  viewportRectDragging: {
    borderColor: ECG_COCKPIT_COLORS.accent,
    cursor: "grabbing",
  } as never,
});
