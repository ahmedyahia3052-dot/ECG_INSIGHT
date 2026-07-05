import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, formatDate, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { AIAnalysisResult } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { EcgAiAnnotationInspector } from "./EcgAiAnnotationInspector";
import { EcgMeasurementsPanel } from "./EcgMeasurementsPanel";
import type { EcgClinicalFindingsModel } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

function MetricRow({
  label,
  source,
  value,
  tone,
}: {
  label: string;
  source?: string;
  tone?: "critical" | "primary" | "success" | "warning";
  value: string;
}) {
  const color =
    tone === "critical" ? medicalTheme.critical : tone === "warning" ? medicalTheme.warning : tone === "success" ? medicalTheme.success : medicalTheme.text;
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLeft}>
        <Text style={styles.metricLabel}>{label}</Text>
        {source ? <Text style={styles.metricSource}>{source}</Text> : null}
      </View>
      <Text style={[styles.metricValue, { color }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function PanelSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export const EcgClinicalRightPanel = memo(function EcgClinicalRightPanel({
  aiOverlay,
  analysis,
  clinicalNotes,
  digitalEcg,
  digitalEcgLoading,
  findings,
  imageHeight,
  imageWidth,
  onDigitize,
  onOpenReview,
  patient,
  studyDate,
  workspace,
}: {
  aiOverlay: EcgAiOverlayWorkspace;
  analysis?: AIAnalysisResult | null;
  clinicalNotes?: string;
  digitalEcg?: DigitalEcg | null;
  digitalEcgLoading?: boolean;
  findings: EcgClinicalFindingsModel;
  imageHeight?: number;
  imageWidth?: number;
  onDigitize?: () => void;
  onOpenReview?: () => void;
  patient?: { age?: number; gender?: string; id: string; name: string };
  studyDate?: string;
  workspace: EcgMeasurementWorkspace;
}) {
  const qualityScore = digitalEcg?.quality?.score;
  const qualityTone = qualityScore == null ? undefined : qualityScore >= 80 ? "success" : qualityScore >= 55 ? "warning" : "critical";
  const severity = analysis?.severity ?? "normal";
  const warnings = digitalEcg?.quality?.warnings?.length
    ? digitalEcg.quality.warnings
    : analysis?.urgentActions?.length
      ? analysis.urgentActions
      : ["No active clinical warnings."];

  const sourceLabel = digitalEcg?.measurementEngine ? "Digital ECG" : findings.heartRate.source === "measurement" ? "Manual" : "Case/AI";

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.fill} testID="sprint21-clinical-right-panel" nativeID="sprint18-clinical-right-panel">
      {patient ? (
        <PanelSection title="Patient">
          <Text style={styles.patientName}>{patient.name}</Text>
          <Text style={styles.patientMeta}>
            {patient.gender ?? "Gender N/A"} · Age {patient.age ?? "N/A"} · ID {patient.id.slice(0, 8)}
          </Text>
          {studyDate ? <Text style={styles.patientMeta}>Study {formatDate(studyDate)}</Text> : null}
        </PanelSection>
      ) : null}

      <PanelSection title="Measurements">
        <MetricRow label="Heart Rate" source={sourceLabel} value={findings.heartRate.value} />
        <MetricRow label="PR" source={findings.prInterval.source} value={findings.prInterval.value} />
        <MetricRow label="QRS" source={findings.qrsDuration.source} value={findings.qrsDuration.value} />
        <MetricRow label="QT" source={findings.qtInterval.source} value={findings.qtInterval.value} />
        <MetricRow label="QTc" source={findings.qtcInterval.source} value={findings.qtcInterval.value} />
        <MetricRow label="RR" source={digitalEcg ? "Digital ECG" : "Pending"} value={digitalEcg?.measurements?.rrIntervalMs != null ? `${Math.round(digitalEcg.measurements.rrIntervalMs)} ms` : "Pending"} />
        <MetricRow label="Axis" source={findings.axis.source} value={findings.axis.value} />
      </PanelSection>

      <PanelSection title="Signal Quality">
        <MetricRow label="Resolution" value={imageWidth && imageHeight ? `${imageWidth}×${imageHeight}` : "Pending"} />
        <MetricRow label="Signal Quality" tone={qualityTone} value={digitalEcg?.calibration?.confidence != null ? `${Math.round(digitalEcg.calibration.confidence * 100)}%` : "Pending"} />
        <MetricRow label="Digitization Score" tone={qualityTone} value={qualityScore != null ? `${qualityScore}/100` : digitalEcgLoading ? "Processing" : "Pending"} />
        <MetricRow label="Grid Detection" value={digitalEcg?.calibration?.gridDetected ? "Detected" : "Pending"} />
        {!digitalEcg && onDigitize ? (
          <Pressable onPress={onDigitize} style={styles.actionButton}>
            <Text style={styles.actionLabel}>{digitalEcgLoading ? "Digitizing…" : "Run Digitization"}</Text>
          </Pressable>
        ) : null}
      </PanelSection>

      <PanelSection title="AI Findings">
        <MetricRow label="Diagnosis" tone={severity === "critical" || severity === "severe" ? "critical" : "primary"} value={analysis?.diagnosis ?? findings.interpretation.value} />
        <MetricRow label="Confidence" value={findings.confidence.value} />
        <MetricRow label="Severity" tone={severity === "critical" ? "critical" : severity === "severe" ? "warning" : "success"} value={severity.toUpperCase()} />
        {analysis?.recommendations?.length ? (
          <View style={styles.listBlock}>
            <Text style={styles.listTitle}>Recommendations</Text>
            {analysis.recommendations.slice(0, 4).map((item) => (
              <Text key={item} style={styles.listItem}>• {item}</Text>
            ))}
          </View>
        ) : null}
        {onOpenReview ? (
          <Pressable onPress={onOpenReview} style={styles.actionButtonOutline}>
            <Text style={styles.actionLabelOutline}>Open Doctor Review</Text>
          </Pressable>
        ) : null}
      </PanelSection>

      <PanelSection title="Warnings">
        {warnings.map((warning) => (
          <Text key={warning} style={styles.warningText}>• {warning}</Text>
        ))}
      </PanelSection>

      <PanelSection title="Clinical Notes">
        <Text style={styles.notesText}>{clinicalNotes ?? "No clinical notes recorded for this study."}</Text>
      </PanelSection>

      <EcgMeasurementsPanel workspace={workspace} />
      <EcgAiAnnotationInspector workspace={aiOverlay} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    backgroundColor: medicalTheme.primary,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonOutline: {
    alignItems: "center",
    borderColor: medicalTheme.primary,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionLabel: { color: "#03131B", fontSize: 12, fontWeight: "900" },
  actionLabelOutline: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
  fill: { flex: 1 },
  listBlock: { gap: 4, marginTop: 6 },
  listItem: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  listTitle: { color: medicalTheme.text, fontSize: 11, fontWeight: "900" },
  metricLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  metricLeft: { flex: 1, gap: 2, paddingRight: 8 },
  metricRow: {
    borderBottomColor: "rgba(30,58,74,0.55)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  metricSource: { color: medicalTheme.primary, fontSize: 9, fontWeight: "800" },
  metricValue: { color: medicalTheme.text, fontSize: 12, fontWeight: "900", maxWidth: "46%", textAlign: "right" },
  notesText: { color: medicalTheme.text, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  patientMeta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  patientName: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  scroll: { gap: 10, paddingBottom: 16 },
  section: {
    backgroundColor: "#081625",
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 2,
    padding: 10,
  },
  sectionTitle: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", letterSpacing: 1, marginBottom: 4 },
  warningText: { color: medicalTheme.warning, fontSize: 11, fontWeight: "700", lineHeight: 16 },
});
