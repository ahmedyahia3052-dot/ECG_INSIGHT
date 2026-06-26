import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { evaluateCDSS, listCDSSRuns, type CDSSFinding } from "@/services/clinicalIntelligence";

type Props = {
  accessToken: string;
  caseId: string;
};

export function CDSSDecisionPanel({ accessToken, caseId }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["cdss-runs", accessToken, caseId];
  const runsQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => listCDSSRuns(accessToken, caseId),
    queryKey,
    retry: false,
  });
  const evaluateMutation = useMutation({
    mutationFn: () => evaluateCDSS(accessToken, caseId),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey }),
  });

  const latest = runsQuery.data?.runs[0];
  const findings = latest?.findings ?? [];
  const redFlags = findings.filter((finding) => finding.findingType === "RED_FLAG");
  const recommendations = findings.filter((finding) => finding.findingType === "RECOMMENDATION");
  const occupational = findings.find((finding) => finding.findingType === "OCCUPATIONAL_DECISION");
  const trends = findings.filter((finding) => finding.findingType === "TREND");

  return (
    <Card style={styles.panel}>
      <SectionHeader
        action={<PrimaryButton label={evaluateMutation.isPending ? "Evaluating..." : "Run CDSS"} onPress={() => evaluateMutation.mutate()} />}
        title="Clinical Decision Support Engine"
      />
      {!latest && runsQuery.isLoading ? <Text style={styles.muted}>Loading decision support history...</Text> : null}
      {!latest && !runsQuery.isLoading ? <EmptyState title="No CDSS run yet" message="Run the clinical decision support engine to generate risk, recommendations, red flags, occupational fitness, explainability, and trends." /> : null}
      {latest ? (
        <>
          <View style={styles.grid}>
            <Card style={styles.subPanel}>
              <SectionHeader title="Risk Panel" />
              <Badge label={latest.riskCategory.replace(/_/g, " ")} tone={latest.riskCategory === "CRITICAL" || latest.riskCategory === "HIGH_RISK" ? "critical" : latest.riskCategory === "MODERATE_RISK" ? "warning" : "success"} />
              <Text style={styles.score}>{Math.round(latest.riskScore)}/100</Text>
              <Text style={styles.body}>{latest.summary}</Text>
              <Text style={styles.muted}>Generated {formatDate(latest.createdAt)}</Text>
            </Card>
            <Card style={styles.subPanel}>
              <SectionHeader title="Red Flag Alerts" />
              {redFlags.length === 0 ? <Text style={styles.body}>No emergency red flags detected.</Text> : null}
              {redFlags.map((finding) => <FindingRow key={finding.id} finding={finding} danger />)}
            </Card>
          </View>

          <View style={styles.grid}>
            <Card style={styles.subPanel}>
              <SectionHeader title="Recommendations" />
              {recommendations.length === 0 ? <Text style={styles.body}>Routine surveillance recommended.</Text> : null}
              {recommendations.map((finding) => <FindingRow key={finding.id} finding={finding} />)}
            </Card>
            <Card style={styles.subPanel}>
              <SectionHeader title="Occupational Decision" />
              <Badge label={latest.occupationalDecision.replace(/_/g, " ")} tone={latest.occupationalDecision === "FIT" ? "success" : latest.occupationalDecision === "FIT_WITH_RESTRICTIONS" ? "warning" : "critical"} />
              <Text style={styles.body}>{occupational?.recommendation ?? "No restrictions generated."}</Text>
              <Text style={styles.muted}>Profile: {latest.occupationalProfile ?? "Not specified"}</Text>
            </Card>
          </View>

          <View style={styles.grid}>
            <Card style={styles.subPanel}>
              <SectionHeader title="Explainability" />
              <Text style={styles.body}>{latest.explainabilityJson.why ?? "No explanation available."}</Text>
              <Text style={styles.muted}>Rules: {(latest.explainabilityJson.ruleIdentifiers ?? []).join(", ") || "None"}</Text>
              <Text style={styles.muted}>Confidence: {Math.round((latest.explainabilityJson.confidence ?? 0) * 100)}%</Text>
            </Card>
            <Card style={styles.subPanel}>
              <SectionHeader title="Trend Intelligence" />
              <Text style={styles.body}>{latest.trendSummary ?? "No trend summary."}</Text>
              {trends.map((finding) => <FindingRow key={finding.id} finding={finding} />)}
            </Card>
          </View>
        </>
      ) : null}
    </Card>
  );
}

function FindingRow({ danger, finding }: { danger?: boolean; finding: CDSSFinding }) {
  return (
    <View style={styles.finding}>
      <View style={styles.findingHeader}>
        <Badge label={finding.ruleId} tone={danger ? "critical" : "primary"} />
        {finding.priority ? <Badge label={finding.priority.toLowerCase()} tone={danger ? "critical" : "warning"} /> : null}
      </View>
      <Text style={styles.body}>{finding.title}</Text>
      <Text style={styles.muted}>{finding.message}</Text>
      {finding.recommendation ? <Text style={styles.recommendation}>{finding.recommendation}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { color: medicalTheme.text, fontSize: 13, fontWeight: "800", lineHeight: 20 },
  finding: { backgroundColor: medicalTheme.surface, borderRadius: 14, gap: 6, padding: 12 },
  findingHeader: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  muted: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  panel: { gap: 16 },
  recommendation: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900", lineHeight: 20 },
  score: { color: medicalTheme.text, fontSize: 32, fontWeight: "900" },
  subPanel: { flex: 1, gap: 10, minWidth: 300 },
});
