import { Feather } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_ENTERPRISE_DESIGN } from "./ecgEnterpriseDesignTokens";
import { EcgWorkstationTooltip } from "./EcgWorkstationTooltip";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import type { EcgCompareLayoutMode, EcgLeadId, EcgWorkstationViewMode } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";
import type { EcgWaveformPlaybackState } from "./useEcgWaveformPlayback";

type IconName = keyof typeof Feather.glyphMap;

type ToolAction = {
  active?: boolean;
  description?: string;
  disabled?: boolean;
  icon: IconName;
  label: string;
  onPress?: () => void;
  shortcut?: string;
  testID?: string;
};

function CompactToolButton({ action }: { action: ToolAction }) {
  return (
    <EcgWorkstationTooltip description={action.description} label={action.label} shortcut={action.shortcut}>
      <Pressable
        accessibilityLabel={action.label}
        accessibilityRole="button"
        disabled={action.disabled || !action.onPress}
        onPress={action.onPress}
        style={({ hovered, pressed }) => [
          styles.btn,
          action.active && styles.btnActive,
          hovered && styles.btnHover,
          pressed && styles.btnPressed,
          action.disabled && styles.btnDisabled,
        ]}
        testID={action.testID}
      >
        <Feather color={action.active ? ECG_COCKPIT_COLORS.bgDeep : ECG_COCKPIT_COLORS.accent} name={action.icon} size={11} />
      </Pressable>
    </EcgWorkstationTooltip>
  );
}

function primaryStrip(input: {
  aiOverlay?: EcgAiOverlayWorkspace;
  compareMode: boolean;
  controls: EcgViewerControls;
  onCompareToggle?: () => void;
  onDigitize?: () => void;
  onEnterDiagnostic?: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onOpenCases?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenSettings?: () => void;
  onSave?: () => void;
  onUpload?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  viewMode: EcgWorkstationViewMode;
}): ToolAction[] {
  const overlayEnabled = input.aiOverlay?.present.settings.enabled ?? false;
  return [
    { description: "Open an ECG case from the case list.", icon: "folder", label: "Open", onPress: input.onOpenCases, shortcut: "Ctrl+O" },
    { description: "Upload a new ECG tracing.", icon: "upload", label: "Upload", onPress: input.onUpload, shortcut: "Ctrl+U" },
    { description: "Save current workspace state.", icon: "save", label: "Save", onPress: input.onSave, shortcut: "Ctrl+S" },
    { active: input.viewMode === "measurement", description: "Open measurement studio tools.", icon: "sliders", label: "Measure", onPress: () => input.onViewModeChange?.("measurement"), testID: "sprint21-measurement-mode" },
    { active: input.viewMode === "ai-review" || input.viewMode === "overlay", description: "Review AI findings and overlays.", icon: "eye", label: "AI Review", onPress: () => input.onViewModeChange?.("ai-review") },
    { active: overlayEnabled, description: "Toggle AI heatmap overlay.", icon: "aperture", label: "Overlay", onPress: () => input.aiOverlay?.toggleOverlay() },
    { active: input.compareMode, description: "Compare with a prior study.", icon: "columns", label: "Compare", onPress: input.onCompareToggle },
    { description: "Export report as PDF.", icon: "file-text", label: "Export PDF", onPress: input.onExportPdf, testID: "sprint18-export-pdf" },
    { description: "Export viewport as PNG.", icon: "image", label: "Export PNG", onPress: input.onExportPng, testID: "sprint18-export-png" },
    { description: "Run ECG digitization pipeline.", icon: "cpu", label: "Digitize", onPress: input.onDigitize, testID: "sprint18-digitize" },
    { description: "Open command palette.", icon: "command", label: "Commands", onPress: input.onOpenCommandPalette, shortcut: "Ctrl+K", testID: "sprint25-open-command-palette" },
    { description: "Viewer and overlay settings.", icon: "tool", label: "Settings", onPress: input.onOpenSettings },
    { description: "Enter diagnostic fullscreen mode.", icon: "maximize", label: "Fullscreen", onPress: input.onEnterDiagnostic, shortcut: "F11", testID: "sprint29-diagnostic-mode" },
  ];
}

/** Sprint 33 — ultra-compact icon command strip (~40% shorter than Sprint 32). */
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
  onSave?: () => void;
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
  const actions = useMemo(() => primaryStrip(props), [props]);

  return (
    <View nativeID="sprint35-compact-toolbar" style={styles.toolbar} testID="sprint35-compact-toolbar">
      <View style={styles.row}>
        {actions.map((action) => (
          <CompactToolButton action={action} key={action.label} />
        ))}
      </View>
    </View>
  );
});

const btnSize = ECG_WORKSTATION_VISUAL.toolbarButtonSize;

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: ECG_ENTERPRISE_DESIGN.radius.sm,
    borderWidth: 1,
    height: btnSize,
    justifyContent: "center",
    transitionDuration: "150ms",
    width: btnSize,
  } as never,
  btnActive: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderColor: ECG_COCKPIT_COLORS.accent },
  btnDisabled: { opacity: 0.4 },
  btnHover: { borderColor: ECG_COCKPIT_COLORS.accentMuted },
  btnPressed: { opacity: 0.88, transform: [{ scale: 0.96 }] },
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: ECG_WORKSTATION_VISUAL.toolbarGroupGap,
    maxHeight: ECG_WORKSTATION_VISUAL.toolbarMaxHeight,
    overflow: "hidden",
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  toolbar: {
    backgroundColor: ECG_COCKPIT_COLORS.bgDeep,
    borderBottomColor: ECG_COCKPIT_COLORS.border,
    borderBottomWidth: 1,
    flexShrink: 0,
    zIndex: 20,
  },
});

export const EcgWorkstationToolbar = EcgZeroChromeToolbar;
