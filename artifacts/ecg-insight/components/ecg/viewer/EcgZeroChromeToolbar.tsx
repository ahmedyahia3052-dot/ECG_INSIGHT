import { Feather } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_ENTERPRISE_DESIGN } from "./ecgEnterpriseDesignTokens";
import { EcgWorkstationTooltip } from "./EcgWorkstationTooltip";
import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";
import type { EcgCompareLayoutMode, EcgLeadId, EcgLeadLayoutMode, EcgWorkstationViewMode } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

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

function ToolbarGroup({ actions, label, testID }: { actions: ToolAction[]; label: string; testID: string }) {
  if (!actions.length) return null;
  return (
    <View style={styles.group} testID={testID}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupRow}>
        {actions.map((action) => (
          <CompactToolButton action={action} key={`${label}-${action.label}`} />
        ))}
      </View>
    </View>
  );
}

function buildGroups(input: {
  aiOverlay?: EcgAiOverlayWorkspace;
  compareMode: boolean;
  controls: EcgViewerControls;
  onCompareToggle?: () => void;
  onDigitize?: () => void;
  onEnterDiagnostic?: () => void;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onViewModeChange?: (mode: EcgWorkstationViewMode) => void;
  viewMode: EcgWorkstationViewMode;
  workspace?: EcgMeasurementWorkspace;
}) {
  const overlayEnabled = input.aiOverlay?.present.settings.enabled ?? false;
  return {
    analysis: [
      {
        active: input.viewMode === "measurement",
        description: "Open measurement studio.",
        icon: "sliders" as IconName,
        label: "Measurements",
        onPress: () => input.onViewModeChange?.("measurement"),
        testID: "sprint52-toolbar-measurements",
      },
      {
        active: input.viewMode === "ai-review" || input.viewMode === "overlay",
        description: "AI interpretation review.",
        icon: "cpu" as IconName,
        label: "AI",
        onPress: () => input.onViewModeChange?.("ai-review"),
        testID: "sprint52-toolbar-ai",
      },
    ],
    annotations: [
      {
        description: "Export measurements CSV.",
        icon: "download" as IconName,
        label: "Export",
        onPress: input.onExportCsv,
        testID: "sprint52-toolbar-export",
      },
    ],
    image: [
      {
        active: input.viewMode === "image",
        description: "Original uploaded tracing.",
        icon: "image" as IconName,
        label: "Original",
        onPress: () => input.onViewModeChange?.("image"),
        testID: "sprint52-toolbar-original",
      },
      {
        active: input.viewMode === "processed",
        description: "Processed enhancement view.",
        icon: "filter" as IconName,
        label: "Processed",
        onPress: () => input.onViewModeChange?.("processed"),
        testID: "sprint52-toolbar-processed",
      },
      {
        active: input.viewMode === "waveform",
        description: "Digitized signal view.",
        icon: "activity" as IconName,
        label: "Digitized",
        onPress: () => input.onViewModeChange?.("waveform"),
        testID: "sprint52-toolbar-digitized",
      },
      {
        active: overlayEnabled || input.viewMode === "overlay",
        description: "Toggle AI overlay.",
        icon: "aperture" as IconName,
        label: "Overlay",
        onPress: () => {
          input.onViewModeChange?.("overlay");
          input.aiOverlay?.toggleOverlay();
        },
        testID: "sprint52-toolbar-overlay",
      },
    ],
    report: [
      {
        description: "Generate clinical report.",
        icon: "file-text" as IconName,
        label: "Report",
        onPress: () => input.onViewModeChange?.("report"),
        testID: "sprint52-toolbar-report",
      },
      {
        active: input.compareMode,
        description: "Compare with prior study.",
        icon: "columns" as IconName,
        label: "Compare",
        onPress: input.onCompareToggle,
        testID: "sprint52-toolbar-compare",
      },
      {
        description: "Print or export PDF.",
        icon: "printer" as IconName,
        label: "Print",
        onPress: input.onExportPdf,
        testID: "sprint52-toolbar-print",
      },
      {
        description: "Export PDF report.",
        icon: "download" as IconName,
        label: "Export PDF",
        onPress: input.onExportPdf,
        testID: "sprint18-export-pdf",
      },
    ],
    view: [
      {
        description: "Fit tracing to viewport width (~90%).",
        icon: "maximize-2" as IconName,
        label: "Fit Width",
        onPress: () => input.controls.applyFit("width"),
        testID: "sprint52-fit-width",
      },
      {
        description: "Fit tracing to viewport height.",
        icon: "maximize" as IconName,
        label: "Fit Height",
        onPress: () => input.controls.applyFit("height"),
        testID: "sprint52-fit-height",
      },
      {
        description: "Fit entire page in viewport.",
        icon: "square" as IconName,
        label: "Fit Page",
        onPress: () => input.controls.applyFit("contain"),
        testID: "sprint52-fit-page",
      },
      {
        active: input.controls.fitMode === "100",
        description: "Actual size (100%).",
        icon: "crosshair" as IconName,
        label: "100%",
        onPress: () => input.controls.applyFit("100"),
        testID: "sprint52-zoom-100",
      },
      {
        active: input.controls.fitMode === "150",
        description: "150% magnification.",
        icon: "zoom-in" as IconName,
        label: "150%",
        onPress: () => input.controls.applyFit("150"),
        testID: "sprint52-zoom-150",
      },
      {
        active: input.controls.fitMode === "200",
        description: "200% magnification.",
        icon: "zoom-in" as IconName,
        label: "200%",
        onPress: () => input.controls.applyFit("200"),
        testID: "sprint52-zoom-200",
      },
      {
        active: input.controls.fitMode === "300",
        description: "300% magnification.",
        icon: "zoom-in" as IconName,
        label: "300%",
        onPress: () => input.controls.applyFit("300"),
        testID: "sprint52-zoom-300",
      },
      {
        description: "Rotate tracing 90°.",
        icon: "rotate-cw" as IconName,
        label: "Rotate",
        onPress: input.controls.rotate,
        testID: "sprint52-toolbar-rotate",
      },
      {
        description: "Increase contrast.",
        icon: "sun" as IconName,
        label: "Contrast",
        onPress: () => input.controls.adjustContrast(8),
        testID: "sprint52-toolbar-contrast",
      },
      {
        description: "Adjust brightness.",
        icon: "sun" as IconName,
        label: "Brightness",
        onPress: () => input.controls.adjustBrightness(8),
        testID: "sprint52-toolbar-brightness",
      },
      {
        description: "Enter diagnostic fullscreen.",
        icon: "maximize-2" as IconName,
        label: "Fullscreen",
        onPress: input.onEnterDiagnostic,
        shortcut: "F11",
        testID: "sprint29-diagnostic-mode",
      },
    ],
  };
}

/** Sprint 52 — grouped professional interpretation toolbar. */
export const EcgZeroChromeToolbar = memo(function EcgZeroChromeToolbar(props: {
  aiOverlay?: EcgAiOverlayWorkspace;
  compareLayout: EcgCompareLayoutMode;
  compareMode: boolean;
  controls: EcgViewerControls;
  leadLayout?: EcgLeadLayoutMode;
  onCompareLayoutChange?: (layout: EcgCompareLayoutMode) => void;
  onCompareToggle?: () => void;
  onDigitize?: () => void;
  onEnterDiagnostic?: () => void;
  onExportCsv?: () => void;
  onExportJson?: () => void;
  onExportPdf?: () => void;
  onExportPng?: () => void;
  onLeadCycle?: () => void;
  onLeadLayoutChange?: (layout: EcgLeadLayoutMode) => void;
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
  selectedLead: EcgLeadId;
  showCrosshair?: boolean;
  showMagnifier?: boolean;
  viewMode: EcgWorkstationViewMode;
  workspace?: EcgMeasurementWorkspace;
}) {
  const groups = useMemo(() => buildGroups(props), [props]);

  return (
    <View nativeID="sprint52-grouped-toolbar" style={styles.toolbar} testID="sprint52-grouped-toolbar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
        <ToolbarGroup actions={groups.image} label="IMAGE" testID="sprint52-toolbar-group-image" />
        <ToolbarGroup actions={groups.view} label="VIEW" testID="sprint52-toolbar-group-view" />
        <ToolbarGroup actions={groups.analysis} label="ANALYSIS" testID="sprint52-toolbar-group-analysis" />
        <ToolbarGroup actions={groups.annotations} label="ANNOTATIONS" testID="sprint52-toolbar-group-annotations" />
        <ToolbarGroup actions={groups.report} label="REPORT" testID="sprint52-toolbar-group-report" />
      </ScrollView>
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
  group: {
    alignItems: "center",
    borderRightColor: ECG_COCKPIT_COLORS.border,
    borderRightWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginRight: 6,
    paddingRight: 6,
  },
  groupLabel: {
    color: ECG_COCKPIT_COLORS.textMuted,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginRight: 2,
  },
  groupRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: ECG_WORKSTATION_VISUAL.toolbarGroupGap,
  },
  scrollRow: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: ECG_WORKSTATION_VISUAL.toolbarMaxHeight,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  toolbar: {
    backgroundColor: ECG_COCKPIT_COLORS.bgDeep,
    borderBottomColor: ECG_COCKPIT_COLORS.border,
    borderBottomWidth: 1,
    flexShrink: 0,
    maxHeight: ECG_WORKSTATION_VISUAL.toolbarMaxHeight + 8,
    zIndex: 20,
  },
});

export const EcgWorkstationToolbar = EcgZeroChromeToolbar;
