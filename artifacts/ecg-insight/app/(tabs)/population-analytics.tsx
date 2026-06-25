import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getPopulationAnalytics } from "@/services/clinicalIntelligence";
import { BoltBadge, BoltCard, BoltEmpty, BoltHero, BoltScreen, BoltStat } from "@/components/bolt/BoltUI";
import { AnalyticsChartCard } from "@/components/bolt/UltraPremium";
import { SkeletonDashboard } from "@/components/interaction/PremiumInteraction";

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatValue(value: unknown) {
  if (value == null || value === "") return "Not available";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `${value.length} records`;
  return "Available";
}

function readableLabel(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ").trim().replace(/^\w/, (char) => char.toUpperCase());
}

export default function PopulationAnalyticsScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const analyticsQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => getPopulationAnalytics(authToken!.token),
    queryKey: ["population-analytics", authToken?.token],
    retry: false,
  });
  const analytics = toRecord(analyticsQuery.data?.analytics);
  const entries = Object.entries(analytics).filter(([, value]) => value != null);
  const numericEntries = entries.filter(([, value]) => typeof value === "number").slice(0, 6);
  const chartData = numericEntries.length > 0 ? numericEntries.map(([, value]) => toNumber(value)) : [0, 0, 0, 0];
  const totalPatients = toNumber(analytics.totalPatients ?? analytics.patients ?? analytics.patientCount);
  const criticalCases = toNumber(analytics.criticalCases ?? analytics.critical ?? analytics.highRiskPatients);
  const abnormalCases = toNumber(analytics.abnormalCases ?? analytics.abnormal ?? analytics.flaggedCases);
  const departments = toNumber(analytics.departments ?? analytics.departmentCount ?? analytics.organizations);

  useEffect(() => {
    if (__DEV__) console.info("[route-mount] AnalyticsPage", { hasAnalytics: entries.length > 0 });
  }, [entries.length]);

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Clinical intelligence"
        subtitle="Organization, department, and contractor KPIs for workforce cardiology, rendered as clinical analytics instead of raw payloads."
        title="Population Analytics"
      />

      {analyticsQuery.isLoading ? (
        <SkeletonDashboard />
      ) : analyticsQuery.isError ? (
        <BoltEmpty title="Analytics unavailable" message="Unable to load live population analytics from the clinical intelligence API." />
      ) : entries.length === 0 ? (
        <BoltEmpty title="No analytics yet" message="Population analytics will appear after ECG cases and clinical events are available." />
      ) : (
        <>
          <View style={styles.statGrid}>
            <BoltStat icon="users" label="Patients" value={totalPatients || "Live"} />
            <BoltStat icon="alert-triangle" label="Critical Risk" value={criticalCases} accent={colors.destructive} />
            <BoltStat icon="activity" label="Abnormal ECGs" value={abnormalCases} accent={colors.warning} />
            <BoltStat icon="briefcase" label="Departments" value={departments || "Live"} accent={colors.accent} />
          </View>

          <View style={styles.chartGrid}>
            <AnalyticsChartCard data={chartData} icon="bar-chart-2" title="Population KPI Distribution" tone={colors.primary} />
            <AnalyticsChartCard data={chartData.slice().reverse()} icon="trending-up" title="Clinical Risk Mix" tone={colors.warning} />
          </View>

          <BoltCard style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Analytics Summary</Text>
              <BoltBadge label="Live API" tone="success" />
            </View>
            {entries.slice(0, 12).map(([key, value]) => (
              <View key={key} style={[styles.tableRow, { borderColor: colors.border }]}>
                <Text style={[styles.tableKey, { color: colors.textSecondary }]}>{readableLabel(key)}</Text>
                <Text style={[styles.tableValue, { color: colors.text }]}>{formatValue(value)}</Text>
              </View>
            ))}
          </BoltCard>
        </>
      )}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  chartGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  table: { gap: 8 },
  tableHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  tableKey: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 12, textTransform: "uppercase" },
  tableRow: { alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, flexDirection: "row", gap: 10, paddingTop: 9 },
  tableValue: { flex: 1.2, fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "right" },
});
