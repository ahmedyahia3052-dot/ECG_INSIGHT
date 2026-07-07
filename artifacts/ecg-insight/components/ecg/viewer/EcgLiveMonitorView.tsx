import React, { createElement, memo, useEffect, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { drawMultiLeadMonitorCanvas, drawRhythmStripCanvas } from "./ecgMonitorCanvas";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import { EcgMonitorMiniNavigator } from "./EcgMonitorMiniNavigator";
import { buildScrollingMonitorPath, durationMsForLead, msToSampleIndex } from "./ecgMonitorPath";
import type { MonitorLayoutMode } from "./monitorLayout";
import type { EcgLeadId } from "./types";
import type { EcgWaveformPlaybackState } from "./useEcgWaveformPlayback";
import type { EcgViewerControls } from "./useEcgViewerControls";

const CANVAS_W = 920;
const CANVAS_H = 280;
const RHYTHM_STRIP_H = 72;

function WebMonitorCanvas({
  alarmTone,
  allLeads,
  brightness,
  canvasRef,
  controls,
  height,
  layoutMode,
  offsetIndex,
  playback,
  reviewMode,
  selectedLead,
  width,
}: {
  alarmTone: boolean;
  allLeads: DigitalEcgLead[];
  brightness: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  controls: EcgViewerControls;
  height: number;
  layoutMode: MonitorLayoutMode;
  offsetIndex: number;
  playback: EcgWaveformPlaybackState & { reviewMode?: boolean };
  reviewMode: boolean;
  selectedLead: EcgLeadId;
  width: number;
}) {
  const offsetRef = useRef(offsetIndex);
  const sizeRef = useRef({ dpr: 0, height: 0, width: 0 });
  offsetRef.current = offsetIndex;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let raf = 0;
    const paint = () => {
      const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true } as CanvasRenderingContext2DSettings);
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      if (sizeRef.current.width !== width || sizeRef.current.height !== height || sizeRef.current.dpr !== dpr) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        sizeRef.current = { dpr, height, width };
      }
      drawMultiLeadMonitorCanvas(ctx, allLeads, width, height, {
        alarmTone,
        brightness,
        frozen: playback.frozen,
        gainMmPerMv: controls.grid.gain,
        gridVisible: controls.grid.visible,
        isPlaying: playback.isPlaying,
        layoutMode,
        offsetIndex: offsetRef.current,
        panX: controls.transform.panX,
        panY: controls.transform.panY,
        paperSpeed: controls.grid.speed,
        playheadMs: playback.playheadMs,
        phosphorPersistence: playback.isPlaying && !playback.frozen && !reviewMode ? 0.2 : 1,
        reviewMode,
        selectedLead,
        zoom: controls.transform.zoom,
      });
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [
    alarmTone,
    allLeads,
    brightness,
    canvasRef,
    controls.grid.gain,
    controls.grid.speed,
    controls.grid.visible,
    controls.transform.panX,
    controls.transform.panY,
    controls.transform.zoom,
    height,
    layoutMode,
    playback.frozen,
    playback.isPlaying,
    playback.playheadMs,
    reviewMode,
    selectedLead,
    width,
  ]);

  return createElement("canvas", {
    "data-testid": "sprint22-hospital-monitor-canvas",
    ref: canvasRef,
    style: { display: "block", height: "100%", width: "100%" },
  });
}

function WebRhythmStripCanvas({
  alarmTone,
  controls,
  lead,
  offsetIndex,
  playback,
  reviewMode,
  width,
}: {
  alarmTone: boolean;
  controls: EcgViewerControls;
  lead: DigitalEcgLead;
  offsetIndex: number;
  playback: EcgWaveformPlaybackState;
  reviewMode: boolean;
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
      const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true } as CanvasRenderingContext2DSettings);
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(RHYTHM_STRIP_H * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${RHYTHM_STRIP_H}px`;
      drawRhythmStripCanvas(ctx, lead, width, RHYTHM_STRIP_H, {
        alarmTone,
        frozen: playback.frozen,
        gainMmPerMv: controls.grid.gain,
        gridVisible: controls.grid.visible,
        isPlaying: playback.isPlaying,
        offsetIndex: offsetRef.current,
        paperSpeed: controls.grid.speed,
        reviewMode,
      });
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [alarmTone, controls.grid.gain, controls.grid.speed, controls.grid.visible, lead, playback.frozen, playback.isPlaying, reviewMode, width]);

  return createElement("canvas", {
    "data-testid": "sprint41-rhythm-strip-canvas",
    ref: canvasRef,
    style: { display: "block", height: RHYTHM_STRIP_H, width: "100%" },
  });
}

export const EcgLiveMonitorView = memo(function EcgLiveMonitorView({
  allLeads = [],
  canvasRef: externalCanvasRef,
  chrome = "full",
  controls,
  heartRate,
  isDigitizing,
  layoutMode = "single",
  lead,
  onDigitize,
  onFpsUpdate,
  onPanBy,
  panActive = false,
  playback,
  reviewMode = false,
  rhythm,
  rhythmStripLead = "II",
  rhythmStripMode = false,
  selectedLead,
}: {
  allLeads?: DigitalEcgLead[];
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
  chrome?: "canvas-only" | "full" | "workspace";
  controls: EcgViewerControls;
  heartRate?: number;
  isDigitizing?: boolean;
  layoutMode?: MonitorLayoutMode;
  lead?: DigitalEcgLead | null;
  onDigitize?: () => void;
  onFpsUpdate?: (fps: number) => void;
  onPanBy?: (dx: number, dy: number) => void;
  panActive?: boolean;
  playback: EcgWaveformPlaybackState;
  reviewMode?: boolean;
  rhythm?: string;
  rhythmStripLead?: EcgLeadId | string;
  rhythmStripMode?: boolean;
  selectedLead: EcgLeadId;
}) {
  const [offsetIndex, setOffsetIndex] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ height: CANVAS_H, width: CANVAS_W });
  const [monitorBrightness, setMonitorBrightness] = useState(1);
  const frameTimes = useRef<number[]>([]);
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = externalCanvasRef ?? internalCanvasRef;
  const gainScale = controls.grid.gain / 10;

  const leadsForRender = useMemo(() => {
    if (allLeads.length) return allLeads;
    return lead ? [lead] : [];
  }, [allLeads, lead]);

  const rhythmLeadData = useMemo(
    () => allLeads.find((l) => l.lead === rhythmStripLead) ?? allLeads.find((l) => l.lead === "II") ?? lead,
    [allLeads, lead, rhythmStripLead],
  );

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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => panActive,
        onPanResponderMove: (_event, gesture) => onPanBy?.(gesture.dx, gesture.dy),
      }),
    [onPanBy, panActive],
  );

  const path = useMemo(() => {
    if (!lead) return "";
    return buildScrollingMonitorPath(lead, CANVAS_W - 50, CANVAS_H - 40, gainScale, offsetIndex);
  }, [gainScale, lead, offsetIndex]);

  const sweepX = lead ? 40 + ((offsetIndex % 520) / 520) * (CANVAS_W - 80) : 0;
  const alarmTone = heartRate != null && (heartRate < 50 || heartRate > 120);
  const useWebCanvas = typeof document !== "undefined";

  const showChrome = chrome === "full";
  const showWorkspaceChrome = chrome === "workspace";
  const canvasOnly = chrome === "canvas-only";

  const layoutLabel =
    layoutMode === "single"
      ? `LEAD ${selectedLead}`
      : layoutMode === "3-lead"
        ? "3-LEAD MONITOR"
        : layoutMode === "5-lead"
          ? "5-LEAD MONITOR"
          : "12-LEAD MONITOR";

  if (!lead && !leadsForRender.length) {
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
    <View
      style={[styles.root, canvasOnly && styles.rootCanvasOnly, showWorkspaceChrome && styles.rootWorkspace]}
      testID={canvasOnly ? "sprint37-live-monitor-canvas-host" : "sprint22-hospital-live-monitor"}
    >
      {showChrome || showWorkspaceChrome ? (
        <View style={styles.header}>
          <Text style={styles.title}>
            {rhythmStripMode ? `RHYTHM STRIP · LEAD ${rhythmStripLead}` : `HOSPITAL DIGITAL ECG MONITOR · ${layoutLabel}`}
          </Text>
          {!showWorkspaceChrome ? (
            <>
              <Text style={[styles.metric, alarmTone && styles.metricAlarm]}>HR {heartRate ?? "--"} BPM</Text>
              <Text style={styles.metric}>{rhythm ?? "Rhythm pending"}</Text>
              <Text style={styles.metric}>{controls.grid.speed} mm/s · {controls.grid.gain} mm/mV</Text>
              <Text style={styles.metric}>{reviewMode ? "REVIEW" : playback.frozen ? "FROZEN" : playback.isPlaying ? "LIVE" : "PAUSED"}</Text>
              <PrimaryButton label="Bright+" onPress={() => setMonitorBrightness((value) => Math.min(1.2, Number((value + 0.05).toFixed(2))))} variant="outline" />
              <PrimaryButton label="Bright−" onPress={() => setMonitorBrightness((value) => Math.max(0.65, Number((value - 0.05).toFixed(2))))} variant="outline" />
            </>
          ) : null}
        </View>
      ) : null}
      <Pressable
        {...panResponder.panHandlers}
        onLayout={(event) => {
          const { height, width } = event.nativeEvent.layout;
          if (width > 0 && height > 0) {
            const rhythmOffset = rhythmStripMode ? RHYTHM_STRIP_H + 8 : 0;
            setCanvasSize({ height: Math.max(height - rhythmOffset, CANVAS_H), width: Math.max(width, 640) });
          }
        }}
        onPress={panActive ? undefined : playback.togglePlay}
        style={styles.canvasHost}
      >
        {useWebCanvas ? (
          <WebMonitorCanvas
            alarmTone={alarmTone}
            allLeads={leadsForRender}
            brightness={monitorBrightness}
            canvasRef={canvasRef}
            controls={controls}
            height={canvasSize.height}
            layoutMode={layoutMode}
            offsetIndex={offsetIndex}
            playback={playback}
            reviewMode={reviewMode}
            selectedLead={selectedLead}
            width={canvasSize.width}
          />
        ) : (
          <Svg height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} width="100%">
            <Rect fill="#020617" height={CANVAS_H} width={CANVAS_W} />
            {path ? <Path d={path} fill="none" stroke={alarmTone ? "#FACC15" : "#22C55E"} strokeLinecap="round" strokeWidth={2.6} transform="translate(30 18)" /> : null}
            <Line stroke="#DCFCE7" strokeOpacity={playback.frozen ? 0.35 : 0.92} strokeWidth={2} x1={sweepX} x2={sweepX} y1={8} y2={CANVAS_H - 8} />
            <Circle cx={sweepX} cy={36} fill={playback.frozen ? "#FACC15" : alarmTone ? "#F87171" : "#22C55E"} r={5} />
            <SvgText fill="#86EFAC" fontSize={12} x={32} y={CANVAS_H - 10}>
              {playback.frozen ? "FROZEN" : playback.isPlaying ? "LIVE SWEEP" : "PAUSED"}
            </SvgText>
          </Svg>
        )}
      </Pressable>
      {rhythmStripMode && rhythmLeadData && useWebCanvas ? (
        <View style={styles.rhythmStripHost} testID="sprint41-rhythm-strip-host">
          <WebRhythmStripCanvas
            alarmTone={alarmTone}
            controls={controls}
            lead={rhythmLeadData}
            offsetIndex={offsetIndex}
            playback={playback}
            reviewMode={reviewMode}
            width={canvasSize.width}
          />
        </View>
      ) : null}
      {!canvasOnly && lead ? <EcgMonitorMiniNavigator gainMmPerMv={controls.grid.gain} lead={lead} offsetIndex={offsetIndex} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  canvasHost: { borderRadius: 10, flex: 1, minHeight: 280, overflow: "hidden" },
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
  rhythmStripHost: { borderTopColor: "#14532D", borderTopWidth: 1, height: RHYTHM_STRIP_H, overflow: "hidden" },
  root: {
    backgroundColor: "#020617",
    borderColor: medicalTheme.border,
    borderRadius: ECG_WORKSTATION_VISUAL.monitorBorderRadius,
    borderWidth: 1,
    flex: 1,
    minHeight: 320,
    overflow: "hidden",
    padding: 10,
  },
  rootCanvasOnly: { backgroundColor: "#010409", borderWidth: 0, borderRadius: 0, padding: 0 },
  rootWorkspace: { backgroundColor: "#010409", borderColor: "#14532D", minHeight: 360 },
  title: { color: "#86EFAC", flex: 1, fontSize: 13, fontWeight: "900", letterSpacing: 1.1 },
});
