import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { ECG_LIVE_MONITOR } from "./ecgLiveMonitorTokens";
import type { MonitorLayoutMode } from "./monitorLayout";
import { STANDARD_ECG_LEADS, type EcgLeadId } from "./types";

export const EcgLiveMonitorLeadStrip = memo(function EcgLiveMonitorLeadStrip({
  compact = false,
  customLeads = [],
  layoutMode,
  onCustomLeadsChange,
  onLayoutModeChange,
  onLeadChange,
  onRhythmStripToggle,
  rhythmStripMode,
  selectedLead,
}: {
  compact?: boolean;
  customLeads?: EcgLeadId[];
  layoutMode: MonitorLayoutMode;
  onCustomLeadsChange?: (leads: EcgLeadId[]) => void;
  onLayoutModeChange: (mode: MonitorLayoutMode) => void;
  onLeadChange: (lead: EcgLeadId) => void;
  onRhythmStripToggle: () => void;
  rhythmStripMode: boolean;
  selectedLead: EcgLeadId;
}) {
  return (
    <View style={[styles.root, compact && styles.rootCompact]} testID="sprint37-live-monitor-leads">
      {!compact ? <Text style={styles.title}>MONITOR MODE & LEADS</Text> : null}
      <ScrollView horizontal contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
        <PrimaryButton label="3 Lead" onPress={() => onLayoutModeChange("3-lead")} variant={layoutMode === "3-lead" ? "primary" : "outline"} />
        <PrimaryButton label="5 Lead" onPress={() => onLayoutModeChange("5-lead")} variant={layoutMode === "5-lead" ? "primary" : "outline"} />
        <PrimaryButton label="6 Lead" onPress={() => onLayoutModeChange("6-lead")} variant={layoutMode === "6-lead" ? "primary" : "outline"} />
        <PrimaryButton label="12 Lead" onPress={() => onLayoutModeChange("12-lead")} variant={layoutMode === "12-lead" ? "primary" : "outline"} />
        <PrimaryButton label="Single" onPress={() => onLayoutModeChange("single")} variant={layoutMode === "single" ? "primary" : "outline"} />
        <PrimaryButton
          label="Custom"
          onPress={() => {
            onLayoutModeChange("custom");
            onCustomLeadsChange?.(customLeads.length ? customLeads : ["I", "II", "III", "aVR"]);
          }}
          variant={layoutMode === "custom" ? "primary" : "outline"}
        />
        <View style={styles.divider} />
        {STANDARD_ECG_LEADS.map((lead) => (
          <PrimaryButton
            key={lead}
            label={lead}
            onPress={() => onLeadChange(lead)}
            variant={selectedLead === lead && layoutMode === "single" && !rhythmStripMode ? "primary" : "outline"}
          />
        ))}
        <PrimaryButton label="Rhythm Strip" onPress={onRhythmStripToggle} variant={rhythmStripMode ? "primary" : "outline"} />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  divider: { backgroundColor: ECG_LIVE_MONITOR.border, height: 18, marginHorizontal: 2, width: 1 },
  root: {
    backgroundColor: ECG_LIVE_MONITOR.canvasBackground,
    borderBottomColor: ECG_LIVE_MONITOR.border,
    borderBottomWidth: 1,
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rootCompact: { minHeight: 32, paddingVertical: 3 },
  row: { alignItems: "center", flexDirection: "row", gap: 4 },
  title: { color: ECG_LIVE_MONITOR.statusText, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
});
