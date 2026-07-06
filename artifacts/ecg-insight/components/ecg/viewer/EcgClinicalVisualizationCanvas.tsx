import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Defs, Filter, FeGaussianBlur, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { AIExplainability } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";

import {
  aiRegionRect,
  applyLeadFocusRegions,
  buildAiVisualRegions,
  buildTimelineMarkers,
  computeCrosshairTelemetry,
  DEFAULT_CLINICAL_SETTINGS,
  deriveSignalQualityFlags,
  gridColorsForPreset,
  resolveWaveformStyle,
  signalQualityLabel,
  toggleLeadFocus,
  type EcgClinicalVisualizationSettings,
  type EcgCrosshairTelemetry,
  waveformOpacity,
} from "./clinical-visualization";
import { applyWheelZoom, decayMomentum, momentumActive, trackPanVelocity } from "./clinical-visualization/zoomPanEngine";
import { EcgClinicalCrosshairPanel } from "./EcgClinicalCrosshairPanel";
import { EcgClinicalMiniNavigator } from "./EcgClinicalMiniNavigator";
import { EcgClinicalTimelineBar } from "./EcgClinicalTimelineBar";
import {
  buildPipelineModel,
  createRenderPipeline,
  defaultViewport,
  renderSvgPipeline,
  resolveBackend,
  tickPipelineMetrics,
  type EcgRenderMetrics,
} from "./rendering-engine";
import { DirtyRectManager } from "./rendering-engine/dirtyRect";
import {
  clearInteraction,
  finishRubberBand,
  hitTestLead,
  startRubberBand,
  toggleLeadSelection,
  updateCrosshair,
  updateHover,
} from "./rendering-engine/interaction";
import { formatMetricsLine } from "./rendering-engine/metrics";
import { buildTwelveLeadRegions } from "./rendering-engine/twelveLeadLayout";
import type { EcgLeadLayoutMode } from "./types";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  activeLead?: string;
  controls: EcgViewerControls;
  digitalEcg?: DigitalEcg | null;
  explainability?: AIExplainability | null;
  layout?: EcgLeadLayoutMode;
  onFpsUpdate?: (fps: number) => void;
  onMetricsUpdate?: (metrics: EcgRenderMetrics) => void;
  playheadMs?: number;
  settings?: Partial<EcgClinicalVisualizationSettings>;
  showCrosshair?: boolean;
  testID?: string;
};

function layoutFromMode(mode: EcgLeadLayoutMode): "12-lead" | "rhythm" | "single" {
  if (mode === "rhythm") return "rhythm";
  if (mode === "single") return "single";
  return "12-lead";
}

export const EcgClinicalVisualizationCanvas = memo(function EcgClinicalVisualizationCanvas({
  activeLead = "II",
  controls,
  digitalEcg,
  explainability,
  layout = "12-lead",
  onFpsUpdate,
  onMetricsUpdate,
  playheadMs,
  settings: settingsOverride,
  showCrosshair = true,
  testID = "sprint28-clinical-visualization-canvas",
}: Props) {
  const [size, setSize] = useState({ height: 720, width: 1280 });
  const [interaction, setInteraction] = useState(clearInteraction());
  const [telemetry, setTelemetry] = useState<EcgCrosshairTelemetry | null>(null);
  const [metricsLine, setMetricsLine] = useState("");
  const [leadFocus, setLeadFocus] = useState({ activeLead: null as string | null, focused: false, progress: 0 });
  const [scrubMs, setScrubMs] = useState<number | null>(null);
  const momentumRef = useRef({ vx: 0, vy: 0 });
  const dragRef = useRef<{ active: boolean; last: { t: number; x: number; y: number } | null; startX: number; startY: number }>({
    active: false,
    last: null,
    startX: 0,
    startY: 0,
  });
  const hostRef = useRef<View | null>(null);

  const settings = useMemo(
    () => ({ ...DEFAULT_CLINICAL_SETTINGS, ...settingsOverride, showCrosshair: showCrosshair ?? DEFAULT_CLINICAL_SETTINGS.showCrosshair }),
    [settingsOverride, showCrosshair],
  );
  const layoutMode = layoutFromMode(layout);
  const backend = resolveBackend(settings.renderMode === "webgl" ? "webgl" : settings.renderMode === "canvas2d" ? "canvas2d" : "svg");

  const viewport = useMemo(
    () => ({
      ...defaultViewport(size.width, size.height),
      panX: controls.transform.panX,
      panY: controls.transform.panY,
      zoom: controls.transform.zoom,
    }),
    [controls.transform.panX, controls.transform.panY, controls.transform.zoom, size.height, size.width],
  );

  const baseRegions = useMemo(
    () => buildTwelveLeadRegions(size.width, size.height, layoutMode, activeLead),
    [activeLead, layoutMode, size.height, size.width],
  );

  const regions = useMemo(
    () => applyLeadFocusRegions(baseRegions, leadFocus.activeLead, size.width, size.height, leadFocus.progress),
    [baseRegions, leadFocus.activeLead, leadFocus.progress, size.height, size.width],
  );

  const model = useMemo(() => {
    if (!digitalEcg?.leads?.length) return null;
    return buildPipelineModel(digitalEcg, viewport, controls.grid, layoutMode, activeLead, 1);
  }, [activeLead, controls.grid, digitalEcg, layoutMode, viewport]);

  const gridColors = useMemo(
    () => gridColorsForPreset(settings.gridPreset, controls.grid.opacity, settings.highContrast),
    [controls.grid.opacity, settings.gridPreset, settings.highContrast],
  );

  const svgOutput = useMemo(() => {
    if (!model) return null;
    const beatInteraction = scrubMs != null ? { ...interaction, beatCursorMs: scrubMs } : playheadMs != null ? { ...interaction, beatCursorMs: playheadMs } : interaction;
    return renderSvgPipeline(model, viewport, controls.grid, beatInteraction, layoutMode, activeLead);
  }, [activeLead, controls.grid, interaction, layoutMode, model, playheadMs, scrubMs, viewport]);

  const aiRegions = useMemo(() => {
    if (!settings.showAiHeatmap || !digitalEcg) return [];
    const rate = digitalEcg.leads[0]?.samplingRate ?? 500;
    const maxSamples = Math.max(...digitalEcg.leads.map((l) => l.samples.length), 0);
    return buildAiVisualRegions(explainability, (maxSamples / rate) * 1000);
  }, [digitalEcg, explainability, settings.showAiHeatmap]);

  const qualityFlags = useMemo(() => deriveSignalQualityFlags(digitalEcg), [digitalEcg]);
  const rhythmLead = digitalEcg?.leads.find((l) => l.lead === activeLead) ?? digitalEcg?.leads.find((l) => l.lead === "II");
  const timelineMarkers = useMemo(
    () => buildTimelineMarkers(rhythmLead, explainability?.leadHighlights?.map((h) => h.finding) ?? []),
    [explainability?.leadHighlights, rhythmLead],
  );
  const durationMs = rhythmLead ? (rhythmLead.samples.length / (rhythmLead.samplingRate || 500)) * 1000 : 0;

  const onLayout = useCallback((event: { nativeEvent: { layout: { height: number; width: number } } }) => {
    const { height, width } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ height, width });
  }, []);

  const updateTelemetry = useCallback(
    (x: number, y: number) => {
      if (!digitalEcg || !settings.showCrosshair) {
        setTelemetry(null);
        return;
      }
      setTelemetry(computeCrosshairTelemetry(x, y, regions, digitalEcg, controls.grid, viewport));
    },
    [controls.grid, digitalEcg, regions, settings.showCrosshair, viewport],
  );

  const handlePointer = useCallback(
    (kind: "down" | "move" | "up", x: number, y: number) => {
      const lead = hitTestLead(x, y, regions);
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      if (kind === "move") {
        setInteraction((prev) => updateHover(updateCrosshair(prev, x, y), lead));
        updateTelemetry(x, y);
        if (dragRef.current.active) {
          const dx = x - dragRef.current.startX;
          const dy = y - dragRef.current.startY;
          controls.panBy(dx, dy);
          momentumRef.current = trackPanVelocity(dragRef.current.last, x, y, now);
          dragRef.current.startX = x;
          dragRef.current.startY = y;
          dragRef.current.last = { t: now, x, y };
        }
      } else if (kind === "down") {
        if (controls.isPanActive) {
          dragRef.current = { active: true, last: { t: now, x, y }, startX: x, startY: y };
        } else if (lead) {
          if (settings.leadFocusEnabled) setLeadFocus((prev) => toggleLeadFocus(prev, lead));
          else setInteraction((prev) => toggleLeadSelection(prev, lead));
        } else {
          setInteraction((prev) => startRubberBand(prev, x, y));
        }
      } else if (kind === "up") {
        dragRef.current.active = false;
        setInteraction((prev) => finishRubberBand(prev, regions));
      }
    },
    [controls, regions, settings.leadFocusEnabled, updateTelemetry],
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const el = hostRef.current as unknown as HTMLElement | null;
    const target = el ?? window;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = applyWheelZoom(event.deltaY);
      controls.zoomAtAnchor({ x: event.offsetX ?? size.width / 2, y: event.offsetY ?? size.height / 2 }, factor > 1 ? 0.12 : -0.12);
    };
    target.addEventListener?.("wheel", onWheel as EventListener, { passive: false });
    return () => target.removeEventListener?.("wheel", onWheel as EventListener);
  }, [controls, size.height, size.width]);

  useEffect(() => {
    if (Platform.OS !== "web") return undefined;
    let raf = 0;
    const tick = () => {
      if (momentumActive(momentumRef.current) && !dragRef.current.active) {
        controls.panBy(momentumRef.current.vx, momentumRef.current.vy);
        momentumRef.current = decayMomentum(momentumRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [controls]);

  useEffect(() => {
    if (!model) return;
    const pipeline = createRenderPipeline({ grid: controls.grid, viewport, backend });
    const metrics = tickPipelineMetrics(pipeline.metrics, backend, model, new DirtyRectManager());
    setMetricsLine(formatMetricsLine(metrics));
    onFpsUpdate?.(metrics.fps);
    onMetricsUpdate?.(metrics);
  }, [backend, controls.grid, model, onFpsUpdate, onMetricsUpdate, viewport]);

  if (!digitalEcg?.leads?.length) {
    return (
      <View onLayout={onLayout} style={[styles.host, { backgroundColor: gridColors.background }]} testID={testID}>
        <Text style={styles.empty}>Digitized ECG required for clinical visualization</Text>
      </View>
    );
  }

  return (
    <View
      ref={hostRef}
      onLayout={onLayout}
      style={[styles.host, { backgroundColor: gridColors.background }]}
      testID={testID}
      {...(Platform.OS === "web"
        ? {
            onMouseDown: (e: { nativeEvent: { locationX: number; locationY: number } }) =>
              handlePointer("down", e.nativeEvent.locationX, e.nativeEvent.locationY),
            onMouseMove: (e: { nativeEvent: { locationX: number; locationY: number } }) =>
              handlePointer("move", e.nativeEvent.locationX, e.nativeEvent.locationY),
            onMouseUp: (e: { nativeEvent: { locationX: number; locationY: number } }) =>
              handlePointer("up", e.nativeEvent.locationX, e.nativeEvent.locationY),
          }
        : {})}
    >
      <Svg height={size.height} testID="sprint28-clinical-render-svg" width={size.width}>
        <Defs>
          <Filter id="sprint28-wave-glow">
            <FeGaussianBlur result="blur" stdDeviation="2.5" />
          </Filter>
        </Defs>
        {svgOutput?.gridMinor.map((d, i) => (
          <Path d={d} key={`g-min-${i}`} stroke={gridColors.minor} strokeWidth={gridColors.minorWidth} />
        ))}
        {svgOutput?.gridMajor.map((d, i) => (
          <Path d={d} key={`g-maj-${i}`} stroke={gridColors.major} strokeWidth={gridColors.majorWidth} />
        ))}
        {aiRegions.map((region) => {
          const leadRegion = regions.find((r) => r.lead === region.lead) ?? regions[0];
          if (!leadRegion) return null;
          const rect = aiRegionRect(region, leadRegion.x, leadRegion.y, leadRegion.width, leadRegion.height, durationMs);
          if (!rect) return null;
          return (
            <Rect
              fill={region.color}
              height={rect.height}
              key={`ai-${region.lead}-${region.startMs}`}
              stroke={region.glow}
              strokeWidth={1}
              width={rect.width}
              x={rect.x}
              y={rect.y}
            />
          );
        })}
        {svgOutput?.waveformPaths.map((item) => {
          const style = resolveWaveformStyle(
            settings,
            settings.gridPreset,
            interaction.highlightedLead === item.lead || interaction.selectedLeads.includes(item.lead),
            interaction.hoverLead === item.lead,
          );
          const region = regions.find((r) => r.lead === item.lead);
          const dimmed = region?.dimmed ?? false;
          return (
            <Path
              d={item.path}
              fill="none"
              key={item.lead}
              opacity={waveformOpacity(settings, dimmed)}
              stroke={style.traceColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={style.traceWidth}
            />
          );
        })}
        {svgOutput?.leadLabels.map((label) => (
          <SvgText fill={gridColors.label} fontSize={11} fontWeight="600" key={label.lead} x={label.x} y={label.y}>
            {label.lead}
          </SvgText>
        ))}
        {settings.showCrosshair
          ? svgOutput?.crosshairLines.map((line, i) => (
              <Line
                key={`cross-${i}`}
                stroke="rgba(20,221,230,0.65)"
                strokeDasharray="4 4"
                strokeWidth={1}
                x1={line.x1}
                x2={line.x2}
                y1={line.y1}
                y2={line.y2}
              />
            ))
          : null}
        {settings.showSweepLine && scrubMs != null ? (
          <Line
            stroke="rgba(250,204,21,0.9)"
            strokeWidth={2}
            x1={(scrubMs / Math.max(durationMs, 1)) * size.width}
            x2={(scrubMs / Math.max(durationMs, 1)) * size.width}
            y1={0}
            y2={size.height}
          />
        ) : null}
      </Svg>

      {settings.showSignalQuality ? (
        <View pointerEvents="none" style={styles.qualityBar} testID="sprint28-signal-quality">
          <Text style={styles.qualityText}>Signal: {signalQualityLabel(qualityFlags)}</Text>
        </View>
      ) : null}

      <EcgClinicalCrosshairPanel telemetry={telemetry} visible={settings.showCrosshair} />
      {settings.showMiniNavigator ? <EcgClinicalMiniNavigator controls={controls} height={size.height} width={size.width} /> : null}

      {settings.showTimeline ? (
        <EcgClinicalTimelineBar
          durationMs={durationMs}
          markers={timelineMarkers}
          onScrub={setScrubMs}
          playheadMs={scrubMs ?? playheadMs}
          viewportEndMs={durationMs * 0.35}
          viewportStartMs={0}
        />
      ) : null}

      <View pointerEvents="none" style={styles.metricsBar} testID="sprint28-clinical-render-metrics">
        <Text style={styles.metricsText}>{metricsLine || "Sprint 28 Clinical Visualization"}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  empty: { color: medicalTheme.muted, fontSize: 13, padding: 16, textAlign: "center" },
  host: { flex: 1, minHeight: 420, overflow: "hidden", position: "relative" },
  metricsBar: {
    backgroundColor: "rgba(15,23,42,0.78)",
    borderRadius: 6,
    bottom: 48,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: "absolute",
  },
  metricsText: { color: "#E2E8F0", fontFamily: "monospace", fontSize: 10 },
  qualityBar: {
    backgroundColor: "rgba(6,17,31,0.85)",
    borderRadius: 6,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: "absolute",
    top: 8,
  },
  qualityText: { color: "#86EFAC", fontSize: 10, fontWeight: "800" },
});

export { DEFAULT_CLINICAL_SETTINGS };
