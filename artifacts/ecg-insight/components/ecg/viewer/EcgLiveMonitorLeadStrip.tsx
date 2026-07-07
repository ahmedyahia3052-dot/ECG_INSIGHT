import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/enterprise/EnterpriseUI";

import { ECG_LIVE_MONITOR } from "./ecgLiveMonitorTokens";
import type { MonitorComparisonPreset, MonitorLayoutMode, RhythmStripWindow } from "./monitorLayout";
import { STANDARD_ECG_LEADS, type EcgLeadId } from "./types";

export const EcgLiveMonitorLeadStrip = memo(function EcgLiveMonitorLeadStrip({
  compact = false,
  comparisonPreset,
  customLeads = [],
  layoutMode,
  onComparisonPreset,
  onCustomLeadsChange,
  onFocusLead,
  onLayoutModeChange,
  onLeadChange,
  onRhythmStripToggle,
  onRhythmWindowChange,
  rhythmStripMode,
  rhythmStripWindowSec = 10,
  selectedLead,
}: {
  compact?: boolean;
  comparisonPreset?: MonitorComparisonPreset;
  customLeads?: EcgLeadId[];
  layoutMode: MonitorLayoutMode;
  onComparisonPreset?: (preset: MonitorComparisonPreset) => void;
  onCustomLeadsChange?: (leads: EcgLeadId[]) => void;
  onFocusLead?: (lead: EcgLeadId) => void;
  onLayoutModeChange: (mode: MonitorLayoutMode) => void;
  onLeadChange: (lead: EcgLeadId) => void;
  onRhythmStripToggle: () => void;
  onRhythmWindowChange?: (seconds: RhythmStripWindow) => void;
  rhythmStripMode: boolean;
  rhythmStripWindowSec?: RhythmStripWindow;
  selectedLead: EcgLeadId;
}) {
  return (
    <View style={[styles.root, compact && styles.rootCompact]} testID="sprint37-live-monitor-leads">
      {!compact ? <Text style={styles.title}>MONITOR MODE & LEADS</Text> : null}
      <ScrollView horizontal contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false}>
        <PrimaryButton label="12 Lead" onPress={() => onLayoutModeChange("12-lead")} variant={layoutMode === "12-lead" ? "primary" : "outline"} />
        <PrimaryButton label="6×2" onPress={() => onLayoutModeChange("6x2")} variant={layoutMode === "6x2" ? "primary" : "outline"} />
        <PrimaryButton label="3×4" onPress={() => onLayoutModeChange("3x4")} variant={layoutMode === "3x4" ? "primary" : "outline"} />
        <PrimaryButton label="6 Lead" onPress={() => onLayoutModeChange("6-lead")} variant={layoutMode === "6-lead" ? "primary" : "outline"} />
        <PrimaryButton label="Dual" onPress={() => onLayoutModeChange("dual")} variant={layoutMode === "dual" ? "primary" : "outline"} />
        <PrimaryButton label="Quad" onPress={() => onLayoutModeChange("quad")} variant={layoutMode === "quad" ? "primary" : "outline"} />
        <PrimaryButton label="3 Lead" onPress={() => onLayoutModeChange("3-lead")} variant={layoutMode === "3-lead" ? "primary" : "outline"} />
        <PrimaryButton label="5 Lead" onPress={() => onLayoutModeChange("5-lead")} variant={layoutMode === "5-lead" ? "primary" : "outline"} />
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
        {onComparisonPreset ? (
          <>
            <PrimaryButton label="II vs V5" onPress={() => onComparisonPreset("II-V5")} variant={comparisonPreset === "II-V5" ? "primary" : "outline"} />
            <PrimaryButton label="Inferior" onPress={() => onComparisonPreset("inferior")} variant={comparisonPreset === "inferior" ? "primary" : "outline"} />
            <PrimaryButton label="Anterior" onPress={() => onComparisonPreset("anterior")} variant={comparisonPreset === "anterior" ? "primary" : "outline"} />
            <PrimaryButton label="Lateral" onPress={() => onComparisonPreset("lateral")} variant={comparisonPreset === "lateral" ? "primary" : "outline"} />
            <View style={styles.divider} />
          </>
        ) : null}
        {STANDARD_ECG_LEADS.map((lead) => (
          <PrimaryButton
            key={lead}
            label={lead}
            onPress={() => {
              if (onFocusLead) onFocusLead(lead);
              else onLeadChange(lead);
            }}
            variant={selectedLead === lead && (layoutMode === "single" || rhythmStripMode) ? "primary" : "outline"}
          />
        ))}
        <PrimaryButton label="Rhythm Strip" onPress={onRhythmStripToggle} variant={rhythmStripMode ? "primary" : "outline"} />
        {onRhythmWindowChange
          ? ([10, 20, 30, 0] as RhythmStripWindow[]).map((seconds) => (
              <PrimaryButton
                key={seconds}
                label={seconds === 0 ? "Cont." : `${seconds}s`}
                onPress={() => onRhythmWindowChange(seconds)}
                variant={rhythmStripWindowSec === seconds ? "primary" : "outline"}
              />
            ))
          : null}
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
