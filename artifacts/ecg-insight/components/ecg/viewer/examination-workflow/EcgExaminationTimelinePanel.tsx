import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatDate } from "@/components/enterprise/EnterpriseUI";

import { ECG_COCKPIT_COLORS } from "../ecgCockpitColors";
import type { ExaminationTimelineEntry } from "./types";

export const EcgExaminationTimelinePanel = memo(function EcgExaminationTimelinePanel({
  timeline,
}: {
  timeline: ExaminationTimelineEntry[];
}) {
  return (
    <View testID="sprint48-examination-timeline">
      <Text style={styles.title}>Examination Timeline</Text>
      {timeline.length === 0 ? (
        <Text style={styles.empty}>No timeline events yet.</Text>
      ) : (
        timeline.slice().reverse().slice(0, 12).map((entry) => (
          <View key={entry.id} style={styles.row} testID={`sprint48-timeline-${entry.id}`}>
            <View style={styles.dot} />
            <View style={styles.body}>
              <Text style={styles.action}>{entry.action}</Text>
              <Text style={styles.meta}>
                {entry.userName} · {formatDate(entry.performedAt)}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  action: { color: ECG_COCKPIT_COLORS.text, fontSize: 10, fontWeight: "800" },
  body: { flex: 1, gap: 2 },
  dot: {
    backgroundColor: ECG_COCKPIT_COLORS.accent,
    borderRadius: 4,
    height: 8,
    marginTop: 4,
    width: 8,
  },
  empty: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, fontWeight: "700" },
  meta: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 8, fontWeight: "700" },
  row: { flexDirection: "row", gap: 8, marginTop: 6 },
  title: { color: ECG_COCKPIT_COLORS.accent, fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
});
