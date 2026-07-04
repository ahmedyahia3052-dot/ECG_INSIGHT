import React, { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { PanResponder, Platform, StyleSheet, View } from "react-native";
import Svg, { Circle, Ellipse, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { resolveLatestRrMs } from "./ecgMeasurementEngine";
import { gridSpacingPx, imageDisplayRect, imageToScreen, screenToImage } from "./ecgCalibrationMath";
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

type DragState =
  | { caliperId: string; endpoint: "start" | "end"; mode: "endpoint" }
  | { mode: "create" }
  | null;

const HANDLE_RADIUS = 7;
const HIT_RADIUS = 12;

function caliperScreenPoints(caliper: EcgCaliper, rect: ReturnType<typeof imageDisplayRect>, transform: EcgViewerControls["transform"]) {
  return {
    end: imageToScreen(caliper.end, rect, transform),
    start: imageToScreen(caliper.start, rect, transform),
  };
}

function distance(a: ImagePoint, b: ImagePoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function CaliperGraphic({
  caliper,
  controls,
  rect,
  rrMs,
  selected,
  hovered,
}: {
  caliper: EcgCaliper;
  controls: EcgViewerControls;
  hovered: boolean;
  rect: ReturnType<typeof imageDisplayRect>;
  rrMs?: number;
  selected: boolean;
}) {
  const { end, start } = caliperScreenPoints(caliper, rect, controls.transform);
  const summary = summarizeCaliper(caliper, controls, rrMs);
  const stroke = caliper.color ?? "#2563EB";
  const strokeWidth = selected ? 2.5 : hovered ? 2.25 : 2;
  const label = caliper.label ?? summary.primary.value;
  return (
    <React.Fragment>
      <Line
        stroke={stroke}
        strokeDasharray={caliper.locked ? "5,4" : undefined}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        x1={start.x}
        x2={end.x}
        y1={start.y}
        y2={end.y}
      />
      <Circle cx={start.x} cy={start.y} fill={selected ? "#FFFFFF" : stroke} r={HANDLE_RADIUS} stroke={stroke} strokeWidth={2} />
      <Circle cx={end.x} cy={end.y} fill={selected ? "#FFFFFF" : stroke} r={HANDLE_RADIUS} stroke={stroke} strokeWidth={2} />
      <SvgText
        fill={medicalTheme.text}
        fontSize={11}
        fontWeight="700"
        stroke={medicalTheme.background}
        strokeWidth={0.5}
        x={(start.x + end.x) / 2}
        y={Math.min(start.y, end.y) - 8}
      >
        {`${label}: ${summary.primary.value} ${summary.primary.unit}`}
      </SvgText>
    </React.Fragment>
  );
}

export const EcgMeasurementOverlay = memo(function EcgMeasurementOverlay({
  containerHeight,
  containerWidth,
  controls,
  imageHeight,
  imageWidth,
  workspace,
}: Props) {
  const rect = useMemo(
    () => imageDisplayRect(containerWidth, containerHeight, imageWidth, imageHeight),
    [containerHeight, containerWidth, imageHeight, imageWidth],
  );
  const dragRef = useRef<DragState>(null);
  const clickAnchorRef = useRef<ImagePoint | null>(null);
  const spacing = gridSpacingPx(controls.grid.speed, controls.grid.gain);
  const rrMs = resolveLatestRrMs(workspace.present.calipers, spacing, controls.grid.speed);

  const screenPoint = useCallback(
    (locationX: number, locationY: number) => screenToImage({ x: locationX, y: locationY }, rect, controls.transform),
    [controls.transform, rect],
  );

  const hitTestEndpoint = useCallback(
    (x: number, y: number) => {
      for (const caliper of workspace.present.calipers) {
        if (caliper.hidden || caliper.locked) continue;
        const points = caliperScreenPoints(caliper, rect, controls.transform);
        if (distance({ x, y }, points.start) <= HIT_RADIUS) return { caliperId: caliper.id, endpoint: "start" as const };
        if (distance({ x, y }, points.end) <= HIT_RADIUS) return { caliperId: caliper.id, endpoint: "end" as const };
      }
      return null;
    },
    [controls.transform, rect, workspace.present.calipers],
  );

  const onPointerDown = useCallback(
    (locationX: number, locationY: number) => {
      if (controls.isPanActive || workspace.present.toolMode === "pan") return;
      const hit = hitTestEndpoint(locationX, locationY);
      if (hit) {
        dragRef.current = { caliperId: hit.caliperId, endpoint: hit.endpoint, mode: "endpoint" };
        workspace.updateSlice((slice) => ({ ...slice, selectedCaliperId: hit.caliperId }));
        workspace.setHoveredCaliperId(hit.caliperId);
      }
    },
    [controls.isPanActive, hitTestEndpoint, workspace],
  );

  const onPointerMove = useCallback(
    (locationX: number, locationY: number) => {
      const drag = dragRef.current;
      if (!drag) {
        const hit = hitTestEndpoint(locationX, locationY);
        workspace.setHoveredCaliperId(hit?.caliperId ?? null);
        return;
      }
      const imagePoint = screenPoint(locationX, locationY);
      if (drag.mode === "endpoint") {
        workspace.dragCaliper(drag.caliperId, drag.endpoint, imagePoint);
        return;
      }
      workspace.updateDraftCaliper(imagePoint);
    },
    [hitTestEndpoint, screenPoint, workspace],
  );

  const handlePress = useCallback(
    (locationX: number, locationY: number) => {
      if (controls.isPanActive || workspace.present.toolMode === "pan") return;
      if (workspace.present.toolMode !== "caliper" && workspace.present.toolMode !== "measurement") return;
      const point = screenPoint(locationX, locationY);
      if (!clickAnchorRef.current) {
        clickAnchorRef.current = point;
        workspace.beginDraftCaliper(point);
        return;
      }
      workspace.updateDraftCaliper(point);
      workspace.commitDraftCaliper();
      clickAnchorRef.current = null;
    },
    [controls.isPanActive, screenPoint, workspace],
  );

  const onPointerUp = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.mode === "create") {
      workspace.commitDraftCaliper();
      clickAnchorRef.current = null;
    }
  }, [workspace]);

  const visibleCalipers = workspace.present.calipers.filter((item) => !item.hidden);
  const visibleAnnotations = workspace.present.annotations.filter((item) => !item.hidden);
  const interactive = !controls.isPanActive && workspace.present.toolMode !== "pan";

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: () => interactive,
        onPanResponderGrant: (event) => onPointerDown(event.nativeEvent.locationX, event.nativeEvent.locationY),
        onPanResponderMove: (event) => onPointerMove(event.nativeEvent.locationX, event.nativeEvent.locationY),
        onPanResponderRelease: onPointerUp,
        onPanResponderTerminate: onPointerUp,
        onStartShouldSetPanResponder: () => interactive,
      }),
    [interactive, onPointerDown, onPointerMove, onPointerUp],
  );

  const draft = workspace.draftCaliper;
  const draftGraphic = draft
    ? (() => {
        const start = imageToScreen(draft.start, rect, controls.transform);
        const end = imageToScreen(draft.end, rect, controls.transform);
        const color = workspace.activePreset.current.color;
        return (
          <Line
            stroke={color}
            strokeDasharray="6,4"
            strokeLinecap="round"
            strokeWidth={2}
            x1={start.x}
            x2={end.x}
            y1={start.y}
            y2={end.y}
          />
        );
      })()
    : null;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return undefined;
    const node = document.querySelector('[data-testid="sprint13-ecg-measurement-overlay"]');
    if (!node) return undefined;
    const toLocal = (event: MouseEvent) => {
      const bounds = node.getBoundingClientRect();
      return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    };
    const onMouseDown = (event: MouseEvent) => {
      if (!interactive) return;
      const point = toLocal(event);
      onPointerDown(point.x, point.y);
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!dragRef.current) return;
      const point = toLocal(event);
      onPointerMove(point.x, point.y);
    };
    const onMouseUp = () => {
      onPointerUp();
    };
    const onClick = (event: MouseEvent) => {
      if (dragRef.current) return;
      const point = toLocal(event);
      handlePress(point.x, point.y);
    };
    node.addEventListener("mousedown", onMouseDown as EventListener);
    node.addEventListener("click", onClick as EventListener);
    window.addEventListener("mousemove", onMouseMove as EventListener);
    window.addEventListener("mouseup", onMouseUp as EventListener);
    return () => {
      node.removeEventListener("mousedown", onMouseDown as EventListener);
      node.removeEventListener("click", onClick as EventListener);
      window.removeEventListener("mousemove", onMouseMove as EventListener);
      window.removeEventListener("mouseup", onMouseUp as EventListener);
    };
  }, [handlePress, interactive, onPointerDown, onPointerMove, onPointerUp]);

  return (
    <View
      {...panResponder.panHandlers}
      accessibilityLabel="ECG measurement overlay"
      pointerEvents={interactive ? "auto" : "none"}
      style={StyleSheet.absoluteFill}
      testID="sprint13-ecg-measurement-overlay"
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="sprint14-ecg-measurement-overlay">
      <Svg height="100%" pointerEvents="none" width="100%">
        {visibleCalipers.map((caliper) => (
          <CaliperGraphic
            key={caliper.id}
            caliper={caliper}
            controls={controls}
            hovered={workspace.hoveredCaliperId === caliper.id}
            rect={rect}
            rrMs={rrMs}
            selected={workspace.present.selectedCaliperId === caliper.id}
          />
        ))}
        {draftGraphic}
        {visibleAnnotations.map((annotation) => renderAnnotation(annotation, rect, controls.transform))}
      </Svg>
      </View>
    </View>
  );
});

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
