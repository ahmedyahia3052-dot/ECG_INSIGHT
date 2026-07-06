import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { ECG_ZOOM_PRESETS } from "./ecgImageEngine";
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

type ToolGroup = {
  id: string;
  label: string;
  actions: ToolAction[];
};

function ToolButton({ action }: { action: ToolAction }) {
  return (
    <Pressable
      accessibilityLabel={action.label}
      accessibilityRole="button"
      disabled={action.disabled || !action.onPress}
      onPress={action.onPress}
      style={({ hovered, pressed }) => [
        styles.toolButton,
        action.active && styles.toolButtonActive,
        (hovered || pressed) && styles.toolButtonHover,
        action.disabled && styles.toolButtonDisabled,
      ]}
      testID={action.testID}
      {...(Platform.OS === "web" && action.shortcut ? ({ title: `${action.label} (${action.shortcut})` } as never) : {})}
    >
      <Feather color={action.active ? "#03131B" : medicalTheme.primary} name={action.icon} size={14} />
      <Text style={[styles.toolLabel, action.active && styles.toolLabelActive]} numberOfLines={1}>
        {action.label}
      </Text>
    </Pressable>
  );
}

function ToolGroupSection({ group }: { group: ToolGroup }) {
  return (
    <View nativeID={`sprint24-ribbon-group-${group.id}`} style={styles.group} testID={`sprint21-toolbar-group-${group.id}`}>
      <Text style={styles.groupLabel}>{group.label}</Text>
      <View style={styles.groupRow}>
        {group.actions.map((action) => (
          <ToolButton key={`${group.id}-${action.label}`} action={action} />
        ))}
      </View>
    </View>
  );
}

export const EcgWorkstationToolbar = memo(function EcgWorkstationToolbar({
  aiOverlay,
  compareLayout,
  compareMode,
  controls,
  leadLayout,
  onCapture,
  onCompareLayoutChange,
  onCompareToggle,
  onDigitize,
  onExportCsv,
  onExportJson,
  onExportPdf,
  onExportPng,
  onLeadCycle,
  onLeadLayoutChange,
  onOpenCases,
  onOpenSettings,
  onRhythmStrip,
  onToggleLeadFocus,
  onToggleLeftPanel,
  onToggleRightPanel,
  onToggleTheme,
  onUpload,
  onViewModeChange,
  playback,
  recentCaseId,
  selectedLead,
  showDigitizedWaveform,
  viewMode,
  workspace,
}: {
  aiOverlay?: EcgAiOverlayWorkspace;
  compareLayout: EcgCompareLayoutMode;
  compareMode: boolean;
  controls: EcgViewerControls;
  leadLayout: EcgLeadLayoutMode;
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
  onOpenSettings?: () => void;
  onRhythmStrip?: () => void;
  onToggleLeadFocus?: () => void;
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  onToggleTheme?: () => void;
  onUpload?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  playback?: EcgWaveformPlaybackState;
  recentCaseId?: string;
  selectedLead: EcgLeadId;
  showDigitizedWaveform: boolean;
  viewMode: EcgWorkstationViewMode;
  workspace?: EcgMeasurementWorkspace;
}) {
  const overlayEnabled = aiOverlay?.present.settings.enabled ?? false;
  const heatmapEnabled = aiOverlay?.present.settings.showHeatmap ?? false;
  const measureActive = workspace?.present.toolMode === "caliper" || workspace?.present.toolMode === "measurement";

  const groups: ToolGroup[] = [
    {
      id: "file",
      label: "FILE",
      actions: [
        { icon: "folder", label: "Open", onPress: onOpenCases ?? onCapture, shortcut: "Ctrl+O" },
        { icon: "upload", label: "Upload", onPress: onUpload, shortcut: "Ctrl+U" },
        { icon: "camera", label: "Capture", onPress: onCapture },
        { icon: "clock", label: "Recent", onPress: onOpenCases },
      ],
    },
    {
      id: "view",
      label: "VIEW",
      actions: [
        { icon: "zoom-in", label: "Zoom In", onPress: () => controls.zoomBy(0.2), shortcut: "Ctrl++" },
        { icon: "zoom-out", label: "Zoom Out", onPress: () => controls.zoomBy(-0.2), shortcut: "Ctrl+-" },
        { icon: "maximize-2", label: "Fit W", onPress: () => controls.applyFit("width") },
        { icon: "minimize-2", label: "Fit H", onPress: () => controls.applyFit("height") },
        { icon: "target", label: "Actual", onPress: () => controls.applyFit("100"), shortcut: "Ctrl+0" },
        { active: controls.panMode === "active", icon: "move", label: "Pan", onPress: controls.togglePanMode },
        { icon: "rotate-cw", label: "Rotate", onPress: controls.rotate },
        { icon: "refresh-cw", label: "Reset", onPress: controls.resetView },
        { icon: "maximize", label: controls.fullscreen ? "Exit FS" : "Full", onPress: controls.toggleFullscreen, shortcut: "F11" },
      ],
    },
    {
      id: "grid",
      label: "GRID",
      actions: [
        { icon: "bar-chart-2", label: `Gain ${controls.grid.gain}`, onPress: controls.cycleGain, testID: "sprint18-gain" },
        { icon: "activity", label: `Speed ${controls.grid.speed}`, onPress: controls.cycleSpeed, testID: "sprint18-speed" },
        { active: controls.grid.visible, icon: "grid", label: "Grid", onPress: controls.toggleGrid },
        { icon: "sun", label: "Bright+", onPress: () => controls.adjustBrightness(8) },
        { icon: "moon", label: "Bright−", onPress: () => controls.adjustBrightness(-8) },
        { icon: "sliders", label: "Contrast", onPress: () => controls.adjustContrast(8) },
      ],
    },
    {
      id: "leads",
      label: "LEADS",
      actions: [
        { icon: "chevrons-right", label: selectedLead, onPress: onLeadCycle },
        {
          active: leadLayout === "rhythm",
          icon: "bar-chart",
          label: "Rhythm",
          onPress: () => {
            onLeadLayoutChange?.("rhythm");
            onRhythmStrip?.();
          },
        },
        { active: leadLayout === "12-lead", icon: "layers", label: "12 Lead", onPress: () => onLeadLayoutChange?.("12-lead") },
        { active: viewMode === "waveform", icon: "activity", label: "Waveform", onPress: () => onViewModeChange?.("waveform") },
        { icon: "cpu", label: "Digitize", onPress: onDigitize, testID: "sprint18-digitize" },
        { icon: "crosshair", label: "Focus", onPress: onToggleLeadFocus },
      ],
    },
    {
      id: "monitor",
      label: "MONITOR",
      actions: [
        { active: viewMode === "monitor", icon: "monitor", label: "Live", onPress: () => onViewModeChange?.("monitor"), testID: "sprint18-monitor-mode" },
        { icon: playback?.isPlaying ? "pause" : "play", label: playback?.isPlaying ? "Pause" : "Play", onPress: playback?.togglePlay },
        { active: playback?.frozen, icon: "pause-circle", label: "Freeze", onPress: () => playback?.setFrozen(!playback?.frozen) },
        { active: playback?.loop, icon: "repeat", label: "Loop", onPress: () => playback?.setLoop(!playback?.loop) },
        { active: viewMode === "processed", icon: "filter", label: "Processed", onPress: () => onViewModeChange?.("processed") },
      ],
    },
    {
      id: "ai",
      label: "AI",
      actions: [
        { active: viewMode === "ai-review" || viewMode === "overlay", icon: "eye", label: "Interpret", onPress: () => onViewModeChange?.("ai-review") },
        { active: overlayEnabled, icon: "aperture", label: "Overlay", onPress: () => aiOverlay?.toggleOverlay() },
        {
          active: heatmapEnabled,
          icon: "map",
          label: "Heatmap",
          onPress: () => aiOverlay?.setSettings({ showHeatmap: !heatmapEnabled }),
        },
        { icon: "shield", label: "Confidence", onPress: () => aiOverlay?.setSettings({ showLabels: true, enabled: true }) },
      ],
    },
    {
      id: "compare",
      label: "COMPARE",
      actions: [
        { active: compareMode, icon: "columns", label: "Compare", onPress: onCompareToggle },
        { active: compareLayout === "side-by-side", icon: "columns", label: "Side", onPress: () => onCompareLayoutChange?.("side-by-side") },
        { active: compareLayout === "overlay", icon: "layers", label: "Overlay", onPress: () => onCompareLayoutChange?.("overlay") },
        { active: compareLayout === "split", icon: "git-branch", label: "Diff", onPress: () => onCompareLayoutChange?.("split") },
      ],
    },
    {
      id: "report",
      label: "REPORT",
      actions: [
        { icon: "file-text", label: "PDF", onPress: onExportPdf, testID: "sprint18-export-pdf" },
        { icon: "image", label: "PNG", onPress: onExportPng, testID: "sprint18-export-png" },
        { icon: "code", label: "JSON", onPress: onExportJson },
        { icon: "grid", label: "CSV", onPress: onExportCsv },
        { icon: "file", label: "Preview", onPress: () => onViewModeChange?.("report"), testID: "sprint21-open-report" },
      ],
    },
    {
      id: "tools",
      label: "TOOLS",
      actions: [
        { active: workspace?.present.toolMode === "caliper", icon: "maximize", label: "Caliper", onPress: () => workspace?.setToolMode("caliper") },
        { active: measureActive, icon: "edit-3", label: "Manual", onPress: () => workspace?.setToolMode(measureActive ? "select" : "measurement") },
        { active: viewMode === "measurement", icon: "sliders", label: "Measure", onPress: () => onViewModeChange?.("measurement"), testID: "sprint21-measurement-mode" },
        { icon: "tool", label: "Settings", onPress: onOpenSettings },
        { icon: "menu", label: "Left", onPress: onToggleLeftPanel, testID: "sprint22-toggle-left-panel" },
        { icon: "columns", label: "Right", onPress: onToggleRightPanel, testID: "sprint22-toggle-right-panel" },
        { icon: "settings", label: "Theme", onPress: onToggleTheme },
      ],
    },
  ];

  return (
    <View nativeID="sprint21-ecg-workstation-toolbar" style={styles.toolbar} testID="sprint24-hospital-ribbon-toolbar">
      <View style={styles.ribbonWrap}>
        {groups.map((group) => (
          <ToolGroupSection key={group.id} group={group} />
        ))}
      </View>
      {recentCaseId ? <Text style={styles.recentHint}>Recent case loaded</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  group: {
    borderRightColor: "rgba(30,58,74,0.9)",
    borderRightWidth: 1,
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  groupLabel: {
    color: medicalTheme.muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  groupRow: { flexDirection: "row", flexWrap: "wrap", gap: ECG_WORKSTATION_VISUAL.toolbarGroupGap, maxWidth: 480 },
  recentHint: { color: medicalTheme.muted, fontSize: 9, fontWeight: "700", paddingHorizontal: 8, paddingBottom: 4 },
  ribbonWrap: { flexDirection: "row", flexWrap: "wrap", gap: 2, paddingHorizontal: 4, paddingVertical: 4 },
  toolButton: {
    alignItems: "center",
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    height: ECG_WORKSTATION_VISUAL.toolbarButtonHeight,
    justifyContent: "center",
    minWidth: ECG_WORKSTATION_VISUAL.toolbarButtonMinWidth,
    paddingHorizontal: 5,
    paddingVertical: 4,
  },
  toolButtonActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  toolButtonDisabled: { opacity: 0.45 },
  toolButtonHover: { borderColor: medicalTheme.primary },
  toolLabel: { color: medicalTheme.muted, fontSize: 8, fontWeight: "800", maxWidth: 52, textAlign: "center" },
  toolLabelActive: { color: "#03131B" },
  toolbar: {
    backgroundColor: "#040E1A",
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
    overflow: "hidden",
  },
});
