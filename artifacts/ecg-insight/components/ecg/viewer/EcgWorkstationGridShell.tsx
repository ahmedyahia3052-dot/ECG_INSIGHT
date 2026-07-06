import React, { createElement, type ReactNode } from "react";
import { Platform, StyleSheet, View } from "react-native";

/** Sprint 24 — CSS Grid shell for hospital workstation layout (web only). */
export function EcgWorkstationGridShell({
  bottom,
  center,
  left,
  leftCollapsed,
  right,
  rightCollapsed,
}: {
  bottom: ReactNode;
  center: ReactNode;
  left: ReactNode;
  leftCollapsed: boolean;
  right: ReactNode;
  rightCollapsed: boolean;
}) {
  if (Platform.OS !== "web") {
    return (
      <View style={styles.nativeColumn}>
        <View style={styles.nativeRow}>
          {!leftCollapsed ? <View style={styles.nativeSide}>{left}</View> : null}
          <View style={styles.nativeCenter}>{center}</View>
          {!rightCollapsed ? <View style={styles.nativeSide}>{right}</View> : null}
        </View>
        <View style={styles.nativeBottom}>{bottom}</View>
      </View>
    );
  }

  const leftCol = leftCollapsed ? "0px" : "minmax(200px, 16fr)";
  const rightCol = rightCollapsed ? "0px" : "minmax(240px, 24fr)";
  const centerCol = leftCollapsed && rightCollapsed ? "1fr" : leftCollapsed || rightCollapsed ? "1fr" : "minmax(0, 58fr)";

  return createElement(
    "div",
    {
      "data-testid": "sprint24-workstation-grid",
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
    createElement("div", { style: { display: leftCollapsed ? "none" : "flex", gridArea: "left", minHeight: 0, minWidth: 0, overflow: "hidden" } }, left),
    createElement("div", { style: { display: "flex", gridArea: "center", minHeight: 0, minWidth: 0, overflow: "hidden" } }, center),
    createElement("div", { style: { display: rightCollapsed ? "none" : "flex", gridArea: "right", minHeight: 0, minWidth: 0, overflow: "hidden" } }, right),
    createElement("div", { style: { gridArea: "bottom", minHeight: 0, minWidth: 0, overflow: "hidden" } }, bottom),
  );
}

const styles = StyleSheet.create({
  nativeBottom: { flexShrink: 0 },
  nativeCenter: { flex: 1, minWidth: 0 },
  nativeColumn: { flex: 1, gap: 6, minHeight: 0 },
  nativeRow: { flex: 1, flexDirection: "row", gap: 6, minHeight: 0 },
  nativeSide: { flexShrink: 0, width: 260 },
});
