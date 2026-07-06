import React, { createElement, useCallback, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";

const MIN_SIDE = 180;
const MAX_SIDE = 360;

/** Sprint 26 — docking layout optimized for ≥80% center viewer area. */
export function EcgWorkstationGridShell({
  bottom,
  center,
  left,
  leftCollapsed,
  leftWidth = ECG_WORKSTATION_VISUAL.leftExpandedWidth,
  onLeftWidthChange,
  onRightWidthChange,
  right,
  rightCollapsed,
  rightWidth = ECG_WORKSTATION_VISUAL.rightExpandedWidth,
}: {
  bottom: ReactNode;
  center: ReactNode;
  left: ReactNode;
  leftCollapsed: boolean;
  leftWidth?: number;
  onLeftWidthChange?: (width: number) => void;
  onRightWidthChange?: (width: number) => void;
  right: ReactNode;
  rightCollapsed: boolean;
  rightWidth?: number;
}) {
  const dragRef = useRef<{ edge: "left" | "right"; startX: number; startWidth: number } | null>(null);

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
            ? Math.min(MAX_SIDE, Math.max(MIN_SIDE, dragRef.current.startWidth + delta))
            : Math.min(MAX_SIDE, Math.max(MIN_SIDE, dragRef.current.startWidth - delta));
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
    [leftWidth, onLeftWidthChange, onRightWidthChange, rightWidth],
  );

  const gap = ECG_WORKSTATION_VISUAL.workspaceGap;
  const leftCol = leftCollapsed ? `${ECG_WORKSTATION_VISUAL.leftCollapsedWidth}px` : `${leftWidth}px`;
  const rightCol = rightCollapsed ? "0px" : `${rightWidth}px`;

  if (Platform.OS !== "web") {
    return (
      <View style={styles.nativeColumn}>
        <View style={styles.nativeRow}>
          <View style={[styles.nativeSide, { width: leftCollapsed ? ECG_WORKSTATION_VISUAL.leftCollapsedWidth : leftWidth }]}>{left}</View>
          <View style={styles.nativeCenter}>{center}</View>
          {!rightCollapsed ? <View style={[styles.nativeSide, { width: rightWidth }]}>{right}</View> : null}
        </View>
        <View style={styles.nativeBottom}>{bottom}</View>
      </View>
    );
  }

  return createElement(
    "div",
    {
      "data-testid": "sprint26-workstation-layout",
      nativeID: "sprint25-workstation-dock",
      style: {
        boxSizing: "border-box",
        display: "grid",
        gap,
        gridTemplateAreas: `
          "left center right"
          "bottom bottom bottom"
        `,
        gridTemplateColumns: `${leftCol} minmax(0, 1fr) ${rightCol}`,
        gridTemplateRows: "minmax(0, 1fr) auto",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        width: "100%",
      },
    },
    createElement(
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
            "data-testid": "sprint26-resize-left",
            onMouseDown: (event: React.MouseEvent) => startDrag("left", event),
            role: "separator",
            style: { bottom: 0, cursor: "col-resize", position: "absolute", right: -2, top: 0, width: 4, zIndex: 20 },
          })
        : null,
    ),
    createElement("div", { style: { display: "flex", gridArea: "center", minHeight: 0, minWidth: 0, overflow: "hidden" } }, center),
    createElement(
      "div",
      {
        style: {
          display: rightCollapsed ? "none" : "flex",
          gridArea: "right",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
        },
      },
      !rightCollapsed
        ? createElement("div", {
            "data-testid": "sprint26-resize-right",
            onMouseDown: (event: React.MouseEvent) => startDrag("right", event),
            role: "separator",
            style: { bottom: 0, cursor: "col-resize", left: -2, position: "absolute", top: 0, width: 4, zIndex: 20 },
          })
        : null,
      right,
    ),
    createElement("div", { style: { gridArea: "bottom", minHeight: 0, minWidth: 0, overflow: "hidden" } }, bottom),
  );
}

const styles = StyleSheet.create({
  nativeBottom: { flexShrink: 0 },
  nativeCenter: { flex: 1, minWidth: 0 },
  nativeColumn: { flex: 1, gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0 },
  nativeRow: { flex: 1, flexDirection: "row", gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0 },
  nativeSide: { flexShrink: 0 },
});
