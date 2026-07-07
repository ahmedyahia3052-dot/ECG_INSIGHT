import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcg } from "@/services/ecgProcessing";

export function EcgDigitizationQualityPanel({
  digitalEcg,
  isLoading,
  onDigitize,
}: {
  digitalEcg?: DigitalEcg | null;
  isLoading?: boolean;
  onDigitize?: () => void;
}) {
  if (isLoading) {
    return (
      <View testID="sprint165-digitization-quality-panel">
        <Card style={styles.card}>
          <SectionHeader title="Digitization Quality" subtitle="Loading digital ECG signal…" />
          <Text style={styles.meta}>Fetching digitized waveform and validation metrics.</Text>
        </Card>
      </View>
    );
  }

  if (!digitalEcg || digitalEcg.status === "fallback") {
    return (
      <View testID="sprint165-digitization-quality-panel">
        <Card style={styles.card}>
          <EmptyState
            message={digitalEcg?.fallbackReason ?? "Run ECG digitization to view signal quality, calibration, lead extraction, and warnings."}
            title="Digitization pending"
          />
          {onDigitize ? <PrimaryButton label="Run digitization now" onPress={onDigitize} variant="outline" /> : null}
        </Card>
      </View>
    );
  }

  const warnings = digitalEcg.quality.warnings.length ? digitalEcg.quality.warnings : ["No digitization warnings detected."];
  const validation = digitalEcg.validation;

  return (
    <View testID="sprint165-digitization-quality-panel">
      <Card style={styles.card}>
      <SectionHeader title="Digitization Quality" subtitle="Signal extraction and calibration confidence" />
      <View style={styles.badgeRow}>
        <Badge label={digitalEcg.quality.tier ?? `Quality ${digitalEcg.quality.score}/100`} tone={digitalEcg.quality.score >= 80 ? "success" : digitalEcg.quality.score >= 55 ? "warning" : "critical"} />
        <Badge label={`${digitalEcg.leadSegments.length || digitalEcg.leads.length}/12 leads`} tone={(digitalEcg.leadSegments.length || digitalEcg.leads.length) === 12 ? "success" : "warning"} />
        <Badge label={`${digitalEcg.calibration.paperSpeedMmPerSec} mm/s`} tone="primary" />
        <Badge label={`${digitalEcg.calibration.gainMmPerMv} mm/mV`} tone="primary" />
      </View>
      <Text style={styles.meta}>
        Extraction {digitalEcg.extractionTimestamp ? new Date(digitalEcg.extractionTimestamp).toLocaleString() : "pending"} · Grid {digitalEcg.calibration.gridDetected ? "detected" : "not detected"} · Confidence {Math.round(digitalEcg.calibration.confidence * 100)}%
      </Text>
      {validation ? (
        <View style={styles.metricGrid}>
          <Metric label="Digitization" value={`${validation.digitizationAccuracy}%`} />
          <Metric label="Lead detection" value={`${validation.leadDetectionPercent}%`} />
          <Metric label="Continuity" value={`${validation.signalContinuityPercent}%`} />
          <Metric label="Grid accuracy" value={`${validation.gridAccuracy}%`} />
          <Metric label="Validation" value={`${validation.score}/100`} />
        </View>
      ) : null}
      {digitalEcg.preprocessing ? (
        <Text style={styles.meta}>
          Preprocessing: border {digitalEcg.preprocessing.borderDetected ? "detected" : "uncertain"}, deskew {digitalEcg.preprocessing.deskewDegrees}°, contrast {digitalEcg.preprocessing.contrastEnhanced ? "enhanced" : "stable"}, noise {digitalEcg.preprocessing.noiseReduced ? "reduced" : "acceptable"}.
        </Text>
      ) : null}
      <SectionHeader title="Signal Quality & Warnings" />
      <View style={styles.warningList}>
        {(digitalEcg.quality.reasons ?? warnings).map((warning) => (
          <Text key={warning} style={styles.warningText}>• {warning}</Text>
        ))}
      </View>
      <Text style={styles.disclaimer}>Digitized signals must be reviewed against the original ECG image before clinical decisions.</Text>
      </Card>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCell}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionLink: { color: medicalTheme.primary, fontSize: 13, fontWeight: "800", marginTop: 8 },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  card: { gap: 8 },
  disclaimer: { color: medicalTheme.muted, fontSize: 11, fontWeight: "600" },
  meta: { color: medicalTheme.text, fontSize: 12, fontWeight: "600", lineHeight: 18 },
  metricCell: { backgroundColor: medicalTheme.background, borderColor: medicalTheme.border, borderRadius: 8, borderWidth: 1, minWidth: "46%", padding: 8 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metricLabel: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  metricValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "900", marginTop: 2 },
  warningList: { gap: 4 },
  warningText: { color: medicalTheme.warning, fontSize: 12, fontWeight: "700" },
});
