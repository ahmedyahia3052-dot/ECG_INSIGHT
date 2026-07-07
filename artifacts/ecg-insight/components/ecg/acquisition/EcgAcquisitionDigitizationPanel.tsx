import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { EcgAcquisitionCapturePanel } from "./EcgAcquisitionCapturePanel";
import { EcgDigitizationOverlayStudio } from "./EcgDigitizationOverlayStudio";
import { useDigitizationJob } from "./useDigitizationJob";
import { EcgDigitizationQualityPanel } from "../viewer/EcgDigitizationQualityPanel";
import { PrimaryButton, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcg, DigitalEcgLead } from "@/services/ecgProcessing";

export const EcgAcquisitionDigitizationPanel = memo(function EcgAcquisitionDigitizationPanel({
  accessToken,
  caseId,
  digitalEcg,
  digitalEcgLoading,
  digitizedLeads = [],
  imageUrl,
  onDigitize,
}: {
  accessToken?: string;
  caseId?: string;
  digitalEcg?: DigitalEcg | null;
  digitalEcgLoading?: boolean;
  digitizedLeads?: DigitalEcgLead[];
  imageUrl?: string;
  onDigitize?: () => void;
}) {
  const job = useDigitizationJob(accessToken, caseId);

  return (
    <View style={styles.root} testID="sprint47-acquisition-panel">
      <EcgAcquisitionCapturePanel onAssetSelected={() => undefined} />
      <View style={styles.jobRow}>
        <PrimaryButton label={job.stage === "complete" ? "Re-digitize (Job)" : "Background Digitize"} onPress={() => job.start()} variant="outline" />
        {job.job && job.stage !== "complete" && job.stage !== "failed" ? (
          <PrimaryButton label="Cancel" onPress={() => job.cancel()} variant="outline" />
        ) : null}
        {job.job ? <Text style={styles.jobMeta}>{job.stage.toUpperCase()} · {job.progress}%</Text> : null}
      </View>
      <EcgDigitizationOverlayStudio digitalEcg={digitalEcg} imageUrl={imageUrl} />
      <EcgDigitizationQualityPanel digitalEcg={digitalEcg} isLoading={digitalEcgLoading} onDigitize={onDigitize} />
    </View>
  );
});

const styles = StyleSheet.create({
  jobMeta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  jobRow: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  root: { gap: 10 },
});
