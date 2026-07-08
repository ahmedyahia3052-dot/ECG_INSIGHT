/**
 * Sprint 78 — Sidebar manager (width, collapse, domain-specific rails).
 */

import { LIVE_MONITOR_LAYOUT } from "@/components/ecg/viewer/live-monitor-hmi/ecgLiveMonitorHmiTokens";
import { clampLeftPanelWidth, responsiveLeftPanelWidth } from "@/components/ecg/viewer/ecgWorkstationVisualTokens";

export type SidebarDomain = "workspace" | "live-monitor" | "dashboard" | "copilot";

export type SidebarState = {
  collapsed: boolean;
  domain: SidebarDomain;
  pinned: boolean;
  width: number;
};

export function defaultSidebarState(domain: SidebarDomain, viewportWidth = 1920): SidebarState {
  if (domain === "live-monitor") {
    const width = viewportWidth >= 2560 ? LIVE_MONITOR_LAYOUT.rightPanelWidth : LIVE_MONITOR_LAYOUT.sidebarWidth;
    return { collapsed: false, domain, pinned: true, width: Math.max(width, LIVE_MONITOR_LAYOUT.sidebarMinWidth) };
  }
  return {
    collapsed: false,
    domain,
    pinned: true,
    width: clampLeftPanelWidth(responsiveLeftPanelWidth(viewportWidth)),
  };
}

export function sidebarWidthForViewport(domain: SidebarDomain, viewportWidth: number) {
  return defaultSidebarState(domain, viewportWidth).width;
}
