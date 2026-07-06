import React, { memo, useEffect, useRef } from "react";
import { createElement } from "react";
import { StyleSheet, View } from "react-native";

import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { drawMonitorOverview } from "./ecgMonitorCanvas";

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
  const width = 920;
  const height = 56;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawMonitorOverview(ctx, lead, width, height, offsetIndex, gainScale);
  }, [gainScale, lead, offsetIndex]);

  return (
    <View style={styles.host} testID="sprint22-monitor-mini-navigator">
      {createElement("canvas", {
        "data-testid": "sprint22-monitor-overview-canvas",
        height,
        ref: canvasRef,
        style: { display: "block", height: 56, width: "100%" },
        width,
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
    height: 56,
    overflow: "hidden",
    width: "100%",
  },
});
