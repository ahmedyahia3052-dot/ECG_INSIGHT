import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Image, LayoutChangeEvent, Platform, StyleSheet, Text, View } from "react-native";
import { PanGestureHandler, PinchGestureHandler, State } from "react-native-gesture-handler";

import { EmptyState } from "@/components/enterprise/EnterpriseUI";
import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ecgAnchorId, ecgNativeId } from "./ecgNativeId";
import { emitRuntimeEvent } from "@/services/runtimeEvents";

import { EcgAiOverlayLayer, type EcgAiOverlayRegion } from "./EcgAiOverlayLayer";
import { EcgDigitizedWaveformLayer, type DigitizedWaveformLead } from "./EcgDigitizedWaveformLayer";
import { EcgMeasurementFloatingToolbar } from "./EcgMeasurementFloatingToolbar";
import { EcgMeasurementOverlay } from "./EcgMeasurementOverlay";
import { EcgMiniNavigator } from "./EcgMiniNavigator";
import { EcgViewerCrosshairOverlay } from "./EcgViewerCrosshairOverlay";
import { EcgPaperGrid } from "./EcgPaperGrid";
import { buildImageFilterStyle, buildTransformStyle, cacheImageDimensions, clampZoom, detectImageFormat, readCachedImageDimensions } from "./ecgImageEngine";
import { displayDimensions, VIEWER_LAYER } from "./ecgViewerEngine";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";
import { useViewerRuntimeMetrics } from "./useViewerRuntimeMetrics";

type Props = {
  accessToken?: string | null;
  aiOverlayEnabled?: boolean;
  aiOverlayRegions?: EcgAiOverlayRegion[];
  assetHeight?: number;
  assetLoading?: boolean;
  assetWidth?: number;
  controls: EcgViewerControls;
  digitizedLeads?: DigitizedWaveformLead[];
  imageUrl?: string;
  onPointerMove?: (coords: { imageX: number; imageY: number; x: number; y: number }) => void;
  onFpsUpdate?: (fps: number) => void;
  pdfUrl?: string;
  showCrosshair?: boolean;
  showDigitizedWaveform?: boolean;
  showMagnifier?: boolean;
  showMiniNavigator?: boolean;
  testID?: string;
  workspace?: EcgMeasurementWorkspace;
};

export const EcgProViewerEngine = memo(function EcgProViewerEngine({
  accessToken,
  aiOverlayEnabled = false,
  aiOverlayRegions = [],
  assetHeight = 0,
  assetLoading = false,
  assetWidth = 0,
  controls,
  digitizedLeads = [],
  imageUrl,
  pdfUrl,
  showDigitizedWaveform = true,
  showCrosshair = false,
  showMagnifier = false,
  showMiniNavigator = true,
  testID = "sprint13-ecg-pro-viewer-engine",
  onFpsUpdate,
  onPointerMove,
  workspace,
}: Props) {
  const [loading, setLoading] = React.useState(true);
  const [localPointer, setLocalPointer] = React.useState<{ imageX: number; imageY: number; x: number; y: number } | null>(null);
  const pinchBase = useRef(controls.transform.zoom);
  const panBase = useRef({ x: controls.transform.panX, y: controls.transform.panY });
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const momentumRef = useRef<number | null>(null);
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastPanRef = useRef({ t: 0, x: 0, y: 0 });
  const { updatePointer } = useViewerRuntimeMetrics(onFpsUpdate);
  const format = detectImageFormat(imageUrl ?? pdfUrl ?? "");
  const isPdf = format === "pdf" || (!imageUrl && !!pdfUrl);
  const viewport = controls.viewport;

  const initialFitRef = useRef(false);

  useEffect(() => {
    if (!imageUrl) {
      setLoading(false);
      return;
    }
    if (assetWidth > 0 && assetHeight > 0) {
      controls.setViewportDimensions({ imageHeight: assetHeight, imageWidth: assetWidth });
      setLoading(false);
      return;
    }
    const cached = readCachedImageDimensions(imageUrl);
    if (cached) {
      controls.setViewportDimensions({ imageHeight: cached.height, imageWidth: cached.width });
      setLoading(false);
      return;
    }
    setLoading(assetLoading);
  }, [assetHeight, assetLoading, assetWidth, controls.setViewportDimensions, imageUrl]);

  useEffect(() => {
    if (initialFitRef.current) return;
    if (!viewport.containerWidth || !viewport.containerHeight || !viewport.imageWidth || !viewport.imageHeight) return;
    initialFitRef.current = true;
    controls.applyFit("hero");
  }, [controls, viewport.containerHeight, viewport.containerWidth, viewport.imageHeight, viewport.imageWidth]);

  useEffect(() => {
    if (!pdfUrl || Platform.OS !== "web" || typeof document === "undefined") return undefined;
    const host = document.getElementById(`${testID}-pdf-frame`);
    if (!host) return undefined;
    host.innerHTML = "";
    const frame = document.createElement("iframe");
    frame.src = pdfUrl;
    frame.title = "ECG PDF preview";
    frame.style.border = "none";
    frame.style.width = "100%";
    frame.style.height = "100%";
    host.appendChild(frame);
    return () => {
      host.innerHTML = "";
    };
  }, [pdfUrl, testID]);

  useEffect(() => {
    if (!imageUrl || Platform.OS !== "web" || typeof document === "undefined") return undefined;
    const node = document.getElementById(testID);
    if (!node) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (controls.isPanActive) return;
      event.preventDefault();
      const rect = node.getBoundingClientRect();
      const anchor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const delta = event.deltaY < 0 ? 0.12 : -0.12;
      controls.zoomAtAnchor(anchor, delta);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    const onDoubleClick = () => {
      controls.applyFit("hero");
    };
    node.addEventListener("dblclick", onDoubleClick);
    return () => {
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("dblclick", onDoubleClick);
    };
  }, [controls, imageUrl, testID]);

  const stopMomentum = useCallback(() => {
    if (momentumRef.current) {
      cancelAnimationFrame(momentumRef.current);
      momentumRef.current = null;
    }
  }, []);

  const startMomentum = useCallback(() => {
    stopMomentum();
    const step = () => {
      const { x, y } = velocityRef.current;
      if (Math.abs(x) < 0.05 && Math.abs(y) < 0.05) {
        momentumRef.current = null;
        return;
      }
      controls.panBy(x, y);
      velocityRef.current = { x: x * 0.92, y: y * 0.92 };
      momentumRef.current = requestAnimationFrame(step);
    };
    momentumRef.current = requestAnimationFrame(step);
  }, [controls, stopMomentum]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const canPan = () => {
      const locked =
        workspace?.present.toolMode === "caliper" ||
        workspace?.present.toolMode === "annotation" ||
        workspace?.present.toolMode === "measurement";
      return controls.isPanActive || !locked;
    };
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0 && event.button !== 1) return;
      if (!canPan()) return;
      stopMomentum();
      dragOrigin.current = { x: event.clientX, y: event.clientY };
      lastPanRef.current = { t: performance.now(), x: event.clientX, y: event.clientY };
      velocityRef.current = { x: 0, y: 0 };
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!dragOrigin.current) return;
      const dx = event.clientX - dragOrigin.current.x;
      const dy = event.clientY - dragOrigin.current.y;
      controls.panBy(dx, dy);
      const now = performance.now();
      const elapsed = Math.max(now - lastPanRef.current.t, 1);
      velocityRef.current = {
        x: ((event.clientX - lastPanRef.current.x) / elapsed) * 16,
        y: ((event.clientY - lastPanRef.current.y) / elapsed) * 16,
      };
      lastPanRef.current = { t: now, x: event.clientX, y: event.clientY };
      dragOrigin.current = { x: event.clientX, y: event.clientY };
    };
    const onMouseUp = () => {
      if (!dragOrigin.current) return;
      dragOrigin.current = null;
      startMomentum();
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      stopMomentum();
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [controls, startMomentum, stopMomentum, workspace?.present.toolMode]);

  const onImageLoad = useCallback(
    (event: { nativeEvent: { source?: { height: number; width: number } } }) => {
      const source = event.nativeEvent?.source;
      const height = source?.height ?? assetHeight ?? viewport.imageHeight;
      const width = source?.width ?? assetWidth ?? viewport.imageWidth;
      if (!height || !width) {
        setLoading(false);
        return;
      }
      if (imageUrl) cacheImageDimensions(imageUrl, width, height);
      controls.setViewportDimensions({ imageHeight: height, imageWidth: width });
      setLoading(false);
      emitRuntimeEvent("ViewerReady", { source: "sprint13-ecg-pro-viewer-engine", url: imageUrl });
    },
    [assetHeight, assetWidth, controls, imageUrl, viewport.imageHeight, viewport.imageWidth],
  );

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { height, width } = event.nativeEvent.layout;
      if (height > 0 && width > 0) controls.setViewportDimensions({ containerHeight: height, containerWidth: width });
    },
    [controls],
  );

  const rect = useMemo(() => displayDimensions(viewport), [viewport]);
  const filterStyle = Platform.OS === "web" ? buildImageFilterStyle(controls.adjustments) : undefined;
  const layerTransform = buildTransformStyle(controls.transform, controls.adjustments);
  const interactionLocked = workspace?.present.toolMode === "caliper" || workspace?.present.toolMode === "annotation" || workspace?.present.toolMode === "measurement";

  const handlePointerMove = useCallback(
    (event: { nativeEvent: { locationX?: number; locationY?: number; clientX?: number; clientY?: number; offsetX?: number; offsetY?: number } }) => {
      const native = event.nativeEvent;
      const x = native.locationX ?? native.offsetX ?? native.clientX ?? 0;
      const y = native.locationY ?? native.offsetY ?? native.clientY ?? 0;
      const imageX = (x - controls.transform.panX) / Math.max(controls.transform.zoom, 0.001);
      const imageY = (y - controls.transform.panY) / Math.max(controls.transform.zoom, 0.001);
      updatePointer({ imageX, imageY, x, y });
      const coords = { imageX, imageY, x, y };
      setLocalPointer(coords);
      onPointerMove?.(coords);
    },
    [controls.transform.panX, controls.transform.panY, controls.transform.zoom, onPointerMove, updatePointer],
  );

  const layerStack = (
    <View
      style={[
        styles.layerStack,
        {
          height: rect.displayHeight,
          transform: layerTransform as never,
          width: rect.displayWidth,
        },
        Platform.OS === "web" ? ({ willChange: "transform", transform: "translateZ(0)" } as never) : null,
      ]}
    >
      {imageUrl ? (
        <Image
          onLoad={onImageLoad}
          resizeMode="contain"
          source={{ uri: imageUrl }}
          style={[
            styles.layerImage as never,
            filterStyle ? ({ filter: filterStyle } as never) : null,
            Platform.OS === "web" ? ({ imageRendering: "auto", WebkitFontSmoothing: "antialiased" } as never) : null,
          ]}
          testID="sprint13-ecg-layer-image"
        />
      ) : null}
      <View pointerEvents="none" style={[styles.layer, { zIndex: VIEWER_LAYER.ecgGrid }]}>
        <EcgPaperGrid grid={controls.grid} height={rect.displayHeight} width={rect.displayWidth} zoom={controls.transform.zoom} />
      </View>
      {showDigitizedWaveform ? (
        <View pointerEvents="none" style={[styles.layer, { zIndex: VIEWER_LAYER.digitizedWaveform }]}>
          <EcgDigitizedWaveformLayer height={rect.displayHeight} leads={digitizedLeads} width={rect.displayWidth} />
        </View>
      ) : null}
      <View pointerEvents="none" style={[styles.layer, { zIndex: VIEWER_LAYER.aiOverlay }]}>
        <EcgAiOverlayLayer enabled={aiOverlayEnabled} height={rect.displayHeight} regions={aiOverlayRegions} width={rect.displayWidth} />
      </View>
    </View>
  );

  const canvasBody = (
    <View
      {...ecgAnchorId(testID)}
      onLayout={onLayout}
      onPointerMove={Platform.OS === "web" ? (handlePointerMove as never) : undefined}
      style={[
        styles.canvas,
        controls.fullscreen && styles.fullscreenCanvas,
        !interactionLocked && Platform.OS === "web" ? ({ cursor: controls.isPanActive ? "grab" : "crosshair" } as never) : null,
      ]}
      testID={testID}
    >
      {loading && imageUrl ? (
        <View pointerEvents="none" style={styles.loadingOverlay} testID="sprint13-ecg-image-loading">
          <ActivityIndicator color={ECG_COCKPIT_COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Loading ECG image…</Text>
        </View>
      ) : null}
      {isPdf ? (
        <View style={styles.pdfPane}>
          {Platform.OS === "web" && pdfUrl ? (
            <View {...ecgAnchorId(`${testID}-pdf-frame`)} style={styles.pdfFrame} />
          ) : (
            <EmptyState message="PDF preview is available on web. Open the document to review the original tracing." title="PDF ECG" />
          )}
        </View>
      ) : imageUrl ? (
        <View style={styles.stage}>
          {layerStack}
        </View>
      ) : (
        <EmptyState message="Open or upload an ECG image to begin review." title="No ECG loaded" />
      )}
      {workspace && imageUrl ? (
        <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { zIndex: VIEWER_LAYER.measurements }]}>
          <EcgMeasurementOverlay
            containerHeight={viewport.containerHeight}
            containerWidth={viewport.containerWidth}
            controls={controls}
            imageHeight={viewport.imageHeight}
            imageWidth={viewport.imageWidth}
            workspace={workspace}
          />
          {workspace.present.toolMode === "caliper" ||
          workspace.present.toolMode === "measurement" ||
          workspace.present.toolMode === "annotation" ? (
            <EcgMeasurementFloatingToolbar workspace={workspace} />
          ) : null}
        </View>
      ) : null}
      {imageUrl && !isPdf && showMiniNavigator && viewport.containerWidth > 0 && viewport.imageWidth > 0 ? (
        <EcgMiniNavigator controls={controls} imageUrl={imageUrl} />
      ) : null}
      {imageUrl && !isPdf ? (
        <EcgViewerCrosshairOverlay
          containerHeight={viewport.containerHeight}
          containerWidth={viewport.containerWidth}
          imageHeight={viewport.imageHeight}
          imageWidth={viewport.imageWidth}
          magnifierEnabled={showMagnifier}
          pointer={localPointer}
          showCrosshair={showCrosshair}
          zoom={controls.transform.zoom}
        />
      ) : null}
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrapper} testID="sprint13-ecg-pro-viewer-engine">
        <View
          // @ts-expect-error web only
          onDoubleClick={() => {
            controls.resetView();
            controls.applyFit("hero");
          }}
          style={styles.wrapper}
        >
          {canvasBody}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper} testID="sprint13-ecg-pro-viewer-engine">
      <PinchGestureHandler
        onGestureEvent={(event) => controls.setZoom(clampZoom(pinchBase.current * event.nativeEvent.scale))}
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === State.BEGAN) pinchBase.current = controls.transform.zoom;
          if (event.nativeEvent.oldState === State.ACTIVE) pinchBase.current = controls.transform.zoom;
        }}
      >
        <PanGestureHandler
          enabled={controls.isPanActive || !interactionLocked}
          minPointers={1}
          onGestureEvent={(event) =>
            controls.setTransform({
              ...controls.transform,
              panX: panBase.current.x + event.nativeEvent.translationX,
              panY: panBase.current.y + event.nativeEvent.translationY,
            })
          }
          onHandlerStateChange={(event) => {
            if (event.nativeEvent.state === State.BEGAN) panBase.current = { x: controls.transform.panX, y: controls.transform.panY };
            if (event.nativeEvent.oldState === State.ACTIVE) panBase.current = { x: controls.transform.panX, y: controls.transform.panY };
          }}
        >
          <View style={styles.wrapper}>{canvasBody}</View>
        </PanGestureHandler>
      </PinchGestureHandler>
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: {
    backgroundColor: ECG_COCKPIT_COLORS.bgDeep,
    borderRadius: 0,
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
    position: "relative",
  },
  fullscreenCanvas: {
    borderRadius: 0,
    minHeight: "100%",
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  layerImage: {
    height: "100%",
    width: "100%",
  },
  layerStack: {
    overflow: "hidden",
    position: "relative",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(255,247,247,0.72)",
    justifyContent: "center",
    zIndex: 20,
  },
  loadingText: {
    color: ECG_COCKPIT_COLORS.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  pdfFrame: {
    flex: 1,
    minHeight: 0,
  },
  pdfPane: {
    flex: 1,
    minHeight: 0,
  },
  stage: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
  },
  wrapper: {
    flex: 1,
    minHeight: 0,
  },
});
