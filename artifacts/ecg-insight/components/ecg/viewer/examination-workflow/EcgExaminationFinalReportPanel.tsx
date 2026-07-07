import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatDate } from "@/components/enterprise/EnterpriseUI";

import { ECG_COCKPIT_COLORS } from "../ecgCockpitColors";
import type { ExaminationReportModel } from "./buildExaminationReportModel";

function Section({ items, title }: { items: string[]; title: string }) {
  if (!items.length) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <Text key={item} style={styles.line}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export const EcgExaminationFinalReportPanel = memo(function EcgExaminationFinalReportPanel({
  report,
}: {
  report: ExaminationReportModel;
}) {
  return (
    <View testID="sprint48-examination-final-report">
      <Text style={styles.title}>Final Examination Report</Text>
      <Text style={styles.meta}>
        {report.patientName} · {formatDate(report.studyDate)}
      </Text>
      <Text style={styles.impression}>{report.finalImpression}</Text>
      <Text style={styles.diagnosis}>Diagnosis: {report.finalDiagnosis}</Text>
      <Section items={report.clinicalHistory} title="Clinical History" />
      <Section items={report.measurements} title="Measurements" />
      <Section items={report.aiFindings} title="AI Findings" />
      {report.doctorFindings.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor Findings</Text>
          {report.doctorFindings.map((row) => (
            <Text key={`${row.status}-${row.label}`} style={styles.line}>
              • [{row.status}] {row.label}
            </Text>
          ))}
        </View>
      ) : null}
      <Section items={report.recommendations} title="Recommendations" />
      {report.electronicSignature ? (
        <View style={styles.signature} testID="sprint48-electronic-signature">
          <Text style={styles.sectionTitle}>Electronic Signature</Text>
          <Text style={styles.line}>
            Signed by {report.electronicSignature.signedByName} · {formatDate(report.electronicSignature.signedAt)}
          </Text>
          <Text style={styles.hash}>Hash: {report.electronicSignature.hash}…</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  diagnosis: { color: ECG_COCKPIT_COLORS.warning, fontSize: 10, fontWeight: "900", marginTop: 6 },
  hash: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 8, fontWeight: "700", marginTop: 2 },
  impression: { color: ECG_COCKPIT_COLORS.text, fontSize: 11, fontWeight: "800", lineHeight: 15, marginTop: 4 },
  line: { color: ECG_COCKPIT_COLORS.text, fontSize: 9, fontWeight: "700", lineHeight: 13, marginTop: 3 },
  meta: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9, fontWeight: "700", marginTop: 2 },
  section: { marginTop: 8 },
  sectionTitle: { color: ECG_COCKPIT_COLORS.accent, fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  signature: { borderColor: ECG_COCKPIT_COLORS.border, borderRadius: 4, borderWidth: 1, marginTop: 10, padding: 6 },
  title: { color: ECG_COCKPIT_COLORS.accent, fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },
});
