import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import {
  compareLongitudinalECG,
  getLongitudinalDashboard,
  listLongitudinalComparisons,
  type LongitudinalComparisonScope,
  type OccupationalSurveillanceType,
} from "@/services/clinicalIntelligence";

type Props = {
  accessToken: string;
  caseId: string;
  patientId: string;
};

const scopes: LongitudinalComparisonScope[] = ["PREVIOUS", "BASELINE", "HISTORICAL"];
const surveillanceTypes: OccupationalSurveillanceType[] = ["PRE_EMPLOYMENT", "PERIODIC_EXAMINATION", "RETURN_TO_WORK", "POST_INCIDENT", "EXIT_EXAMINATION"];

export function LongitudinalECGPanel({ accessToken, caseId, patientId }: Props) {
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<LongitudinalComparisonScope>("PREVIOUS");
  const [surveillanceType, setSurveillanceType] = useState<OccupationalSurveillanceType | undefined>();
  const comparisonsKey = ["longitudinal-comparisons", accessToken, caseId];
  const dashboardKey = ["longitudinal-dashboard", accessToken, patientId];
  const comparisonsQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => listLongitudinalComparisons(accessToken, caseId),
    queryKey: comparisonsKey,
    retry: false,
  });
  const dashboardQuery = useQuery({
    enabled: !!accessToken && !!patientId,
    queryFn: () => getLongitudinalDashboard(accessToken, patientId),
    queryKey: dashboardKey,
    retry: false,
  });
  const compareMutation = useMutation({
    mutationFn: () => compareLongitudinalECG(accessToken, caseId, { scope, surveillanceType }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: comparisonsKey });
      await queryClient.invalidateQueries({ queryKey: dashboardKey });
    },
  });

  const latest = comparisonsQuery.data?.comparisons[0] ?? dashboardQuery.data?.dashboard.comparisons[0];
  const trendMetrics = latest?.trendMetrics ?? dashboardQuery.data?.dashboard.trendMetrics ?? [];
  const abnormalityTimeline = latest?.abnormalityTimeline ?? dashboardQuery.data?.dashboard.abnormalityTimeline ?? [];
  const riskProgression = latest?.riskProgression ?? dashboardQuery.data?.dashboard.riskProgression ?? [];

  return (
    <Card style={styles.panel}>
      <SectionHeader
        action={<PrimaryButton label={compareMutation.isPending ? "Comparing..." : "Run Comparison"} onPress={() => compareMutation.mutate()} />}
        title="Longitudinal ECG Intelligence"
      />
      <Text style={styles.disclaimer}>
        Longitudinal analytics support clinical review and require confirmation against original ECG tracings.
      </Text>
      <View style={styles.actions}>
        {scopes.map((item) => (
          <PrimaryButton key={item} label={item.replace(/_/g, " ")} onPress={() => setScope(item)} variant={scope === item ? "primary" : "outline"} />
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.actions}>
          {surveillanceTypes.map((item) => (
            <PrimaryButton
              key={item}
              label={item.replace(/_/g, " ")}
              onPress={() => setSurveillanceType(surveillanceType === item ? undefined : item)}
              variant={surveillanceType === item ? "primary" : "outline"}
            />
          ))}
        </View>
      </ScrollView>
      {!latest && comparisonsQuery.isLoading ? <Text style={styles.muted}>Loading longitudinal comparisons...</Text> : null}
      {!latest && !comparisonsQuery.isLoading ? <EmptyState title="No comparison yet" message="Run a longitudinal ECG comparison to generate interval-change intelligence." /> : null}
      {latest ? (
        <>
          <View style={styles.heroRow}>
            <Badge label={latest.overallChange.replace(/_/g, " ")} tone={latest.overallChange === "WORSENING" || latest.overallChange === "NEW_ABNORMALITY" ? "critical" : latest.overallChange === "IMPROVEMENT" ? "success" : "primary"} />
            <Text style={styles.statement}>{latest.aiTrendStatement}</Text>
            <Text style={styles.muted}>Generated {formatDate(latest.createdAt)} · {latest.scope.toLowerCase()}</Text>
          </View>

          <View style={styles.grid}>
            <Card style={styles.subPanel}>
              <SectionHeader title="ECG Comparison Dashboard" />
              {latest.findings.slice(0, 6).map((finding) => (
                <View key={finding.id} style={styles.item}>
                  <View style={styles.itemHeader}>
                    <Badge label={finding.category.replace(/_/g, " ")} tone={finding.changeType === "WORSENING" || finding.changeType === "NEW_ABNORMALITY" ? "critical" : "primary"} />
                    <Badge label={finding.changeType.replace(/_/g, " ")} tone="warning" />
                  </View>
                  <Text style={styles.body}>{finding.title}</Text>
                  <Text style={styles.muted}>{finding.statement}</Text>
                </View>
              ))}
            </Card>

            <Card style={styles.subPanel}>
              <SectionHeader title="Trend Charts" />
              {trendMetrics.slice(-6).map((metric, index) => (
                <Text key={`${String(metric.caseId)}-${index}`} style={styles.body}>
                  {String(metric.date).slice(0, 10)} · HR {value(metric.heartRate)} · PR {value(metric.prInterval)} · QRS {value(metric.qrsDuration)} · QTc {value(metric.qtcInterval)} · Axis {value(metric.axis)}
                </Text>
              ))}
            </Card>
          </View>

          <View style={styles.grid}>
            <Card style={styles.subPanel}>
              <SectionHeader title="Abnormality Timeline" />
              {abnormalityTimeline.slice(-6).map((item, index) => (
                <Text key={`${String(item.caseId)}-${index}`} style={styles.body}>
                  {String(item.date).slice(0, 10)} · {Array.isArray(item.abnormalities) && item.abnormalities.length ? item.abnormalities.join(", ") : "No abnormality text"} · {String(item.severity ?? "unknown")}
                </Text>
              ))}
            </Card>
            <Card style={styles.subPanel}>
              <SectionHeader title="Risk Progression" />
              {riskProgression.slice(-6).map((item, index) => (
                <Text key={`${String(item.caseId)}-${index}`} style={styles.body}>
                  {String(item.date).slice(0, 10)} · {String(item.priority ?? "medium")} · score {String(item.score ?? "-")} · {String(item.severity ?? "unknown")}
                </Text>
              ))}
              {latest.occupationalSummary ? <Text style={styles.recommendation}>{String(latest.occupationalSummary.recommendation ?? "")}</Text> : null}
            </Card>
          </View>
        </>
      ) : null}
    </Card>
  );
}

function value(input: unknown) {
  return input === null || input === undefined ? "-" : String(input);
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  body: { color: medicalTheme.text, fontSize: 13, fontWeight: "800", lineHeight: 20 },
  disclaimer: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  heroRow: { gap: 8 },
  item: { backgroundColor: medicalTheme.surface, borderRadius: 14, gap: 6, padding: 12 },
  itemHeader: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  muted: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  panel: { gap: 16 },
  recommendation: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900", lineHeight: 20 },
  statement: { color: medicalTheme.text, fontSize: 18, fontWeight: "900", lineHeight: 24 },
  subPanel: { flex: 1, gap: 10, minWidth: 320 },
});
