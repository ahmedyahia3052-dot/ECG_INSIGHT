import React, { memo, useEffect, useRef } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { drawMultiLeadMonitorCanvas } from "../ecgMonitorCanvas";
import type { EcgLeadId } from "../types";
import type { EcgViewerControls } from "../useEcgViewerControls";
import type { EcgWaveformPlaybackState } from "../useEcgWaveformPlayback";

export const EcgDiagnosticRhythmStrip = memo(function EcgDiagnosticRhythmStrip({
  controls,
  lead,
  playback,
  selectedLead,
}: {
  controls: EcgViewerControls;
  lead: DigitalEcgLead | null;
  playback: EcgWaveformPlaybackState;
  selectedLead: EcgLeadId;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" || !canvasRef.current) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx || !lead?.samples?.length) return undefined;

    const render = () => {
      const width = canvas.clientWidth || 1200;
      const height = canvas.clientHeight || 96;
      canvas.width = width;
      canvas.height = height;
      drawMultiLeadMonitorCanvas(ctx, [lead], width, height, {
        alarmTone: false,
        brightness: 1,
        frozen: playback.frozen,
        gainMmPerMv: controls.grid.gain,
        gridVisible: true,
        horizontalScroll: 0,
        isPlaying: playback.isPlaying,
        layoutMode: "single",
        offsetIndex: 0,
        panX: 0,
        panY: 0,
        paperSpeed: controls.grid.speed,
        playheadMs: playback.playheadMs,
        phosphorPersistence: playback.isPlaying ? 0.18 : 1,
        reviewMode: false,
        selectedLead,
        zoom: 1,
      });
      frameRef.current = requestAnimationFrame(render);
    };

    frameRef.current = requestAnimationFrame(render);
    return () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    };
  }, [controls.grid.gain, controls.grid.speed, lead, playback.frozen, playback.isPlaying, playback.playheadMs, selectedLead]);

  return (
    <View style={styles.root} testID="sprint46-diagnostic-rhythm-strip">
      <Text style={styles.label}>Rhythm Strip · Lead {selectedLead}</Text>
      {Platform.OS === "web" ? (
        <canvas data-testid="sprint46-rhythm-strip-canvas" ref={canvasRef} style={{ height: 96, width: "100%" }} />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.fallbackText}>Rhythm strip available on web workstation</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    height: 96,
    justifyContent: "center",
  },
  fallbackText: {
    color: "#94A3B8",
    fontSize: 12,
  },
  label: {
    color: "#86EFAC",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    paddingHorizontal: 10,
    paddingTop: 6,
    textTransform: "uppercase",
  },
  root: {
    backgroundColor: "#020617",
    borderTopColor: "rgba(51,65,85,0.65)",
    borderTopWidth: 1,
    minHeight: 120,
  },
});
