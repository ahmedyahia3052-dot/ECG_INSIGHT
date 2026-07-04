import { useQuery } from "@tanstack/react-query";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, PageSection, SectionHeader, StatCard, medicalTheme } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getReleaseCandidateDashboard } from "@/services/releaseCandidate";
import { safeArray } from "@/utils/collections";

export default function ReleaseCandidateScreen() {
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const isOwner = user?.isOwner === true || user?.email?.toLowerCase() === "ahmedyahia3052@gmail.com";

  const dashboardQuery = useQuery({
    enabled: !!token && isOwner,
    queryFn: () => getReleaseCandidateDashboard(token!),
    queryKey: ["release-candidate-dashboard", token],
    retry: 1,
  });

  if (!isOwner) {
    return (
      <PageSection>
        <EmptyState message="Release candidate validation is restricted to the platform owner account." title="Owner access required" />
      </PageSection>
    );
  }

  const release = dashboardQuery.data?.release;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <SectionHeader
        subtitle="Launch readiness score, workflow validation, performance metrics, and defect summary."
        title="Final Release Dashboard"
      />

      {dashboardQuery.isLoading ? (
        <Card style={styles.card}>
          <Text style={styles.loading}>Loading release candidate metrics...</Text>
        </Card>
      ) : null}

      {release ? (
        <View testID="release-candidate-ready">
          <View style={styles.stats}>
            <StatCard icon="target" label="Release Readiness" value={`${release.releaseReadinessScore}%`} />
            <StatCard icon="check-circle" label="Launch Decision" tone={release.launchDecision === "GO" ? "success" : "critical"} value={release.launchDecision} />
            <StatCard icon="list" label="Checks Passed" value={`${release.validationSummary.passed}/${release.validationSummary.total}`} />
            <StatCard icon="alert-triangle" label="Defects" tone="warning" value={String(release.bugBash.totalDefects)} />
          </View>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>End-to-End Workflow Validation</Text>
            {safeArray(release.checks).slice(0, 8).map((check) => (
              <View key={`${check.category}-${check.name}`} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{check.name}</Text>
                  <Text style={styles.muted}>{check.category} • {check.description}</Text>
                </View>
                <Badge label={check.status} tone={check.status === "passed" ? "success" : check.status === "warning" ? "warning" : "critical"} />
              </View>
            ))}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Performance and Load</Text>
            <Text style={styles.muted}>API benchmark, upload stress planning, websocket load, and resource usage snapshots.</Text>
            <Text style={styles.body}>
              CPU load avg: {String((release.performance.resourceUsage as { loadAverage?: number[] })?.loadAverage?.[0] ?? "n/a")}
            </Text>
            <Text style={styles.body}>
              Regression status: {release.bugBash.regressionStatus}
            </Text>
          </Card>
        </View>
      ) : dashboardQuery.isError ? (
        <EmptyState message="Unable to load release candidate dashboard from the API." title="Dashboard unavailable" />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { color: medicalTheme.text, fontSize: 13, fontWeight: "700" },
  card: { gap: 12 },
  loading: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  muted: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  page: { gap: 18, padding: 18 },
  row: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, paddingVertical: 10 },
  rowMain: { flex: 1 },
  rowTitle: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  sectionTitle: { color: medicalTheme.text, fontSize: 16, fontWeight: "900" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
