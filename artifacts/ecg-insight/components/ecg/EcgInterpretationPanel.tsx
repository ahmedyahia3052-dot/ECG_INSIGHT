import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { EcgClinicalInterpretation } from "@/services/ecgProcessing";

type Props = {
  interpretation?: EcgClinicalInterpretation | null;
};

function severityTone(severity: EcgClinicalInterpretation["severity"]) {
  if (severity === "critical") return "critical" as const;
  if (severity === "urgent" || severity === "abnormal") return "warning" as const;
  if (severity === "minor") return "primary" as const;
  return "success" as const;
}

export function EcgInterpretationPanel({ interpretation }: Props) {
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  if (!interpretation) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>Clinical Interpretation</Text>
        <Text style={styles.emptyText}>Digitize and measure an ECG to generate evidence-based interpretation.</Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Text style={styles.title}>Clinical Interpretation</Text>
        <Badge label={interpretation.severity.toUpperCase()} tone={severityTone(interpretation.severity)} />
      </View>

      <Text style={styles.primary}>{interpretation.primaryDiagnosis}</Text>
      <Text style={styles.summary}>{interpretation.report.summary}</Text>

      <View style={styles.metaRow}>
        <MetaChip label="Urgency" value={interpretation.urgency.toUpperCase()} />
        <MetaChip label="Confidence" value={`${Math.round(interpretation.confidence * 100)}%`} />
        <MetaChip label="Findings" value={String(interpretation.findings.length)} />
      </View>

      <Text style={styles.sectionTitle}>Findings</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.findingsRail}>
        {interpretation.findings.map((item) => (
          <Pressable
            key={item.code}
            onPress={() => setExpandedCode((current) => (current === item.code ? null : item.code))}
            style={[styles.findingCard, expandedCode === item.code && styles.findingCardActive]}
          >
            <Text style={styles.findingLabel}>{item.label}</Text>
            <Text style={styles.findingCategory}>{item.category}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {expandedCode ? (
        <View style={styles.evidenceCard}>
          {interpretation.findings.filter((item) => item.code === expandedCode).map((item) => (
            <View key={item.code} style={styles.evidenceBlock}>
              <Text style={styles.evidenceTitle}>Detected {item.label} because:</Text>
              {item.evidence.map((row) => (
                <Text key={`${item.code}-${row.feature}`} style={styles.evidenceLine}>• {row.feature} = {row.value}</Text>
              ))}
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Recommendations</Text>
      {interpretation.recommendations.map((item) => (
        <Text key={item} style={styles.recommendation}>• {item}</Text>
      ))}

      <Text style={styles.sectionTitle}>Markdown Report</Text>
      <ScrollView style={styles.markdownBox}>
        <Text style={styles.markdownText}>{interpretation.markdownReport}</Text>
      </ScrollView>
    </View>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipLabel}>{label}</Text>
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "rgba(15,23,42,0.88)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 100,
    padding: 10,
  },
  chipLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  chipValue: { color: medicalTheme.text, fontSize: 13, fontWeight: "900", marginTop: 4 },
  empty: {
    backgroundColor: "rgba(15,23,42,0.82)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  emptyText: { color: medicalTheme.muted, fontSize: 13, lineHeight: 20 },
  emptyTitle: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  evidenceBlock: { gap: 6 },
  evidenceCard: {
    backgroundColor: "rgba(15,23,42,0.88)",
    borderColor: "rgba(56,189,248,0.28)",
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 12,
  },
  evidenceLine: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  evidenceTitle: { color: medicalTheme.primary, fontSize: 13, fontWeight: "800" },
  findingCard: {
    backgroundColor: "rgba(15,23,42,0.88)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
    minWidth: 160,
    padding: 12,
  },
  findingCardActive: { borderColor: medicalTheme.primary, backgroundColor: "rgba(56,189,248,0.12)" },
  findingCategory: { color: medicalTheme.muted, fontSize: 11, marginTop: 4, textTransform: "capitalize" },
  findingLabel: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  findingsRail: { maxHeight: 92 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  markdownBox: {
    backgroundColor: "rgba(2,6,23,0.92)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 220,
    padding: 12,
  },
  markdownText: { color: medicalTheme.muted, fontFamily: "monospace", fontSize: 11, lineHeight: 18 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  primary: { color: medicalTheme.text, fontSize: 18, fontWeight: "900" },
  recommendation: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  sectionTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  shell: { gap: 12 },
  summary: { color: medicalTheme.muted, fontSize: 13, lineHeight: 20 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
