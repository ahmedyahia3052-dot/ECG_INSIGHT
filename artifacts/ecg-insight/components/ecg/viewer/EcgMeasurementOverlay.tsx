import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { imageDisplayRect, imageToScreen, screenToImage, snapPoint } from "./ecgCalibrationMath";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import { summarizeCaliper } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";
import type { EcgViewerAnnotation, EcgCaliper, ImagePoint } from "./measurementTypes";

type Props = {
  containerHeight: number;
  containerWidth: number;
  controls: EcgViewerControls;
  imageHeight: number;
  imageWidth: number;
  workspace: EcgMeasurementWorkspace;
};

function caliperPath(caliper: EcgCaliper, rect: ReturnType<typeof imageDisplayRect>, transform: EcgViewerControls["transform"]) {
  const start = imageToScreen(caliper.start, rect, transform);
  const end = imageToScreen(caliper.end, rect, transform);
  return { end, start };
}

export function EcgMeasurementOverlay({ containerHeight, containerWidth, controls, imageHeight, imageWidth, workspace }: Props) {
  const rect = useMemo(
    () => imageDisplayRect(containerWidth, containerHeight, imageWidth, imageHeight),
    [containerHeight, containerWidth, imageHeight, imageWidth],
  );
  const spacing = 14;

  const handlePointer = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    const point = screenToImage({ x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }, rect, controls.transform);
    return point;
  };

  const onPressCanvas = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    const point = handlePointer(event);
    if (workspace.present.toolMode === "caliper") {
      workspace.addCaliper(workspace.activeCaliperKind.current, point);
      return;
    }
    if (workspace.present.toolMode === "annotation") {
      workspace.addAnnotation(workspace.activeAnnotationKind.current, [point], workspace.activeAnnotationKind.current === "text" ? "Note" : undefined);
    }
  };

  const visibleCalipers = workspace.present.calipers.filter((item) => !item.hidden);
  const visibleAnnotations = workspace.present.annotations.filter((item) => !item.hidden);

  return (
    <Pressable
      accessibilityLabel="ECG measurement overlay"
      onPress={onPressCanvas}
      pointerEvents={workspace.present.toolMode === "pan" || controls.spacePanActive ? "none" : "auto"}
      style={StyleSheet.absoluteFill}
      testID="sprint13-ecg-measurement-overlay"
    >
      <Svg height="100%" width="100%">
        {visibleCalipers.map((caliper) => {
          const { end, start } = caliperPath(caliper, rect, controls.transform);
          const selected = workspace.present.selectedCaliperId === caliper.id;
          const summary = summarizeCaliper(caliper, controls);
          return (
            <React.Fragment key={caliper.id}>
              <Line
                stroke={selected ? "#2563EB" : "#0EA5E9"}
                strokeDasharray={caliper.locked ? "4,4" : undefined}
                strokeWidth={selected ? 2.5 : 2}
                x1={start.x}
                x2={end.x}
                y1={start.y}
                y2={end.y}
              />
              <Circle cx={start.x} cy={start.y} fill="#38BDF8" r={5} />
              <Circle cx={end.x} cy={end.y} fill="#0284C7" r={5} />
              <SvgText fill={medicalTheme.text} fontSize={11} fontWeight="700" x={(start.x + end.x) / 2} y={Math.min(start.y, end.y) - 6}>
                {`${summary.primary.value} ${summary.primary.unit}`}
              </SvgText>
            </React.Fragment>
          );
        })}
        {visibleAnnotations.map((annotation) => renderAnnotation(annotation, rect, controls.transform))}
      </Svg>
    </Pressable>
  );
}

function renderAnnotation(
  annotation: EcgViewerAnnotation,
  rect: ReturnType<typeof imageDisplayRect>,
  transform: EcgViewerControls["transform"],
) {
  const points = annotation.points.map((point) => imageToScreen(point, rect, transform));
  const color = annotation.color;
  const opacity = annotation.opacity;
  const strokeWidth = annotation.thickness;
  if (annotation.kind === "circle" && points[0]) {
    const radius = points[1] ? Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) : 24;
    return <Circle key={annotation.id} cx={points[0].x} cy={points[0].y} fill="none" opacity={opacity} r={radius} stroke={color} strokeWidth={strokeWidth} />;
  }
  if (annotation.kind === "rectangle" && points[0] && points[1]) {
    return (
      <Rect
        key={annotation.id}
        fill="none"
        height={Math.abs(points[1].y - points[0].y)}
        opacity={opacity}
        stroke={color}
        strokeWidth={strokeWidth}
        width={Math.abs(points[1].x - points[0].x)}
        x={Math.min(points[0].x, points[1].x)}
        y={Math.min(points[0].y, points[1].y)}
      />
    );
  }
  if (annotation.kind === "highlighter" && points[0] && points[1]) {
    return (
      <Rect
        key={annotation.id}
        fill={color}
        height={Math.abs(points[1].y - points[0].y)}
        opacity={opacity}
        stroke={color}
        strokeWidth={strokeWidth}
        width={Math.abs(points[1].x - points[0].x)}
        x={Math.min(points[0].x, points[1].x)}
        y={Math.min(points[0].y, points[1].y)}
      />
    );
  }
  if (annotation.kind === "ellipse" && points[0] && points[1]) {
    return (
      <Ellipse
        key={annotation.id}
        cx={(points[0].x + points[1].x) / 2}
        cy={(points[0].y + points[1].y) / 2}
        fill="none"
        opacity={opacity}
        rx={Math.abs(points[1].x - points[0].x) / 2}
        ry={Math.abs(points[1].y - points[0].y) / 2}
        stroke={color}
        strokeWidth={strokeWidth}
      />
    );
  }
  if ((annotation.kind === "freehand" || annotation.kind === "highlighter") && points.length > 1) {
    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
    return <Path key={annotation.id} d={path} fill="none" opacity={opacity} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} />;
  }
  if (annotation.kind === "arrow" && points[0] && points[1]) {
    return (
      <React.Fragment key={annotation.id}>
        <Line opacity={opacity} stroke={color} strokeWidth={strokeWidth} x1={points[0].x} x2={points[1].x} y1={points[0].y} y2={points[1].y} />
        <Circle cx={points[1].x} cy={points[1].y} fill={color} opacity={opacity} r={4} />
      </React.Fragment>
    );
  }
  if ((annotation.kind === "text" || annotation.kind === "number" || annotation.kind === "medical") && points[0]) {
    return (
      <SvgText key={annotation.id} fill={color} fontSize={13} fontWeight="700" opacity={opacity} x={points[0].x} y={points[0].y}>
        {annotation.text ?? (annotation.kind === "medical" ? "⚕" : annotation.kind === "number" ? "1" : "Text")}
      </SvgText>
    );
  }
  return null;
}

export function dragCaliperEndpoint(
  caliper: EcgCaliper,
  endpoint: "start" | "end",
  imagePoint: ImagePoint,
  spacing: number,
) {
  const snapped = caliper.snapToGrid ? snapPoint(imagePoint, spacing) : imagePoint;
  if (endpoint === "start") {
    if (caliper.kind === "horizontal") return { ...caliper, start: { x: snapped.x, y: caliper.start.y } };
    if (caliper.kind === "vertical") return { ...caliper, start: { x: caliper.start.x, y: snapped.y } };
    return { ...caliper, start: snapped };
  }
  if (caliper.kind === "horizontal") return { ...caliper, end: { x: snapped.x, y: caliper.start.y } };
  if (caliper.kind === "vertical") return { ...caliper, end: { x: caliper.start.x, y: snapped.y } };
  return { ...caliper, end: snapped };
}
