import React from "react";
import { StyleSheet, View } from "react-native";

import type { AIExplainability } from "@/services/ai";

import { EcgAiClinicalOverlay } from "./EcgAiClinicalOverlay";
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
  controls: EcgViewerControls;
  digitizedLeads?: DigitizedWaveformLead[];
  explainability?: AIExplainability | null;
  imageUrl?: string;
  pdfUrl?: string;
  testID?: string;
  workspace?: EcgMeasurementWorkspace;
};

export function EcgImageCanvas({
  accessToken,
  activeLead = "II",
  aiOverlay,
  controls,
  digitizedLeads = [],
  explainability,
  imageUrl,
  pdfUrl,
  testID = "sprint13-ecg-image-canvas",
  workspace,
}: Props) {
  const asset = useAuthenticatedEcgAsset(imageUrl, accessToken);

  return (
    <View style={styles.host}>
      <EcgProViewerEngine
        accessToken={accessToken}
        aiOverlayEnabled={aiOverlay?.present.settings.enabled}
        assetHeight={asset.height}
        assetLoading={asset.loading}
        assetWidth={asset.width}
        controls={controls}
        digitizedLeads={digitizedLeads}
        imageUrl={asset.url}
        pdfUrl={pdfUrl}
        testID={testID}
        workspace={workspace}
      />
      {aiOverlay && asset.url ? (
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
