import React, { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { MedicalIntelligenceReport } from "@/services/medicalIntelligence";

import { buildCardiologistModelFromSources } from "./ai-cardiologist";
import type { CardiologistStructuredFinding, IntervalStatus } from "./ai-cardiologist/types";
import { EcgClinicalCard } from "./EcgClinicalCard";
import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";

function statusTone(status: IntervalStatus): "critical" | "primary" | "success" | "warning" {
  if (status === "abnormal") return "critical";
  if (status === "borderline") return "warning";
  if (status === "normal") return "success";
  return "primary";
}

function FindingRow({
  active,
  finding,
  onPress,
}: {
  active?: boolean;
  finding: CardiologistStructuredFinding;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.findingRow, active && styles.findingRowActive, pressed && styles.findingRowPressed]}
      testID={`sprint38-finding-${finding.code}`}
    >
      <View style={styles.findingHeader}>
        <Text style={styles.findingLabel}>{finding.label}</Text>
        <Badge label={`${finding.confidence}%`} tone={finding.severity === "critical" ? "critical" : "primary"} />
      </View>
      <Text style={styles.findingMeta}>Leads: {finding.affectedLeads.join(", ")}</Text>
      <Text style={styles.findingBody}>{finding.explanation}</Text>
    </Pressable>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricLine}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export const EcgAiCardiologistWorkspace = memo(function EcgAiCardiologistWorkspace({
  analysis,
  confirmed,
  digitalEcg,
  explainability,
  loading,
  medicalReport,
  onConfirm,
  onFocusLeads,
  onOpenReview,
  selectedFindingId,
}: {
  analysis?: AIAnalysisResult | null;
  confirmed?: boolean;
  digitalEcg?: DigitalEcg | null;
  explainability?: AIExplainability | null;
  loading?: boolean;
  medicalReport?: MedicalIntelligenceReport | null;
  onConfirm?: () => void;
  onFocusLeads?: (finding: CardiologistStructuredFinding) => void;
  onOpenReview?: () => void;
  selectedFindingId?: string | null;
}) {
  const model = useMemo(
    () => buildCardiologistModelFromSources(analysis, explainability, digitalEcg, medicalReport),
    [analysis, digitalEcg, explainability, medicalReport],
  );

  if (loading && !model.loaded) {
    return (
      <View style={styles.root} testID="sprint38-ai-cardiologist-loading">
        <Text style={styles.loadingText}>Generating structured cardiologist interpretation…</Text>
      </View>
    );
  }

  if (!model.loaded) {
    return (
      <View style={styles.root} testID="sprint38-ai-cardiologist-empty">
        <Text style={styles.title}>AI Cardiologist Workspace</Text>
        <Text style={styles.muted}>Digitize the ECG and run AI analysis to populate rhythm, axis, intervals, waveforms, and clinical impression.</Text>
        {onOpenReview ? <PrimaryButton label="Open Clinical Review" onPress={onOpenReview} variant="outline" /> : null}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} style={styles.root} testID="sprint38-ai-cardiologist-workspace">
      <View nativeID="sprint30-ai-review-panel" testID="sprint30-ai-review-panel">
        <View style={styles.header}>
          <Text style={styles.title}>AI Cardiologist Interpretation</Text>
          <Badge label={`${model.confidence.overall}% overall`} tone="primary" />
        </View>
        <Text style={styles.primaryDx}>{model.primaryDiagnosis.label}</Text>
        <Text style={styles.primaryMeta}>Code {model.primaryDiagnosis.code} · Confidence {model.primaryDiagnosis.confidence}%</Text>
      </View>

      <SectionCard badge={model.rhythm.regularity} id="rhythm" title="1 · Rhythm Analysis">
        <MetricLine label="Rhythm" value={model.rhythm.rhythm} />
        <MetricLine label="Regularity" value={model.rhythm.regularity} />
        <MetricLine label="Heart Rate" value={model.rhythm.heartRate != null ? `${model.rhythm.heartRate} bpm` : "—"} />
        <MetricLine label="P wave" value={model.rhythm.pWaveDetected ? "Detected" : "Not detected"} />
        <MetricLine label="RR variability" value={model.rhythm.rrVariability} />
        <MetricLine label="PR status" value={model.rhythm.prStatus} />
      </SectionCard>

      <SectionCard badge={model.axis.classification} id="axis" title="2 · Axis">
        <MetricLine label="Classification" value={model.axis.classification} />
        <MetricLine label="QRS axis" value={model.axis.degrees != null ? `${model.axis.degrees}°` : "—"} />
        <MetricLine label="Confidence" value={`${model.axis.confidence}%`} />
        <Text style={styles.body}>{model.axis.explanation}</Text>
      </SectionCard>

      <SectionCard id="intervals" title="3 · Intervals">
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeadCell}>Measure</Text>
          <Text style={styles.tableHeadCell}>Value</Text>
          <Text style={styles.tableHeadCell}>Normal</Text>
          <Text style={styles.tableHeadCell}>Flag</Text>
        </View>
        {model.intervals.map((row) => (
          <View key={row.name} style={styles.tableRow} testID={`sprint38-interval-${row.name}`}>
            <Text style={styles.tableCell}>{row.name}</Text>
            <Text style={styles.tableCell}>{row.value != null ? `${Math.round(row.value)} ${row.unit}` : "—"}</Text>
            <Text style={styles.tableCell}>{row.normalRange}</Text>
            <Text style={[styles.tableCell, styles.flagCell, row.status === "abnormal" && styles.flagAbnormal]}>
              {row.flag ?? (row.status === "normal" ? "Normal" : row.status)}
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard id="waves" title="4 · Wave Analysis">
        {model.waveAnalysis.map((row) => (
          <View key={row.wave} style={styles.waveRow}>
            <View style={styles.waveHeader}>
              <Text style={styles.waveTitle}>{row.wave}</Text>
              <Badge label={row.interpretation} tone={statusTone(row.status)} />
            </View>
            <Text style={styles.body}>{row.explanation}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard badge={model.stAnalysis.length ? `${model.stAnalysis.length}` : undefined} id="st" title="5 · ST Analysis">
        {model.stAnalysis.length ? (
          model.stAnalysis.map((row) => (
            <Pressable
              key={row.label}
              onPress={() => onFocusLeads?.({ affectedLeads: row.affectedLeads, category: "ischemia", code: "ST", confidence: 0, confidenceLevel: "medium", explanation: row.explanation, id: row.label, label: row.label, severity: "abnormal" })}
              style={styles.findingRow}
            >
              <Text style={styles.findingLabel}>{row.label}</Text>
              <Text style={styles.findingMeta}>Pattern: {row.pattern} · Leads {row.affectedLeads.join(", ")}</Text>
              <Text style={styles.findingBody}>{row.explanation}</Text>
            </Pressable>
          ))
        ) : (
          <Text style={styles.body}>No significant ST deviation detected on measured waveform.</Text>
        )}
      </SectionCard>

      <FindingSection findings={model.blocks} id="blocks" onFocusLeads={onFocusLeads} selectedFindingId={selectedFindingId} title="6 · Block Detection" />
      <FindingSection findings={model.arrhythmias} id="arrhythmia" onFocusLeads={onFocusLeads} selectedFindingId={selectedFindingId} title="7 · Arrhythmia" />
      <FindingSection findings={model.hypertrophy} id="hypertrophy" onFocusLeads={onFocusLeads} selectedFindingId={selectedFindingId} title="8 · Hypertrophy" />
      <FindingSection findings={model.ischemia} id="ischemia" onFocusLeads={onFocusLeads} selectedFindingId={selectedFindingId} title="9 · Ischemia / Infarction" />

      <SectionCard id="impression" title="10 · Clinical Impression">
        <Text style={styles.impression}>{model.clinicalImpression}</Text>
      </SectionCard>

      <SectionCard id="differential" title="11 · Differential Diagnosis">
        {model.differential.length ? (
          model.differential.map((row) => (
            <View key={`${row.rank}-${row.label}`} style={styles.diffRow} testID={`sprint38-differential-${row.rank}`}>
              <Text style={styles.diffRank}>#{row.rank}</Text>
              <View style={styles.diffBody}>
                <Text style={styles.findingLabel}>{row.label}</Text>
                <Text style={styles.findingMeta}>{row.confidence}% likelihood</Text>
                <Text style={styles.body}>{row.explanation}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.body}>No ranked differential available.</Text>
        )}
      </SectionCard>

      <SectionCard id="recommendations" title="12 · Recommendations">
        {model.recommendations.length ? (
          model.recommendations.map((row) => (
            <View key={row.action} style={styles.recRow}>
              <Badge label={row.priority} tone={row.priority === "immediate" ? "critical" : "primary"} />
              <Text style={styles.findingLabel}>{row.action}</Text>
              <Text style={styles.body}>{row.rationale}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.body}>No additional recommendations.</Text>
        )}
      </SectionCard>

      <SectionCard id="confidence" title="13 · Confidence">
        <MetricLine label="Overall" value={`${model.confidence.overall}% (${model.confidence.overallLevel})`} />
        <MetricLine label="Signal quality" value={model.confidence.signalQuality} />
        <MetricLine label="Lead quality" value={model.confidence.leadQuality} />
        <MetricLine label="Image quality" value={model.confidence.imageQuality} />
        <Text style={styles.sectionLabel}>Evidence used</Text>
        {model.confidence.evidenceUsed.length ? (
          model.confidence.evidenceUsed.map((item) => (
            <Text key={item} style={styles.bullet}>• {item}</Text>
          ))
        ) : (
          <Text style={styles.body}>Evidence derived from measurement engine and rule findings.</Text>
        )}
      </SectionCard>

      <SectionCard id="visualization" title="14 · Visualization">
        <Text style={styles.body}>Select any finding above to highlight affected leads on the ECG canvas and rhythm strip.</Text>
        {selectedFindingId ? <Badge label="Lead focus active" tone="success" /> : null}
      </SectionCard>

      <View style={styles.footer}>
        <Badge label={confirmed ? "Confirmed" : "Pending physician review"} tone={confirmed ? "success" : "warning"} />
        {onConfirm ? (
          <PrimaryButton disabled={confirmed} label={confirmed ? "Confirmed" : "Confirm AI Findings"} onPress={onConfirm} variant="outline" />
        ) : null}
        {onOpenReview ? <PrimaryButton label="Open Clinical Review" onPress={onOpenReview} variant="outline" /> : null}
      </View>
    </ScrollView>
  );
});

function SectionCard({
  badge,
  children,
  id,
  title,
}: {
  badge?: string;
  children: React.ReactNode;
  id: string;
  title: string;
}) {
  return (
    <EcgClinicalCard badge={badge} defaultCollapsed={false} id={`sprint38-${id}`} title={title}>
      <View testID={`sprint38-section-${id}`}>{children}</View>
    </EcgClinicalCard>
  );
}

function FindingSection({
  findings,
  id,
  onFocusLeads,
  selectedFindingId,
  title,
}: {
  findings: CardiologistStructuredFinding[];
  id: string;
  onFocusLeads?: (finding: CardiologistStructuredFinding) => void;
  selectedFindingId?: string | null;
  title: string;
}) {
  return (
    <EcgClinicalCard badge={findings.length ? String(findings.length) : undefined} defaultCollapsed={false} id={`sprint38-${id}`} title={title}>
      <View testID={`sprint38-section-${id}`}>
        {findings.length ? (
          findings.map((finding) => (
            <FindingRow
              active={selectedFindingId === finding.id}
              finding={finding}
              key={finding.id}
              onPress={() => onFocusLeads?.(finding)}
            />
          ))
        ) : (
          <Text style={styles.body}>No findings in this category on measured signal.</Text>
        )}
      </View>
    </EcgClinicalCard>
  );
}

const styles = StyleSheet.create({
  body: { color: ECG_COCKPIT_COLORS.text, fontSize: 11, lineHeight: 16 },
  bullet: { color: ECG_COCKPIT_COLORS.text, fontSize: 10, lineHeight: 15 },
  diffBody: { flex: 1, gap: 2 },
  diffRank: { color: ECG_COCKPIT_COLORS.accent, fontSize: 12, fontWeight: "900", width: 24 },
  diffRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  findingBody: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, lineHeight: 14 },
  findingHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  findingLabel: { color: ECG_COCKPIT_COLORS.text, fontSize: 11, fontWeight: "900" },
  findingMeta: { color: ECG_COCKPIT_COLORS.accent, fontSize: 9, fontWeight: "800" },
  findingRow: {
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
    marginBottom: 6,
    padding: 8,
  },
  findingRowActive: { borderColor: ECG_COCKPIT_COLORS.accent, borderWidth: 1.5 },
  findingRowPressed: { opacity: 0.88 },
  flagAbnormal: { color: ECG_COCKPIT_COLORS.critical },
  flagCell: { fontWeight: "900" },
  footer: { gap: 8, paddingBottom: 16, paddingTop: 4 },
  header: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  impression: { color: medicalTheme.text, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  loadingText: { color: medicalTheme.muted, fontSize: 12, padding: 12 },
  metricLabel: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9, fontWeight: "800", width: 92 },
  metricLine: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 4 },
  metricValue: { color: ECG_COCKPIT_COLORS.text, flex: 1, fontSize: 10, fontWeight: "800" },
  muted: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  primaryDx: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  primaryMeta: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700", marginBottom: 8 },
  recRow: { gap: 4, marginBottom: 8 },
  root: { flex: 1, minHeight: 0 },
  scroll: { gap: 4, paddingBottom: 8 },
  sectionLabel: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9, fontWeight: "800", marginTop: 6 },
  tableCell: { color: ECG_COCKPIT_COLORS.text, flex: 1, fontSize: 9, fontWeight: "700" },
  tableHeadCell: { color: ECG_COCKPIT_COLORS.textMuted, flex: 1, fontSize: 8, fontWeight: "900" },
  tableHeader: { flexDirection: "row", marginBottom: 4 },
  tableRow: { borderTopColor: ECG_COCKPIT_COLORS.border, borderTopWidth: 1, flexDirection: "row", paddingVertical: 4 },
  title: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900" },
  waveHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  waveRow: { gap: 4, marginBottom: 8 },
  waveTitle: { color: ECG_COCKPIT_COLORS.text, fontSize: 11, fontWeight: "900" },
});
