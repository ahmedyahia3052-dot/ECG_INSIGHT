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
      <Feather color={action.active ? "#03131B" : medicalTheme.primary} name={action.icon} size={15} />
      <Text style={[styles.toolLabel, action.active && styles.toolLabelActive]} numberOfLines={1}>
        {action.label}
      </Text>
    </Pressable>
  );
}

function ToolGroupSection({ group }: { group: ToolGroup }) {
  return (
    <View style={styles.group} testID={`sprint18-toolbar-group-${group.id}`}>
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
  onOpenSettings,
  onRhythmStrip,
  onToggleLeadFocus,
  onToggleTheme,
  onUpload,
  onViewModeChange,
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
  onOpenSettings?: () => void;
  onRhythmStrip?: () => void;
  onToggleLeadFocus?: () => void;
  onToggleTheme?: () => void;
  onUpload?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  selectedLead: EcgLeadId;
  showDigitizedWaveform: boolean;
  viewMode: EcgWorkstationViewMode;
  workspace?: EcgMeasurementWorkspace;
}) {
  const overlayEnabled = aiOverlay?.present.settings.enabled ?? false;
  const measureActive = workspace?.present.toolMode === "caliper" || workspace?.present.toolMode === "measurement";

  const groups: ToolGroup[] = [
    {
      id: "file",
      label: "FILE",
      actions: [
        { icon: "folder", label: "Open", onPress: onCapture, shortcut: "Ctrl+O" },
        { icon: "upload", label: "Upload", onPress: onUpload, shortcut: "Ctrl+U" },
        { icon: "camera", label: "Capture", onPress: onCapture },
        { icon: "file-text", label: "PDF", onPress: onExportPdf, testID: "sprint18-export-pdf" },
        { icon: "image", label: "Export PNG", onPress: onExportPng, testID: "sprint18-export-png" },
        { icon: "code", label: "JSON", onPress: onExportJson },
        { icon: "grid", label: "CSV", onPress: onExportCsv },
      ],
    },
    {
      id: "viewer",
      label: "VIEWER",
      actions: [
        { icon: "zoom-in", label: "Zoom In", onPress: () => controls.zoomBy(0.2), shortcut: "Ctrl++" },
        { icon: "zoom-out", label: "Zoom Out", onPress: () => controls.zoomBy(-0.2), shortcut: "Ctrl+-" },
        { icon: "maximize-2", label: "Fit W", onPress: () => controls.applyFit("width") },
        { icon: "minimize-2", label: "Fit H", onPress: () => controls.applyFit("height") },
        { icon: "target", label: "100%", onPress: () => controls.applyFit("100"), shortcut: "Ctrl+0" },
        ...ECG_ZOOM_PRESETS.filter((p) => p > 1).map((preset) => ({
          active: Math.abs(controls.transform.zoom - preset) < 0.05,
          icon: "search" as IconName,
          label: `${preset * 100}%`,
          onPress: () => controls.setZoomPreset(preset),
          testID: `sprint18-zoom-${preset * 100}`,
        })),
        { active: controls.panMode === "active", icon: "move", label: "Pan", onPress: controls.togglePanMode },
        { icon: "rotate-cw", label: "Rotate", onPress: controls.rotate },
        { icon: "refresh-cw", label: "Reset", onPress: controls.resetView },
      ],
    },
    {
      id: "leads",
      label: "LEADS",
      actions: [
        { active: leadLayout === "12-lead", icon: "layers", label: "12 Lead", onPress: () => onLeadLayoutChange?.("12-lead") },
        { active: leadLayout === "single", icon: "activity", label: "Single", onPress: () => onLeadLayoutChange?.("single") },
        {
          active: leadLayout === "rhythm",
          icon: "bar-chart-2",
          label: "Rhythm",
          onPress: () => {
            onLeadLayoutChange?.("rhythm");
            onRhythmStrip?.();
          },
        },
        { icon: "crosshair", label: "Focus", onPress: onToggleLeadFocus },
        { icon: "chevrons-right", label: selectedLead, onPress: onLeadCycle },
      ],
    },
    {
      id: "clinical",
      label: "CLINICAL",
      actions: [
        { active: measureActive, icon: "edit-3", label: "Measure", onPress: () => workspace?.setToolMode(measureActive ? "select" : "measurement") },
        { active: workspace?.present.toolMode === "caliper", icon: "maximize", label: "Caliper", onPress: () => workspace?.setToolMode("caliper") },
        { active: compareMode, icon: "columns", label: "Compare", onPress: onCompareToggle },
        { icon: "cpu", label: "Digitize", onPress: onDigitize, testID: "sprint18-digitize" },
        {
          active: viewMode === "waveform" || showDigitizedWaveform,
          icon: "activity",
          label: "Wave",
          onPress: () => onViewModeChange?.(viewMode === "waveform" ? "image" : "waveform"),
        },
        { active: overlayEnabled, icon: "eye", label: "AI", onPress: () => aiOverlay?.toggleOverlay() },
        { active: viewMode === "overlay", icon: "aperture", label: "Explain", onPress: () => onViewModeChange?.("overlay") },
      ],
    },
    {
      id: "view",
      label: "VIEW",
      actions: [
        { active: controls.grid.visible, icon: "grid", label: "Grid", onPress: controls.toggleGrid },
        { icon: "activity", label: `Speed ${controls.grid.speed}`, onPress: controls.cycleSpeed, testID: "sprint18-speed" },
        { icon: "bar-chart-2", label: `Gain ${controls.grid.gain}`, onPress: controls.cycleGain, testID: "sprint18-gain" },
        { icon: "sun", label: "Bright+", onPress: () => controls.adjustBrightness(8) },
        { icon: "moon", label: "Bright−", onPress: () => controls.adjustBrightness(-8) },
        { icon: "sliders", label: "Contrast", onPress: () => controls.adjustContrast(8) },
        { icon: "monitor", label: "Monitor", onPress: () => onViewModeChange?.("monitor"), testID: "sprint18-monitor-mode" },
        { icon: "image", label: "Image", onPress: () => onViewModeChange?.("image") },
        { icon: "filter", label: "Processed", onPress: () => onViewModeChange?.("processed") },
        {
          icon: "layout",
          label: compareLayout === "side-by-side" ? "Side" : compareLayout === "overlay" ? "Overlay" : "Split",
          onPress: () => {
            const next: EcgCompareLayoutMode =
              compareLayout === "side-by-side" ? "overlay" : compareLayout === "overlay" ? "split" : "side-by-side";
            onCompareLayoutChange?.(next);
          },
        },
        { icon: "settings", label: "Theme", onPress: onToggleTheme },
        { icon: "maximize", label: controls.fullscreen ? "Exit FS" : "Full", onPress: controls.toggleFullscreen, shortcut: "F11" },
        { icon: "tool", label: "Settings", onPress: onOpenSettings },
      ],
    },
  ];

  return (
    <View style={styles.toolbar} testID="sprint18-ecg-workstation-toolbar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {groups.map((group) => (
          <ToolGroupSection key={group.id} group={group} />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  group: {
    borderRightColor: "rgba(30,58,74,0.9)",
    borderRightWidth: 1,
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
  groupRow: { flexDirection: "row", flexWrap: "nowrap", gap: 4 },
  scroll: { alignItems: "stretch", gap: 2, paddingHorizontal: 4, paddingVertical: 2 },
  toolButton: {
    alignItems: "center",
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    minWidth: 52,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  toolButtonActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  toolButtonDisabled: { opacity: 0.45 },
  toolButtonHover: { borderColor: medicalTheme.primary },
  toolLabel: { color: medicalTheme.muted, fontSize: 9, fontWeight: "800", maxWidth: 56, textAlign: "center" },
  toolLabelActive: { color: "#03131B" },
  toolbar: {
    backgroundColor: "#040E1A",
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
});
