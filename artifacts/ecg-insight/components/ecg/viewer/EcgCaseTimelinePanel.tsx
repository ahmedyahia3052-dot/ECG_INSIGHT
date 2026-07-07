import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatDate, medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { CaseTimelineEvent } from "./clinical-workflow";

export const EcgCaseTimelinePanel = memo(function EcgCaseTimelinePanel({
  events,
}: {
  events: CaseTimelineEvent[];
}) {
  return (
    <View style={styles.root} testID="sprint30-case-timeline">
      <Text style={styles.title}>Case Timeline</Text>
      {events.map((event) => (
        <View key={event.id} style={styles.row} testID={`sprint30-case-event-${event.id}`}>
          <View
            style={[
              styles.dot,
              event.status === "complete" && styles.dotComplete,
              event.status === "current" && styles.dotCurrent,
            ]}
          />
          <View style={styles.content}>
            <Text style={styles.label}>{event.label}</Text>
            {event.timestamp ? <Text style={styles.time}>{formatDate(event.timestamp)}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  content: { flex: 1 },
  dot: { backgroundColor: medicalTheme.border, borderRadius: 5, height: 10, marginTop: 3, width: 10 },
  dotComplete: { backgroundColor: medicalTheme.success },
  dotCurrent: { backgroundColor: "#38BDF8" },
  label: { color: medicalTheme.text, fontSize: 11, fontWeight: "700" },
  root: { gap: 8, paddingVertical: 4 },
  row: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  time: { color: medicalTheme.muted, fontSize: 9, marginTop: 2 },
  title: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", marginBottom: 4 },
});
