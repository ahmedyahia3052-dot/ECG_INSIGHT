import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { TimelineMarker } from "./clinical-visualization/clinicalTimeline";
import { viewportIndicatorRatio } from "./clinical-visualization/clinicalTimeline";

export const EcgClinicalTimelineBar = memo(function EcgClinicalTimelineBar({
  durationMs,
  markers,
  onScrub,
  playheadMs,
  viewportEndMs,
  viewportStartMs,
}: {
  durationMs: number;
  markers: TimelineMarker[];
  onScrub?: (ms: number) => void;
  playheadMs?: number;
  viewportEndMs: number;
  viewportStartMs: number;
}) {
  const indicator = viewportIndicatorRatio(viewportStartMs, viewportEndMs, durationMs);
  return (
    <View style={styles.host} testID="sprint28-clinical-timeline">
      <View style={styles.track}>
        <View style={[styles.viewportIndicator, { left: `${indicator.left * 100}%`, width: `${indicator.width * 100}%` }]} />
        {markers.map((marker) => (
          <Pressable
            key={`${marker.kind}-${marker.ms}`}
            onPress={() => onScrub?.(marker.ms)}
            style={[styles.marker, { backgroundColor: marker.color, left: `${(marker.ms / Math.max(durationMs, 1)) * 100}%` }]}
          />
        ))}
        {playheadMs != null ? (
          <View style={[styles.playhead, { left: `${(playheadMs / Math.max(durationMs, 1)) * 100}%` }]} />
        ) : null}
      </View>
      <Text style={styles.label}>Timeline · {Math.round(durationMs)} ms · {markers.length} markers</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    backgroundColor: "rgba(6,17,31,0.92)",
    borderTopColor: medicalTheme.border,
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  label: { color: medicalTheme.muted, fontSize: 9, fontWeight: "700", marginTop: 4 },
  marker: { borderRadius: 3, height: 10, marginTop: 7, position: "absolute", width: 6 },
  playhead: { backgroundColor: "#FACC15", height: 22, marginTop: 1, position: "absolute", width: 2 },
  track: {
    backgroundColor: "rgba(15,23,42,0.85)",
    borderRadius: 4,
    height: 24,
    overflow: "hidden",
    position: "relative",
  },
  viewportIndicator: {
    backgroundColor: "rgba(20,221,230,0.12)",
    borderColor: "rgba(20,221,230,0.45)",
    borderRadius: 3,
    borderWidth: 1,
    height: "100%",
    position: "absolute",
  },
});
