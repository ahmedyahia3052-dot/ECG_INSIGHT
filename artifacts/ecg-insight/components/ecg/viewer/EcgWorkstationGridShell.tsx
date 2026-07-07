import React, { createElement, useCallback, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { clampLeftPanelWidth, clampRightPanelWidth, ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";

/** Sprint 53 — CSS Grid workstation: independent sidebar + canvas regions (no overlap). */
export function EcgWorkstationGridShell({
  bottom,
  center,
  diagnosticMode = false,
  left,
  leftCollapsed,
  leftWidth = ECG_WORKSTATION_VISUAL.leftExpandedWidth,
  onLeftWidthChange,
  onRightWidthChange,
  right,
  rightCollapsed,
  rightWidth = ECG_WORKSTATION_VISUAL.rightExpandedWidth,
}: {
  bottom: ReactNode | null;
  center: ReactNode;
  diagnosticMode?: boolean;
  left: ReactNode | null;
  leftCollapsed: boolean;
  leftWidth?: number;
  onLeftWidthChange?: (width: number) => void;
  onRightWidthChange?: (width: number) => void;
  right: ReactNode | null;
  rightCollapsed: boolean;
  rightWidth?: number;
}) {
  const dragRef = useRef<{ edge: "left" | "right"; startX: number; startWidth: number } | null>(null);
  const leftMin = ECG_WORKSTATION_VISUAL.leftPanelMinWidth;
  const leftMax = ECG_WORKSTATION_VISUAL.leftPanelMaxWidth;
  const rightMin = ECG_WORKSTATION_VISUAL.rightPanelMinWidth;
  const rightMax = ECG_WORKSTATION_VISUAL.rightPanelMaxWidth;
  const safeLeftWidth = clampLeftPanelWidth(leftWidth);
  const safeRightWidth = clampRightPanelWidth(rightWidth);

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
            ? clampLeftPanelWidth(dragRef.current.startWidth + delta)
            : clampRightPanelWidth(dragRef.current.startWidth - delta);
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

  const resetWidth = useCallback(
    (edge: "left" | "right") => {
      if (edge === "left") onLeftWidthChange?.(ECG_WORKSTATION_VISUAL.leftExpandedWidth);
      else onRightWidthChange?.(ECG_WORKSTATION_VISUAL.rightExpandedWidth);
    },
    [onLeftWidthChange, onRightWidthChange],
  );

  const gap = ECG_WORKSTATION_VISUAL.workspaceGap;
  const hideLeft = diagnosticMode || !left;
  const hideRight = diagnosticMode || !right;
  const hideBottom = !bottom;

  const leftCol = hideLeft
    ? "0px"
    : leftCollapsed
      ? `${ECG_WORKSTATION_VISUAL.leftCollapsedWidth}px`
      : `minmax(${leftMin}px, ${safeLeftWidth}px)`;

  const rightCol = hideRight
    ? "0px"
    : rightCollapsed
      ? `${ECG_WORKSTATION_VISUAL.rightCollapsedWidth}px`
      : `minmax(${rightMin}px, ${safeRightWidth}px)`;

  if (Platform.OS !== "web") {
    return (
      <View style={styles.nativeColumn}>
        <View style={styles.nativeRow}>
          <View
            style={[
              styles.nativeSide,
              {
                minWidth: leftCollapsed ? ECG_WORKSTATION_VISUAL.leftCollapsedWidth : leftMin,
                width: leftCollapsed ? ECG_WORKSTATION_VISUAL.leftCollapsedWidth : safeLeftWidth,
              },
            ]}
          >
            {left}
          </View>
          <View style={styles.nativeCenter}>{center}</View>
          <View
            style={[
              styles.nativeSide,
              {
                minWidth: rightCollapsed ? ECG_WORKSTATION_VISUAL.rightCollapsedWidth : rightMin,
                width: rightCollapsed ? ECG_WORKSTATION_VISUAL.rightCollapsedWidth : safeRightWidth,
              },
            ]}
          >
            {right}
          </View>
        </View>
        <View style={styles.nativeBottom}>{bottom}</View>
      </View>
    );
  }

  return createElement(
    "div",
    {
      "data-testid": "sprint53-workspace-grid",
      id: "sprint29-enterprise-layout",
      style: {
        boxSizing: "border-box",
        display: "grid",
        gap,
        gridTemplateAreas: hideBottom
          ? hideLeft && hideRight
            ? `"canvas"`
            : `"sidebar canvas panel"`
          : hideLeft && hideRight
            ? `
          "canvas"
          "status"
        `
            : `
          "sidebar canvas panel"
          "status status status"
        `,
        gridTemplateColumns:
          hideLeft && hideRight ? "minmax(0, 1fr)" : `${leftCol} minmax(0, 1fr) ${rightCol}`,
        gridTemplateRows: hideBottom ? "minmax(0, 1fr)" : "minmax(0, 1fr) auto",
        height: "100%",
        isolation: "isolate",
        minHeight: 0,
        overflow: "hidden",
        width: "100%",
      },
    },
    hideLeft
      ? null
      : createElement(
          "aside",
          {
            "data-testid": "sprint53-left-sidebar-region",
            style: {
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              gridArea: "sidebar",
              minHeight: 0,
              minWidth: leftCollapsed ? ECG_WORKSTATION_VISUAL.leftCollapsedWidth : leftMin,
              overflow: "hidden",
              position: "relative",
              width: "100%",
            },
          },
          left,
          !leftCollapsed
            ? createElement("div", {
                "data-testid": "sprint29-resize-left",
                onDoubleClick: () => resetWidth("left"),
                onMouseDown: (event: React.MouseEvent) => startDrag("left", event),
                role: "separator",
                style: { bottom: 0, cursor: "col-resize", position: "absolute", right: -2, top: 0, width: 4, zIndex: 20 },
              })
            : null,
        ),
    createElement(
      "main",
      {
        "data-testid": "sprint53-canvas-region",
        style: {
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gridArea: hideLeft && hideRight ? "canvas" : "canvas",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
        },
      },
      center,
    ),
    hideRight
      ? null
      : createElement(
          "aside",
          {
            "data-testid": "sprint53-right-sidebar-region",
            style: {
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              flexShrink: 0,
              gridArea: "panel",
              minHeight: 0,
              minWidth: rightCollapsed ? ECG_WORKSTATION_VISUAL.rightCollapsedWidth : rightMin,
              overflow: "hidden",
              position: "relative",
              width: "100%",
            },
          },
          !rightCollapsed
            ? createElement("div", {
                "data-testid": "sprint29-resize-right",
                onDoubleClick: () => resetWidth("right"),
                onMouseDown: (event: React.MouseEvent) => startDrag("right", event),
                role: "separator",
                style: { bottom: 0, cursor: "col-resize", left: -2, position: "absolute", top: 0, width: 4, zIndex: 20 },
              })
            : null,
          right,
        ),
    hideBottom
      ? null
      : createElement(
          "footer",
          {
            "data-testid": "sprint53-status-region",
            style: { gridArea: "status", minHeight: 0, minWidth: 0, overflow: "hidden" },
          },
          bottom,
        ),
  );
}

const styles = StyleSheet.create({
  nativeBottom: { flexShrink: 0 },
  nativeCenter: { flex: 1, minWidth: 0 },
  nativeColumn: { flex: 1, gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0 },
  nativeRow: { flex: 1, flexDirection: "row", gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0 },
  nativeSide: { flexShrink: 0 },
});
