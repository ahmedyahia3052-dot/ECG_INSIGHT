import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, LayoutChangeEvent, Platform, StyleSheet, Text, View } from "react-native";
import { PanGestureHandler, PinchGestureHandler, State } from "react-native-gesture-handler";

import { EcgPaperGrid } from "../EcgPaperGrid";
import { buildImageFilterStyle, cacheImageDimensions, clampZoom, readCachedImageDimensions } from "../ecgImageEngine";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgProViewerDisplayMode, EcgProViewerGridColors, EcgProViewerTheme } from "./types";
import { ECG_PRO_VIEWER_THEMES } from "./types";

type Props = {
  controls: EcgViewerControls;
  displayMode: EcgProViewerDisplayMode;
  imageUrl?: string;
  onPointerMove?: (coords: { imageX: number; imageY: number; x: number; y: number }) => void;
  testID?: string;
  theme: EcgProViewerTheme;
};

export const EcgProViewerCanvas = memo(function EcgProViewerCanvas({
  controls,
  displayMode,
  imageUrl,
  onPointerMove,
  testID = "sprint93-ecg-pro-viewer-canvas",
  theme,
}: Props) {
  const palette = ECG_PRO_VIEWER_THEMES[theme];
  const [loading, setLoading] = useState(Boolean(imageUrl));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pinchBase = useRef(controls.transform.zoom);
  const panBase = useRef({ x: controls.transform.panX, y: controls.transform.panY });
  const viewport = controls.viewport;
  const showImage = displayMode !== "grid";
  const showGrid = displayMode !== "image";

  useEffect(() => {
    if (!imageUrl) {
      setLoading(false);
      return;
    }
    const cached = readCachedImageDimensions(imageUrl);
    if (cached) {
      controls.setViewportDimensions({ imageHeight: cached.height, imageWidth: cached.width });
      setLoading(false);
    }
  }, [controls.setViewportDimensions, imageUrl]);

  const paintCanvas = useCallback(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !image.complete) return;

    const dpr = window.devicePixelRatio || 1;
    const { containerHeight, containerWidth } = viewport;
    if (!containerWidth || !containerHeight) return;

    canvas.width = Math.floor(containerWidth * dpr);
    canvas.height = Math.floor(containerHeight * dpr);
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, containerWidth, containerHeight);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, containerWidth, containerHeight);

    const imageWidth = viewport.imageWidth;
    const imageHeight = viewport.imageHeight;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const { adjustments, transform } = controls;

    ctx.save();
    ctx.translate(centerX + transform.panX, centerY + transform.panY);
    ctx.rotate((transform.rotation * Math.PI) / 180);
    const scaleX = (adjustments.flipHorizontal ? -1 : 1) * transform.zoom;
    const scaleY = (adjustments.flipVertical ? -1 : 1) * transform.zoom;
    ctx.scale(scaleX, scaleY);

    if (showImage) {
      const filter = buildImageFilterStyle(adjustments);
      if (filter) ctx.filter = filter;
      ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
    }
    ctx.restore();
  }, [controls, palette.background, showImage, viewport]);

  useEffect(() => {
    if (Platform.OS !== "web" || !imageUrl) return undefined;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      imageRef.current = image;
      cacheImageDimensions(imageUrl, image.naturalWidth, image.naturalHeight);
      controls.setViewportDimensions({ imageHeight: image.naturalHeight, imageWidth: image.naturalWidth });
      setLoading(false);
      paintCanvas();
    };
    image.onerror = () => setLoading(false);
    image.src = imageUrl;
    return () => {
      imageRef.current = null;
    };
  }, [controls.setViewportDimensions, imageUrl, paintCanvas]);

  useEffect(() => {
    paintCanvas();
  }, [controls.adjustments, controls.transform, paintCanvas, showImage, theme]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return undefined;
    const node = document.getElementById(testID);
    if (!node) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (controls.isPanActive) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      controls.zoomAtAnchor({ x: event.clientX - rect.left, y: event.clientY - rect.top }, event.deltaY < 0 ? 0.12 : -0.12);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [controls, testID]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout;
      controls.setViewportDimensions({ containerHeight: height, containerWidth: width });
      if (viewport.imageWidth && viewport.imageHeight && controls.fitMode === "none") {
        controls.applyFit("width");
      }
    },
    [controls, viewport.imageHeight, viewport.imageWidth],
  );

  const onPanGesture = useCallback(
    (event: { nativeEvent: { state: number; translationX: number; translationY: number } }) => {
      if (event.nativeEvent.state === State.BEGAN) {
        panBase.current = { x: controls.transform.panX, y: controls.transform.panY };
      }
      if (event.nativeEvent.state === State.ACTIVE) {
        controls.setTransform({
          ...controls.transform,
          panX: panBase.current.x + event.nativeEvent.translationX,
          panY: panBase.current.y + event.nativeEvent.translationY,
        });
      }
    },
    [controls],
  );

  const onPinchGesture = useCallback(
    (event: { nativeEvent: { scale: number; state: number } }) => {
      if (event.nativeEvent.state === State.BEGAN) pinchBase.current = controls.transform.zoom;
      if (event.nativeEvent.state === State.ACTIVE) {
        controls.setZoom(clampZoom(pinchBase.current * event.nativeEvent.scale));
      }
    },
    [controls],
  );

  const onPointer = useCallback(
    (event: { nativeEvent: { locationX: number; locationY: number } }) => {
      const imageWidth = viewport.imageWidth;
      const imageHeight = viewport.imageHeight;
      const centerX = viewport.containerWidth / 2;
      const centerY = viewport.containerHeight / 2;
      const localX = event.nativeEvent.locationX - centerX - controls.transform.panX;
      const localY = event.nativeEvent.locationY - centerY - controls.transform.panY;
      onPointerMove?.({
        imageX: localX / controls.transform.zoom + imageWidth / 2,
        imageY: localY / controls.transform.zoom + imageHeight / 2,
        x: event.nativeEvent.locationX,
        y: event.nativeEvent.locationY,
      });
    },
    [controls.transform.panX, controls.transform.panY, controls.transform.zoom, onPointerMove, viewport],
  );

  const imageWidth = viewport.imageWidth;
  const imageHeight = viewport.imageHeight;
  const gridColors: EcgProViewerGridColors = palette.grid;

  const canvasBody = (
    <View nativeID={testID} onLayout={onLayout} style={[styles.canvasHost, { backgroundColor: palette.background }]} testID={testID}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={palette.text} />
          <Text style={{ color: palette.muted }}>Loading ECG image…</Text>
        </View>
      ) : null}
      {Platform.OS === "web" ? (
        <canvas
          ref={(node) => {
            canvasRef.current = node;
          }}
          id={`${testID}-web`}
          style={{ height: "100%", width: "100%" }}
        />
      ) : null}
      {showGrid ? (
        <View pointerEvents="none" style={styles.gridLayer}>
          <EcgPaperGrid
            grid={{ ...controls.grid, colors: gridColors }}
            height={imageHeight}
            width={imageWidth}
            zoom={controls.transform.zoom}
          />
        </View>
      ) : null}
    </View>
  );

  return (
    <PinchGestureHandler onGestureEvent={onPinchGesture} onHandlerStateChange={onPinchGesture}>
      <View style={styles.root}>
        <PanGestureHandler enabled={controls.isPanActive || Platform.OS !== "web"} onGestureEvent={onPanGesture} onHandlerStateChange={onPanGesture}>
          <View onTouchMove={onPointer as never} style={styles.root}>
            {canvasBody}
          </View>
        </PanGestureHandler>
      </View>
    </PinchGestureHandler>
  );
});

const styles = StyleSheet.create({
  canvasHost: { flex: 1, minHeight: 320, overflow: "hidden", position: "relative" },
  gridLayer: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  loader: { alignItems: "center", gap: 8, justifyContent: "center", ...StyleSheet.absoluteFillObject, zIndex: 2 },
  root: { flex: 1, minHeight: 320 },
});
