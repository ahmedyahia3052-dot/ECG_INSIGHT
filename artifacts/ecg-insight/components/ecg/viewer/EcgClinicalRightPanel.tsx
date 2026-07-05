import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { AIAnalysisResult } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";

import { EcgAiAnnotationInspector } from "./EcgAiAnnotationInspector";
import { EcgMeasurementsPanel } from "./EcgMeasurementsPanel";
import type { EcgClinicalFindingsModel } from "./types";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

function MetricRow({ label, value, tone }: { label: string; tone?: "critical" | "primary" | "success" | "warning"; value: string }) {
  const color =
    tone === "critical" ? medicalTheme.critical : tone === "warning" ? medicalTheme.warning : tone === "success" ? medicalTheme.success : medicalTheme.text;
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
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
  digitalEcg,
  digitalEcgLoading,
  findings,
  imageHeight,
  imageWidth,
  onDigitize,
  workspace,
}: {
  aiOverlay: EcgAiOverlayWorkspace;
  analysis?: AIAnalysisResult | null;
  digitalEcg?: DigitalEcg | null;
  digitalEcgLoading?: boolean;
  findings: EcgClinicalFindingsModel;
  imageHeight?: number;
  imageWidth?: number;
  onDigitize?: () => void;
  workspace: EcgMeasurementWorkspace;
}) {
  const qualityScore = digitalEcg?.quality?.score;
  const qualityTone = qualityScore == null ? undefined : qualityScore >= 80 ? "success" : qualityScore >= 55 ? "warning" : "critical";
  const severity = analysis?.severity ?? "normal";

  return (
    <ScrollView contentContainerStyle={styles.scroll} style={styles.fill} testID="sprint18-clinical-right-panel">
      <PanelSection title="Measurements">
        <MetricRow label="Heart Rate" value={findings.heartRate.value} />
        <MetricRow label="PR" value={findings.prInterval.value} />
        <MetricRow label="QRS" value={findings.qrsDuration.value} />
        <MetricRow label="QT" value={findings.qtInterval.value} />
        <MetricRow label="QTc" value={findings.qtcInterval.value} />
        <MetricRow label="RR" value={digitalEcg?.measurements?.rrIntervalMs != null ? `${Math.round(digitalEcg.measurements.rrIntervalMs)} ms` : "Pending"} />
        <MetricRow label="Axis" value={findings.axis.value} />
      </PanelSection>

      <PanelSection title="AI">
        <MetricRow label="Diagnosis" tone={severity === "critical" || severity === "severe" ? "critical" : "primary"} value={analysis?.diagnosis ?? findings.interpretation.value} />
        <MetricRow label="Confidence" value={findings.confidence.value} />
        <MetricRow label="Severity" tone={severity === "critical" ? "critical" : severity === "severe" ? "warning" : "success"} value={severity.toUpperCase()} />
        {analysis?.recommendations?.length ? (
          <View style={styles.recommendations}>
            {analysis.recommendations.slice(0, 3).map((item) => (
              <Text key={item} style={styles.recommendation}>• {item}</Text>
            ))}
          </View>
        ) : null}
      </PanelSection>

      <PanelSection title="Image Quality">
        <MetricRow label="Resolution" value={imageWidth && imageHeight ? `${imageWidth}×${imageHeight}` : "Pending"} />
        <MetricRow label="Signal Quality" value={digitalEcg?.calibration?.confidence != null ? `${Math.round(digitalEcg.calibration.confidence * 100)}%` : "Pending"} />
        <MetricRow label="Digitization" tone={qualityTone} value={qualityScore != null ? `${qualityScore}%` : digitalEcgLoading ? "Processing" : "Pending"} />
        <MetricRow label="Grid Detection" value={digitalEcg?.calibration?.gridDetected ? "Detected" : "Pending"} />
        <MetricRow label="Baseline Wander" value={digitalEcg?.preprocessing?.noiseReduced ? "Reduced" : "Review"} />
        <MetricRow label="Noise" value={digitalEcg?.preprocessing?.noiseReduced ? "Reduced" : "Acceptable"} />
        {!digitalEcg && onDigitize ? (
          <Pressable onPress={onDigitize} style={styles.digitizeButton}>
            <Text style={styles.digitizeLabel}>{digitalEcgLoading ? "Digitizing…" : "Run Digitization"}</Text>
          </Pressable>
        ) : null}
      </PanelSection>

      <EcgMeasurementsPanel workspace={workspace} />
      <EcgAiAnnotationInspector workspace={aiOverlay} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  digitizeButton: {
    alignItems: "center",
    backgroundColor: medicalTheme.primary,
    borderRadius: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  digitizeLabel: { color: "#03131B", fontSize: 12, fontWeight: "900" },
  fill: { flex: 1 },
  metricLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  metricRow: {
    borderBottomColor: "rgba(30,58,74,0.55)",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  metricValue: { color: medicalTheme.text, fontSize: 12, fontWeight: "900", maxWidth: "58%", textAlign: "right" },
  recommendation: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  recommendations: { gap: 4, marginTop: 6 },
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
});
