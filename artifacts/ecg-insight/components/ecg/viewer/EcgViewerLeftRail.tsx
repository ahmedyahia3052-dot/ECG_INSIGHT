import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, formatDate, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import type { EcgViewerPatientContext, EcgViewerPreviousStudy, EcgViewerStudyContext } from "./types";

function InfoRow({ label, value }: { label: string; value?: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value ?? "—"}</Text>
    </View>
  );
}

export function EcgViewerLeftRail({
  onSelectPrevious,
  patient,
  previousStudies,
  study,
}: {
  onSelectPrevious?: (caseId: string) => void;
  patient?: EcgViewerPatientContext;
  previousStudies: EcgViewerPreviousStudy[];
  study?: EcgViewerStudyContext;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.fill}>
      <Card style={styles.card}>
        <SectionHeader title="Patient Information" />
        <InfoRow label="Patient" value={patient?.name} />
        <InfoRow label="Age" value={patient?.age} />
        <InfoRow label="Gender" value={patient?.gender} />
      </Card>
      <Card style={styles.card}>
        <SectionHeader title="Study Information" />
        <InfoRow label="Study Date" value={study?.studyDate ? formatDate(study.studyDate) : undefined} />
        <InfoRow label="Hospital" value={study?.hospital} />
        <InfoRow label="Physician" value={study?.physician} />
        <InfoRow label="Heart Rate" value={study?.heartRate ? `${study.heartRate} BPM` : undefined} />
        <InfoRow label="Acquisition Device" value={study?.acquisitionDevice} />
        <InfoRow label="File Type" value={study?.fileType} />
        <InfoRow label="Image Resolution" value={study?.imageWidth && study.imageHeight ? `${study.imageWidth} × ${study.imageHeight}` : undefined} />
      </Card>
      <Card style={styles.card}>
        <SectionHeader title="Previous ECGs" />
        {previousStudies.length ? (
          previousStudies.map((item) => (
            <View key={item.caseId} style={styles.previousRow}>
              <Text style={styles.previousTitle}>{item.caseNumber ?? item.caseId}</Text>
              <Text style={styles.previousMeta}>{item.studyDate ? formatDate(item.studyDate) : "Date pending"}</Text>
              <PrimaryButton label="Open" onPress={() => onSelectPrevious?.(item.caseId)} variant="outline" />
            </View>
          ))
        ) : (
          <Text style={styles.placeholder}>No prior ECG studies recorded for this patient.</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8, marginBottom: 10 },
  fill: { flex: 1 },
  infoLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  infoRow: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 2, paddingVertical: 6 },
  infoValue: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  placeholder: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  previousMeta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  previousRow: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 8 },
  previousTitle: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
  scroll: { gap: 8, paddingBottom: 12 },
});
