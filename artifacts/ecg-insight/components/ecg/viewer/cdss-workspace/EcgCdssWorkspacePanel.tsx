import React, { memo, useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { MedicalIntelligenceReport } from "@/services/medicalIntelligence";

import type { EcgClinicalMeasurement } from "../measurementTypes";
import { buildCdssWorkspaceModel } from "./buildCdssWorkspaceModel";
import { triageLabel } from "./guidelineEngine";
import { matchedRules } from "./clinicalRuleEngine";
import type { CdssRuleEvaluation, CdssTriageLevel } from "./types";

const TRIAGE_COLORS: Record<CdssTriageLevel, string> = {
  black: "#0F172A",
  green: "#15803D",
  orange: "#C2410C",
  red: "#B91C1C",
  yellow: "#CA8A04",
};

const Section = memo(function Section({ children, testId, title }: { children: React.ReactNode; testId?: string; title: string }) {
  return (
    <View style={styles.section} testID={testId}>
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

const DiagnosisCard = memo(function DiagnosisCard({ rule }: { rule: CdssRuleEvaluation }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{rule.diagnosis}</Text>
      <Text style={styles.meta}>
        Confidence {rule.confidence}% · Severity {rule.severity.replace(/_/g, " ")}
      </Text>
      <Text style={styles.body}>{rule.evidence.reasoning}</Text>
      <Text style={styles.subheading}>Evidence</Text>
      {rule.evidence.affectedLeads.length ? <Text style={styles.listItem}>Supporting leads: {rule.evidence.affectedLeads.join(", ")}</Text> : null}
      {rule.evidence.measurements.map((item) => (
        <Text key={item} style={styles.listItem}>
          • {item}
        </Text>
      ))}
      {rule.evidence.morphology.map((item) => (
        <Text key={item} style={styles.listItem}>
          • {item}
        </Text>
      ))}
      {rule.evidence.rhythm ? <Text style={styles.listItem}>Rhythm: {rule.evidence.rhythm}</Text> : null}
      {rule.evidence.axis ? <Text style={styles.listItem}>Axis: {rule.evidence.axis}</Text> : null}
      {rule.contradictingFindings.length ? (
        <>
          <Text style={styles.subheading}>Contradicting</Text>
          {rule.contradictingFindings.map((item) => (
            <Text key={item} style={styles.muted}>
              • {item}
            </Text>
          ))}
        </>
      ) : null}
    </View>
  );
});

export const EcgCdssWorkspacePanel = memo(function EcgCdssWorkspacePanel({
  analysis,
  digitalEcg,
  explainability,
  measurements = [],
  medicalReport,
}: {
  analysis?: AIAnalysisResult | null;
  digitalEcg?: DigitalEcg | null;
  explainability?: AIExplainability | null;
  measurements?: EcgClinicalMeasurement[];
  medicalReport?: MedicalIntelligenceReport | null;
}) {
  const model = useMemo(
    () => buildCdssWorkspaceModel({ analysis, digitalEcg, explainability, measurements, medicalReport }),
    [analysis, digitalEcg, explainability, measurements, medicalReport],
  );

  const activeRules = useMemo(() => matchedRules(model.primaryRules), [model.primaryRules]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} testID="sprint44-cdss-workspace">
      <View style={[styles.triageBadge, { backgroundColor: TRIAGE_COLORS[model.assessment.triage] }]} testID="sprint44-cdss-triage-badge">
        <Text style={styles.triageText}>{triageLabel(model.assessment.triage)}</Text>
      </View>
      <Text style={styles.summary}>{model.summary}</Text>

      <Section testId="sprint44-cdss-clinical-summary" title="Clinical Summary">
        <Text style={styles.body}>{model.assessment.reasoning}</Text>
        <Text style={styles.meta}>
          Final assessment: {model.assessment.finalDiagnosis} · Overall {model.assessment.overallConfidence}%
        </Text>
        <Text style={styles.meta}>Pipeline: ECG → Digitization → Measurements → AI Findings → Rules → Differential → Recommendations → Assessment</Text>
      </Section>

      <Section testId="sprint44-cdss-diagnosis" title="Diagnosis">
        {activeRules.length ? activeRules.slice(0, 5).map((rule) => <DiagnosisCard key={rule.ruleId} rule={rule} />) : <Text style={styles.muted}>No rule-triggered diagnoses.</Text>}
      </Section>

      <Section testId="sprint44-cdss-differential" title="Differential">
        {model.differential.map((row) => (
          <View key={row.diagnosis} style={styles.card}>
            <Text style={styles.cardTitle}>
              {row.diagnosis} — {row.probability}%
            </Text>
            <Text style={styles.meta}>Clinical confidence {row.clinicalConfidence}%</Text>
            {row.supportingFindings.map((item) => (
              <Text key={item} style={styles.listItem}>
                + {item}
              </Text>
            ))}
            {row.contradictingFindings.map((item) => (
              <Text key={item} style={styles.muted}>
                − {item}
              </Text>
            ))}
          </View>
        ))}
      </Section>

      <Section testId="sprint44-cdss-evidence" title="Evidence">
        {activeRules.slice(0, 3).map((rule) => (
          <View key={`ev-${rule.ruleId}`} style={styles.card}>
            <Text style={styles.cardTitle}>{rule.diagnosis}</Text>
            {rule.evidence.morphology.map((m) => (
              <Text key={m} style={styles.listItem}>
                Morphology: {m}
              </Text>
            ))}
            {rule.evidence.measurements.map((m) => (
              <Text key={m} style={styles.listItem}>
                Measurement: {m}
              </Text>
            ))}
          </View>
        ))}
      </Section>

      <Section testId="sprint44-cdss-recommendations" title="Recommendations">
        {model.recommendations.map((rec) => (
          <View key={rec.action} style={styles.card}>
            <Text style={styles.cardTitle}>{rec.action}</Text>
            <Text style={styles.meta}>{rec.priority.toUpperCase()}</Text>
            <Text style={styles.body}>{rec.rationale}</Text>
            {rec.linkedDiagnoses.length ? <Text style={styles.muted}>Linked diagnoses: {rec.linkedDiagnoses.join(", ")}</Text> : null}
          </View>
        ))}
      </Section>

      <Section testId="sprint44-cdss-guidelines" title="Guidelines">
        {model.guidelines.map((g) => (
          <View key={`${g.source}-${g.topic}`} style={styles.card}>
            <Text style={styles.cardTitle}>
              {g.source} — {g.topic}
            </Text>
            <Text style={styles.meta}>
              Class {g.recommendationClass} · Level {g.evidenceLevel}
            </Text>
            <Text style={styles.body}>{g.statement}</Text>
          </View>
        ))}
      </Section>

      <Section testId="sprint44-cdss-risk" title="Risk">
        <Text style={styles.cardTitle}>Severity: {model.assessment.severity.replace(/_/g, " ")}</Text>
        {model.confidence.map((metric) => (
          <ConfidenceBar key={metric.label} label={metric.label} percent={metric.percent} />
        ))}
      </Section>

      <Section testId="sprint44-cdss-relationship-graph" title="Finding Relationship Graph">
        <Text style={styles.body}>{model.relationshipGraph.nodes.length} nodes · {model.relationshipGraph.edges.length} edges</Text>
        {model.relationshipGraph.edges.slice(0, 12).map((edge) => {
          const from = model.relationshipGraph.nodes.find((n) => n.id === edge.from);
          const to = model.relationshipGraph.nodes.find((n) => n.id === edge.to);
          return (
            <Text key={`${edge.from}-${edge.to}`} style={styles.listItem}>
              {from?.label ?? edge.from} → {edge.label} → {to?.label ?? edge.to}
            </Text>
          );
        })}
      </Section>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  body: { color: medicalTheme.text, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  card: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 10, borderWidth: 1, gap: 4, marginBottom: 8, padding: 10 },
  cardTitle: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
  confFill: { backgroundColor: medicalTheme.primary, height: "100%" },
  confLabel: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800", width: 120 },
  confRow: { alignItems: "center", flexDirection: "row", gap: 8, marginBottom: 4 },
  confTrack: { backgroundColor: "#E2E8F0", borderRadius: 999, flex: 1, height: 8, overflow: "hidden" },
  confValue: { color: medicalTheme.text, fontSize: 10, fontWeight: "900", width: 36 },
  listItem: { color: medicalTheme.text, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  meta: { color: medicalTheme.muted, fontSize: 10, fontWeight: "700", lineHeight: 15 },
  muted: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700", lineHeight: 16 },
  scroll: { gap: 8, paddingBottom: 12 },
  section: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 10, borderWidth: 1, gap: 6, padding: 10 },
  sectionTitle: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  subheading: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", marginTop: 4 },
  summary: { color: medicalTheme.text, fontSize: 12, fontWeight: "800" },
  triageBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  triageText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900" },
});
