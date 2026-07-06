import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcg } from "@/services/ecgProcessing";

import type { EcgLeadLayoutMode } from "./types";
import type { EcgViewerControls } from "./useEcgViewerControls";
import {
  buildPipelineModel,
  createRenderPipeline,
  defaultViewport,
  renderSvgPipeline,
  tickPipelineMetrics,
  type EcgRenderBackend,
  type EcgRenderMetrics,
} from "./rendering-engine";
import { configureCanvas2d, drawDigitizedCanvas2d } from "./rendering-engine/canvas2dRenderer";
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
import { createWebGLRenderer, detectWebGLSupport } from "./rendering-engine/webglRenderer";

type Props = {
  activeLead?: string;
  backend?: EcgRenderBackend;
  controls: EcgViewerControls;
  digitalEcg?: DigitalEcg | null;
  gainScale?: number;
  layout?: EcgLeadLayoutMode;
  onFpsUpdate?: (fps: number) => void;
  onMetricsUpdate?: (metrics: EcgRenderMetrics) => void;
  playheadMs?: number;
  testID?: string;
};

function layoutFromMode(mode: EcgLeadLayoutMode): "12-lead" | "rhythm" | "single" {
  if (mode === "rhythm") return "rhythm";
  if (mode === "single") return "single";
  return "12-lead";
}

function WebCanvasEngine({
  backend,
  controls,
  digitalEcg,
  gainScale,
  height,
  interaction,
  layout,
  activeLead,
  onFpsUpdate,
  onMetricsUpdate,
  playheadMs,
  width,
}: {
  activeLead?: string;
  backend: EcgRenderBackend;
  controls: EcgViewerControls;
  digitalEcg: DigitalEcg;
  gainScale: number;
  height: number;
  interaction: ReturnType<typeof clearInteraction>;
  layout: "12-lead" | "rhythm" | "single";
  onFpsUpdate?: (fps: number) => void;
  onMetricsUpdate?: (metrics: EcgRenderMetrics) => void;
  playheadMs?: number;
  width: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pipelineRef = useRef(createRenderPipeline({ grid: controls.grid, viewport: defaultViewport(width, height) }));

  useEffect(() => {
    if (backend !== "canvas2d" && backend !== "webgl") return undefined;
    const canvas = canvasRef.current;
    if (!canvas || !digitalEcg) return undefined;
    let raf = 0;
    const paint = () => {
      const viewport = {
        ...defaultViewport(width, height),
        panX: controls.transform.panX,
        panY: controls.transform.panY,
        zoom: controls.transform.zoom,
      };
      const model = buildPipelineModel(digitalEcg, viewport, controls.grid, layout, activeLead, gainScale);
      const pipeline = pipelineRef.current;
      if (backend === "webgl" && detectWebGLSupport() && !pipeline.webgl) {
        pipeline.webgl = createWebGLRenderer(canvas);
      }
      const ctx = configureCanvas2d(canvas, width, height, viewport);
      if (!ctx) return;
      const beatInteraction = playheadMs != null ? { ...interaction, beatCursorMs: playheadMs } : interaction;
      drawDigitizedCanvas2d(
        ctx,
        model,
        buildTwelveLeadRegions(width, height, layout, activeLead),
        controls.grid,
        viewport,
        beatInteraction,
        width,
        height,
      );
      const metrics = tickPipelineMetrics(pipeline.metrics, backend, model, pipeline.dirty);
      onFpsUpdate?.(metrics.fps);
      onMetricsUpdate?.(metrics);
      raf = requestAnimationFrame(paint);
    };
    raf = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(raf);
  }, [
    activeLead,
    backend,
    controls.grid,
    controls.transform.panX,
    controls.transform.panY,
    controls.transform.zoom,
    digitalEcg,
    gainScale,
    height,
    interaction,
    layout,
    onFpsUpdate,
    onMetricsUpdate,
    playheadMs,
    width,
  ]);

  return React.createElement("canvas", {
    "data-testid": "sprint27-ecg-render-canvas",
    ref: canvasRef,
    style: { display: "block", height: "100%", width: "100%" },
  });
}

export const EcgRenderingEngineView = memo(function EcgRenderingEngineView({
  activeLead = "II",
  backend = "svg",
  controls,
  digitalEcg,
  gainScale = 1,
  layout = "12-lead",
  onFpsUpdate,
  onMetricsUpdate,
  playheadMs,
  testID = "sprint27-ecg-rendering-engine",
}: Props) {
  const [size, setSize] = useState({ height: 720, width: 1280 });
  const [interaction, setInteraction] = useState(clearInteraction());
  const [metricsLine, setMetricsLine] = useState("");

  const layoutMode = layoutFromMode(layout);
  const viewport = useMemo(
    () => ({
      ...defaultViewport(size.width, size.height),
      panX: controls.transform.panX,
      panY: controls.transform.panY,
      zoom: controls.transform.zoom,
    }),
    [controls.transform.panX, controls.transform.panY, controls.transform.zoom, size.height, size.width],
  );

  const model = useMemo(() => {
    if (!digitalEcg?.leads?.length) return null;
    return buildPipelineModel(digitalEcg, viewport, controls.grid, layoutMode, activeLead, gainScale);
  }, [activeLead, controls.grid, digitalEcg, gainScale, layoutMode, viewport]);

  const svgOutput = useMemo(() => {
    if (!model) return null;
    const beatInteraction = playheadMs != null ? { ...interaction, beatCursorMs: playheadMs } : interaction;
    return renderSvgPipeline(model, viewport, controls.grid, beatInteraction, layoutMode, activeLead);
  }, [activeLead, controls.grid, interaction, layoutMode, model, playheadMs, viewport]);

  const onLayout = useCallback((event: { nativeEvent: { layout: { height: number; width: number } } }) => {
    const { height, width } = event.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ height, width });
  }, []);

  const handlePointer = useCallback(
    (kind: "down" | "move" | "up", x: number, y: number) => {
      const regions = buildTwelveLeadRegions(size.width, size.height, layoutMode, activeLead);
      const lead = hitTestLead(x, y, regions);
      if (kind === "move") {
        setInteraction((prev) => updateHover(updateCrosshair(prev, x, y), lead));
      } else if (kind === "down") {
        if (lead) setInteraction((prev) => toggleLeadSelection(prev, lead));
        else setInteraction((prev) => startRubberBand(prev, x, y));
      } else if (kind === "up") {
        setInteraction((prev) => finishRubberBand(prev, regions));
      }
    },
    [activeLead, layoutMode, size.height, size.width],
  );

  useEffect(() => {
    if (!model) return;
    const pipeline = createRenderPipeline({ grid: controls.grid, viewport });
    const metrics = tickPipelineMetrics(pipeline.metrics, backend, model, new DirtyRectManager());
    setMetricsLine(formatMetricsLine(metrics));
    onFpsUpdate?.(metrics.fps);
    onMetricsUpdate?.(metrics);
  }, [backend, controls.grid, model, onFpsUpdate, onMetricsUpdate, viewport]);

  if (!digitalEcg?.leads?.length) {
    return (
      <View onLayout={onLayout} style={styles.host} testID={testID}>
        <Text style={styles.empty}>Digitized ECG required for rendering engine</Text>
      </View>
    );
  }

  const useCanvas = Platform.OS === "web" && (backend === "canvas2d" || backend === "webgl");

  return (
    <View
      onLayout={onLayout}
      style={styles.host}
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
      {useCanvas ? (
        <WebCanvasEngine
          activeLead={activeLead}
          backend={backend}
          controls={controls}
          digitalEcg={digitalEcg}
          gainScale={gainScale}
          height={size.height}
          interaction={interaction}
          layout={layoutMode}
          onFpsUpdate={onFpsUpdate}
          onMetricsUpdate={(m) => {
            setMetricsLine(formatMetricsLine(m));
            onMetricsUpdate?.(m);
          }}
          playheadMs={playheadMs}
          width={size.width}
        />
      ) : (
        <Svg height={size.height} testID="sprint27-ecg-render-svg" width={size.width}>
          {svgOutput?.gridMinor.map((d, i) => (
            <Path d={d} key={`g-min-${i}`} stroke="rgba(220,38,38,0.25)" strokeWidth={0.5} />
          ))}
          {svgOutput?.gridMajor.map((d, i) => (
            <Path d={d} key={`g-maj-${i}`} stroke="rgba(220,38,38,0.55)" strokeWidth={1} />
          ))}
          {svgOutput?.waveformPaths.map((item) => (
            <Path
              d={item.path}
              fill="none"
              key={item.lead}
              stroke={item.highlighted ? "#FACC15" : "#1D4ED8"}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={item.highlighted ? 2.2 : 1.6}
            />
          ))}
          {svgOutput?.leadLabels.map((label) => (
            <SvgText fill="#991B1B" fontSize={11} fontWeight="600" key={label.lead} x={label.x} y={label.y}>
              {label.lead}
            </SvgText>
          ))}
          {svgOutput?.crosshairLines.map((line, i) => (
            <Line
              key={`cross-${i}`}
              stroke="rgba(29,78,216,0.55)"
              strokeDasharray="4 4"
              strokeWidth={1}
              x1={line.x1}
              x2={line.x2}
              y1={line.y1}
              y2={line.y2}
            />
          ))}
          {svgOutput?.rubberBand ? (
            <Rect
              fill="rgba(29,78,216,0.08)"
              height={svgOutput.rubberBand.height}
              stroke="#1D4ED8"
              strokeDasharray="6 4"
              strokeWidth={1}
              width={svgOutput.rubberBand.width}
              x={svgOutput.rubberBand.x}
              y={svgOutput.rubberBand.y}
            />
          ) : null}
        </Svg>
      )}
      <View pointerEvents="none" style={styles.metricsBar} testID="sprint27-ecg-render-metrics">
        <Text style={styles.metricsText}>{metricsLine || "Sprint 27 Rendering Engine"}</Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  empty: { color: medicalTheme.muted, fontSize: 13, padding: 16, textAlign: "center" },
  host: { backgroundColor: "#FFFDF8", flex: 1, minHeight: 420, overflow: "hidden", position: "relative" },
  metricsBar: {
    backgroundColor: "rgba(15,23,42,0.72)",
    borderRadius: 6,
    bottom: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    position: "absolute",
  },
  metricsText: { color: "#E2E8F0", fontFamily: "monospace", fontSize: 10 },
});

export { panBy, zoomAt } from "./rendering-engine/viewport";
