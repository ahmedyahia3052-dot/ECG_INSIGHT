import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import { EcgAiAnnotationInspector } from "./EcgAiAnnotationInspector";
import { EcgClinicalFindingsPanel } from "./EcgClinicalFindingsPanel";
import { EcgMeasurementsPanel } from "./EcgMeasurementsPanel";
import type { EcgClinicalFindingsModel } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

type Props = {
  aiOverlay: EcgAiOverlayWorkspace;
  findings: EcgClinicalFindingsModel;
  workspace: EcgMeasurementWorkspace;
};

export function EcgViewerRightRail({ aiOverlay, findings, workspace }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.fill}>
      <EcgClinicalFindingsPanel findings={findings} />
      <EcgAiAnnotationInspector workspace={aiOverlay} />
      <EcgMeasurementsPanel workspace={workspace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { gap: 8, paddingBottom: 12 },
});
