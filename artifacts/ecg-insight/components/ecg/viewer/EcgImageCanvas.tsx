import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Image, Platform, StyleSheet, Text, View } from "react-native";
import { PanGestureHandler, PinchGestureHandler, State } from "react-native-gesture-handler";

import { EmptyState, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import { emitRuntimeEvent } from "@/services/runtimeEvents";

import { buildImageFilterStyle, buildTransformStyle, cacheImageDimensions, detectImageFormat, readCachedImageDimensions } from "./ecgImageEngine";
import { EcgPaperGrid } from "./EcgPaperGrid";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  controls: EcgViewerControls;
  imageUrl?: string;
  pdfUrl?: string;
  testID?: string;
};

export function EcgImageCanvas({ controls, imageUrl, pdfUrl, testID = "sprint13-ecg-image-canvas" }: Props) {
  const [loading, setLoading] = useState(true);
  const pinchBase = React.useRef(controls.transform.zoom);
  const panBase = React.useRef({ x: controls.transform.panX, y: controls.transform.panY });
  const format = detectImageFormat(imageUrl ?? pdfUrl ?? "");
  const isPdf = format === "pdf" || (!imageUrl && !!pdfUrl);

  useEffect(() => {
    const cached = imageUrl ? readCachedImageDimensions(imageUrl) : null;
    if (cached) setLoading(false);
    else if (imageUrl) setLoading(true);
  }, [imageUrl]);

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
      event.preventDefault();
      controls.zoomBy(event.deltaY < 0 ? 0.12 : -0.12);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [controls, imageUrl, testID]);

  const onImageLoad = useCallback(
    (event: { nativeEvent: { source: { height: number; width: number } } }) => {
      const { height, width } = event.nativeEvent.source;
      if (imageUrl) cacheImageDimensions(imageUrl, width, height);
      setLoading(false);
      emitRuntimeEvent("ViewerReady", { source: "sprint13-ecg-monitor", url: imageUrl });
    },
    [imageUrl],
  );

  const filterStyle = Platform.OS === "web" ? buildImageFilterStyle(controls.adjustments) : undefined;
  const transformStyle = buildTransformStyle(controls.transform, controls.adjustments);

  const canvasBody = (
    <View nativeID={testID} style={[styles.canvas, controls.fullscreen && styles.fullscreenCanvas]} testID={testID}>
      <EcgPaperGrid grid={controls.grid} />
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
        <Image
          onLoad={onImageLoad}
          resizeMode="contain"
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            { transform: transformStyle as never },
            filterStyle ? ({ filter: filterStyle } as never) : null,
            Platform.OS === "web" ? ({ willChange: "transform" } as never) : null,
          ]}
        />
      ) : (
        <EmptyState message="Open or upload an ECG image to begin review." title="No ECG loaded" />
      )}
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View
        // @ts-expect-error web only
        onDoubleClick={controls.handleDoubleClickZoom}
        style={styles.wrapper}
      >
        {canvasBody}
      </View>
    );
  }

  return (
    <PinchGestureHandler
      onGestureEvent={(event) => controls.setZoom(Math.max(0.1, Math.min(pinchBase.current * event.nativeEvent.scale, 8)))}
      onHandlerStateChange={(event) => {
        if (event.nativeEvent.state === State.BEGAN) pinchBase.current = controls.transform.zoom;
        if (event.nativeEvent.oldState === State.ACTIVE) pinchBase.current = controls.transform.zoom;
      }}
    >
      <PanGestureHandler
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
  );
}

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
  image: {
    height: "100%",
    width: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    backgroundColor: "rgba(255,247,247,0.72)",
    justifyContent: "center",
    zIndex: 2,
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
  wrapper: {
    flex: 1,
    minHeight: 320,
  },
});
