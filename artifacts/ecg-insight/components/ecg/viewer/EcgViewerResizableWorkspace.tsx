import React, { type ReactNode, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { EcgWorkstationGridShell } from "./EcgWorkstationGridShell";

const LAYOUT_KEY = "ecg-insight:ecg-monitor-panel-layout-v2";

type SavedLayout = {
  bottomSize?: number;
  leftCollapsed?: boolean;
  leftSize?: number;
  rightCollapsed?: boolean;
  rightSize?: number;
};

function loadLayout(): SavedLayout {
  if (typeof window === "undefined") return { leftSize: 260, rightSize: 280 };
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY) ?? window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout");
    return { leftSize: 260, rightSize: 280, ...(JSON.parse(raw ?? "{}") as SavedLayout) };
  } catch {
    return { leftSize: 260, rightSize: 280 };
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

  const updateLayout = (patch: Partial<SavedLayout>) => setLayout((current) => ({ ...current, ...patch }));

  if (Platform.OS === "web") {
    return (
      <View style={styles.webRoot}>
        <EcgWorkstationGridShell
          bottom={bottom}
          center={center}
          left={left}
          leftCollapsed={!!layout.leftCollapsed}
          leftWidth={layout.leftSize ?? 260}
          onLeftWidthChange={(leftSize) => updateLayout({ leftSize })}
          onRightWidthChange={(rightSize) => updateLayout({ rightSize })}
          right={right}
          rightCollapsed={!!layout.rightCollapsed}
          rightWidth={layout.rightSize ?? 280}
        />
      </View>
    );
  }

  return (
    <View style={styles.nativeColumn}>
      <View style={styles.nativeMainRow}>
        {!layout.leftCollapsed ? <View style={[styles.nativeSide, { width: layout.leftSize ?? 280 }]}>{left}</View> : null}
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
  webRoot: { display: "flex", flex: 1, height: "100%", minHeight: 0, overflow: "hidden", width: "100%" },
});
