import React, { memo, useEffect, useRef, useState } from "react";
import { createElement } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";

import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { drawMonitorOverview } from "./ecgMonitorCanvas";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";

export const EcgMonitorMiniNavigator = memo(function EcgMonitorMiniNavigator({
  gainScale,
  lead,
  offsetIndex,
}: {
  gainScale: number;
  lead: DigitalEcgLead;
  offsetIndex: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hostWidth, setHostWidth] = useState(920);
  const height = ECG_WORKSTATION_VISUAL.miniNavigatorHeight;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const width = Math.max(320, Math.floor(hostWidth));
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    drawMonitorOverview(ctx, lead, width, height, offsetIndex, gainScale);
  }, [gainScale, height, hostWidth, lead, offsetIndex]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) setHostWidth(width);
  };

  return (
    <View onLayout={onLayout} style={styles.host} testID="sprint22-monitor-mini-navigator">
      {createElement("canvas", {
        "data-testid": "sprint22-monitor-overview-canvas",
        ref: canvasRef,
        style: { display: "block", height, width: "100%" },
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    backgroundColor: "#020617",
    borderColor: "rgba(30,58,74,0.9)",
    borderRadius: 8,
    borderWidth: 1,
    height: ECG_WORKSTATION_VISUAL.miniNavigatorHeight,
    overflow: "hidden",
    width: "100%",
  },
});
