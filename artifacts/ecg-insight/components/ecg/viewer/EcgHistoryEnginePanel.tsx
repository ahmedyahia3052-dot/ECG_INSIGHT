import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatDate, medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EcgViewerPreviousStudy } from "./types";

export const EcgHistoryEnginePanel = memo(function EcgHistoryEnginePanel({
  currentDiagnosis,
  onCompare,
  previousStudies = [],
}: {
  currentDiagnosis?: string;
  onCompare?: (caseId: string) => void;
  previousStudies?: EcgViewerPreviousStudy[];
}) {
  return (
    <View style={styles.root} testID="sprint30-history-engine">
      <Text style={styles.title}>ECG History</Text>
      {currentDiagnosis ? (
        <View style={styles.trend}>
          <Text style={styles.trendLabel}>Current AI Progression</Text>
          <Text style={styles.trendValue}>{currentDiagnosis}</Text>
        </View>
      ) : null}
      {previousStudies.length ? (
        previousStudies.slice(0, 6).map((study) => (
          <View key={study.caseId} style={styles.row}>
            <View style={styles.content}>
              <Text style={styles.case}>{study.caseNumber ?? study.caseId}</Text>
              <Text style={styles.meta}>{study.studyDate ? formatDate(study.studyDate) : "Date pending"}</Text>
              <Text style={styles.meta}>Measurements · Compare available</Text>
            </View>
            {onCompare ? (
              <Pressable onPress={() => onCompare(study.caseId)} style={styles.compareBtn} testID={`sprint30-compare-${study.caseId}`}>
                <Text style={styles.compareLabel}>Compare</Text>
              </Pressable>
            ) : null}
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No prior ECG studies linked to this patient.</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  case: { color: medicalTheme.text, fontSize: 12, fontWeight: "800" },
  compareBtn: {
    backgroundColor: "rgba(56,189,248,0.12)",
    borderColor: "rgba(56,189,248,0.35)",
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compareLabel: { color: "#38BDF8", fontSize: 10, fontWeight: "800" },
  content: { flex: 1, gap: 2 },
  empty: { color: medicalTheme.muted, fontSize: 11 },
  meta: { color: medicalTheme.muted, fontSize: 9, fontWeight: "600" },
  root: { gap: 8 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  title: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
  trend: {
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 8,
  },
  trendLabel: { color: medicalTheme.muted, fontSize: 9, fontWeight: "800" },
  trendValue: { color: medicalTheme.text, fontSize: 11, fontWeight: "700" },
});
