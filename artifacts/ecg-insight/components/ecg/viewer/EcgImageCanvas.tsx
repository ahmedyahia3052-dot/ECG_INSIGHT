import React from "react";
import { StyleSheet, View } from "react-native";

import type { AIExplainability } from "@/services/ai";

import { EcgAiClinicalOverlay } from "./EcgAiClinicalOverlay";
import { EcgCompareViewer } from "./EcgCompareViewer";
import type { DigitizedWaveformLead } from "./EcgDigitizedWaveformLayer";
import { EcgProViewerEngine } from "./EcgProViewerEngine";
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
  compareMode?: boolean;
  compareThumbnailUrl?: string;
  controls: EcgViewerControls;
  currentLabel?: string;
  digitizedLeads?: DigitizedWaveformLead[];
  explainability?: AIExplainability | null;
  imageUrl?: string;
  onFpsUpdate?: (fps: number) => void;
  onPointerMove?: (coords: { imageX: number; imageY: number; x: number; y: number }) => void;
  pdfUrl?: string;
  showDigitizedWaveform?: boolean;
  testID?: string;
  workspace?: EcgMeasurementWorkspace;
};

export function EcgImageCanvas({
  accessToken,
  activeLead = "II",
  aiOverlay,
  compareImageUrl,
  compareLabel = "Comparison Study",
  compareMode = false,
  compareThumbnailUrl,
  controls,
  currentLabel = "Current Study",
  digitizedLeads = [],
  explainability,
  imageUrl,
  onFpsUpdate,
  onPointerMove,
  pdfUrl,
  showDigitizedWaveform = true,
  testID = "sprint13-ecg-image-canvas",
  workspace,
}: Props) {
  const asset = useAuthenticatedEcgAsset(imageUrl, accessToken);

  return (
    <View style={styles.host}>
      {compareMode ? (
        <EcgCompareViewer
          accessToken={accessToken}
          compareImageUrl={compareImageUrl}
          compareLabel={compareLabel}
          compareThumbnailUrl={compareThumbnailUrl}
          controls={controls}
          currentDigitizedLeads={showDigitizedWaveform ? digitizedLeads : []}
          currentImageUrl={asset.url}
          currentLabel={currentLabel}
        />
      ) : (
        <EcgProViewerEngine
          accessToken={accessToken}
          aiOverlayEnabled={aiOverlay?.present.settings.enabled}
          assetHeight={asset.height}
          assetLoading={asset.loading}
          assetWidth={asset.width}
          controls={controls}
          digitizedLeads={digitizedLeads}
          imageUrl={asset.url}
          onFpsUpdate={onFpsUpdate}
          onPointerMove={onPointerMove}
          pdfUrl={pdfUrl}
          showDigitizedWaveform={showDigitizedWaveform}
          testID={testID}
          workspace={workspace}
        />
      )}
      {aiOverlay && asset.url && !compareMode ? (
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
  host: { flex: 1, minHeight: 320, position: "relative" },
});
