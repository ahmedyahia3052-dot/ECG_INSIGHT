import React, { type ReactNode, useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import { EcgWorkstationGridShell } from "./EcgWorkstationGridShell";

const LAYOUT_KEY = "ecg-insight:ecg-monitor-panel-layout-v3";

type SavedLayout = {
  bottomSize?: number;
  leftCollapsed?: boolean;
  leftSize?: number;
  rightCollapsed?: boolean;
  rightSize?: number;
};

function loadLayout(): SavedLayout {
  if (typeof window === "undefined") {
    return { leftSize: ECG_WORKSTATION_VISUAL.leftExpandedWidth, rightSize: ECG_WORKSTATION_VISUAL.rightExpandedWidth };
  }
  try {
    const raw =
      window.localStorage.getItem(LAYOUT_KEY) ??
      window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout-v2") ??
      window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout");
    return {
      leftSize: ECG_WORKSTATION_VISUAL.leftExpandedWidth,
      rightSize: ECG_WORKSTATION_VISUAL.rightExpandedWidth,
      ...(JSON.parse(raw ?? "{}") as SavedLayout),
    };
  } catch {
    return { leftSize: ECG_WORKSTATION_VISUAL.leftExpandedWidth, rightSize: ECG_WORKSTATION_VISUAL.rightExpandedWidth };
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
          leftWidth={layout.leftSize ?? ECG_WORKSTATION_VISUAL.leftExpandedWidth}
          onLeftWidthChange={(leftSize) => updateLayout({ leftSize })}
          onRightWidthChange={(rightSize) => updateLayout({ rightSize })}
          right={right}
          rightCollapsed={!!layout.rightCollapsed}
          rightWidth={layout.rightSize ?? ECG_WORKSTATION_VISUAL.rightExpandedWidth}
        />
      </View>
    );
  }

  return (
    <View style={styles.nativeColumn}>
      <View style={styles.nativeMainRow}>
        <View style={[styles.nativeSide, { width: layout.leftCollapsed ? ECG_WORKSTATION_VISUAL.leftCollapsedWidth : layout.leftSize ?? 240 }]}>
          {left}
        </View>
        <View style={styles.nativeCenter}>{center}</View>
        {!layout.rightCollapsed ? <View style={[styles.nativeSide, { width: layout.rightSize ?? 220 }]}>{right}</View> : null}
      </View>
      <View style={styles.nativeBottom}>{bottom}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  nativeBottom: { flexShrink: 0 },
  nativeCenter: { flex: 1, minWidth: 0 },
  nativeColumn: { flex: 1, gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0 },
  nativeMainRow: { flex: 1, flexDirection: "row", gap: ECG_WORKSTATION_VISUAL.workspaceGap, minHeight: 0 },
  nativeSide: { flexShrink: 0 },
  webRoot: { display: "flex", flex: 1, height: "100%", minHeight: 0, overflow: "hidden", width: "100%" },
});
