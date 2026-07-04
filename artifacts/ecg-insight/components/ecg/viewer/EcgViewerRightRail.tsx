import React from "react";
import { ScrollView, StyleSheet } from "react-native";

import { EcgClinicalFindingsPanel } from "./EcgClinicalFindingsPanel";
import { EcgMeasurementsPanel } from "./EcgMeasurementsPanel";
import type { EcgClinicalFindingsModel } from "./types";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

type Props = {
  findings: EcgClinicalFindingsModel;
  workspace: EcgMeasurementWorkspace;
};

export function EcgViewerRightRail({ findings, workspace }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.fill}>
      <EcgClinicalFindingsPanel findings={findings} />
      <EcgMeasurementsPanel workspace={workspace} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { gap: 8, paddingBottom: 12 },
});
