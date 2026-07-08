import React, { createElement, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { LIVE_MONITOR_LAYOUT } from "./live-monitor-hmi/ecgLiveMonitorHmiTokens";

/** Hotfix — CSS Grid live monitor shell: docked sidebar, in-flow canvas, no overlays. */
export function EcgLiveMonitorGridShell({
  bottom,
  canvas,
  diagnosticMode = false,
  header,
  left,
  right,
  showRight = true,
  sidebarWidth = LIVE_MONITOR_LAYOUT.sidebarWidth,
}: {
  bottom: ReactNode;
  canvas: ReactNode;
  diagnosticMode?: boolean;
  header: ReactNode | null;
  left: ReactNode;
  right: ReactNode | null;
  showRight?: boolean;
  sidebarWidth?: number;
}) {
  const rightWidth = showRight ? LIVE_MONITOR_LAYOUT.rightPanelWidth : 0;
  const gap = LIVE_MONITOR_LAYOUT.gridGap;

  if (Platform.OS !== "web") {
    return (
      <View style={styles.nativeRoot}>
        {!diagnosticMode ? (
          <View style={[styles.nativeSidebar, { width: sidebarWidth }]}>
            {left}
          </View>
        ) : null}
        <View style={styles.nativeMain}>
          {!diagnosticMode && header ? <View style={styles.nativeHeader}>{header}</View> : null}
          <View style={styles.nativeCanvas}>{canvas}</View>
          {!diagnosticMode ? <View style={styles.nativeBottom}>{bottom}</View> : null}
        </View>
        {!diagnosticMode && showRight && right ? (
          <View style={[styles.nativeRight, { width: rightWidth }]}>
            {right}
          </View>
        ) : null}
      </View>
    );
  }

  const columns = diagnosticMode
    ? "minmax(0, 1fr)"
    : showRight && right
      ? `${sidebarWidth}px minmax(0, 1fr) ${rightWidth}px`
      : `${sidebarWidth}px minmax(0, 1fr)`;

  const areas = diagnosticMode
    ? `"canvas"`
    : showRight && right
      ? `
        "sidebar header header"
        "sidebar canvas panel"
        "sidebar bottom bottom"
      `
      : `
        "sidebar header"
        "sidebar canvas"
        "sidebar bottom"
      `;

  return createElement(
    "div",
    {
      "data-testid": "live-monitor-grid-shell",
      id: "live-monitor-grid-shell",
      style: {
        boxSizing: "border-box",
        display: "grid",
        gap,
        gridTemplateAreas: areas,
        gridTemplateColumns: columns,
        gridTemplateRows: diagnosticMode ? "minmax(0, 1fr)" : "auto minmax(0, 1fr) auto",
        height: "100%",
        isolation: "isolate",
        minHeight: 0,
        overflow: "hidden",
        width: "100%",
      },
    },
    diagnosticMode
      ? null
      : createElement(
          "aside",
          {
            "data-testid": "live-monitor-sidebar-region",
            style: {
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gridArea: "sidebar",
              minHeight: 0,
              minWidth: LIVE_MONITOR_LAYOUT.sidebarMinWidth,
              overflow: "hidden",
              width: sidebarWidth,
            },
          },
          left,
        ),
    diagnosticMode
      ? null
      : header
        ? createElement(
            "header",
            {
              "data-testid": "live-monitor-header-region",
              style: {
                boxSizing: "border-box",
                gridArea: "header",
                minHeight: LIVE_MONITOR_LAYOUT.statusBarHeight,
                minWidth: 0,
                overflow: "hidden",
              },
            },
            header,
          )
        : null,
    createElement(
      "main",
      {
        "data-testid": "live-monitor-canvas-region",
        style: {
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          gridArea: "canvas",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
        },
      },
      canvas,
    ),
    !diagnosticMode && showRight && right
      ? createElement(
          "aside",
          {
            "data-testid": "live-monitor-right-panel-region",
            style: {
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gridArea: "panel",
              minHeight: 0,
              minWidth: LIVE_MONITOR_LAYOUT.rightPanelMinWidth,
              overflow: "hidden",
              width: rightWidth,
            },
          },
          right,
        )
      : null,
    diagnosticMode
      ? null
      : createElement(
          "footer",
          {
            "data-testid": "live-monitor-bottom-region",
            style: {
              boxSizing: "border-box",
              gridArea: "bottom",
              minHeight: LIVE_MONITOR_LAYOUT.bottomBarHeight,
              minWidth: 0,
              overflow: "hidden",
            },
          },
          bottom,
        ),
  );
}

const styles = StyleSheet.create({
  nativeBottom: { flexShrink: 0 },
  nativeCanvas: { flex: 1, minHeight: 0 },
  nativeHeader: { flexShrink: 0 },
  nativeMain: { flex: 1, minHeight: 0, minWidth: 0 },
  nativeRight: { flexShrink: 0 },
  nativeRoot: { flex: 1, flexDirection: "row", minHeight: 0 },
  nativeSidebar: { flexShrink: 0 },
});
