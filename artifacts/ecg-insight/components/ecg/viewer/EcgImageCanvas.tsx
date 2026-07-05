import React from "react";
import { StyleSheet, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { AIExplainability } from "@/services/ai";

import { EcgAiClinicalOverlay } from "./EcgAiClinicalOverlay";
import { EcgCompareViewer } from "./EcgCompareViewer";
import type { DigitizedWaveformLead } from "./EcgDigitizedWaveformLayer";
import { EcgDigitizedWaveformLayer } from "./EcgDigitizedWaveformLayer";
import { EcgPaperGrid } from "./EcgPaperGrid";
import { EcgProViewerEngine } from "./EcgProViewerEngine";
import type { EcgCompareLayoutMode, EcgWorkstationViewMode } from "./types";
import { useAuthenticatedEcgAsset } from "./useAuthenticatedEcgAsset";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";
import type { EcgViewerControls } from "./useEcgViewerControls";

type Props = {
  accessToken?: string | null;
  activeLead?: string;
  aiOverlay?: EcgAiOverlayWorkspace;
  compareImageUrl?: string;
  compareLabel?: string;
  compareLayout?: EcgCompareLayoutMode;
  compareMode?: boolean;
  compareOpacity?: number;
  compareThumbnailUrl?: string;
  controls: EcgViewerControls;
  currentLabel?: string;
  digitizedLeads?: DigitizedWaveformLead[];
  explainability?: AIExplainability | null;
  imageUrl?: string;
  onFpsUpdate?: (fps: number) => void;
  onPointerMove?: (coords: { imageX: number; imageY: number; x: number; y: number }) => void;
  pdfUrl?: string;
  processedImageUrl?: string;
  showDigitizedWaveform?: boolean;
  testID?: string;
  viewMode?: EcgWorkstationViewMode;
  workspace?: EcgMeasurementWorkspace;
};

export function EcgImageCanvas({
  accessToken,
  activeLead = "II",
  aiOverlay,
  compareImageUrl,
  compareLabel = "Comparison Study",
  compareLayout = "side-by-side",
  compareMode = false,
  compareOpacity = 0.45,
  compareThumbnailUrl,
  controls,
  currentLabel = "Current Study",
  digitizedLeads = [],
  explainability,
  imageUrl,
  onFpsUpdate,
  onPointerMove,
  pdfUrl,
  processedImageUrl,
  showDigitizedWaveform = true,
  testID = "sprint13-ecg-image-canvas",
  viewMode = "image",
  workspace,
}: Props) {
  const sourceUrl = viewMode === "processed" && processedImageUrl ? processedImageUrl : imageUrl;
  const asset = useAuthenticatedEcgAsset(sourceUrl, accessToken);
  const effectiveCompare = compareMode || viewMode === "compare";
  const overlayForced = viewMode === "overlay" || (aiOverlay?.present.settings.enabled ?? false);
  const waveformOnly = viewMode === "waveform";
  const measurementMode = viewMode === "measurement";
  const rectW = controls.viewport.imageWidth || 1600;
  const rectH = controls.viewport.imageHeight || 1200;

  if (waveformOnly) {
    return (
      <View style={styles.waveformHost} testID="sprint18-waveform-view">
        <View style={[styles.waveformStage, { height: Math.max(rectH * 0.55, 420) }]}>
          <EcgPaperGrid grid={controls.grid} height={rectH * 0.55} width={rectW} zoom={controls.transform.zoom} />
          <EcgDigitizedWaveformLayer height={rectH * 0.55} leads={digitizedLeads} width={rectW} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.host} testID={measurementMode ? "sprint19-measurement-view" : undefined}>
      {effectiveCompare ? (
        <EcgCompareViewer
          accessToken={accessToken}
          compareImageUrl={compareImageUrl}
          compareLabel={compareLabel}
          compareLayout={compareLayout}
          compareOpacity={compareOpacity}
          compareThumbnailUrl={compareThumbnailUrl}
          controls={controls}
          currentDigitizedLeads={showDigitizedWaveform ? digitizedLeads : []}
          currentImageUrl={asset.url}
          currentLabel={currentLabel}
        />
      ) : (
        <EcgProViewerEngine
          accessToken={accessToken}
          aiOverlayEnabled={overlayForced}
          assetHeight={asset.height}
          assetLoading={asset.loading}
          assetWidth={asset.width}
          controls={controls}
          digitizedLeads={showDigitizedWaveform ? digitizedLeads : []}
          imageUrl={asset.url}
          onFpsUpdate={onFpsUpdate}
          onPointerMove={onPointerMove}
          pdfUrl={pdfUrl}
          showDigitizedWaveform={showDigitizedWaveform}
          testID={testID}
          workspace={workspace}
        />
      )}
      {aiOverlay && asset.url && !effectiveCompare ? (
        <EcgAiClinicalOverlay
          activeLead={activeLead}
          containerHeight={controls.viewport.containerHeight}
          containerWidth={controls.viewport.containerWidth}
          controls={controls}
          explainability={explainability}
          imageHeight={controls.viewport.imageHeight}
          imageWidth={controls.viewport.imageWidth}
          workspace={aiOverlay}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { backgroundColor: "#040E1A", flex: 1, minHeight: 320, position: "relative" },
  waveformHost: {
    backgroundColor: "#020617",
    borderColor: medicalTheme.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 320,
    overflow: "hidden",
    padding: 8,
  },
  waveformStage: { overflow: "hidden", position: "relative", width: "100%" },
});
