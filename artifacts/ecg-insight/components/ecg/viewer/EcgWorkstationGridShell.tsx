import React, { createElement, useCallback, useRef, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

const DEFAULT_LEFT = 260;
const DEFAULT_RIGHT = 280;
const MIN_SIDE = 180;
const MAX_SIDE = 480;

/** Sprint 25 — docking layout shell with drag-resize and ~70% center priority. */
export function EcgWorkstationGridShell({
  bottom,
  center,
  left,
  leftCollapsed,
  leftWidth = DEFAULT_LEFT,
  onLeftWidthChange,
  onRightWidthChange,
  right,
  rightCollapsed,
  rightWidth = DEFAULT_RIGHT,
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

  if (Platform.OS !== "web") {
    return (
      <View style={styles.nativeColumn}>
        <View style={styles.nativeRow}>
          {!leftCollapsed ? <View style={[styles.nativeSide, { width: leftWidth }]}>{left}</View> : null}
          <View style={styles.nativeCenter}>{center}</View>
          {!rightCollapsed ? <View style={[styles.nativeSide, { width: rightWidth }]}>{right}</View> : null}
        </View>
        <View style={styles.nativeBottom}>{bottom}</View>
      </View>
    );
  }

  const leftCol = leftCollapsed ? "0px" : `${leftWidth}px`;
  const rightCol = rightCollapsed ? "0px" : `${rightWidth}px`;
  const centerCol = "minmax(0, 1fr)";

  return createElement(
    "div",
    {
      "data-testid": "sprint25-workstation-dock",
      nativeID: "sprint24-workstation-grid",
      style: {
        boxSizing: "border-box",
        display: "grid",
        gap: 6,
        gridTemplateAreas: `
          "left center right"
          "bottom bottom bottom"
        `,
        gridTemplateColumns: `${leftCol} ${centerCol} ${rightCol}`,
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
          display: leftCollapsed ? "none" : "flex",
          gridArea: "left",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          position: "relative",
        },
      },
      left,
      !leftCollapsed
        ? createElement("div", {
            "data-testid": "sprint25-resize-left",
            onMouseDown: (event: React.MouseEvent) => startDrag("left", event),
            role: "separator",
            style: {
              bottom: 0,
              cursor: "col-resize",
              position: "absolute",
              right: -3,
              top: 0,
              width: 6,
              zIndex: 20,
            },
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
            "data-testid": "sprint25-resize-right",
            onMouseDown: (event: React.MouseEvent) => startDrag("right", event),
            role: "separator",
            style: {
              bottom: 0,
              cursor: "col-resize",
              left: -3,
              position: "absolute",
              top: 0,
              width: 6,
              zIndex: 20,
            },
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
  nativeColumn: { flex: 1, gap: 6, minHeight: 0 },
  nativeRow: { flex: 1, flexDirection: "row", gap: 6, minHeight: 0 },
  nativeSide: { flexShrink: 0 },
});
