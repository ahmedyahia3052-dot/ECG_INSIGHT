import { Feather } from "@expo/vector-icons";
import React, { memo, useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { ECG_ENTERPRISE_DESIGN } from "./ecgEnterpriseDesignTokens";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import type { EcgCompareLayoutMode, EcgLeadId, EcgWorkstationViewMode } from "./types";
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

type ToolGroupId = "FILE" | "VIEW" | "DIGITIZE" | "MONITOR" | "MEASURE" | "AI" | "COMPARE" | "EXPORT" | "REPORT";

const GROUP_ORDER: ToolGroupId[] = ["FILE", "VIEW", "DIGITIZE", "MONITOR", "MEASURE", "AI", "COMPARE", "EXPORT", "REPORT"];

function GroupChip({
  active,
  expanded,
  label,
  onPress,
}: {
  active: boolean;
  expanded: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label} tools`}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.groupChip,
        active && styles.groupChipActive,
        (hovered || pressed) && styles.groupChipHover,
      ]}
      testID={`sprint29-toolbar-group-${label.toLowerCase()}`}
      {...(Platform.OS === "web" ? ({ title: label } as never) : {})}
    >
      <Text style={[styles.groupLabel, active && styles.groupLabelActive]} numberOfLines={1}>
        {label}
      </Text>
      <Feather color={active ? "#03131B" : medicalTheme.muted} name={expanded ? "chevron-up" : "chevron-down"} size={10} />
    </Pressable>
  );
}

function IconButton({ action }: { action: ToolAction }) {
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
      {...(Platform.OS === "web" ? ({ title: action.shortcut ? `${action.label} (${action.shortcut})` : action.label } as never) : {})}
    >
      <Feather color={action.active ? "#03131B" : medicalTheme.primary} name={action.icon} size={15} />
    </Pressable>
  );
}

function contextualGroups(input: {
  aiOverlay?: EcgAiOverlayWorkspace;
  compareLayout: EcgCompareLayoutMode;
  compareMode: boolean;
  controls: EcgViewerControls;
  onCompareLayoutChange?: (layout: EcgCompareLayoutMode) => void;
  onCompareToggle?: () => void;
  onDigitize?: () => void;
  onEnterDiagnostic?: () => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onLeadCycle?: () => void;
  onOpenCases?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSettings?: () => void;
  onToggleCrosshair?: () => void;
  onToggleLeftPanel?: () => void;
  onToggleMagnifier?: () => void;
  onToggleRightPanel?: () => void;
  onUpload?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  playback?: EcgWaveformPlaybackState;
  selectedLead: EcgLeadId;
  showCrosshair?: boolean;
  showMagnifier?: boolean;
  viewMode: EcgWorkstationViewMode;
  workspace?: EcgMeasurementWorkspace;
}): Partial<Record<ToolGroupId, ToolAction[]>> {
  const overlayEnabled = input.aiOverlay?.present.settings.enabled ?? false;
  const measureActive = input.workspace?.present.toolMode === "caliper" || input.workspace?.present.toolMode === "measurement";

  const file: ToolAction[] = [
    { icon: "folder", label: "Open", onPress: input.onOpenCases, shortcut: "Ctrl+O" },
    { icon: "upload", label: "Upload", onPress: input.onUpload, shortcut: "Ctrl+U" },
    { icon: "command", label: "Commands", onPress: input.onOpenCommandPalette, shortcut: "Ctrl+K", testID: "sprint25-open-command-palette" },
    { icon: "tool", label: "Settings", onPress: input.onOpenSettings },
  ];

  const viewBase: ToolAction[] = [
    { icon: "folder", label: "Open", onPress: input.onOpenCases, shortcut: "Ctrl+O" },
    { icon: "crop", label: "Crop", onPress: () => input.controls.applyFit("height") },
    { icon: "zoom-in", label: "Zoom In", onPress: () => input.controls.zoomBy(0.2) },
    { icon: "zoom-out", label: "Zoom Out", onPress: () => input.controls.zoomBy(-0.2) },
    { active: input.controls.panMode === "active", icon: "move", label: "Pan", onPress: input.controls.togglePanMode },
    { icon: "maximize-2", label: "Fit Width", onPress: () => input.controls.applyFit("width") },
    { icon: "rotate-cw", label: "Rotate", onPress: input.controls.rotate },
    { icon: "sun", label: "Brightness +", onPress: () => input.controls.adjustBrightness(8) },
    { icon: "moon", label: "Brightness −", onPress: () => input.controls.adjustBrightness(-8) },
    { icon: "sliders", label: "Contrast +", onPress: () => input.controls.adjustContrast(8) },
    { icon: "minus", label: "Contrast −", onPress: () => input.controls.adjustContrast(-8) },
    { icon: "menu", label: "Left Panel", onPress: input.onToggleLeftPanel, testID: "sprint22-toggle-left-panel" },
    { icon: "columns", label: "Right Panel", onPress: input.onToggleRightPanel, testID: "sprint22-toggle-right-panel" },
    { icon: "maximize", label: "Diagnostic", onPress: input.onEnterDiagnostic, shortcut: "F11", testID: "sprint29-diagnostic-mode" },
  ];

  const digitize: ToolAction[] = [
    { icon: "cpu", label: "Digitize", onPress: input.onDigitize, testID: "sprint18-digitize" },
    { icon: "target", label: "Lead Detection", onPress: input.onLeadCycle },
    { icon: "grid", label: "Grid Detection", onPress: input.controls.toggleGrid },
    { icon: "crosshair", label: "Calibration", onPress: input.controls.toggleCustomCalibration },
    { icon: "activity", label: "Vectorization", onPress: input.onDigitize, testID: "sprint29-vectorize" },
    { icon: "bar-chart-2", label: `Gain ${input.controls.grid.gain}`, onPress: input.controls.cycleGain, testID: "sprint18-gain" },
    { icon: "activity", label: `Speed ${input.controls.grid.speed}`, onPress: input.controls.cycleSpeed, testID: "sprint18-speed" },
    { icon: "refresh-cw", label: "Baseline Reset", onPress: input.controls.resetView },
  ];

  const monitor: ToolAction[] = [
    { icon: input.playback?.isPlaying ? "pause" : "play", label: input.playback?.isPlaying ? "Pause" : "Play", onPress: input.playback?.togglePlay },
    { active: input.playback?.loop, icon: "repeat", label: "Loop", onPress: () => input.playback?.setLoop(!input.playback?.loop) },
    { active: input.playback?.frozen, icon: "pause-circle", label: "Freeze", onPress: () => input.playback?.setFrozen(!input.playback?.frozen) },
    { icon: "bar-chart-2", label: `Gain ${input.controls.grid.gain}`, onPress: input.controls.cycleGain },
    { icon: "activity", label: `Speed ${input.controls.grid.speed}`, onPress: input.controls.cycleSpeed },
    { active: input.controls.grid.visible, icon: "grid", label: "Grid", onPress: input.controls.toggleGrid },
    { icon: "filter", label: "Filter", onPress: input.controls.cycleGridOpacity },
  ];

  const measure: ToolAction[] = [
    { active: input.viewMode === "measurement", icon: "sliders", label: "Measure", onPress: () => input.onViewModeChange?.("measurement"), testID: "sprint21-measurement-mode" },
    { active: input.workspace?.present.toolMode === "caliper", icon: "maximize", label: "Caliper", onPress: () => input.workspace?.setToolMode("caliper") },
    { active: measureActive, icon: "edit-3", label: "Manual", onPress: () => input.workspace?.setToolMode(measureActive ? "select" : "measurement") },
    { active: input.showCrosshair, icon: "crosshair", label: "Crosshair", onPress: input.onToggleCrosshair, testID: "sprint25-toggle-crosshair" },
    { active: input.showMagnifier, icon: "search", label: "Magnifier", onPress: input.onToggleMagnifier, testID: "sprint25-toggle-magnifier" },
    { icon: "chevrons-right", label: `Lead ${input.selectedLead}`, onPress: input.onLeadCycle },
  ];

  const ai: ToolAction[] = [
    { active: input.viewMode === "ai-review" || input.viewMode === "overlay", icon: "eye", label: "AI Review", onPress: () => input.onViewModeChange?.("ai-review") },
    { active: overlayEnabled, icon: "aperture", label: "Heatmap", onPress: () => input.aiOverlay?.toggleOverlay() },
    { icon: "activity", label: "Explainability", onPress: () => input.aiOverlay?.setSettings({ showHeatmap: true, showLabels: true }) },
    { icon: "bar-chart", label: "Confidence", onPress: () => input.onViewModeChange?.("ai-review"), testID: "sprint29-ai-confidence" },
    { icon: "alert-triangle", label: "Severity", onPress: () => input.onViewModeChange?.("ai-review") },
  ];

  const compare: ToolAction[] = [
    { active: input.compareMode, icon: "columns", label: "Compare", onPress: input.onCompareToggle },
    { active: input.compareLayout === "overlay", icon: "layers", label: "Overlay", onPress: () => input.onCompareLayoutChange?.("overlay") },
    { active: input.compareLayout === "side-by-side", icon: "columns", label: "Split", onPress: () => input.onCompareLayoutChange?.("side-by-side") },
    { icon: "git-branch", label: "Sync", onPress: () => input.onCompareLayoutChange?.("split") },
  ];

  const exportGroup: ToolAction[] = [
    { icon: "file-text", label: "PDF", onPress: input.onExportPdf, testID: "sprint18-export-pdf" },
    { icon: "image", label: "PNG", onPress: input.onExportPng, testID: "sprint18-export-png" },
    { icon: "code", label: "JSON", onPress: input.onExportJson },
    { icon: "grid", label: "CSV", onPress: input.onExportCsv },
  ];

  const report: ToolAction[] = [
    { icon: "file", label: "Report Preview", onPress: () => input.onViewModeChange?.("report"), testID: "sprint21-open-report" },
    { active: input.viewMode === "monitor", icon: "monitor", label: "Live Monitor", onPress: () => input.onViewModeChange?.("monitor"), testID: "sprint18-monitor-mode" },
  ];

  const all: Record<ToolGroupId, ToolAction[]> = {
    AI: ai,
    COMPARE: compare,
    DIGITIZE: digitize,
    EXPORT: exportGroup,
    FILE: file,
    MEASURE: measure,
    MONITOR: monitor,
    REPORT: report,
    VIEW: viewBase,
  };

  const mode = input.viewMode;
  if (mode === "image" || mode === "processed") {
    return { FILE: file, VIEW: viewBase, EXPORT: exportGroup, REPORT: report };
  }
  if (mode === "waveform") {
    return { FILE: file, DIGITIZE: digitize, MEASURE: measure, EXPORT: exportGroup };
  }
  if (mode === "monitor") {
    return { FILE: file, MONITOR: monitor, MEASURE: measure, EXPORT: exportGroup };
  }
  if (mode === "ai-review" || mode === "overlay") {
    return { FILE: file, AI: ai, MEASURE: measure, EXPORT: exportGroup };
  }
  if (mode === "compare") {
    return { FILE: file, COMPARE: compare, VIEW: viewBase, EXPORT: exportGroup };
  }
  if (mode === "measurement") {
    return { FILE: file, MEASURE: measure, VIEW: viewBase, EXPORT: exportGroup };
  }
  if (mode === "report") {
    return { FILE: file, REPORT: report, EXPORT: exportGroup };
  }
  return all;
}

/** Sprint 29 — zero-chrome contextual toolbar with collapsible smart groups. */
export const EcgZeroChromeToolbar = memo(function EcgZeroChromeToolbar(props: {
  aiOverlay?: EcgAiOverlayWorkspace;
  compareLayout: EcgCompareLayoutMode;
  compareMode: boolean;
  controls: EcgViewerControls;
  onCompareLayoutChange?: (layout: EcgCompareLayoutMode) => void;
  onCompareToggle?: () => void;
  onDigitize?: () => void;
  onEnterDiagnostic?: () => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onLeadCycle?: () => void;
  onOpenCases?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSettings?: () => void;
  onToggleCrosshair?: () => void;
  onToggleLeftPanel?: () => void;
  onToggleMagnifier?: () => void;
  onToggleRightPanel?: () => void;
  onUpload?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  playback?: EcgWaveformPlaybackState;
  selectedLead: EcgLeadId;
  showCrosshair?: boolean;
  showMagnifier?: boolean;
  viewMode: EcgWorkstationViewMode;
  workspace?: EcgMeasurementWorkspace;
}) {
  const groups = useMemo(() => contextualGroups(props), [props]);
  const visibleGroupIds = GROUP_ORDER.filter((id) => (groups[id]?.length ?? 0) > 0);
  const [expandedGroup, setExpandedGroup] = useState<ToolGroupId | null>(visibleGroupIds[0] ?? "FILE");

  const expandedActions = expandedGroup ? groups[expandedGroup] ?? [] : [];

  return (
    <View nativeID="sprint26-compact-ribbon" style={styles.toolbar} testID="sprint29-zero-chrome-toolbar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} style={styles.scroll}>
        {visibleGroupIds.map((groupId) => (
          <GroupChip
            active={expandedGroup === groupId}
            expanded={expandedGroup === groupId}
            key={groupId}
            label={groupId}
            onPress={() => setExpandedGroup((current) => (current === groupId ? null : groupId))}
          />
        ))}
        {expandedActions.length ? <View style={styles.divider} /> : null}
        {expandedActions.map((action) => (
          <IconButton action={action} key={`${expandedGroup}-${action.label}`} />
        ))}
      </ScrollView>
    </View>
  );
});

const btnSize = ECG_WORKSTATION_VISUAL.toolbarButtonSize;

const styles = StyleSheet.create({
  divider: { alignSelf: "stretch", backgroundColor: ECG_ENTERPRISE_DESIGN.border.hairline, marginHorizontal: 4, width: 1 },
  groupChip: {
    alignItems: "center",
    backgroundColor: ECG_ENTERPRISE_DESIGN.color.surface,
    borderColor: medicalTheme.border,
    borderRadius: ECG_ENTERPRISE_DESIGN.radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    height: 32,
    paddingHorizontal: 8,
  },
  groupChipActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  groupChipHover: { borderColor: medicalTheme.primary },
  groupLabel: { color: medicalTheme.muted, fontSize: 9, fontWeight: "900", letterSpacing: 0.4 },
  groupLabelActive: { color: "#03131B" },
  iconBtn: {
    alignItems: "center",
    backgroundColor: ECG_ENTERPRISE_DESIGN.color.surface,
    borderColor: medicalTheme.border,
    borderRadius: ECG_ENTERPRISE_DESIGN.radius.sm,
    borderWidth: 1,
    height: btnSize,
    justifyContent: "center",
    width: btnSize,
  },
  iconBtnActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  iconBtnDisabled: { opacity: 0.45 },
  iconBtnHover: { borderColor: medicalTheme.primary },
  row: { alignItems: "center", flexDirection: "row", gap: ECG_WORKSTATION_VISUAL.toolbarGroupGap, paddingHorizontal: 4, paddingVertical: 2 },
  scroll: { flexGrow: 0, maxHeight: ECG_WORKSTATION_VISUAL.toolbarMaxHeight },
  toolbar: {
    backgroundColor: ECG_ENTERPRISE_DESIGN.color.chrome,
    borderColor: medicalTheme.border,
    borderRadius: ECG_ENTERPRISE_DESIGN.radius.md,
    borderWidth: 1,
    flexShrink: 0,
    maxHeight: ECG_WORKSTATION_VISUAL.toolbarMaxHeight,
    overflow: "hidden",
  },
});

/** Backward-compatible export for existing imports. */
export const EcgWorkstationToolbar = EcgZeroChromeToolbar;
