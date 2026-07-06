import React, { createElement, memo, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { drawMonitorCanvas } from "./ecgMonitorCanvas";
import { EcgMonitorMiniNavigator } from "./EcgMonitorMiniNavigator";
import { buildScrollingMonitorPath, durationMsForLead, msToSampleIndex } from "./ecgMonitorPath";
import type { EcgLeadId } from "./types";
import type { EcgWaveformPlaybackState } from "./useEcgWaveformPlayback";
import type { EcgViewerControls } from "./useEcgViewerControls";

const CANVAS_W = 920;
const CANVAS_H = 280;

function WebMonitorCanvas({
  alarmTone,
  brightness,
  controls,
  gainScale,
  height,
  lead,
  offsetIndex,
  playback,
  width,
}: {
  alarmTone: boolean;
  brightness: number;
  controls: EcgViewerControls;
  gainScale: number;
  height: number;
  lead: DigitalEcgLead;
  offsetIndex: number;
  playback: EcgWaveformPlaybackState;
  width: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const offsetRef = useRef(offsetIndex);
  offsetRef.current = offsetIndex;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let raf = 0;
    const paint = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      drawMonitorCanvas(ctx, lead, width, height, {
        alarmTone,
        brightness,
        frozen: playback.frozen,
        gainScale,
        isPlaying: playback.isPlaying,
        offsetIndex: offsetRef.current,
        paperSpeed: controls.grid.speed,
        playheadMs: playback.playheadMs,
        phosphorPersistence: playback.isPlaying && !playback.frozen ? 0.22 : 1,
      });
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [alarmTone, brightness, controls.grid.speed, gainScale, height, lead, playback.frozen, playback.isPlaying, playback.playheadMs, width]);

  return createElement("canvas", {
    "data-testid": "sprint22-hospital-monitor-canvas",
    ref: canvasRef,
    style: { display: "block", height: "100%", width: "100%" },
  });
}

export const EcgLiveMonitorView = memo(function EcgLiveMonitorView({
  controls,
  heartRate,
  isDigitizing,
  lead,
  onDigitize,
  onFpsUpdate,
  playback,
  rhythm,
  selectedLead,
}: {
  controls: EcgViewerControls;
  heartRate?: number;
  isDigitizing?: boolean;
  lead?: DigitalEcgLead | null;
  onDigitize?: () => void;
  onFpsUpdate?: (fps: number) => void;
  playback: EcgWaveformPlaybackState;
  rhythm?: string;
  selectedLead: EcgLeadId;
}) {
  const [offsetIndex, setOffsetIndex] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ height: CANVAS_H, width: CANVAS_W });
  const [monitorBrightness, setMonitorBrightness] = useState(1);
  const frameTimes = useRef<number[]>([]);
  const gainScale = controls.grid.gain / 10;

  useEffect(() => {
    if (!lead || playback.frozen || !playback.isPlaying) return undefined;
    let raf = 0;
    const tick = (now: number) => {
      frameTimes.current.push(now);
      if (frameTimes.current.length > 24) frameTimes.current.shift();
      if (frameTimes.current.length >= 2) {
        const elapsed = frameTimes.current[frameTimes.current.length - 1]! - frameTimes.current[0]!;
        const frames = frameTimes.current.length - 1;
        if (elapsed > 0) onFpsUpdate?.(Math.round((frames / elapsed) * 1000));
      }
      setOffsetIndex(msToSampleIndex(lead, playback.playheadMs));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lead, onFpsUpdate, playback.frozen, playback.isPlaying, playback.playheadMs]);

  useEffect(() => {
    if (!lead) return;
    setOffsetIndex(msToSampleIndex(lead, playback.playheadMs));
  }, [lead, playback.playheadMs]);

  const path = useMemo(() => {
    if (!lead) return "";
    return buildScrollingMonitorPath(lead, CANVAS_W - 50, CANVAS_H - 40, gainScale, offsetIndex);
  }, [gainScale, lead, offsetIndex]);

  const sweepX = lead ? 40 + ((offsetIndex % 520) / 520) * (CANVAS_W - 80) : 0;
  const alarmTone = heartRate != null && (heartRate < 50 || heartRate > 120);
  const useWebCanvas = typeof document !== "undefined";

  if (!lead) {
    return (
      <View style={styles.empty} testID="sprint18-live-monitor">
        <Text style={styles.emptyTitle}>Live Monitor — Lead {selectedLead}</Text>
        <Text style={styles.emptyBody}>
          {isDigitizing ? "Digitizing ECG signal for live monitor rendering…" : "Digitize this ECG to render a real-time canvas waveform monitor."}
        </Text>
        {onDigitize ? <PrimaryButton label={isDigitizing ? "Digitizing…" : "Run Digitization"} onPress={onDigitize} variant="primary" /> : null}
      </View>
    );
  }

  return (
    <View style={styles.root} testID="sprint22-hospital-live-monitor">
      <View style={styles.header}>
        <Text style={styles.title}>HOSPITAL DIGITAL ECG MONITOR · LEAD {selectedLead}</Text>
        <Text style={[styles.metric, alarmTone && styles.metricAlarm]}>HR {heartRate ?? "--"} BPM</Text>
        <Text style={styles.metric}>{rhythm ?? "Rhythm pending"}</Text>
        <Text style={styles.metric}>{controls.grid.speed} mm/s · {controls.grid.gain} mm/mV</Text>
        <Text style={styles.metric}>{playback.frozen ? "FROZEN" : playback.isPlaying ? "LIVE" : "PAUSED"}</Text>
        <PrimaryButton label="Bright+" onPress={() => setMonitorBrightness((value) => Math.min(1.2, Number((value + 0.05).toFixed(2))))} variant="outline" />
        <PrimaryButton label="Bright−" onPress={() => setMonitorBrightness((value) => Math.max(0.65, Number((value - 0.05).toFixed(2))))} variant="outline" />
      </View>
      <Pressable
        onLayout={(event) => {
          const { height, width } = event.nativeEvent.layout;
          if (width > 0 && height > 0) setCanvasSize({ height: Math.max(height, CANVAS_H), width: Math.max(width, 640) });
        }}
        onPress={playback.togglePlay}
        style={styles.canvasHost}
      >
        {useWebCanvas ? (
          <WebMonitorCanvas
            alarmTone={alarmTone}
            brightness={monitorBrightness}
            controls={controls}
            gainScale={gainScale}
            height={canvasSize.height}
            lead={lead}
            offsetIndex={offsetIndex}
            playback={playback}
            width={canvasSize.width}
          />
        ) : (
          <Svg height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width="100%">
            <Rect fill="#020617" height={CANVAS_H} width={CANVAS_W} />
            {Array.from({ length: 19 }).map((_, index) => (
              <Line key={`v-${index}`} stroke="#064E3B" strokeWidth={0.45} x1={index * 48} x2={index * 48} y1={0} y2={CANVAS_H} />
            ))}
            {Array.from({ length: 6 }).map((_, index) => (
              <Line key={`h-${index}`} stroke="#064E3B" strokeWidth={0.45} x1={0} x2={CANVAS_W} y1={index * 48} y2={index * 48} />
            ))}
            {path ? <Path d={path} fill="none" stroke={alarmTone ? "#FACC15" : "#22C55E"} strokeLinecap="round" strokeWidth={2.6} transform="translate(30 18)" /> : null}
            <Line stroke="#DCFCE7" strokeOpacity={playback.frozen ? 0.35 : 0.92} strokeWidth={2} x1={sweepX} x2={sweepX} y1={8} y2={CANVAS_H - 8} />
            <Circle cx={sweepX} cy={36} fill={playback.frozen ? "#FACC15" : alarmTone ? "#F87171" : "#22C55E"} r={5} />
            <SvgText fill="#86EFAC" fontSize={12} x={32} y={CANVAS_H - 10}>
              {playback.frozen ? "FROZEN" : playback.isPlaying ? "LIVE SWEEP" : "PAUSED"} · {Math.round(playback.playheadMs)} ms / {Math.round(durationMsForLead(lead))} ms
            </SvgText>
          </Svg>
        )}
      </Pressable>
      <EcgMonitorMiniNavigator gainScale={gainScale} lead={lead} offsetIndex={offsetIndex} />
      <View style={styles.controls}>
        <PrimaryButton label={playback.isPlaying ? "Pause" : "Play"} onPress={playback.togglePlay} variant="primary" />
        <PrimaryButton label={playback.frozen ? "Resume" : "Freeze"} onPress={() => playback.setFrozen(!playback.frozen)} variant="outline" />
        <PrimaryButton label={playback.loop ? "Loop On" : "Loop Off"} onPress={() => playback.setLoop(!playback.loop)} variant="outline" />
        <PrimaryButton label="Step −" onPress={playback.previousBeat} variant="outline" />
        <PrimaryButton label="Step +" onPress={playback.nextBeat} variant="outline" />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  canvasHost: { borderRadius: 10, flex: 1, minHeight: 280, overflow: "hidden" },
  controls: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 8 },
  empty: {
    alignItems: "center",
    backgroundColor: "#020617",
    borderColor: medicalTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    justifyContent: "center",
    minHeight: 320,
    padding: 24,
  },
  emptyBody: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700", maxWidth: 420, textAlign: "center" },
  emptyTitle: { color: medicalTheme.primary, fontSize: 16, fontWeight: "900" },
  header: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 12, paddingBottom: 8 },
  metric: { color: "#86EFAC", fontSize: 12, fontWeight: "800" },
  metricAlarm: { color: "#FACC15" },
  root: { backgroundColor: "#020617", borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 320, padding: 10 },
  title: { color: "#86EFAC", flex: 1, fontSize: 13, fontWeight: "900", letterSpacing: 1.1 },
});
