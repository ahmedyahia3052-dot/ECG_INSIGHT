import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, medicalTheme, PrimaryButton } from "@/components/enterprise/EnterpriseUI";
import type { AIAnalysisResult, AIExplainability } from "@/services/ai";

export const EcgAiReviewWorkflowPanel = memo(function EcgAiReviewWorkflowPanel({
  analysis,
  confirmed,
  explainability,
  onConfirm,
  onOpenReview,
}: {
  analysis?: AIAnalysisResult | null;
  confirmed?: boolean;
  explainability?: AIExplainability | null;
  onConfirm?: () => void;
  onOpenReview?: () => void;
}) {
  const highlights = explainability?.leadHighlights ?? [];
  const panelFacts = explainability?.panel ?? [];
  const urgency =
    analysis?.severity === "critical" || analysis?.severity === "severe"
      ? "Critical"
      : analysis?.severity === "moderate"
        ? "Moderate"
        : "Routine";

  return (
    <View style={styles.root} testID="sprint30-ai-review-panel">
      <Text style={styles.title}>AI Clinical Review Workspace</Text>
      {analysis ? (
        <>
          <View style={styles.block}>
            <Text style={styles.label}>Primary Diagnosis</Text>
            <Text style={styles.value}>{analysis.diagnosis}</Text>
            <Badge label={`${Math.round((analysis.confidenceScore ?? 0) * 100)}% confidence`} tone="primary" />
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Secondary Findings</Text>
            <Text style={styles.body}>{analysis.rhythm ? `Rhythm: ${analysis.rhythm}` : "No secondary rhythm flags."}</Text>
            {analysis.urgentActions?.length ? (
              analysis.urgentActions.map((item) => (
                <Text key={item} style={styles.bullet}>• {item}</Text>
              ))
            ) : null}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Differential Considerations</Text>
            {panelFacts.length ? (
              panelFacts.slice(0, 4).map((item) => (
                <Text key={item.label} style={styles.bullet}>
                  {item.label}: {item.value}
                </Text>
              ))
            ) : (
              <Text style={styles.body}>Refer to highlighted leads for region-specific differentials.</Text>
            )}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Urgency Level</Text>
            <Badge label={urgency} tone={analysis.severity === "critical" ? "critical" : "warning"} />
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Clinical Explanation</Text>
            <Text style={styles.body}>{analysis.interpretation}</Text>
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Supporting Evidence</Text>
            {highlights.length ? (
              highlights.map((h) => (
                <Text key={`${h.lead}-${h.finding}`} style={styles.bullet}>
                  {h.lead}: {h.finding} — {h.reason} ({Math.round(h.confidence * 100)}%)
                </Text>
              ))
            ) : (
              <Text style={styles.body}>No lead highlights available.</Text>
            )}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Suggested Investigations</Text>
            {analysis.recommendations?.length ? (
              analysis.recommendations.map((item) => (
                <Text key={item} style={styles.bullet}>• {item}</Text>
              ))
            ) : (
              <Text style={styles.body}>No additional investigations suggested.</Text>
            )}
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Guideline References</Text>
            <Text style={styles.body}>ESC/ACC ECG interpretation standards · Institutional AI CDS policy v2</Text>
          </View>
          <View style={styles.block}>
            <Text style={styles.label}>Doctor Confirmation</Text>
            <Badge label={confirmed ? "Confirmed" : "Pending physician review"} tone={confirmed ? "success" : "warning"} />
            {onConfirm ? (
              <PrimaryButton disabled={confirmed} label={confirmed ? "Confirmed" : "Confirm AI Findings"} onPress={onConfirm} variant="outline" />
            ) : null}
          </View>
        </>
      ) : (
        <Text style={styles.muted}>Run AI analysis to populate the review workspace.</Text>
      )}
      {onOpenReview ? <PrimaryButton label="Open Clinical Review" onPress={onOpenReview} variant="outline" /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  block: { gap: 4, marginBottom: 10 },
  body: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  bullet: { color: medicalTheme.text, fontSize: 11, lineHeight: 16 },
  label: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  muted: { color: medicalTheme.muted, fontSize: 12 },
  root: { gap: 8, paddingBottom: 12 },
  title: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900", marginBottom: 6 },
  value: { color: medicalTheme.text, fontSize: 14, fontWeight: "800" },
});
