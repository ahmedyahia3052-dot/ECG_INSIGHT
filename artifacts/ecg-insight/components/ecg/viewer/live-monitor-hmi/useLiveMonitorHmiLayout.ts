import { useCallback, useEffect, useMemo, useState } from "react";
import { useWindowDimensions } from "react-native";

import { HMI_LAYOUT } from "./ecgLiveMonitorHmiTokens";

export function useLiveMonitorHmiLayout(diagnosticMode: boolean) {
  const { width } = useWindowDimensions();
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(width < 1200);
  const [bottomCollapsed, setBottomCollapsed] = useState(false);
  const [controlsPinned, setControlsPinned] = useState(true);

  useEffect(() => {
    if (width >= HMI_LAYOUT.ultraWideBreakpoint) setRightCollapsed(false);
    else if (width < 1024) setRightCollapsed(true);
  }, [width]);

  const leftWidth = leftCollapsed ? HMI_LAYOUT.leftRailCollapsed : HMI_LAYOUT.leftRailExpanded;
  const rightWidth = rightCollapsed ? HMI_LAYOUT.rightRailCollapsed : HMI_LAYOUT.rightRailExpanded;

  const chromeHeight = useMemo(() => {
    if (diagnosticMode) return 0;
    return HMI_LAYOUT.statusBarHeight;
  }, [diagnosticMode]);

  const toggleLeft = useCallback(() => setLeftCollapsed((v) => !v), []);
  const toggleRight = useCallback(() => setRightCollapsed((v) => !v), []);
  const toggleBottom = useCallback(() => setBottomCollapsed((v) => !v), []);

  return {
    bottomCollapsed,
    chromeHeight,
    controlsPinned,
    isUltraWide: width >= HMI_LAYOUT.ultraWideBreakpoint,
    isWide: width >= 1280,
    leftCollapsed,
    leftWidth,
    rightCollapsed,
    rightWidth,
    setControlsPinned,
    toggleBottom,
    toggleLeft,
    toggleRight,
    viewportWidth: width,
  };
}
