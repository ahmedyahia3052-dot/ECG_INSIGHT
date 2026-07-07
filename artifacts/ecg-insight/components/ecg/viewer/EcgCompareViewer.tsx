import React, { memo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import { medicalTheme, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import { EcgProViewerEngine } from "./EcgProViewerEngine";
import type { DigitizedWaveformLead } from "./EcgDigitizedWaveformLayer";
import type { EcgCompareLayoutMode } from "./types";
import type { EcgViewerControls } from "./useEcgViewerControls";

export const EcgCompareViewer = memo(function EcgCompareViewer({
  accessToken,
  compareImageUrl,
  compareLabel,
  compareLayout = "side-by-side",
  compareOpacity = 0.45,
  compareThumbnailUrl,
  controls,
  currentDigitizedLeads,
  currentImageUrl,
  currentLabel,
  differenceHighlight = false,
  differenceRegions = [],
}: {
  accessToken?: string | null;
  compareImageUrl?: string;
  compareLabel: string;
  compareLayout?: EcgCompareLayoutMode;
  compareOpacity?: number;
  compareThumbnailUrl?: string;
  controls: EcgViewerControls;
  currentDigitizedLeads: DigitizedWaveformLead[];
  currentImageUrl?: string;
  currentLabel: string;
  differenceHighlight?: boolean;
  differenceRegions?: Array<{ endX: number; severity: "high" | "low" | "medium"; startX: number }>;
}) {
  const differenceBanner = differenceHighlight ? (
    <View style={styles.diffBanner} testID="sprint46-compare-difference-banner">
      <Text style={styles.diffBannerText}>
        Difference highlighting active · {differenceRegions.length} region{differenceRegions.length === 1 ? "" : "s"}
      </Text>
    </View>
  ) : null;

  if (compareLayout === "overlay") {
    return (
      <View style={styles.root} testID="sprint18-ecg-compare-overlay">
        {differenceBanner}
        <Text style={styles.paneLabel}>{currentLabel} + {compareLabel}</Text>
        <View style={styles.overlayHost}>
          <EcgProViewerEngine
            accessToken={accessToken}
            controls={controls}
            digitizedLeads={currentDigitizedLeads}
            imageUrl={currentImageUrl}
            showDigitizedWaveform
            testID="sprint165-ecg-compare-current"
          />
          {compareImageUrl ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlayLayer, { opacity: compareOpacity }]}>
              <EcgProViewerEngine accessToken={accessToken} controls={controls} imageUrl={compareImageUrl} testID="sprint165-ecg-compare-previous" />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  if (compareLayout === "split") {
    return (
      <View style={styles.root} testID="sprint18-ecg-compare-split">
        {differenceBanner}
        <View style={styles.compareRow}>
        <View style={styles.splitPane}>
          <Text style={styles.paneLabel}>{currentLabel}</Text>
          <EcgProViewerEngine accessToken={accessToken} controls={controls} digitizedLeads={currentDigitizedLeads} imageUrl={currentImageUrl} showDigitizedWaveform testID="sprint165-ecg-compare-current" />
        </View>
        <View style={styles.splitDivider} />
        <View style={styles.splitPane}>
          <Text style={styles.paneLabel}>{compareLabel}</Text>
          {compareImageUrl ? (
            <EcgProViewerEngine accessToken={accessToken} controls={controls} imageUrl={compareImageUrl} testID="sprint165-ecg-compare-previous" />
          ) : (
            <View style={styles.emptyPane}>
              <SectionHeader subtitle="Select a prior study from the left panel." title="No comparison study" />
            </View>
          )}
        </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="sprint165-ecg-compare-viewer">
      {differenceBanner}
      <View style={styles.compareRow}>
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
            <SectionHeader subtitle="Select a prior ECG from the left panel to compare." title="No comparison study" />
          </View>
        )}
      </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  diffBanner: {
    backgroundColor: "rgba(234,179,8,0.16)",
    borderColor: "rgba(234,179,8,0.45)",
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: "100%",
  },
  diffBannerText: {
    color: "#FDE68A",
    fontSize: 11,
    fontWeight: "700",
  },
  compareRow: { flex: 1, flexDirection: "row", gap: 8, minHeight: 320 },
  divider: { backgroundColor: medicalTheme.border, width: 2 },
  emptyPane: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 280, padding: 16 },
  overlayHost: { flex: 1, minHeight: 320, position: "relative" },
  overlayLayer: { zIndex: 4 },
  pane: { flex: 1, gap: 6, minWidth: 0 },
  paneLabel: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
  root: { flex: 1, flexDirection: "column", gap: 8, minHeight: 320 },
  splitDivider: { backgroundColor: medicalTheme.primary, width: 3 },
  splitPane: { flex: 1, gap: 6, minWidth: 0 },
  thumbnail: { flex: 1, minHeight: 240, width: "100%" },
  thumbnailHint: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700", textAlign: "center" },
  thumbnailPane: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, flex: 1, gap: 8, minHeight: 280, padding: 8 },
});
