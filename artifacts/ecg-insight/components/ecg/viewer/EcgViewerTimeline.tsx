import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { formatDate, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import type { EcgViewerPreviousStudy, EcgViewerStudyContext } from "./types";

export function EcgViewerTimeline({
  currentStudy,
  onSelect,
  studies,
}: {
  currentStudy?: EcgViewerStudyContext;
  onSelect?: (caseId: string) => void;
  studies: EcgViewerPreviousStudy[];
}) {
  const timeline = currentStudy
    ? [{ caseId: currentStudy.caseId, caseNumber: currentStudy.caseNumber, studyDate: currentStudy.studyDate }, ...studies.filter((item) => item.caseId !== currentStudy.caseId)]
    : studies;

  return (
    <View style={styles.timeline} testID="sprint13-ecg-viewer-timeline">
      <SectionHeader title="Timeline" subtitle="Prior and current ECG studies for longitudinal review." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {timeline.length ? (
          timeline.map((item) => {
            const current = item.caseId === currentStudy?.caseId;
            return (
              <View key={item.caseId} style={[styles.chip, current && styles.chipCurrent]}>
                <Text style={styles.chipTitle}>{item.caseNumber ?? item.caseId}</Text>
                <Text style={styles.chipMeta}>{item.studyDate ? formatDate(item.studyDate) : "Pending date"}</Text>
                <PrimaryButton disabled={current} label={current ? "Current" : "Open"} onPress={() => onSelect?.(item.caseId)} variant="outline" />
              </View>
            );
          })
        ) : (
          <Text style={styles.empty}>No timeline entries yet.</Text>
        )}
      </ScrollView>
    </View>
  );
}

export function EcgViewerStatusBar({
  fileType,
  gridVisible,
  imageResolution,
  zoom,
}: {
  fileType?: string;
  gridVisible: boolean;
  imageResolution?: string;
  zoom: number;
}) {
  return (
    <View style={styles.statusBar} testID="sprint13-ecg-viewer-status">
      <Text style={styles.statusText}>Zoom {Math.round(zoom * 100)}%</Text>
      <Text style={styles.statusText}>Grid {gridVisible ? "ON" : "OFF"}</Text>
      <Text style={styles.statusText}>Type {fileType ?? "N/A"}</Text>
      <Text style={styles.statusText}>Resolution {imageResolution ?? "Pending"}</Text>
      <Text style={styles.statusText}>Ready</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: medicalTheme.surface,
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    minWidth: 160,
    padding: 10,
  },
  chipCurrent: {
    borderColor: medicalTheme.primary,
  },
  chipMeta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  chipTitle: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
  empty: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  row: { gap: 10, paddingVertical: 4 },
  statusBar: {
    alignItems: "center",
    backgroundColor: medicalTheme.surface,
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusText: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  timeline: { gap: 8 },
});
