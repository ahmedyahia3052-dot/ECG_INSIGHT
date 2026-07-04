import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Image, LayoutChangeEvent, Platform, StyleSheet, Text, View } from "react-native";
import { PanGestureHandler, PinchGestureHandler, State } from "react-native-gesture-handler";

import { EmptyState, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import { emitRuntimeEvent } from "@/services/runtimeEvents";

import { EcgAiOverlayLayer, type EcgAiOverlayRegion } from "./EcgAiOverlayLayer";
import { EcgDigitizedWaveformLayer, type DigitizedWaveformLead } from "./EcgDigitizedWaveformLayer";
import { EcgMeasurementOverlay } from "./EcgMeasurementOverlay";
import { EcgPaperGrid } from "./EcgPaperGrid";
import { buildImageFilterStyle, buildTransformStyle, cacheImageDimensions, detectImageFormat, readCachedImageDimensions } from "./ecgImageEngine";
import { displayDimensions, VIEWER_LAYER } from "./ecgViewerEngine";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  aiOverlayEnabled?: boolean;
  aiOverlayRegions?: EcgAiOverlayRegion[];
  controls: EcgViewerControls;
  digitizedLeads?: DigitizedWaveformLead[];
  imageUrl?: string;
  pdfUrl?: string;
  testID?: string;
  workspace?: EcgMeasurementWorkspace;
};

export const EcgProViewerEngine = memo(function EcgProViewerEngine({
  aiOverlayEnabled = false,
  aiOverlayRegions = [],
  controls,
  digitizedLeads = [],
  imageUrl,
  pdfUrl,
  testID = "sprint13-ecg-pro-viewer-engine",
  workspace,
}: Props) {
  const [loading, setLoading] = React.useState(true);
  const pinchBase = useRef(controls.transform.zoom);
  const panBase = useRef({ x: controls.transform.panX, y: controls.transform.panY });
  const dragOrigin = useRef<{ x: number; y: number } | null>(null);
  const format = detectImageFormat(imageUrl ?? pdfUrl ?? "");
  const isPdf = format === "pdf" || (!imageUrl && !!pdfUrl);
  const viewport = controls.viewport;

  useEffect(() => {
    const cached = imageUrl ? readCachedImageDimensions(imageUrl) : null;
    if (cached) {
      controls.setViewportDimensions({ imageHeight: cached.height, imageWidth: cached.width });
      setLoading(false);
    } else if (imageUrl) setLoading(true);
  }, [controls, imageUrl]);

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
      controls.zoomBy(event.deltaY < 0 ? 0.12 : -0.12);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [controls, imageUrl, testID]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const onMouseDown = (event: MouseEvent) => {
      if (!controls.isPanActive) return;
      dragOrigin.current = { x: event.clientX, y: event.clientY };
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!dragOrigin.current) return;
      controls.panBy(event.clientX - dragOrigin.current.x, event.clientY - dragOrigin.current.y);
      dragOrigin.current = { x: event.clientX, y: event.clientY };
    };
    const onMouseUp = () => {
      dragOrigin.current = null;
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [controls]);

  const onImageLoad = useCallback(
    (event: { nativeEvent: { source: { height: number; width: number } } }) => {
      const { height, width } = event.nativeEvent.source;
      if (imageUrl) cacheImageDimensions(imageUrl, width, height);
      controls.setViewportDimensions({ imageHeight: height, imageWidth: width });
      setLoading(false);
      emitRuntimeEvent("ViewerReady", { source: "sprint13-ecg-pro-viewer-engine", url: imageUrl });
    },
    [controls, imageUrl],
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

  const layerStack = (
    <View
      style={[
        styles.layerStack,
        {
          height: rect.displayHeight,
          transform: layerTransform as never,
          width: rect.displayWidth,
        },
        Platform.OS === "web" ? ({ willChange: "transform" } as never) : null,
      ]}
    >
      {imageUrl ? (
        <Image
          onLoad={onImageLoad}
          resizeMode="stretch"
          source={{ uri: imageUrl }}
          style={[styles.layerImage as never, filterStyle ? ({ filter: filterStyle } as never) : null]}
          testID="sprint13-ecg-layer-image"
        />
      ) : null}
      <View pointerEvents="none" style={[styles.layer, { zIndex: VIEWER_LAYER.ecgGrid }]}>
        <EcgPaperGrid grid={controls.grid} height={rect.displayHeight} width={rect.displayWidth} zoom={controls.transform.zoom} />
      </View>
      <View pointerEvents="none" style={[styles.layer, { zIndex: VIEWER_LAYER.digitizedWaveform }]}>
        <EcgDigitizedWaveformLayer height={rect.displayHeight} leads={digitizedLeads} width={rect.displayWidth} />
      </View>
      <View pointerEvents="none" style={[styles.layer, { zIndex: VIEWER_LAYER.aiOverlay }]}>
        <EcgAiOverlayLayer enabled={aiOverlayEnabled} height={rect.displayHeight} regions={aiOverlayRegions} width={rect.displayWidth} />
      </View>
    </View>
  );

  const canvasBody = (
    <View
      nativeID={testID}
      onLayout={onLayout}
      style={[
        styles.canvas,
        controls.fullscreen && styles.fullscreenCanvas,
        controls.isPanActive && !interactionLocked && Platform.OS === "web" ? ({ cursor: "grab" } as never) : null,
      ]}
      testID={testID}
    >
      {loading && imageUrl ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={medicalTheme.primary} size="large" />
          <Text style={styles.loadingText}>Loading ECG image…</Text>
        </View>
      ) : null}
      {isPdf ? (
        <View style={styles.pdfPane}>
          {Platform.OS === "web" && pdfUrl ? (
            <View nativeID={`${testID}-pdf-frame`} style={styles.pdfFrame} />
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
        </View>
      ) : null}
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View style={styles.wrapper} testID="sprint13-ecg-pro-viewer-engine">
        <View
          // @ts-expect-error web only
          onDoubleClick={controls.handleDoubleClickZoom}
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
        onGestureEvent={(event) => controls.setZoom(Math.max(0.1, Math.min(pinchBase.current * event.nativeEvent.scale, 8)))}
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
    backgroundColor: "#FFF7F7",
    borderColor: medicalTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 320,
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
    color: medicalTheme.muted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },
  pdfFrame: {
    flex: 1,
    minHeight: 320,
  },
  pdfPane: {
    flex: 1,
    minHeight: 320,
  },
  stage: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  wrapper: {
    flex: 1,
    minHeight: 320,
  },
});
