import { Feather } from "@expo/vector-icons";
import React, { memo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { ECG_ZOOM_PRESETS } from "./ecgImageEngine";
import type { EcgCompareLayoutMode, EcgLeadId, EcgLeadLayoutMode, EcgWorkstationViewMode } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

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
    <View style={styles.group} testID={`sprint21-toolbar-group-${group.id}`}>
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
      id: "digitize",
      label: "DIGITIZE",
      actions: [
        { icon: "cpu", label: "Run", onPress: onDigitize, testID: "sprint18-digitize" },
        { active: viewMode === "processed", icon: "filter", label: "Processed", onPress: () => onViewModeChange?.("processed") },
        { active: viewMode === "waveform", icon: "activity", label: "Digitized", onPress: () => onViewModeChange?.("waveform") },
        { active: viewMode === "monitor", icon: "monitor", label: "Monitor", onPress: () => onViewModeChange?.("monitor"), testID: "sprint18-monitor-mode" },
        { icon: "chevrons-right", label: selectedLead, onPress: onLeadCycle },
        { icon: "activity", label: `Speed ${controls.grid.speed}`, onPress: controls.cycleSpeed, testID: "sprint18-speed" },
        { icon: "bar-chart-2", label: `Gain ${controls.grid.gain}`, onPress: controls.cycleGain, testID: "sprint18-gain" },
      ],
    },
    {
      id: "measure",
      label: "MEASURE",
      actions: [
        { active: workspace?.present.toolMode === "caliper", icon: "maximize", label: "Caliper", onPress: () => workspace?.setToolMode("caliper") },
        { active: measureActive, icon: "edit-3", label: "Manual", onPress: () => workspace?.setToolMode(measureActive ? "select" : "measurement") },
        { active: viewMode === "measurement", icon: "sliders", label: "Mode", onPress: () => onViewModeChange?.("measurement"), testID: "sprint21-measurement-mode" },
        { active: compareMode, icon: "columns", label: "Compare", onPress: onCompareToggle },
      ],
    },
    {
      id: "ai",
      label: "AI",
      actions: [
        { active: viewMode === "ai-review" || viewMode === "overlay", icon: "eye", label: "Review", onPress: () => onViewModeChange?.("ai-review") },
        { active: overlayEnabled, icon: "aperture", label: "Explain", onPress: () => aiOverlay?.toggleOverlay() },
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
      id: "export",
      label: "EXPORT",
      actions: [
        { icon: "file-text", label: "PDF", onPress: onExportPdf, testID: "sprint18-export-pdf" },
        { icon: "image", label: "PNG", onPress: onExportPng, testID: "sprint18-export-png" },
        { icon: "grid", label: "CSV", onPress: onExportCsv },
        { icon: "code", label: "JSON", onPress: onExportJson },
        { icon: "file", label: "Report", onPress: () => onViewModeChange?.("report"), testID: "sprint21-open-report" },
      ],
    },
    {
      id: "display",
      label: "DISPLAY",
      actions: [
        { active: controls.grid.visible, icon: "grid", label: "Grid", onPress: controls.toggleGrid },
        { icon: "sun", label: "Bright+", onPress: () => controls.adjustBrightness(8) },
        { icon: "moon", label: "Bright−", onPress: () => controls.adjustBrightness(-8) },
        { icon: "sliders", label: "Contrast", onPress: () => controls.adjustContrast(8) },
        { icon: "settings", label: "Theme", onPress: onToggleTheme },
        { active: leadLayout === "12-lead", icon: "layers", label: "12 Lead", onPress: () => onLeadLayoutChange?.("12-lead") },
        { icon: "crosshair", label: "Focus", onPress: onToggleLeadFocus },
      ],
    },
    {
      id: "tools",
      label: "TOOLS",
      actions: [
        { icon: "tool", label: "Settings", onPress: onOpenSettings },
        {
          icon: "layout",
          label: compareLayout === "side-by-side" ? "Side" : compareLayout === "overlay" ? "Overlay" : "Split",
          onPress: () => {
            const next: EcgCompareLayoutMode =
              compareLayout === "side-by-side" ? "overlay" : compareLayout === "overlay" ? "split" : "side-by-side";
            onCompareLayoutChange?.(next);
          },
        },
        {
          active: leadLayout === "rhythm",
          icon: "bar-chart",
          label: "Rhythm",
          onPress: () => {
            onLeadLayoutChange?.("rhythm");
            onRhythmStrip?.();
          },
        },
        { icon: "menu", label: "Left", onPress: onToggleLeftPanel, testID: "sprint22-toggle-left-panel" },
        { icon: "columns", label: "Right", onPress: onToggleRightPanel, testID: "sprint22-toggle-right-panel" },
      ],
    },
  ];

  return (
    <View style={styles.toolbar} testID="sprint22-hospital-workstation-toolbar" nativeID="sprint21-ecg-workstation-toolbar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {groups.map((group) => (
          <ToolGroupSection key={group.id} group={group} />
        ))}
      </ScrollView>
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
  groupRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, maxWidth: 420 },
  recentHint: { color: medicalTheme.muted, fontSize: 9, fontWeight: "700", paddingHorizontal: 8, paddingBottom: 4 },
  scroll: { alignItems: "stretch", gap: 2, paddingHorizontal: 4, paddingVertical: 2 },
  toolButton: {
    alignItems: "center",
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    height: 48,
    justifyContent: "center",
    minWidth: 50,
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
