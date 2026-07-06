import { Feather } from "@expo/vector-icons";
import React, { memo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import type { EcgCompareLayoutMode, EcgLeadId, EcgLeadLayoutMode, EcgWorkstationViewMode } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";
import type { EcgWaveformPlaybackState } from "./useEcgWaveformPlayback";

type IconName = keyof typeof Feather.glyphMap;

type ToolAction = {
  active?: boolean;
  disabled?: boolean;
  icon: IconName;
  label: string;
  onPress?: () => void;
  shortcut?: string;
  testID?: string;
};

function CompactIconButton({ action }: { action: ToolAction }) {
  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      disabled={action.disabled || !action.onPress}
      onPress={action.onPress}
      style={({ hovered, pressed }) => [
        styles.iconBtn,
        action.active && styles.iconBtnActive,
        (hovered || pressed) && styles.iconBtnHover,
        action.disabled && styles.iconBtnDisabled,
      ]}
      testID={action.testID}
      {...(Platform.OS === "web" && action.shortcut ? ({ title: `${action.label} (${action.shortcut})` } as never) : {})}
    >
      <Feather color={action.active ? "#03131B" : medicalTheme.primary} name={action.icon} size={16} />
    </Pressable>
  );
}

function OverflowMenu({ actions, groupId }: { actions: ToolAction[]; groupId: string }) {
  const [open, setOpen] = useState(false);
  if (!actions.length) return null;

  return (
    <View style={styles.overflowHost}>
      <Pressable
        accessibilityLabel="More tools"
        onPress={() => setOpen((value) => !value)}
        style={({ hovered, pressed }) => [styles.iconBtn, (hovered || pressed) && styles.iconBtnHover, open && styles.iconBtnActive]}
        testID={`sprint26-overflow-${groupId}`}
      >
        <Feather color={open ? "#03131B" : medicalTheme.muted} name="more-horizontal" size={16} />
      </Pressable>
      {open ? (
        <View style={styles.overflowPanel} testID={`sprint26-overflow-panel-${groupId}`}>
          {actions.map((action) => (
            <Pressable
              key={`${groupId}-${action.label}`}
              onPress={() => {
                action.onPress?.();
                setOpen(false);
              }}
              style={({ hovered, pressed }) => [styles.overflowRow, (hovered || pressed) && styles.overflowRowHover]}
            >
              <Feather color={medicalTheme.primary} name={action.icon} size={14} />
              <Text style={styles.overflowLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RibbonDivider() {
  return <View style={styles.divider} />;
}

/** Sprint 26 — compact icon ribbon, horizontal scroll, overflow menus. */
export const EcgWorkstationToolbar = memo(function EcgWorkstationToolbar({
  aiOverlay,
  compareLayout,
  compareMode,
  controls,
  onCapture,
  onCompareLayoutChange,
  onCompareToggle,
  onDigitize,
  onExportCsv,
  onExportJson,
  onExportPdf,
  onExportPng,
  onLeadCycle,
  onOpenCases,
  onOpenCommandPalette,
  onOpenSettings,
  onToggleCrosshair,
  onToggleLeadFocus,
  onToggleLeftPanel,
  onToggleMagnifier,
  onToggleRightPanel,
  onToggleTheme,
  onUpload,
  onViewModeChange,
  playback,
  selectedLead,
  showCrosshair = false,
  showMagnifier = false,
  viewMode,
  workspace,
}: {
  aiOverlay?: EcgAiOverlayWorkspace;
  compareLayout: EcgCompareLayoutMode;
  compareMode: boolean;
  controls: EcgViewerControls;
  leadLayout?: EcgLeadLayoutMode;
  onCapture?: () => void;
  onCompareLayoutChange?: (layout: EcgCompareLayoutMode) => void;
  onCompareToggle?: () => void;
  onDigitize?: () => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onLeadCycle?: () => void;
  onLeadLayoutChange?: (layout: EcgLeadLayoutMode) => void;
  onOpenCases?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSettings?: () => void;
  onRhythmStrip?: () => void;
  onToggleCrosshair?: () => void;
  onToggleLeadFocus?: () => void;
  onToggleLeftPanel?: () => void;
  onToggleMagnifier?: () => void;
  onToggleRightPanel?: () => void;
  onToggleTheme?: () => void;
  onUpload?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  playback?: EcgWaveformPlaybackState;
  recentCaseId?: string;
  selectedLead: EcgLeadId;
  showCrosshair?: boolean;
  showDigitizedWaveform?: boolean;
  showMagnifier?: boolean;
  viewMode: EcgWorkstationViewMode;
  workspace?: EcgMeasurementWorkspace;
}) {
  const overlayEnabled = aiOverlay?.present.settings.enabled ?? false;
  const measureActive = workspace?.present.toolMode === "caliper" || workspace?.present.toolMode === "measurement";

  const primary: ToolAction[] = [
    { icon: "folder", label: "Open", onPress: onOpenCases ?? onCapture, shortcut: "Ctrl+O" },
    { icon: "upload", label: "Upload", onPress: onUpload, shortcut: "Ctrl+U" },
    { icon: "command", label: "Commands", onPress: onOpenCommandPalette, shortcut: "Ctrl+K", testID: "sprint25-open-command-palette" },
    { icon: "zoom-in", label: "Zoom In", onPress: () => controls.zoomBy(0.2) },
    { icon: "zoom-out", label: "Zoom Out", onPress: () => controls.zoomBy(-0.2) },
    { icon: "maximize-2", label: "Fit Width", onPress: () => controls.applyFit("width") },
    { active: controls.panMode === "active", icon: "move", label: "Pan", onPress: controls.togglePanMode },
    { active: showCrosshair, icon: "crosshair", label: "Crosshair", onPress: onToggleCrosshair, testID: "sprint25-toggle-crosshair" },
    { icon: "cpu", label: "Digitize", onPress: onDigitize, testID: "sprint18-digitize" },
    { active: viewMode === "monitor", icon: "monitor", label: "Live Monitor", onPress: () => onViewModeChange?.("monitor"), testID: "sprint18-monitor-mode" },
    { icon: playback?.isPlaying ? "pause" : "play", label: playback?.isPlaying ? "Pause" : "Play", onPress: playback?.togglePlay },
    { active: playback?.frozen, icon: "pause-circle", label: "Freeze", onPress: () => playback?.setFrozen(!playback?.frozen) },
    { active: viewMode === "measurement", icon: "sliders", label: "Measure", onPress: () => onViewModeChange?.("measurement"), testID: "sprint21-measurement-mode" },
    { icon: "chevrons-right", label: `Lead ${selectedLead}`, onPress: onLeadCycle },
    { active: viewMode === "ai-review" || viewMode === "overlay", icon: "eye", label: "AI Interpret", onPress: () => onViewModeChange?.("ai-review") },
    { active: overlayEnabled, icon: "aperture", label: "AI Overlay", onPress: () => aiOverlay?.toggleOverlay() },
    { active: compareMode, icon: "columns", label: "Compare", onPress: onCompareToggle },
    { icon: "file-text", label: "Export PDF", onPress: onExportPdf, testID: "sprint18-export-pdf" },
    { icon: "image", label: "Export PNG", onPress: onExportPng, testID: "sprint18-export-png" },
    { icon: "menu", label: "Toggle Left Panel", onPress: onToggleLeftPanel, testID: "sprint22-toggle-left-panel" },
    { icon: "columns", label: "Toggle Right Panel", onPress: onToggleRightPanel, testID: "sprint22-toggle-right-panel" },
  ];

  const overflow: ToolAction[] = [
    { icon: "camera", label: "Capture", onPress: onCapture },
    { icon: "clock", label: "Recent Cases", onPress: onOpenCases },
    { icon: "minimize-2", label: "Fit Height", onPress: () => controls.applyFit("height") },
    { icon: "target", label: "Actual Size", onPress: () => controls.applyFit("100"), shortcut: "Ctrl+0" },
    { active: showMagnifier, icon: "search", label: "Magnifier", onPress: onToggleMagnifier, testID: "sprint25-toggle-magnifier" },
    { icon: "rotate-cw", label: "Rotate", onPress: controls.rotate },
    { icon: "refresh-cw", label: "Reset View", onPress: controls.resetView },
    { icon: "maximize", label: controls.fullscreen ? "Exit Fullscreen" : "Fullscreen", onPress: controls.toggleFullscreen },
    { active: viewMode === "processed", icon: "filter", label: "Processed View", onPress: () => onViewModeChange?.("processed") },
    { active: viewMode === "waveform", icon: "activity", label: "Waveform View", onPress: () => onViewModeChange?.("waveform") },
    { active: playback?.loop, icon: "repeat", label: "Loop", onPress: () => playback?.setLoop(!playback?.loop) },
    { icon: "bar-chart-2", label: `Gain ${controls.grid.gain}`, onPress: controls.cycleGain, testID: "sprint18-gain" },
    { icon: "activity", label: `Speed ${controls.grid.speed}`, onPress: controls.cycleSpeed, testID: "sprint18-speed" },
    { active: controls.grid.visible, icon: "grid", label: "Grid", onPress: controls.toggleGrid },
    { active: workspace?.present.toolMode === "caliper", icon: "maximize", label: "Caliper", onPress: () => workspace?.setToolMode("caliper") },
    { active: measureActive, icon: "edit-3", label: "Manual Measure", onPress: () => workspace?.setToolMode(measureActive ? "select" : "measurement") },
    { icon: "crosshair", label: "Lead Focus", onPress: onToggleLeadFocus },
    { active: compareLayout === "side-by-side", icon: "columns", label: "Side by Side", onPress: () => onCompareLayoutChange?.("side-by-side") },
    { active: compareLayout === "overlay", icon: "layers", label: "Compare Overlay", onPress: () => onCompareLayoutChange?.("overlay") },
    { active: compareLayout === "split", icon: "git-branch", label: "Difference", onPress: () => onCompareLayoutChange?.("split") },
    { icon: "file", label: "Report Preview", onPress: () => onViewModeChange?.("report"), testID: "sprint21-open-report" },
    { icon: "code", label: "Export JSON", onPress: onExportJson },
    { icon: "grid", label: "Export CSV", onPress: onExportCsv },
    { icon: "tool", label: "Settings", onPress: onOpenSettings },
    { icon: "settings", label: "Theme", onPress: onToggleTheme },
  ];

  return (
    <View nativeID="sprint26-compact-ribbon" style={styles.toolbar} testID="sprint26-compact-ribbon">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow} style={styles.scroll}>
        {primary.map((action) => (
          <CompactIconButton key={action.label} action={action} />
        ))}
        <RibbonDivider />
        <OverflowMenu actions={overflow} groupId="more" />
      </ScrollView>
    </View>
  );
});

const size = ECG_WORKSTATION_VISUAL.toolbarButtonSize;

const styles = StyleSheet.create({
  divider: { alignSelf: "stretch", backgroundColor: "rgba(30,58,74,0.9)", marginHorizontal: 2, width: 1 },
  iconBtn: {
    alignItems: "center",
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 6,
    borderWidth: 1,
    height: size,
    justifyContent: "center",
    width: size,
  },
  iconBtnActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  iconBtnDisabled: { opacity: 0.45 },
  iconBtnHover: { borderColor: medicalTheme.primary },
  overflowHost: { position: "relative", zIndex: 30 },
  overflowLabel: { color: medicalTheme.text, fontSize: 11, fontWeight: "700" },
  overflowPanel: {
    backgroundColor: "#071422",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    left: 0,
    minWidth: 168,
    paddingVertical: 4,
    position: "absolute",
    top: size + 4,
    zIndex: 40,
  },
  overflowRow: { alignItems: "center", flexDirection: "row", gap: 8, paddingHorizontal: 10, paddingVertical: 7 },
  overflowRowHover: { backgroundColor: "rgba(34,197,94,0.1)" },
  scroll: { flexGrow: 0, maxHeight: ECG_WORKSTATION_VISUAL.toolbarMaxHeight },
  scrollRow: { alignItems: "center", flexDirection: "row", gap: ECG_WORKSTATION_VISUAL.toolbarGroupGap, paddingHorizontal: 4, paddingVertical: 1 },
  toolbar: {
    backgroundColor: "#040E1A",
    borderColor: medicalTheme.border,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
    maxHeight: ECG_WORKSTATION_VISUAL.toolbarMaxHeight,
    overflow: "hidden",
  },
});
