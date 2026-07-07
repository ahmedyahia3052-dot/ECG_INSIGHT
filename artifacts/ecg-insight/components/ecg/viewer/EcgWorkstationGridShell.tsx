import React, { createElement, useCallback, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";

/** Sprint 29 — docking layout optimized for ≥80% center viewer with hover-expand rails. */
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
  const minSide = ECG_WORKSTATION_VISUAL.leftPanelMinWidth;
  const maxSide = ECG_WORKSTATION_VISUAL.leftPanelMaxWidth;

  const startDrag = useCallback(
    (edge: "left" | "right", event: React.MouseEvent) => {
      event.preventDefault();
      dragRef.current = {
        edge,
        startX: event.clientX,
        startWidth: edge === "left" ? leftWidth : rightWidth,
      };
      const onMove = (moveEvent: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = moveEvent.clientX - dragRef.current.startX;
        const next =
          dragRef.current.edge === "left"
            ? Math.min(maxSide, Math.max(minSide, dragRef.current.startWidth + delta))
            : Math.min(maxSide, Math.max(minSide, dragRef.current.startWidth - delta));
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
    [leftWidth, maxSide, minSide, onLeftWidthChange, onRightWidthChange, rightWidth],
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
  const leftCol = hideLeft ? "0px" : leftCollapsed ? `${ECG_WORKSTATION_VISUAL.leftCollapsedWidth}px` : `${leftWidth}px`;
  const rightCol = hideRight ? "0px" : rightCollapsed ? `${ECG_WORKSTATION_VISUAL.rightCollapsedWidth}px` : `${rightWidth}px`;

  if (Platform.OS !== "web") {
    return (
      <View style={styles.nativeColumn}>
        <View style={styles.nativeRow}>
          <View style={[styles.nativeSide, { width: leftCollapsed ? ECG_WORKSTATION_VISUAL.leftCollapsedWidth : leftWidth }]}>{left}</View>
          <View style={styles.nativeCenter}>{center}</View>
          <View style={[styles.nativeSide, { width: rightCollapsed ? ECG_WORKSTATION_VISUAL.rightCollapsedWidth : rightWidth }]}>{right}</View>
        </View>
        <View style={styles.nativeBottom}>{bottom}</View>
      </View>
    );
  }

  return createElement(
    "div",
    {
      "data-testid": "sprint29-enterprise-layout",
      nativeID: "sprint26-workstation-layout",
      style: {
        boxSizing: "border-box",
        display: "grid",
        gap,
        gridTemplateAreas: hideBottom
          ? hideLeft && hideRight
            ? `"center"`
            : `"left center right"`
          : hideLeft && hideRight
            ? `
          "center"
          "bottom"
        `
            : `
          "left center right"
          "bottom bottom bottom"
        `,
        gridTemplateColumns: hideLeft && hideRight ? "minmax(0, 1fr)" : `${leftCol} minmax(0, 1fr) ${rightCol}`,
        gridTemplateRows: hideBottom ? "minmax(0, 1fr)" : "minmax(0, 1fr) auto",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        width: "100%",
      },
    },
    hideLeft
      ? null
      : createElement(
      "div",
      {
        style: {
          display: "flex",
          gridArea: "left",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
          transition: "width 180ms ease",
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
    createElement("div", { style: { display: "flex", gridArea: "center", minHeight: 0, minWidth: 0, overflow: "hidden" } }, center),
    hideRight
      ? null
      : createElement(
      "div",
      {
        style: {
          display: "flex",
          gridArea: "right",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
          transition: "width 180ms ease",
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
    hideBottom ? null : createElement("div", { style: { gridArea: "bottom", minHeight: 0, minWidth: 0, overflow: "hidden" } }, bottom),
  );
}

const styles = StyleSheet.create({
  nativeBottom: { flexShrink: 0 },
  nativeCenter: { flex: 1, minWidth: 0 },
  nativeColumn: { flex: 1, gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0 },
  nativeRow: { flex: 1, flexDirection: "row", gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0 },
  nativeSide: { flexShrink: 0 },
});
