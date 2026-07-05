import React, { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcgLead } from "@/services/ecgProcessing";

import { buildDigitizedWaveformPath } from "./ecgDigitizedWaveformSync";
import { rhythmStripMarkers } from "./ecgViewerEngine";
import type { EcgLeadId } from "./types";
import { STANDARD_ECG_LEADS } from "./types";
import type { EcgViewerControls } from "./useEcgViewerControls";

export const EcgRhythmStripPanel = memo(function EcgRhythmStripPanel({
  controls,
  leadWaveform,
  onLeadChange,
  selectedLead,
}: {
  controls: EcgViewerControls;
  leadWaveform?: DigitalEcgLead | null;
  onLeadChange: (lead: EcgLeadId) => void;
  selectedLead: EcgLeadId;
}) {
  const markers = useMemo(() => rhythmStripMarkers(controls.grid.speed), [controls.grid.speed]);
  const stripWidth = Math.max(640, controls.viewport.containerWidth - 48);
  const stripHeight = 88;
  const waveformPath = useMemo(
    () => (leadWaveform ? buildDigitizedWaveformPath(leadWaveform, stripWidth - 24, stripHeight - 20) : ""),
    [leadWaveform, stripHeight, stripWidth],
  );

  return (
    <View style={styles.shell} testID="sprint13-ecg-rhythm-strip-panel">
      <SectionHeader subtitle="Lead-focused rhythm review with synchronized digitized preview" title="Rhythm Strip" />
      <ScrollView horizontal contentContainerStyle={styles.leadRow} showsHorizontalScrollIndicator={false}>
        {STANDARD_ECG_LEADS.map((lead) => (
          <PrimaryButton
            key={lead}
            label={lead}
            onPress={() => onLeadChange(lead)}
            variant={selectedLead === lead ? "primary" : "outline"}
          />
        ))}
      </ScrollView>
      <View style={styles.stripSurface}>
        <Text style={styles.stripMeta}>
          Lead {selectedLead} · {controls.grid.speed} mm/s · Zoom {Math.round(controls.transform.zoom * 100)}%
        </Text>
        {waveformPath ? (
          <Svg height={stripHeight} width={stripWidth} testID="sprint165-rhythm-strip-waveform">
            {Array.from({ length: Math.ceil(stripWidth / 20) }).map((_, index) => (
              <Path d={`M ${index * 20} 0 L ${index * 20} ${stripHeight}`} key={`grid-${index}`} stroke="#FECACA" strokeWidth={index % 5 === 0 ? 0.8 : 0.35} />
            ))}
            <Path d={waveformPath} fill="none" stroke="#DC2626" strokeLinecap="round" strokeWidth={1.8} transform="translate(12 10)" />
          </Svg>
        ) : (
          <Text style={styles.placeholder}>Digitized waveform preview appears after ECG digitization completes.</Text>
        )}
        <View style={styles.markerRow}>
          {markers.map((marker) => (
            <View key={marker.ms} style={styles.markerCell}>
              <View style={styles.markerTick} />
              <Text style={styles.markerLabel}>{marker.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  leadRow: { flexDirection: "row", gap: 6, paddingVertical: 4 },
  markerCell: { alignItems: "center", minWidth: 48 },
  markerLabel: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700", marginTop: 4 },
  markerRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  markerTick: { backgroundColor: medicalTheme.primary, height: 10, width: 1 },
  placeholder: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", paddingVertical: 16 },
  shell: { gap: 8 },
  stripMeta: { color: medicalTheme.text, fontSize: 12, fontWeight: "800" },
  stripSurface: {
    backgroundColor: medicalTheme.surface,
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 120,
    padding: 10,
  },
});
