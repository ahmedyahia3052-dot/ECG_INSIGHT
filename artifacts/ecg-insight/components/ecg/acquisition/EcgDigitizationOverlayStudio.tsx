import React, { memo, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { PrimaryButton, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcg, DigitalEcgLead } from "@/services/ecgProcessing";

import { buildSegmentAlignedDigitizedWaveformLeads } from "../viewer/ecgDigitizedWaveformSync";

type OverlayMode = "overlay" | "split";

export const EcgDigitizationOverlayStudio = memo(function EcgDigitizationOverlayStudio({
  digitalEcg,
  imageUrl,
}: {
  digitalEcg?: DigitalEcg | null;
  imageUrl?: string;
}) {
  const [mode, setMode] = useState<OverlayMode>("overlay");
  const [opacity, setOpacity] = useState(0.72);

  const paths = useMemo(() => {
    if (!digitalEcg?.leads?.length) return [];
    return buildSegmentAlignedDigitizedWaveformLeads(digitalEcg, 1400, 1000);
  }, [digitalEcg]);

  if (!imageUrl) {
    return (
      <View style={styles.empty} testID="sprint47-digitization-overlay">
        <Text style={styles.emptyText}>Upload an ECG image to verify digitized waveform alignment.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="sprint47-digitization-overlay">
      <View style={styles.toolbar}>
        <PrimaryButton label={mode === "overlay" ? "Overlay" : "Split"} onPress={() => setMode((m) => (m === "overlay" ? "split" : "overlay"))} variant="primary" />
        <PrimaryButton label="Opacity −" onPress={() => setOpacity((v) => Math.max(0.2, Number((v - 0.08).toFixed(2))))} variant="outline" />
        <PrimaryButton label="Opacity +" onPress={() => setOpacity((v) => Math.min(1, Number((v + 0.08).toFixed(2))))} variant="outline" />
        <Text style={styles.meta}>{Math.round(opacity * 100)}% · {paths.length} leads</Text>
      </View>
      <View style={[styles.stage, mode === "split" && styles.stageSplit]}>
        <Image accessibilityLabel="Original ECG" resizeMode="contain" source={{ uri: imageUrl }} style={styles.image} />
        {mode === "overlay" ? (
          <View pointerEvents="none" style={[styles.waveOverlay, { opacity }]}>
            <Svg height="100%" viewBox="0 0 1400 1000" width="100%">
              {paths.map((entry) => (
                <Path d={entry.path} fill="none" key={entry.lead} stroke="#EF4444" strokeWidth={2.2} />
              ))}
            </Svg>
            {digitalEcg?.gridOverlaySvg ? (
              <View style={styles.gridHost}>
                <Text style={styles.gridLabel}>Grid calibration overlay</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.splitWave}>
            {paths.slice(0, 3).map((entry) => (
              <Text key={entry.lead} style={styles.splitLead} numberOfLines={1}>
                {entry.lead}: aligned waveform segment
              </Text>
            ))}
          </View>
        )}
      </View>
      <Pressable accessibilityRole="summary">
        <Text style={styles.verify}>Alignment verification — compare original grid boxes with digitized trace overlay before clinical use.</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  empty: { backgroundColor: medicalTheme.background, borderColor: medicalTheme.border, borderRadius: 8, borderWidth: 1, padding: 12 },
  emptyText: { color: medicalTheme.muted, fontSize: 12, fontWeight: "600" },
  gridHost: { bottom: 6, position: "absolute", right: 6 },
  gridLabel: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700" },
  image: { height: "100%", width: "100%" },
  meta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  root: { gap: 8 },
  splitLead: { color: medicalTheme.text, fontSize: 11, fontWeight: "700" },
  splitWave: { backgroundColor: "#020617", borderLeftColor: medicalTheme.border, borderLeftWidth: 1, flex: 1, gap: 4, padding: 8 },
  stage: { backgroundColor: "#000", borderColor: medicalTheme.border, borderRadius: 8, borderWidth: 1, height: 220, overflow: "hidden", position: "relative" },
  stageSplit: { flexDirection: "row" },
  toolbar: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6 },
  verify: { color: medicalTheme.muted, fontSize: 10, fontWeight: "600" },
  waveOverlay: { ...StyleSheet.absoluteFillObject },
});
