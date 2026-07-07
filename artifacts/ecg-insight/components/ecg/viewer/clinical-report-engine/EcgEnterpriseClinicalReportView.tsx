import React, { memo, useMemo } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type {
  ClinicalReportOrientation,
  ClinicalReportTheme,
  EnterpriseClinicalReportModel,
} from "./types";

function themeStyles(theme: ClinicalReportTheme, orientation: ClinicalReportOrientation) {
  const isDark = theme === "dark";
  return {
    accent: isDark ? "#38BDF8" : "#0E7490",
    alertBg: isDark ? "rgba(127,29,29,0.35)" : "#FEF2F2",
    border: isDark ? "#1E3A4A" : "#CBD5E1",
    muted: isDark ? "#94A3B8" : "#64748B",
    pageBg: isDark ? "#0B1220" : "#FFFFFF",
    pageMaxWidth: orientation === "landscape" ? 1120 : 820,
    sectionBg: isDark ? "rgba(12,26,45,0.92)" : "#F8FAFC",
    text: isDark ? "#E2E8F0" : "#0F172A",
  };
}

const Section = memo(function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {children}
    </View>
  );
});

const ConfidenceBar = memo(function ConfidenceBar({ label, percent }: { label: string; percent: number }) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.confRow}>
      <Text style={styles.confLabel}>{label}</Text>
      <View style={styles.confTrack}>
        <View style={[styles.confFill, { width: `${clamped}%` }]} />
      </View>
      <Text style={styles.confValue}>{clamped}%</Text>
    </View>
  );
});

export const EcgEnterpriseClinicalReportView = memo(function EcgEnterpriseClinicalReportView({
  model,
  orientation = "portrait",
  theme = "light",
}: {
  model: EnterpriseClinicalReportModel;
  orientation?: ClinicalReportOrientation;
  theme?: ClinicalReportTheme;
}) {
  const palette = useMemo(() => themeStyles(theme, orientation), [orientation, theme]);
  const dynamic = useMemo(
    () =>
      StyleSheet.create({
        page: {
          backgroundColor: palette.pageBg,
          borderColor: palette.border,
          maxWidth: palette.pageMaxWidth,
          width: "100%",
        },
        section: { backgroundColor: palette.sectionBg, borderColor: palette.border },
        sectionTitle: { color: palette.accent },
        text: { color: palette.text },
        muted: { color: palette.muted },
        alertCard: { backgroundColor: palette.alertBg, borderColor: palette.border },
      }),
    [palette],
  );

  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="sprint43-enterprise-clinical-report">
      <View style={[styles.page, dynamic.page]}>
        <View style={styles.header}>
          <Text style={[styles.reportTitle, dynamic.text]}>Enterprise Clinical ECG Report</Text>
          <Text style={[styles.reportMeta, dynamic.muted]}>
            {model.reportNumber ?? "Draft"} · {model.header.reportStatus.toUpperCase()} · {model.reportType.replace("_", " ")}
          </Text>
        </View>

        <Section title="Patient Header">
          <KvGrid dynamic={dynamic} rows={[
            ["Patient", model.header.patientName],
            ["Age / Gender", `${model.header.patientAge} / ${model.header.gender}`],
            ["MRN", model.header.mrn],
            ["Case ID", model.header.caseId],
            ["Study Date", model.header.studyDate],
            ["Study Time", model.header.studyTime],
            ["Organization", model.header.organization],
            ["Department", model.header.department],
            ["Ordering Physician", model.header.orderingPhysician],
            ["Reviewing Physician", model.header.reviewingPhysician],
            ["Device", model.header.device],
            ["Acquisition", model.header.acquisitionSource],
            ["Status", model.header.reportStatus],
          ]} />
        </Section>

        <Section title="ECG Parameters">
          <View style={styles.table}>
            {model.ecgParameters.map((row) => (
              <View key={row.label} style={styles.tableRow}>
                <Text style={[styles.tableLabel, dynamic.muted]}>{row.label}</Text>
                <Text style={[styles.tableValue, dynamic.text]}>{row.value}{row.unit ? ` ${row.unit}` : ""}</Text>
                {row.confidence ? <Text style={[styles.tableConf, dynamic.muted]}>{row.confidence}</Text> : null}
              </View>
            ))}
          </View>
        </Section>

        <Section title="AI Findings">
          {model.aiFindings.length ? model.aiFindings.map((finding) => (
            <View key={finding.title} style={[styles.card, dynamic.section]} testID="sprint43-ai-finding-card">
              <Text style={[styles.cardTitle, dynamic.text]}>{finding.title} · {finding.severity}</Text>
              <Text style={[dynamic.muted, styles.cardBody]}>Confidence {finding.confidence}% · {finding.status}</Text>
              <Text style={[dynamic.text, styles.cardBody]}>{finding.explanation}</Text>
              {finding.affectedLeads.length ? <Text style={dynamic.muted}>Leads: {finding.affectedLeads.join(", ")}</Text> : null}
              {finding.supportingMeasurements.length ? <Text style={dynamic.muted}>Measurements: {finding.supportingMeasurements.join("; ")}</Text> : null}
              {finding.guideline ? <Text style={dynamic.muted}>Guideline: {finding.guideline}</Text> : null}
            </View>
          )) : <Text style={dynamic.muted}>No AI findings recorded.</Text>}
        </Section>

        <Section title="Clinical Impression">
          {model.clinicalImpression.map((line) => (
            <Text key={line} style={[dynamic.text, styles.impressionLine]}>{line}</Text>
          ))}
        </Section>

        {model.clinicalDecision ? (
          <Section title="Clinical Decision Support">
            <Text style={[dynamic.text, styles.impressionLine]} testID="sprint44-report-clinical-decision">
              {model.clinicalDecision.triageLabel}
            </Text>
            <Text style={dynamic.text}>{model.clinicalDecision.assessment.finalDiagnosis}</Text>
            <Text style={dynamic.muted}>{model.clinicalDecision.assessment.reasoning}</Text>
            {model.clinicalDecision.primaryDiagnosis ? (
              <>
                <Text style={[dynamic.text, styles.recAction]}>{model.clinicalDecision.primaryDiagnosis.diagnosis} · {model.clinicalDecision.primaryDiagnosis.confidence}%</Text>
                <Text style={dynamic.muted}>Evidence: {model.clinicalDecision.primaryDiagnosis.evidence.morphology.join("; ")}</Text>
              </>
            ) : null}
            {model.clinicalDecision.recommendations.slice(0, 4).map((rec) => (
              <Text key={rec.action} style={dynamic.muted}>{rec.action} — {rec.rationale}</Text>
            ))}
            <Text style={dynamic.muted}>{model.clinicalDecision.relationshipSummary}</Text>
          </Section>
        ) : null}

        <Section title="Differential Diagnosis">
          {model.differential.map((row) => (
            <View key={`${row.diagnosis}-${row.probability}`} style={[styles.card, dynamic.section]}>
              <Text style={[styles.cardTitle, dynamic.text]}>{row.diagnosis} · {row.probability}%</Text>
              <Text style={dynamic.muted}>Supporting: {row.supportingFindings.join("; ") || "—"}</Text>
              <Text style={dynamic.muted}>Contradicting: {row.contradictingFindings.join("; ") || "—"}</Text>
              <Text style={dynamic.text}>{row.clinicalNotes}</Text>
            </View>
          ))}
        </Section>

        <Section title="Clinical Recommendations">
          {model.recommendations.map((rec) => (
            <View key={rec.action} style={styles.recRow}>
              <Text style={[dynamic.text, styles.recAction]}>{rec.action}</Text>
              <Text style={dynamic.muted}>{rec.priority} · {rec.rationale}{rec.timeframe ? ` · ${rec.timeframe}` : ""}</Text>
            </View>
          ))}
        </Section>

        <Section title="Confidence Summary">
          {model.confidence.map((metric) => (
            <ConfidenceBar key={metric.label} label={metric.label} percent={metric.percent} />
          ))}
        </Section>

        <Section title="Critical Alerts">
          {model.criticalAlerts.length ? model.criticalAlerts.map((alert) => (
            <View key={alert.title} style={[styles.alertCard, dynamic.alertCard]} testID="sprint43-critical-alert">
              <Text style={[styles.alertTitle, dynamic.text]}>{alert.priority} · {alert.title}</Text>
              <Text style={dynamic.muted}>{alert.severity} · {alert.recommendedAction}</Text>
            </View>
          )) : <Text style={dynamic.muted}>No critical alerts.</Text>}
        </Section>

        <Section title="Lead Summary">
          <View style={styles.leadGrid}>
            {model.leadSummary.map((lead) => (
              <View key={String(lead.lead)} style={[styles.leadChip, dynamic.section]}>
                <Text style={[dynamic.text, styles.leadName]}>{lead.lead}</Text>
                <Text style={dynamic.muted}>{lead.status} · {lead.confidence}%</Text>
                <Text style={dynamic.muted} numberOfLines={2}>{lead.findings.join(", ") || "No findings"}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="ECG Snapshot">
          <View style={styles.snapshotGrid}>
            {model.snapshots.originalEcgUrl ? (
              <Image accessibilityLabel="Original ECG" source={{ uri: model.snapshots.originalEcgUrl }} style={styles.snapshotImage} />
            ) : null}
            {model.snapshots.processedEcgUrl ? (
              <Image accessibilityLabel="Processed ECG" source={{ uri: model.snapshots.processedEcgUrl }} style={styles.snapshotImage} />
            ) : null}
          </View>
          <Text style={dynamic.muted}>{model.snapshots.caliperSnapshotNote}</Text>
        </Section>

        <Section title="Previous ECG Comparison">
          {model.previousComparison.available ? (
            <>
              <Text style={dynamic.text}>{model.previousComparison.clinicalChangeSummary}</Text>
              <Text style={dynamic.muted}>Added: {model.previousComparison.findingsAdded.join(", ") || "—"}</Text>
              <Text style={dynamic.muted}>Removed: {model.previousComparison.findingsRemoved.join(", ") || "—"}</Text>
            </>
          ) : (
            <Text style={dynamic.muted}>{model.previousComparison.clinicalChangeSummary}</Text>
          )}
        </Section>

        <Section title="Doctor Review">
          <KvGrid dynamic={dynamic} rows={[
            ["Final Diagnosis", model.doctorReview.finalDiagnosis],
            ["Doctor Notes", model.doctorReview.doctorNotes || "—"],
            ["Signature", model.doctorReview.signatureName ?? "—"],
            ["License", model.doctorReview.licenseNumber ?? "—"],
            ["Approval Date", model.doctorReview.approvalDate ? new Date(model.doctorReview.approvalDate).toLocaleString() : "Pending"],
            ["E-Signature", model.doctorReview.electronicSignature ?? "Pending"],
          ]} />
        </Section>
      </View>
    </ScrollView>
  );
});

function KvGrid({ dynamic, rows }: { dynamic: { muted: { color: string }; text: { color: string } }; rows: [string, string][] }) {
  return (
    <View style={styles.kvGrid}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.kvRow}>
          <Text style={[styles.kvLabel, dynamic.muted]}>{label}</Text>
          <Text style={[styles.kvValue, dynamic.text]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  alertCard: { borderRadius: 8, borderWidth: 1, marginTop: 8, padding: 10 },
  alertTitle: { fontSize: 13, fontWeight: "900" },
  card: { borderRadius: 8, borderWidth: 1, gap: 4, marginTop: 8, padding: 10 },
  cardBody: { fontSize: 12, lineHeight: 18 },
  cardTitle: { fontSize: 13, fontWeight: "800" },
  confFill: { backgroundColor: medicalTheme.primary, borderRadius: 4, height: 8 },
  confLabel: { color: medicalTheme.muted, flex: 1, fontSize: 11, fontWeight: "700" },
  confRow: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 6 },
  confTrack: { backgroundColor: "rgba(148,163,184,0.25)", borderRadius: 4, flex: 2, height: 8, overflow: "hidden" },
  confValue: { color: medicalTheme.text, fontSize: 11, fontWeight: "800", width: 36 },
  header: { gap: 4, paddingBottom: 12 },
  impressionLine: { fontSize: 13, fontWeight: "700", lineHeight: 20, marginTop: 4 },
  kvGrid: { gap: 6 },
  kvLabel: { fontSize: 11, fontWeight: "800", width: 160 },
  kvRow: { flexDirection: "row", gap: 8 },
  kvValue: { flex: 1, fontSize: 12, fontWeight: "700" },
  leadChip: { borderRadius: 8, borderWidth: 1, flexBasis: "23%", gap: 2, minWidth: 88, padding: 6 },
  leadGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  leadName: { fontSize: 12, fontWeight: "900" },
  page: { alignSelf: "center", borderRadius: 12, borderWidth: 1, gap: 12, padding: 16 },
  recAction: { fontSize: 13, fontWeight: "800" },
  recRow: { gap: 2, marginTop: 8 },
  reportMeta: { fontSize: 11, fontWeight: "700" },
  reportTitle: { fontSize: 20, fontWeight: "900" },
  scroll: { padding: 8 },
  section: { borderRadius: 10, borderWidth: 1, gap: 6, padding: 12 },
  sectionTitle: { fontSize: 12, fontWeight: "900", letterSpacing: 1.1, textTransform: "uppercase" },
  snapshotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  snapshotImage: { borderRadius: 8, height: 160, resizeMode: "contain", width: 240 },
  table: { gap: 4 },
  tableConf: { fontSize: 10, width: 80 },
  tableLabel: { fontSize: 11, fontWeight: "800", width: 140 },
  tableRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  tableValue: { flex: 1, fontSize: 12, fontWeight: "700" },
});
