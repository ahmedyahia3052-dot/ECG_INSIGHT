import React, { type ReactNode, useCallback, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import { EcgWorkstationGridShell } from "./EcgWorkstationGridShell";

/** Sprint 29 — enterprise layout engine with auto-hide panels and diagnostic chrome reduction. */
export function EcgEnterpriseLayoutEngine({
  autoHidePanels = true,
  bottom,
  center,
  diagnosticMode = false,
  left,
  leftCollapsed,
  leftPinned = true,
  leftWidth,
  onLeftCollapsedChange,
  onLeftWidthChange,
  onRightCollapsedChange,
  onRightWidthChange,
  right,
  rightCollapsed,
  rightPinned = false,
  rightWidth,
}: {
  autoHidePanels?: boolean;
  bottom: React.ReactNode | null;
  center: React.ReactNode;
  diagnosticMode?: boolean;
  left: React.ReactNode | null;
  leftCollapsed: boolean;
  leftPinned?: boolean;
  leftWidth?: number;
  onLeftCollapsedChange?: (collapsed: boolean) => void;
  onLeftWidthChange?: (width: number) => void;
  onRightCollapsedChange?: (collapsed: boolean) => void;
  onRightWidthChange?: (width: number) => void;
  right: React.ReactNode | null;
  rightCollapsed: boolean;
  rightPinned?: boolean;
  rightWidth?: number;
}) {
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleAutoHide = useCallback(
    (edge: "left" | "right") => {
      if (!autoHidePanels || diagnosticMode) return;
      if (edge === "left" && leftPinned) return;
      if (edge === "right" && rightPinned) return;
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (edge === "left") onLeftCollapsedChange?.(true);
        else onRightCollapsedChange?.(true);
      }, ECG_WORKSTATION_VISUAL.panelAutoHideDelayMs);
    },
    [autoHidePanels, diagnosticMode, leftPinned, onLeftCollapsedChange, onRightCollapsedChange, rightPinned],
  );

  const cancelAutoHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);

  const effectiveLeftCollapsed = diagnosticMode || !left ? true : leftCollapsed;
  const effectiveRightCollapsed = diagnosticMode || !right ? true : rightCollapsed;

  const hoverProps = (edge: "left" | "right") =>
    Platform.OS === "web"
      ? ({
          onMouseEnter: () => {
            cancelAutoHide();
            if (edge === "left" && effectiveLeftCollapsed && !diagnosticMode) onLeftCollapsedChange?.(false);
            if (edge === "right" && effectiveRightCollapsed && !diagnosticMode) onRightCollapsedChange?.(false);
          },
          onMouseLeave: () => scheduleAutoHide(edge),
        } as never)
      : {};

  return (
    <View nativeID="sprint29-enterprise-layout-engine" style={styles.root} testID="sprint29-enterprise-layout-engine">
      <EcgWorkstationGridShell
        bottom={diagnosticMode ? null : bottom}
        center={center}
        diagnosticMode={diagnosticMode}
        left={left ? <View {...hoverProps("left")} style={styles.panelHost}>{left}</View> : null}
        leftCollapsed={effectiveLeftCollapsed}
        leftWidth={leftWidth}
        onLeftWidthChange={onLeftWidthChange}
        onRightWidthChange={onRightWidthChange}
        right={right ? <View {...hoverProps("right")} style={styles.panelHost}>{right}</View> : null}
        rightCollapsed={effectiveRightCollapsed}
        rightWidth={rightWidth}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panelHost: { flex: 1, minHeight: 0, minWidth: 0 },
  root: { flex: 1, minHeight: 0, overflow: "hidden" },
});
