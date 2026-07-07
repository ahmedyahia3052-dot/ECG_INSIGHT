import React, { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { EcgEnterpriseLayoutEngine } from "./EcgEnterpriseLayoutEngine";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";

const LAYOUT_KEY = "ecg-insight:ecg-monitor-panel-layout-v8";

type SavedLayout = {
  autoHidePanels?: boolean;
  bottomSize?: number;
  leftCollapsed?: boolean;
  leftPinned?: boolean;
  leftSize?: number;
  rightCollapsed?: boolean;
  rightPinned?: boolean;
  rightSize?: number;
};

function loadLayout(): SavedLayout {
  if (typeof window === "undefined") {
    return { leftSize: ECG_WORKSTATION_VISUAL.leftExpandedWidth, rightSize: ECG_WORKSTATION_VISUAL.rightExpandedWidth };
  }
  try {
    const raw =
      window.localStorage.getItem(LAYOUT_KEY) ??
      window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout-v7") ??
      window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout-v6") ??
      window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout-v5") ??
      window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout-v3") ??
      window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout-v2");
    return {
      autoHidePanels: true,
      leftPinned: true,
      rightPinned: false,
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
  bottom: ReactNode | null;
  center: ReactNode;
  diagnosticMode?: boolean;
  layout?: SavedLayout;
  left: ReactNode | null;
  onLayoutChange?: (layout: SavedLayout) => void;
  right: ReactNode | null;
};

export function EcgViewerResizableWorkspace({ bottom, center, diagnosticMode = false, layout: controlledLayout, left, onLayoutChange, right }: Props) {
  const [layout, setLayout] = useState<SavedLayout>(() => controlledLayout ?? loadLayout());
  const mergedRef = useRef(layout);

  useEffect(() => {
    if (controlledLayout) setLayout((current) => ({ ...current, ...controlledLayout }));
  }, [controlledLayout]);

  useEffect(() => {
    mergedRef.current = layout;
    saveLayout(layout);
    onLayoutChange?.(layout);
  }, [layout, onLayoutChange]);

  const updateLayout = useCallback((patch: Partial<SavedLayout>) => setLayout((current) => ({ ...current, ...patch })), []);

  return (
    <View style={styles.webRoot}>
      <EcgEnterpriseLayoutEngine
        autoHidePanels={layout.autoHidePanels ?? true}
        bottom={bottom}
        center={center}
        diagnosticMode={diagnosticMode}
        left={left}
        leftCollapsed={!!layout.leftCollapsed}
        leftPinned={layout.leftPinned ?? true}
        leftWidth={layout.leftSize ?? ECG_WORKSTATION_VISUAL.leftExpandedWidth}
        onLeftCollapsedChange={(leftCollapsed) => updateLayout({ leftCollapsed })}
        onLeftWidthChange={(leftSize) => updateLayout({ leftSize })}
        onRightCollapsedChange={(rightCollapsed) => updateLayout({ rightCollapsed })}
        onRightWidthChange={(rightSize) => updateLayout({ rightSize })}
        right={right}
        rightCollapsed={!!layout.rightCollapsed}
        rightPinned={layout.rightPinned ?? false}
        rightWidth={layout.rightSize ?? ECG_WORKSTATION_VISUAL.rightExpandedWidth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webRoot: { display: "flex", flex: 1, height: "100%", minHeight: 0, overflow: "hidden", width: "100%" },
});
