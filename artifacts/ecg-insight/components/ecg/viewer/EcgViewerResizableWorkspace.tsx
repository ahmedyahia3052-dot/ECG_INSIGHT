import React, { type ReactNode, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { EcgWorkstationGridShell } from "./EcgWorkstationGridShell";

const LAYOUT_KEY = "ecg-insight:ecg-monitor-panel-layout";

type SavedLayout = {
  bottomSize?: number;
  leftCollapsed?: boolean;
  leftSize?: number;
  rightCollapsed?: boolean;
  rightSize?: number;
};

function loadLayout(): SavedLayout {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LAYOUT_KEY) ?? "{}") as SavedLayout;
  } catch {
    return {};
  }
}

function saveLayout(layout: SavedLayout) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // Ignore storage failures.
  }
}

type Props = {
  bottom: ReactNode;
  center: ReactNode;
  layout?: SavedLayout;
  left: ReactNode;
  onLayoutChange?: (layout: SavedLayout) => void;
  right: ReactNode;
};

export function EcgViewerResizableWorkspace({ bottom, center, layout: controlledLayout, left, onLayoutChange, right }: Props) {
  const [layout, setLayout] = useState<SavedLayout>(() => controlledLayout ?? loadLayout());

  useEffect(() => {
    if (controlledLayout) setLayout(controlledLayout);
  }, [controlledLayout]);

  useEffect(() => {
    saveLayout(layout);
    onLayoutChange?.(layout);
  }, [layout, onLayoutChange]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.webRoot}>
        <EcgWorkstationGridShell
          bottom={bottom}
          center={center}
          left={left}
          leftCollapsed={!!layout.leftCollapsed}
          right={right}
          rightCollapsed={!!layout.rightCollapsed}
        />
      </View>
    );
  }

  return (
    <View style={styles.nativeColumn}>
      <View style={styles.nativeMainRow}>
        <View style={[styles.nativeSide, { width: layout.leftSize ?? 280 }]}>{left}</View>
        <View style={styles.nativeCenter}>{center}</View>
        {!layout.rightCollapsed ? <View style={[styles.nativeSide, { width: layout.rightSize ?? 260 }]}>{right}</View> : null}
      </View>
      <View style={styles.nativeBottom}>{bottom}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeBottom: { flexShrink: 0, marginTop: 10 },
  nativeCenter: { flex: 1, minWidth: 0 },
  nativeColumn: { flex: 1, gap: 10, minHeight: 0 },
  nativeMainRow: { flex: 1, flexDirection: "row", gap: 10, minHeight: 0 },
  nativeSide: { flexShrink: 0 },
  panelFill: { flex: 1, height: "100%", minHeight: 0, overflow: "hidden" },
  separator: { backgroundColor: "rgba(148,163,184,0.18)", width: 6 },
  separatorHorizontal: { backgroundColor: "rgba(148,163,184,0.18)", height: 6 },
  webRoot: { display: "flex", flex: 1, height: "100%", minHeight: 0, overflow: "hidden", width: "100%" },
});
