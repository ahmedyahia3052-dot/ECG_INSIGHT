import React, { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { medicalTheme, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import { EcgProViewerEngine } from "./EcgProViewerEngine";
import type { DigitizedWaveformLead } from "./EcgDigitizedWaveformLayer";
import type { EcgViewerControls } from "./useEcgViewerControls";

export const EcgCompareViewer = memo(function EcgCompareViewer({
  accessToken,
  compareImageUrl,
  compareLabel,
  compareThumbnailUrl,
  controls,
  currentDigitizedLeads,
  currentImageUrl,
  currentLabel,
}: {
  accessToken?: string | null;
  compareImageUrl?: string;
  compareLabel: string;
  compareThumbnailUrl?: string;
  controls: EcgViewerControls;
  currentDigitizedLeads: DigitizedWaveformLead[];
  currentImageUrl?: string;
  currentLabel: string;
}) {
  return (
    <View style={styles.root} testID="sprint165-ecg-compare-viewer">
      <View style={styles.pane}>
        <Text style={styles.paneLabel}>{currentLabel}</Text>
        <EcgProViewerEngine
          accessToken={accessToken}
          controls={controls}
          digitizedLeads={currentDigitizedLeads}
          imageUrl={currentImageUrl}
          showDigitizedWaveform
          testID="sprint165-ecg-compare-current"
        />
      </View>
      <View style={styles.divider} />
      <View style={styles.pane}>
        <Text style={styles.paneLabel}>{compareLabel}</Text>
        {compareImageUrl ? (
          <EcgProViewerEngine accessToken={accessToken} controls={controls} imageUrl={compareImageUrl} testID="sprint165-ecg-compare-previous" />
        ) : compareThumbnailUrl ? (
          <View style={styles.thumbnailPane}>
            <Image resizeMode="contain" source={{ uri: compareThumbnailUrl }} style={styles.thumbnail} />
            <Text style={styles.thumbnailHint}>Prior study preview — open full study for synchronized review.</Text>
          </View>
        ) : (
          <View style={styles.emptyPane}>
            <SectionHeader title="No comparison study" subtitle="Select a prior ECG from the left panel to compare." />
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  divider: { backgroundColor: medicalTheme.border, width: 2 },
  emptyPane: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 280, padding: 16 },
  pane: { flex: 1, gap: 6, minWidth: 0 },
  paneLabel: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
  root: { flex: 1, flexDirection: "row", gap: 8, minHeight: 320 },
  thumbnail: { flex: 1, minHeight: 240, width: "100%" },
  thumbnailHint: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  thumbnailPane: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, flex: 1, gap: 8, minHeight: 280, padding: 8 },
});
