import React, { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import { rhythmStripMarkers } from "./ecgViewerEngine";
import type { EcgLeadId } from "./types";
import { STANDARD_ECG_LEADS } from "./types";
import type { EcgViewerControls } from "./useEcgViewerControls";

export const EcgRhythmStripPanel = memo(function EcgRhythmStripPanel({
  controls,
  onLeadChange,
  selectedLead,
}: {
  controls: EcgViewerControls;
  onLeadChange: (lead: EcgLeadId) => void;
  selectedLead: EcgLeadId;
}) {
  const markers = useMemo(() => rhythmStripMarkers(controls.grid.speed), [controls.grid.speed]);

  return (
    <View style={styles.shell} testID="sprint13-ecg-rhythm-strip-panel">
      <SectionHeader subtitle="Lead-focused rhythm review with synchronized zoom context" title="Rhythm Strip" />
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
  markerRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  markerTick: { backgroundColor: medicalTheme.primary, height: 10, width: 1 },
  shell: { gap: 8 },
  stripMeta: { color: medicalTheme.text, fontSize: 12, fontWeight: "800" },
  stripSurface: {
    backgroundColor: medicalTheme.surface,
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 72,
    padding: 10,
  },
});
