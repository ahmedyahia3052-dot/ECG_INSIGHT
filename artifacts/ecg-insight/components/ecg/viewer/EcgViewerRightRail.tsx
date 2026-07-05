import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import type { DigitalEcg } from "@/services/ecgProcessing";

import { EcgAiAnnotationInspector } from "./EcgAiAnnotationInspector";
import { EcgClinicalFindingsPanel } from "./EcgClinicalFindingsPanel";
import { EcgDigitizationQualityPanel } from "./EcgDigitizationQualityPanel";
import { EcgMeasurementsPanel } from "./EcgMeasurementsPanel";
import type { EcgClinicalFindingsModel } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

type Props = {
  aiOverlay: EcgAiOverlayWorkspace;
  digitalEcg?: DigitalEcg | null;
  digitalEcgLoading?: boolean;
  findings: EcgClinicalFindingsModel;
  onDigitize?: () => void;
  workspace: EcgMeasurementWorkspace;
};

export function EcgViewerRightRail({ aiOverlay, digitalEcg, digitalEcgLoading, findings, onDigitize, workspace }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.fill} testID="sprint165-ecg-right-rail">
      <EcgDigitizationQualityPanel digitalEcg={digitalEcg} isLoading={digitalEcgLoading} onDigitize={onDigitize} />
      <EcgClinicalFindingsPanel findings={findings} />
      <EcgMeasurementsPanel workspace={workspace} />
      <EcgAiAnnotationInspector workspace={aiOverlay} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { gap: 8, paddingBottom: 12 },
});
