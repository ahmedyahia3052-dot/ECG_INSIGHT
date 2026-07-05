import React, { useCallback } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";

import { PrimaryButton, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import { downloadEcgViewerWorkspacePdf, downloadEcgViewerWorkspaceJson } from "@/services/ecgViewerWorkspace";

import { exportMeasurements } from "./ecgMeasurementEngine";
import type { EcgLeadId } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  accessToken?: string;
  aiOverlay?: EcgAiOverlayWorkspace;
  caseId?: string;
  compareMode?: boolean;
  controls: EcgViewerControls;
  imageUrl?: string;
  nextCaseId?: string;
  onCapture?: () => void;
  onCompareToggle?: () => void;
  onLeadCycle?: () => void;
  onNextStudy?: () => void;
  onOpen?: () => void;
  onOpenSettings?: () => void;
  onPreviousStudy?: () => void;
  onToggleDigitized?: () => void;
  onUpload?: () => void;
  pdfUrl?: string;
  selectedLead?: EcgLeadId;
  showDigitizedWaveform?: boolean;
  workspace?: EcgMeasurementWorkspace;
};

export function EcgViewerToolbar({
  accessToken,
  aiOverlay,
  caseId,
  compareMode = false,
  controls,
  imageUrl,
  nextCaseId,
  onCapture,
  onCompareToggle,
  onLeadCycle,
  onNextStudy,
  onOpen,
  onOpenSettings,
  onPreviousStudy,
  onToggleDigitized,
  onUpload,
  pdfUrl,
  selectedLead = "II",
  showDigitizedWaveform = true,
  workspace,
}: Props) {
  const exportTarget = imageUrl ?? pdfUrl;
  const measureActive = workspace?.present.toolMode === "caliper" || workspace?.present.toolMode === "measurement";
  const overlaySettings = aiOverlay?.present.settings;
  const overlayEnabled = overlaySettings?.enabled ?? false;

  const exportPdf = useCallback(async () => {
    if (accessToken && caseId && Platform.OS === "web" && typeof window !== "undefined") {
      const blob = await downloadEcgViewerWorkspacePdf(accessToken, caseId);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      return;
    }
    if (exportTarget) void Linking.openURL(exportTarget);
  }, [accessToken, caseId, exportTarget]);

  const exportJson = useCallback(async () => {
    if (workspace && Platform.OS === "web" && typeof window !== "undefined") {
      const bundle = exportMeasurements(workspace.present.measurements, "json");
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ecg-measurements-${caseId ?? "workspace"}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (accessToken && caseId) await downloadEcgViewerWorkspaceJson(accessToken, caseId);
  }, [accessToken, caseId, workspace]);

  const exportCsv = useCallback(() => {
    if (!workspace || Platform.OS !== "web" || typeof window === "undefined") return;
    const bundle = exportMeasurements(workspace.present.measurements, "csv") as { csv?: string };
    const blob = new Blob([bundle.csv ?? ""], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ecg-measurements-${caseId ?? "workspace"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [caseId, workspace]);

  const exportOverlay = useCallback(() => {
    if (!aiOverlay || Platform.OS !== "web" || typeof window === "undefined") return;
    const bundle = aiOverlay.exportOverlay();
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ecg-ai-overlay-${caseId ?? "workspace"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [aiOverlay, caseId]);

  return (
    <View style={styles.toolbar} testID="sprint13-ecg-viewer-toolbar">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <PrimaryButton label="Open" onPress={() => (onOpen ? onOpen() : exportTarget ? void Linking.openURL(exportTarget) : undefined)} variant="outline" />
        <PrimaryButton disabled={!onPreviousStudy} label="Previous" onPress={() => onPreviousStudy?.()} variant="outline" />
        <PrimaryButton disabled={!nextCaseId} label="Next" onPress={() => onNextStudy?.()} variant="outline" />
        <PrimaryButton label={`Lead ${selectedLead}`} onPress={() => onLeadCycle?.()} variant="outline" />
        <PrimaryButton label={compareMode ? "Compare On" : "Compare"} onPress={() => onCompareToggle?.()} variant={compareMode ? "primary" : "outline"} />
        <PrimaryButton label="Measure" onPress={() => workspace?.setToolMode(measureActive ? "select" : "measurement")} variant={measureActive ? "primary" : "outline"} />
        <PrimaryButton label="Caliper" onPress={() => workspace?.setToolMode("caliper")} variant={workspace?.present.toolMode === "caliper" ? "primary" : "outline"} />
        <PrimaryButton label={overlayEnabled ? "AI Overlay On" : "AI Overlay"} onPress={() => aiOverlay?.toggleOverlay()} variant={overlayEnabled ? "primary" : "outline"} />
        <PrimaryButton label="AI" onPress={() => aiOverlay?.setSettings({ enabled: true, showAnnotations: true, showLabels: true })} variant="outline" />
        <PrimaryButton label={showDigitizedWaveform ? "Wave On" : "Wave Off"} onPress={() => onToggleDigitized?.()} variant={showDigitizedWaveform ? "primary" : "outline"} />
        <PrimaryButton label="Export PDF" onPress={() => void exportPdf()} variant="outline" />
        <PrimaryButton label="Export JSON" onPress={() => void exportJson()} variant="outline" />
        <PrimaryButton label="Export CSV" onPress={exportCsv} variant="outline" />
        <PrimaryButton label={controls.fullscreen ? "Exit Fullscreen" : "Fullscreen"} onPress={controls.toggleFullscreen} variant="outline" />
        <PrimaryButton label="Settings" onPress={() => onOpenSettings?.()} variant="outline" />
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.secondaryRow}>
        <PrimaryButton label="Upload" onPress={() => onUpload?.()} variant="outline" />
        <PrimaryButton label="Capture" onPress={() => onCapture?.()} variant="outline" />
        <PrimaryButton label="Zoom In" onPress={() => controls.zoomBy(0.2)} variant="outline" />
        <PrimaryButton label="Zoom Out" onPress={() => controls.zoomBy(-0.2)} variant="outline" />
        <PrimaryButton label="Pan" onPress={controls.togglePanMode} variant={controls.panMode === "active" ? "primary" : "outline"} />
        <PrimaryButton label="Fit Width" onPress={() => controls.applyFit("width")} variant="outline" />
        <PrimaryButton label="Fit Height" onPress={() => controls.applyFit("height")} variant="outline" />
        <PrimaryButton label="100%" onPress={() => controls.applyFit("100")} variant="outline" />
        <PrimaryButton label="Reset View" onPress={controls.resetView} variant="outline" />
        <PrimaryButton label="Rotate" onPress={controls.rotate} variant="outline" />
        <PrimaryButton label={`Zoom ${Math.round(controls.transform.zoom)}x`} onPress={controls.cycleZoomPreset} variant="outline" />
        <PrimaryButton label={controls.grid.customCalibration ? "Custom Cal On" : "Custom Cal Off"} onPress={controls.toggleCustomCalibration} variant={controls.grid.customCalibration ? "primary" : "outline"} />
        <PrimaryButton label={controls.grid.visible ? "Grid On" : "Grid Off"} onPress={controls.toggleGrid} variant={controls.grid.visible ? "primary" : "outline"} />
        <PrimaryButton label={`Grid ${Math.round(controls.grid.opacity * 100)}%`} onPress={controls.cycleGridOpacity} variant="outline" />
        <PrimaryButton disabled={!workspace?.canUndo} label="Undo" onPress={() => workspace?.undo()} variant="outline" />
        <PrimaryButton disabled={!workspace?.canRedo} label="Redo" onPress={() => workspace?.redo()} variant="outline" />
        <PrimaryButton label="Annotation" onPress={() => workspace?.setToolMode("annotation")} variant={workspace?.present.toolMode === "annotation" ? "primary" : "outline"} />
        {aiOverlay ? (
          <>
            <PrimaryButton label={overlaySettings?.showLabels ? "Labels On" : "Labels Off"} onPress={() => aiOverlay.setSettings({ showLabels: !overlaySettings?.showLabels })} variant={overlaySettings?.showLabels ? "primary" : "outline"} />
            <PrimaryButton label={overlaySettings?.showConfidence ? "Confidence On" : "Confidence Off"} onPress={() => aiOverlay.setSettings({ showConfidence: !overlaySettings?.showConfidence })} variant={overlaySettings?.showConfidence ? "primary" : "outline"} />
            <PrimaryButton label={`Overlay ${Math.round((overlaySettings?.opacity ?? 0.82) * 100)}%`} onPress={() => aiOverlay.setSettings({ opacity: (overlaySettings?.opacity ?? 0.82) >= 1 ? 0.55 : Math.min(Number(((overlaySettings?.opacity ?? 0.82) + 0.15).toFixed(2)), 1) })} variant="outline" />
            <PrimaryButton label={`Theme ${overlaySettings?.theme ?? "clinical"}`} onPress={() => aiOverlay.setSettings({ theme: overlaySettings?.theme === "clinical" ? "dark" : overlaySettings?.theme === "dark" ? "light" : "clinical" })} variant="outline" />
            <PrimaryButton label="Export Overlay" onPress={exportOverlay} variant="outline" />
            <PrimaryButton label="Reset Overlay" onPress={() => aiOverlay.resetOverlay()} variant="outline" />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: 8, paddingVertical: 4 },
  secondaryRow: { alignItems: "center", borderTopColor: medicalTheme.border, borderTopWidth: 1, flexDirection: "row", gap: 8, marginTop: 4, paddingTop: 6, paddingVertical: 4 },
  toolbar: {
    backgroundColor: medicalTheme.surface,
    borderColor: medicalTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
});
