import React, { createElement, useCallback, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import {
  clampLeftRailWidth,
  clampRightRailWidth,
  ECG_READING_STATION,
} from "./ecgReadingStationTokens";

/**
 * Sprint 53 Hotfix — four-region reading station layout.
 * HEADER → WORKFLOW → ECG VIEWER → STATUS BAR
 * Side rails live inside the viewer row and default hidden/collapsed.
 */
export function EcgReadingStationLayout({
  diagnosticMode = false,
  header,
  leftRail,
  leftCollapsed = true,
  leftVisible = false,
  leftWidth = ECG_READING_STATION.leftExpandedWidth,
  onLeftCollapsedChange,
  onLeftVisibleChange,
  onLeftWidthChange,
  onRightCollapsedChange,
  onRightVisibleChange,
  onRightWidthChange,
  rightCollapsed = true,
  rightRail,
  rightVisible = false,
  rightWidth = ECG_READING_STATION.rightExpandedWidth,
  statusBar,
  viewer,
  workflow,
}: {
  diagnosticMode?: boolean;
  header: ReactNode;
  leftRail: ReactNode | null;
  leftCollapsed?: boolean;
  leftVisible?: boolean;
  leftWidth?: number;
  onLeftCollapsedChange?: (collapsed: boolean) => void;
  onLeftVisibleChange?: (visible: boolean) => void;
  onLeftWidthChange?: (width: number) => void;
  onRightCollapsedChange?: (collapsed: boolean) => void;
  onRightVisibleChange?: (visible: boolean) => void;
  onRightWidthChange?: (width: number) => void;
  rightCollapsed?: boolean;
  rightRail: ReactNode | null;
  rightVisible?: boolean;
  rightWidth?: number;
  statusBar: ReactNode;
  viewer: ReactNode;
  workflow: ReactNode | null;
}) {
  const dragRef = useRef<{ edge: "left" | "right"; startX: number; startWidth: number } | null>(null);
  const safeLeftWidth = clampLeftRailWidth(leftWidth);
  const safeRightWidth = clampRightRailWidth(rightWidth);

  const startDrag = useCallback(
    (edge: "left" | "right", event: React.MouseEvent) => {
      event.preventDefault();
      dragRef.current = {
        edge,
        startX: event.clientX,
        startWidth: edge === "left" ? safeLeftWidth : safeRightWidth,
      };
      const onMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = moveEvent.clientX - dragRef.current.startX;
        const next =
          dragRef.current.edge === "left"
            ? clampLeftRailWidth(dragRef.current.startWidth + delta)
            : clampRightRailWidth(dragRef.current.startWidth - delta);
        if (dragRef.current.edge === "left") onLeftWidthChange?.(next);
        else onRightWidthChange?.(next);
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [onLeftWidthChange, onRightWidthChange, safeLeftWidth, safeRightWidth],
  );

  const showLeft = !diagnosticMode && leftVisible && leftRail;
  const showRight = !diagnosticMode && rightVisible && rightRail;
  const leftColWidth = showLeft ? (leftCollapsed ? ECG_READING_STATION.leftCollapsedWidth : safeLeftWidth) : 0;
  const rightColWidth = showRight ? (rightCollapsed ? ECG_READING_STATION.rightCollapsedWidth : safeRightWidth) : 0;

  if (Platform.OS !== "web") {
    return (
      <View style={styles.nativeRoot} testID="sprint53-reading-station">
        {!diagnosticMode ? <View style={styles.nativeHeader}>{header}</View> : null}
        {!diagnosticMode && workflow ? <View style={styles.nativeWorkflow}>{workflow}</View> : null}
        <View style={styles.nativeViewerRow}>
          {showLeft ? <View style={{ width: leftColWidth }}>{leftRail}</View> : null}
          <View style={styles.nativeViewer}>{viewer}</View>
          {showRight ? <View style={{ width: rightColWidth }}>{rightRail}</View> : null}
        </View>
        <View style={styles.nativeStatus}>{statusBar}</View>
      </View>
    );
  }

  return createElement(
    "div",
    {
      "data-testid": "sprint53-reading-station",
      "data-workspace-grid": "sprint53-workspace-grid",
      style: {
        background: "#060a0f",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateAreas: diagnosticMode
          ? `"viewer" "status"`
          : workflow
            ? `"header" "workflow" "viewer" "status"`
            : `"header" "viewer" "status"`,
        gridTemplateRows: diagnosticMode
          ? "minmax(0, 1fr) auto"
          : workflow
            ? "auto auto minmax(0, 1fr) auto"
            : "auto minmax(0, 1fr) auto",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        width: "100%",
      },
    },
    diagnosticMode
      ? null
      : createElement(
          "header",
          {
            "data-testid": "sprint53-reading-station-header",
            style: {
              gridArea: "header",
              maxHeight: ECG_READING_STATION.headerMaxHeight,
              minHeight: 0,
              overflow: "hidden",
            },
          },
          header,
        ),
    diagnosticMode || !workflow
      ? null
      : createElement(
          "section",
          {
            "data-testid": "sprint53-reading-station-workflow",
            style: {
              gridArea: "workflow",
              maxHeight: ECG_READING_STATION.workflowMaxHeight,
              minHeight: ECG_READING_STATION.workflowMinHeight,
              overflow: "hidden",
            },
          },
          workflow,
        ),
    createElement(
      "main",
      {
        "data-testid": "sprint53-reading-station-viewer",
        style: {
          display: "flex",
          flexDirection: "row",
          gridArea: "viewer",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
        },
      },
      showLeft
        ? createElement(
            "aside",
            {
              "data-testid": "sprint53-left-rail",
              style: {
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                height: "100%",
                overflow: "hidden",
                position: "relative",
                width: leftColWidth,
              },
            },
            leftRail,
            !leftCollapsed
              ? createElement("div", {
                  "data-testid": "sprint53-resize-left",
                  onMouseDown: (event: React.MouseEvent) => startDrag("left", event),
                  role: "separator",
                  style: { bottom: 0, cursor: "col-resize", position: "absolute", right: -2, top: 0, width: 4, zIndex: 5 },
                })
              : null,
          )
        : null,
      createElement(
        "div",
        {
          "data-testid": "sprint53-ecg-viewer-host",
          "data-canvas-region": "sprint53-canvas-region",
          style: {
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            overflowX: "hidden",
            overflowY: "auto",
            position: "relative",
          },
        },
        viewer,
      ),
      showRight
        ? createElement(
            "aside",
            {
              "data-testid": "sprint53-right-rail",
              style: {
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                height: "100%",
                overflow: "hidden",
                position: "relative",
                width: rightColWidth,
              },
            },
            !rightCollapsed
              ? createElement("div", {
                  "data-testid": "sprint53-resize-right",
                  onMouseDown: (event: React.MouseEvent) => startDrag("right", event),
                  role: "separator",
                  style: { bottom: 0, cursor: "col-resize", left: -2, position: "absolute", top: 0, width: 4, zIndex: 5 },
                })
              : null,
            rightRail,
          )
        : null,
    ),
    createElement(
      "footer",
      {
        "data-testid": "sprint53-reading-station-status",
        style: { gridArea: "status", minHeight: ECG_READING_STATION.statusBarHeight, overflow: "hidden" },
      },
      statusBar,
    ),
  );
}

const styles = StyleSheet.create({
  nativeHeader: { flexShrink: 0 },
  nativeRoot: { flex: 1, minHeight: 0 },
  nativeStatus: { flexShrink: 0 },
  nativeViewer: { flex: 1, minWidth: 0 },
  nativeViewerRow: { flex: 1, flexDirection: "row", minHeight: 0 },
  nativeWorkflow: { flexShrink: 0 },
});

export type ReadingStationRailState = {
  leftCollapsed: boolean;
  leftSize: number;
  leftVisible: boolean;
  rightCollapsed: boolean;
  rightSize: number;
  rightVisible: boolean;
};

export const DEFAULT_READING_STATION_RAILS: ReadingStationRailState = {
  leftCollapsed: true,
  leftSize: ECG_READING_STATION.leftExpandedWidth,
  leftVisible: false,
  rightCollapsed: true,
  rightSize: ECG_READING_STATION.rightExpandedWidth,
  rightVisible: false,
};
