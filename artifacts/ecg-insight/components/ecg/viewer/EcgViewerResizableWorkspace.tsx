import React, { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { EcgEnterpriseLayoutEngine } from "./EcgEnterpriseLayoutEngine";
import {
  clampLeftPanelWidth,
  clampRightPanelWidth,
  ECG_WORKSTATION_VISUAL,
  responsiveLeftPanelWidth,
} from "./ecgWorkstationVisualTokens";

const LAYOUT_KEY = "ecg-insight:ecg-workspace-panel-layout-v11";

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
  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1920;
  const defaultLeft = responsiveLeftPanelWidth(viewportWidth);
  if (typeof window === "undefined") {
    return { leftSize: defaultLeft, rightSize: ECG_WORKSTATION_VISUAL.rightExpandedWidth };
  }
  try {
    const raw =
      window.localStorage.getItem(LAYOUT_KEY) ??
      window.localStorage.getItem("ecg-insight:ecg-workspace-panel-layout-v11") ??
      window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout-v10") ??
      window.localStorage.getItem("ecg-insight:ecg-monitor-panel-layout-v7");
    const parsed = JSON.parse(raw ?? "{}") as SavedLayout;
    const leftSize = clampLeftPanelWidth(parsed.leftSize ?? defaultLeft);
    const rightSize = clampRightPanelWidth(parsed.rightSize ?? ECG_WORKSTATION_VISUAL.rightExpandedWidth);
    return {
      autoHidePanels: false,
      leftCollapsed: parsed.leftCollapsed ?? false,
      leftPinned: parsed.leftPinned ?? true,
      rightCollapsed: parsed.rightCollapsed ?? false,
      rightPinned: parsed.rightPinned ?? true,
      leftSize,
      rightSize,
    };
  } catch {
    return {
      autoHidePanels: false,
      leftCollapsed: false,
      leftPinned: true,
      leftSize: defaultLeft,
      rightSize: ECG_WORKSTATION_VISUAL.rightExpandedWidth,
    };
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
    if (controlledLayout) {
      setLayout((current) => ({
        ...current,
        ...controlledLayout,
        leftSize: clampLeftPanelWidth(controlledLayout.leftSize ?? current.leftSize ?? ECG_WORKSTATION_VISUAL.leftExpandedWidth),
        rightSize: clampRightPanelWidth(controlledLayout.rightSize ?? current.rightSize ?? ECG_WORKSTATION_VISUAL.rightExpandedWidth),
      }));
    }
  }, [controlledLayout]);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return undefined;
    const onResize = () => {
      setLayout((current) => {
        if (current.leftCollapsed) return current;
        const nextLeft = clampLeftPanelWidth(Math.max(current.leftSize ?? ECG_WORKSTATION_VISUAL.leftExpandedWidth, responsiveLeftPanelWidth(window.innerWidth)));
        if (nextLeft === current.leftSize) return current;
        return { ...current, leftSize: nextLeft };
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    mergedRef.current = layout;
    saveLayout(layout);
    onLayoutChange?.(layout);
  }, [layout, onLayoutChange]);

  const updateLayout = useCallback((patch: Partial<SavedLayout>) => {
    setLayout((current) => ({
      ...current,
      ...patch,
      leftSize: patch.leftSize != null ? clampLeftPanelWidth(patch.leftSize) : current.leftSize,
      rightSize: patch.rightSize != null ? clampRightPanelWidth(patch.rightSize) : current.rightSize,
    }));
  }, []);

  return (
    <View style={styles.webRoot}>
      <EcgEnterpriseLayoutEngine
        autoHidePanels={layout.autoHidePanels ?? false}
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
        rightPinned={layout.rightPinned ?? true}
        rightWidth={layout.rightSize ?? ECG_WORKSTATION_VISUAL.rightExpandedWidth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  webRoot: { display: "flex", flex: 1, height: "100%", minHeight: 0, overflow: "hidden", width: "100%" },
});
