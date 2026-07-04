import React, { memo, useCallback, useEffect, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Rect, Text as SvgText } from "react-native-svg";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { AIExplainability } from "@/services/ai";

import {
  annotationTypeLabel,
  confidenceColor,
  confidencePercent,
  leadRegionInImage,
} from "./ecgAiOverlayEngine";
import { imageDisplayRect, imageToScreen } from "./ecgCalibrationMath";
import type { EcgAiClinicalAnnotation } from "./aiOverlayTypes";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  activeLead: string;
  containerHeight: number;
  containerWidth: number;
  controls: EcgViewerControls;
  explainability?: AIExplainability | null;
  imageHeight: number;
  imageWidth: number;
  workspace: EcgAiOverlayWorkspace;
};

function hitTest(annotation: EcgAiClinicalAnnotation, x: number, y: number, rect: ReturnType<typeof imageDisplayRect>, transform: EcgViewerControls["transform"]) {
  const start = imageToScreen({ x: annotation.coordinates.x, y: annotation.coordinates.y }, rect, transform);
  const end = imageToScreen(
    { x: annotation.coordinates.x + annotation.coordinates.width, y: annotation.coordinates.y + annotation.coordinates.height },
    rect,
    transform,
  );
  const left = Math.min(start.x, end.x);
  const right = Math.max(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const bottom = Math.max(start.y, end.y);
  return x >= left && x <= right && y >= top && y <= bottom;
}

const AnnotationGraphic = memo(function AnnotationGraphic({
  annotation,
  controls,
  fontScale,
  opacity,
  rect,
  selected,
  showConfidence,
  showLabels,
  theme,
}: {
  annotation: EcgAiClinicalAnnotation;
  controls: EcgViewerControls;
  fontScale: number;
  opacity: number;
  rect: ReturnType<typeof imageDisplayRect>;
  selected: boolean;
  showConfidence: boolean;
  showLabels: boolean;
  theme: "clinical" | "dark" | "light";
}) {
  const start = imageToScreen({ x: annotation.coordinates.x, y: annotation.coordinates.y }, rect, controls.transform);
  const end = imageToScreen(
    { x: annotation.coordinates.x + annotation.coordinates.width, y: annotation.coordinates.y + annotation.coordinates.height },
    rect,
    controls.transform,
  );
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  const stroke = confidenceColor(confidencePercent(annotation.confidence));
  const labelColor = theme === "dark" ? "#F8FAFC" : medicalTheme.text;
  const label = annotationTypeLabel(annotation.type);
  const confidence = confidencePercent(annotation.confidence);

  return (
    <React.Fragment>
      <Rect
        fill={`${stroke}${Math.round(opacity * 0.18 * 255).toString(16).padStart(2, "0")}`}
        height={height}
        rx={8}
        stroke={stroke}
        strokeDasharray={annotation.locked ? "5,4" : undefined}
        strokeWidth={selected ? 2.8 : 2}
        width={width}
        x={left}
        y={top}
      />
      <Line stroke={stroke} strokeWidth={1.4} x1={left + width / 2} x2={left + width / 2 + 42} y1={top} y2={top - 24} />
      {showLabels ? (
        <SvgText
          fill={labelColor}
          fontSize={11 * fontScale}
          fontWeight="700"
          stroke={theme === "dark" ? "#06111F" : medicalTheme.background}
          strokeWidth={0.4}
          x={left + width / 2 + 46}
          y={Math.max(14, top - 26)}
        >
          {`${annotation.lead}: ${label}`}
        </SvgText>
      ) : null}
      {showConfidence ? (
        <SvgText fill={stroke} fontSize={10 * fontScale} fontWeight="700" x={left + 6} y={top + height + 14 * fontScale}>
          {`${confidence}%${annotation.units && annotation.measurement ? ` · ${annotation.measurement} ${annotation.units}` : ""}`}
        </SvgText>
      ) : null}
      {selected ? <Circle cx={left + width - 6} cy={top + 6} fill="#FFFFFF" r={5} stroke={stroke} strokeWidth={2} /> : null}
    </React.Fragment>
  );
});

export const EcgAiClinicalOverlay = memo(function EcgAiClinicalOverlay({
  activeLead,
  containerHeight,
  containerWidth,
  controls,
  explainability,
  imageHeight,
  imageWidth,
  workspace,
}: Props) {
  const rect = useMemo(
    () => imageDisplayRect(containerWidth, containerHeight, imageWidth, imageHeight),
    [containerHeight, containerWidth, imageHeight, imageWidth],
  );
  const settings = workspace.present.settings;
  const interactive = settings.enabled && !controls.isPanActive;

  const heatmapPoints = useMemo(() => {
    if (!settings.showHeatmap || !explainability?.heatmap?.points?.length || !imageWidth || !imageHeight) return [];
    const filtered =
      activeLead === "ALL" || activeLead === "Rhythm Strip"
        ? explainability.heatmap.points
        : explainability.heatmap.points.filter((point) => point.lead === activeLead || (activeLead === "Rhythm Strip" && point.lead === "II"));
    return filtered.map((point) => {
      const region = leadRegionInImage(point.lead, imageWidth, imageHeight);
      const center = imageToScreen({ x: region.x + region.width / 2, y: region.y + region.height / 2 }, rect, controls.transform);
      return { ...point, cx: center.x, cy: center.y, r: Math.max(10, point.intensity * 28) };
    });
  }, [activeLead, controls.transform, explainability?.heatmap?.points, imageHeight, imageWidth, rect, settings.showHeatmap]);

  const handlePress = useCallback(
    (x: number, y: number, multi: boolean) => {
      if (!interactive) return;
      for (let index = workspace.visibleAnnotations.length - 1; index >= 0; index -= 1) {
        const annotation = workspace.visibleAnnotations[index]!;
        if (hitTest(annotation, x, y, rect, controls.transform)) {
          workspace.selectAnnotation(annotation.id, multi);
          return;
        }
      }
      workspace.clearSelection();
    },
    [controls.transform, interactive, rect, workspace],
  );

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !interactive) return undefined;
    const node = document.querySelector('[data-testid="sprint14-ecg-ai-clinical-overlay"]');
    if (!node) return undefined;
    const toLocal = (event: MouseEvent) => {
      const bounds = node.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    const onClick = (event: MouseEvent) => {
      const point = toLocal(event);
      handlePress(point.x, point.y, event.shiftKey);
    };
    node.addEventListener("click", onClick as EventListener);
    return () => node.removeEventListener("click", onClick as EventListener);
  }, [handlePress, interactive]);

  if (!settings.enabled || containerWidth <= 0 || containerHeight <= 0) return null;

  return (
    <View
      accessibilityLabel="AI clinical overlay"
      pointerEvents={interactive ? "box-none" : "none"}
      style={StyleSheet.absoluteFill}
      testID="sprint14-ecg-ai-clinical-overlay"
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="sprint14-ecg-ai-overlay-layer">
        <Svg height="100%" pointerEvents="none" width="100%">
          {heatmapPoints.map((point, index) => (
            <Circle
              key={`${point.lead}-${index}`}
              cx={point.cx}
              cy={point.cy}
              fill={`rgba(244,63,94,${Math.min(0.34, point.intensity * 0.28 * settings.opacity)})`}
              r={point.r}
            />
          ))}
          {settings.showAnnotations
            ? workspace.visibleAnnotations.map((annotation) => (
                <AnnotationGraphic
                  key={annotation.id}
                  annotation={annotation}
                  controls={controls}
                  fontScale={settings.fontScale}
                  opacity={settings.opacity}
                  rect={rect}
                  selected={workspace.present.selectedAnnotationIds.includes(annotation.id)}
                  showConfidence={settings.showConfidence}
                  showLabels={settings.showLabels}
                  theme={settings.theme}
                />
              ))
            : null}
        </Svg>
      </View>
    </View>
  );
});
