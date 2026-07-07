import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { ECG_LIVE_MONITOR } from "./ecgLiveMonitorTokens";
import { STANDARD_ECG_LEADS, type EcgLeadId } from "./types";

export const EcgLiveMonitorLeadStrip = memo(function EcgLiveMonitorLeadStrip({
  onLeadChange,
  onRhythmStripToggle,
  rhythmStripMode,
  selectedLead,
}: {
  onLeadChange: (lead: EcgLeadId) => void;
  onRhythmStripToggle: () => void;
  rhythmStripMode: boolean;
  selectedLead: EcgLeadId;
}) {
  return (
    <View style={styles.root} testID="sprint37-live-monitor-leads">
      <Text style={styles.title}>LEAD SELECTION</Text>
      <ScrollView horizontal contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
        {STANDARD_ECG_LEADS.map((lead) => (
          <PrimaryButton
            key={lead}
            label={lead}
            onPress={() => onLeadChange(lead)}
            variant={selectedLead === lead && !rhythmStripMode ? "primary" : "outline"}
          />
        ))}
        <PrimaryButton
          label="Rhythm Strip"
          onPress={onRhythmStripToggle}
          variant={rhythmStripMode ? "primary" : "outline"}
        />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    backgroundColor: ECG_LIVE_MONITOR.canvasBackground,
    borderBottomColor: ECG_LIVE_MONITOR.border,
    borderBottomWidth: 1,
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  title: { color: ECG_LIVE_MONITOR.statusText, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
});
