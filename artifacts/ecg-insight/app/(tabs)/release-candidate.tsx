import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BoltBadge, BoltCard, BoltEmpty, BoltHero, BoltScreen, BoltStat } from "@/components/bolt/BoltUI";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getReleaseCandidateDashboard, type ReleaseValidationStatus } from "@/services/releaseCandidate";

function toneForStatus(status?: ReleaseValidationStatus | string): "danger" | "muted" | "success" | "warning" {
  if (status === "passed" || status === "GO" || status === "healthy") return "success";
  if (status === "warning" || status === "degraded") return "warning";
  if (status === "failed" || status === "blocked" || status === "NO_GO" || status === "down") return "danger";
  return "muted";
}

export default function ReleaseCandidateScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const query = useQuery({
    enabled: !!token,
    queryFn: async () => getReleaseCandidateDashboard(token!),
    queryKey: ["release-candidate-dashboard", token],
    refetchInterval: 30_000,
    retry: false,
  });
  const release = query.data?.release;
  const workflowChecks = release?.checks.filter((check) => check.category.startsWith("Workflow")) ?? [];

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Release candidate"
        subtitle="Final launch validation across clinical workflows, QA, load testing, operational readiness, observability, and defect risk."
        title="Final Release Dashboard"
      />
      {query.isError ? (
        <BoltEmpty title="Release dashboard unavailable" message="Unable to load release candidate validation for this account." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <BoltStat icon="activity" label="Readiness Score" value={release?.releaseReadinessScore ?? "..."} />
            <BoltStat icon="shield" label="Launch Decision" value={release?.launchDecision ?? "..."} />
            <BoltStat icon="check-circle" label="Passed Checks" value={release?.validationSummary.passed ?? "..."} />
            <BoltStat icon="alert-triangle" label="Risks" value={release?.outstandingRisks.length ?? "..."} />
          </View>

          <BoltCard highlight style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.title, { color: colors.text }]}>Release Gate</Text>
              <BoltBadge label={release?.launchDecision ?? "loading"} tone={toneForStatus(release?.launchDecision)} />
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {release?.validationSummary.passed ?? 0}/{release?.validationSummary.total ?? 0} checks passed · {release?.validationSummary.warnings ?? 0} warnings · {release?.validationSummary.failed ?? 0} failures
            </Text>
          </BoltCard>

          <BoltCard style={styles.card}>
            <Text style={[styles.title, { color: colors.text }]}>End-to-End Workflow Validation</Text>
            {workflowChecks.map((check) => (
              <View key={check.name} style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{check.name}</Text>
                  <Text style={[styles.meta, { color: colors.textSecondary }]}>{check.description}</Text>
                </View>
                <BoltBadge label={check.status} tone={toneForStatus(check.status)} />
              </View>
            ))}
          </BoltCard>

          <BoltCard style={styles.card}>
            <Text style={[styles.title, { color: colors.text }]}>Performance and Load</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              API throughput {String(release?.performance.apiBenchmark.throughputRequests ?? 0)} · error rate {String(release?.performance.apiBenchmark.errorRate ?? 0)}
            </Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Memory {String(release?.performance.resourceUsage.memoryUsedMb ?? "...")} MB used · WebSocket and ECG upload stress scripts ready.
            </Text>
          </BoltCard>

          <BoltCard style={styles.card}>
            <Text style={[styles.title, { color: colors.text }]}>Outstanding Risks</Text>
            {(release?.outstandingRisks ?? []).slice(0, 8).map((risk) => (
              <Text key={`${risk.severity}-${risk.title}`} style={[styles.meta, { color: colors.textSecondary }]}>
                {risk.severity}: {risk.title} - {risk.detail}
              </Text>
            ))}
            {release?.outstandingRisks.length === 0 ? (
              <Text style={[styles.meta, { color: colors.textSecondary }]}>No blocking release risks detected.</Text>
            ) : null}
          </BoltCard>

          <BoltCard style={styles.card}>
            <Text style={[styles.title, { color: colors.text }]}>Bug Bash and Regression</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {release?.bugBash.totalDefects ?? 0} defects · regression status {release?.bugBash.regressionStatus ?? "pending"}.
            </Text>
          </BoltCard>
        </>
      )}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  itemTitle: { fontFamily: "Inter_700Bold", fontSize: 14 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  row: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  rowText: { flex: 1, gap: 3 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 18 },
});
