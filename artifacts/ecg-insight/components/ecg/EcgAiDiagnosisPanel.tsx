import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { EcgAiDiagnosis } from "@/services/ecgProcessing";

type Props = {
  diagnosis?: EcgAiDiagnosis | null;
};

export function EcgAiDiagnosisPanel({ diagnosis }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!diagnosis) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>AI Diagnosis Ensemble</Text>
        <Text style={styles.emptyText}>Digitize an ECG to combine rule engine, measurements, deep learning, and local LLM reasoning.</Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Diagnosis Ensemble</Text>
        <Badge label={`${Math.round(diagnosis.confidence * 100)}% confidence`} tone={diagnosis.confidence >= 0.7 ? "success" : "warning"} />
      </View>

      <Text style={styles.primary}>{diagnosis.primaryDiagnosis}</Text>
      <Text style={styles.meta}>Agreement with rules: {Math.round(diagnosis.agreementWithRules * 100)}%</Text>
      <Text style={styles.summary}>{diagnosis.disagreementExplanation}</Text>

      <Text style={styles.sectionTitle}>Top Diagnoses</Text>
      {diagnosis.topDiagnoses.map((item, index) => (
        <Pressable
          key={item.label}
          onPress={() => setExpanded((current) => (current === item.label ? null : item.label))}
          style={[styles.row, expanded === item.label && styles.rowActive]}
        >
          <Text style={styles.rank}>{index + 1}</Text>
          <View style={styles.rowBody}>
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.rowMeta}>{Math.round(item.probability * 100)}% · rules agree {Math.round(item.agreementWithRules * 100)}%</Text>
            {expanded === item.label && item.evidence.length ? (
              <View style={styles.evidence}>
                {item.evidence.map((line) => <Text key={line} style={styles.evidenceLine}>• {line}</Text>)}
              </View>
            ) : null}
          </View>
        </Pressable>
      ))}

      <Text style={styles.sectionTitle}>Clinical Reasoning</Text>
      <Text style={styles.reasoning}>{diagnosis.clinicalReasoning}</Text>

      <Text style={styles.sectionTitle}>Ensemble Sources</Text>
      <View style={styles.sources}>
        {diagnosis.ensembleSources.map((source) => (
          <Badge key={source} label={source.replace(/_/g, " ")} tone="primary" />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  evidence: { gap: 4, marginTop: 8 },
  evidenceLine: { color: medicalTheme.muted, fontSize: 11, lineHeight: 16 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  meta: { color: medicalTheme.muted, fontSize: 12 },
  primary: { color: medicalTheme.text, fontSize: 18, fontWeight: "900" },
  rank: { color: medicalTheme.primary, fontSize: 16, fontWeight: "900", width: 24 },
  reasoning: { color: medicalTheme.text, fontSize: 13, lineHeight: 20 },
  row: {
    alignItems: "flex-start",
    backgroundColor: "rgba(15,23,42,0.88)",
    borderColor: "rgba(148,163,184,0.22)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  rowActive: { borderColor: medicalTheme.primary, backgroundColor: "rgba(56,189,248,0.12)" },
  rowBody: { flex: 1, gap: 4 },
  rowLabel: { color: medicalTheme.text, fontSize: 14, fontWeight: "800" },
  rowMeta: { color: medicalTheme.muted, fontSize: 11 },
  sectionTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  shell: { gap: 12 },
  sources: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summary: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  title: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
