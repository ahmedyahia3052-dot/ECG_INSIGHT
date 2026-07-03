import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, PageSection, SectionHeader, StatCard, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import {
  benchmarkExportUrl,
  getEcgBenchmarkDashboard,
  getEcgBenchmarkRun,
  runEcgBenchmark,
  type BenchmarkDatasetId,
} from "@/services/ecgBenchmark";
import { API_BASE_URL } from "@/src/config/api";

const DATASETS: Array<{ id: BenchmarkDatasetId; label: string }> = [
  { id: "ptb-xl", label: "PTB-XL" },
  { id: "physionet", label: "PhysioNet" },
  { id: "cpsc", label: "CPSC 2018" },
];

export default function EcgBenchmarkDashboardScreen() {
  const { authToken, canAccess } = useAuth();
  const token = authToken?.token;
  const allowed = canAccess(["admin", "super_admin"]);
  const queryClient = useQueryClient();
  const [dataset, setDataset] = useState<BenchmarkDatasetId>("ptb-xl");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    enabled: !!token && allowed,
    queryFn: () => getEcgBenchmarkDashboard(token!),
    queryKey: ["ecg-benchmark-dashboard", token],
    retry: false,
  });

  const runDetailQuery = useQuery({
    enabled: !!token && allowed && !!selectedRunId,
    queryFn: () => getEcgBenchmarkRun(token!, selectedRunId!),
    queryKey: ["ecg-benchmark-run", token, selectedRunId],
    retry: false,
  });

  const runMutation = useMutation({
    mutationFn: () => runEcgBenchmark(token!, { dataset, maxSamples: 4 }),
    onSuccess: (payload) => {
      setSelectedRunId(payload.benchmark.id);
      queryClient.invalidateQueries({ queryKey: ["ecg-benchmark-dashboard", token] });
    },
  });

  const dashboard = dashboardQuery.data?.dashboard;
  const latest = runDetailQuery.data?.run ?? dashboard?.latestRun;

  const exportHref = useMemo(() => {
    if (!selectedRunId || !token) return null;
    return `${API_BASE_URL}${benchmarkExportUrl(selectedRunId, "csv")}`;
  }, [selectedRunId, token]);

  if (!allowed) {
    return <EmptyState title="Developer access required" message="Only administrators can open the clinical validation benchmark dashboard." />;
  }

  return (
    <PageSection>
      <View style={styles.statGrid}>
        <StatCard icon="check-circle" label="Overall Accuracy" value={`${Math.round((dashboard?.overallAccuracy ?? 0) * 100)}%`} />
        <StatCard icon="layers" label="Benchmark Runs" value={String(dashboard?.totals.runs ?? 0)} />
        <StatCard icon="alert-triangle" label="Misclassified" tone="warning" value={String(dashboard?.totals.misclassified ?? 0)} />
        <StatCard icon="x-circle" label="False Positives" tone="critical" value={String(dashboard?.totals.falsePositives ?? 0)} />
        <StatCard icon="minus-circle" label="False Negatives" tone="critical" value={String(dashboard?.totals.falseNegatives ?? 0)} />
      </View>

      <Card style={styles.panel}>
        <SectionHeader
          title="Clinical Validation Benchmark"
          subtitle="Run the full ECG pipeline against PTB-XL, PhysioNet, and CPSC-style manifests and compare AI diagnosis against ground truth."
        />
        <View style={styles.datasetRow}>
          {DATASETS.map((item) => (
            <Pressable key={item.id} onPress={() => setDataset(item.id)} style={[styles.datasetChip, dataset === item.id && styles.datasetChipActive]}>
              <Text style={[styles.datasetChipText, dataset === item.id && styles.datasetChipTextActive]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable disabled={runMutation.isPending} onPress={() => runMutation.mutate()} style={styles.runButton}>
          <Text style={styles.runButtonText}>{runMutation.isPending ? "Running benchmark…" : "Run Benchmark Mode"}</Text>
        </Pressable>
      </Card>

      {latest ? (
        <Card style={styles.panel}>
          <SectionHeader title="Latest Validation Report" subtitle={`${latest.datasetLabel} · ${latest.sampleCount} samples`} />
          <Info label="Primary Accuracy" value={`${Math.round(latest.metrics.accuracy * 100)}%`} />
          <Info label="Precision" value={`${Math.round(latest.metrics.precision * 100)}%`} />
          <Info label="Recall / Sensitivity" value={`${Math.round(latest.metrics.recall * 100)}%`} />
          <Info label="F1 Score" value={`${Math.round(latest.metrics.f1 * 100)}%`} />
          <Info label="Specificity" value={`${Math.round(latest.metrics.specificity * 100)}%`} />
          <Info label="ROC AUC" value={latest.metrics.auroc === null ? "N/A" : latest.metrics.auroc.toFixed(4)} />
          <View style={styles.exportRow}>
            {(["csv", "pdf", "markdown"] as const).map((format) => (
              <Pressable
                key={format}
                onPress={() => {
                  if (!selectedRunId && !latest.id) return;
                  const runId = selectedRunId ?? latest.id;
                  Linking.openURL(`${API_BASE_URL}${benchmarkExportUrl(runId, format)}`);
                }}
                style={styles.exportButton}
              >
                <Text style={styles.exportButtonText}>Export {format.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      ) : null}

      {latest?.metrics.perClass.length ? (
        <Card style={styles.panel}>
          <SectionHeader title="Per-Class Accuracy" subtitle="Precision, recall, and support by diagnosis label." />
          {latest.metrics.perClass.map((item) => (
            <View key={item.label} style={styles.perClassRow}>
              <Text style={styles.perClassLabel}>{item.label}</Text>
              <Badge label={`P ${Math.round(item.precision * 100)}% · R ${Math.round(item.recall * 100)}% · n=${item.support}`} tone="muted" />
            </View>
          ))}
        </Card>
      ) : null}

      {dashboard?.perClassAccuracy.length ? (
        <Card style={styles.panel}>
          <SectionHeader title="Aggregate Per-Class Accuracy" subtitle="Across all saved benchmark runs." />
          {dashboard.perClassAccuracy.map((item) => (
            <Info key={item.label} label={item.label} value={`${Math.round(item.accuracy * 100)}% (${item.samples} samples)`} />
          ))}
        </Card>
      ) : null}

      {latest?.metrics.calibration.length ? (
        <Card style={styles.panel}>
          <SectionHeader title="Confidence Calibration" subtitle="Observed accuracy by predicted confidence bucket." />
          {latest.metrics.calibration.map((bucket) => (
            <Info
              key={`${bucket.min}-${bucket.max}`}
              label={`${Math.round(bucket.min * 100)}–${Math.round(bucket.max * 100)}% confidence`}
              value={`n=${bucket.count}, avg ${Math.round(bucket.avgConfidence * 100)}%, accuracy ${Math.round(bucket.actualAccuracy * 100)}%`}
            />
          ))}
        </Card>
      ) : null}

      {latest?.metrics.misclassified.length ? (
        <Card style={styles.panel}>
          <SectionHeader title="Misclassified ECGs" subtitle="Ground truth vs ensemble primary diagnosis." />
          {latest.metrics.misclassified.slice(0, 12).map((item) => (
            <View key={item.externalId} style={styles.misclassifiedRow}>
              <Text style={styles.misclassifiedId}>{item.externalId}</Text>
              <Text style={styles.misclassifiedDetail}>Expected {item.groundTruth} · Predicted {item.prediction} · {Math.round(item.confidence * 100)}% conf</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {dashboard?.recentRuns.length ? (
        <Card style={styles.panel}>
          <SectionHeader title="Saved Benchmark Runs" subtitle="Select a run to inspect detailed metrics." />
          {dashboard.recentRuns.map((run) => (
            <Pressable key={run.id} onPress={() => setSelectedRunId(run.id)} style={styles.runRow}>
              <Text style={styles.runTitle}>{run.datasetLabel}</Text>
              <Text style={styles.runMeta}>{run.sampleCount} samples · accuracy {Math.round(run.metrics.accuracy * 100)}%</Text>
            </Pressable>
          ))}
        </Card>
      ) : null}

      {exportHref ? null : null}
    </PageSection>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  datasetChip: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  datasetChipActive: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.primary },
  datasetChipText: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  datasetChipTextActive: { color: medicalTheme.primary },
  datasetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  exportButton: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  exportButtonText: { color: medicalTheme.text, fontSize: 12, fontWeight: "800" },
  exportRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 10 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  misclassifiedDetail: { color: medicalTheme.muted, fontSize: 12 },
  misclassifiedId: { color: medicalTheme.text, fontSize: 13, fontWeight: "800" },
  misclassifiedRow: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 8 },
  panel: { gap: 8 },
  perClassLabel: { color: medicalTheme.text, flex: 1, fontSize: 13, fontWeight: "800" },
  perClassRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 8, paddingVertical: 8 },
  runButton: { alignSelf: "flex-start", backgroundColor: medicalTheme.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  runButtonText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  runMeta: { color: medicalTheme.muted, fontSize: 12 },
  runRow: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 4, paddingVertical: 10 },
  runTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
});
