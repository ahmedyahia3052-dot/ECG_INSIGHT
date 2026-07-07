import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ECG_LIVE_MONITOR } from "../ecgLiveMonitorTokens";
import { HMI_COLORS } from "./ecgLiveMonitorHmiTokens";

export const EcgLiveMonitorHmiRightRail = memo(function EcgLiveMonitorHmiRightRail({
  aiDiagnosis,
  alerts,
  clinicalNotes,
  collapsed,
  heartRate,
  measurements,
  onCollapseToggle,
  quickImpression,
  rhythm,
  signalQuality,
}: {
  aiDiagnosis?: string;
  alerts: string[];
  clinicalNotes?: string;
  collapsed: boolean;
  heartRate?: number;
  measurements: string[];
  onCollapseToggle: () => void;
  quickImpression?: string;
  rhythm?: string;
  signalQuality?: string;
}) {
  if (collapsed) {
    return (
      <View style={styles.collapsedRoot} testID="sprint49-hmi-right-rail">
        <Pressable onPress={onCollapseToggle} style={styles.collapseToggle}>
          <Text style={styles.collapseGlyph}>‹</Text>
        </Pressable>
        <Text style={styles.collapsedLabel}>AI</Text>
        <Text style={styles.collapsedLabel}>ALR</Text>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="sprint49-hmi-right-rail">
      <View style={styles.header}>
        <Text style={styles.title}>CLINICAL</Text>
        <Pressable onPress={onCollapseToggle} style={styles.collapseToggle}>
          <Text style={styles.collapseGlyph}>›</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Section title="Quick Impression">
          <Text style={styles.bodyText}>{quickImpression ?? aiDiagnosis ?? "Awaiting interpretation"}</Text>
        </Section>
        <Section title="AI Findings">
          <Text style={styles.bodyText}>{aiDiagnosis ?? "No AI diagnosis on case record"}</Text>
        </Section>
        <Section title="Measurements">
          {measurements.length ? measurements.map((row) => <Text key={row} style={styles.line}>• {row}</Text>) : <Text style={styles.muted}>No measurements captured</Text>}
        </Section>
        <Section title="Clinical Notes">
          <Text style={styles.bodyText}>{clinicalNotes ?? "—"}</Text>
        </Section>
        <Section title="Alerts">
          {alerts.length ? alerts.map((row) => <Text key={row} style={styles.alertLine}>• {row}</Text>) : <Text style={styles.muted}>No active alerts</Text>}
        </Section>
        <Section title="Vitals">
          <Text style={styles.line}>HR {heartRate ?? "--"} bpm</Text>
          <Text style={styles.line}>Rhythm {rhythm ?? "Pending"}</Text>
          <Text style={styles.line}>Signal {signalQuality ?? "Unknown"}</Text>
        </Section>
      </ScrollView>
    </View>
  );
});

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  alertLine: { color: ECG_LIVE_MONITOR.alarm, fontSize: 9, fontWeight: "800", lineHeight: 13 },
  body: { gap: 8, padding: 6 },
  bodyText: { color: HMI_COLORS.railText, fontSize: 9, fontWeight: "700", lineHeight: 13 },
  collapseGlyph: { color: HMI_COLORS.railAccent, fontSize: 14, fontWeight: "900" },
  collapseToggle: { padding: 4 },
  collapsedLabel: { color: HMI_COLORS.railMuted, fontSize: 7, fontWeight: "900" },
  collapsedRoot: {
    alignItems: "center",
    backgroundColor: HMI_COLORS.panelBg,
    borderLeftColor: HMI_COLORS.panelBorder,
    borderLeftWidth: 1,
    gap: 8,
    paddingVertical: 6,
    width: 36,
  },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingTop: 4 },
  line: { color: HMI_COLORS.railText, fontSize: 9, fontWeight: "700", lineHeight: 13 },
  muted: { color: HMI_COLORS.railMuted, fontSize: 9, fontWeight: "700" },
  root: {
    backgroundColor: "rgba(1, 4, 9, 0.88)",
    borderLeftColor: HMI_COLORS.panelBorder,
    borderLeftWidth: 1,
    flex: 1,
    flexShrink: 0,
    minHeight: 0,
  },
  section: { gap: 3 },
  sectionTitle: { color: HMI_COLORS.railAccent, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  title: { color: HMI_COLORS.railMuted, fontSize: 8, fontWeight: "900", letterSpacing: 1 },
});
