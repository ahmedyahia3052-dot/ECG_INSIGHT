import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getProductionReadiness } from "@/services/security";
import { BoltBadge, BoltCard, BoltEmpty, BoltHero, BoltScreen, BoltStat } from "@/components/bolt/BoltUI";

function toneFor(status?: string): "danger" | "muted" | "success" | "warning" {
  if (status === "healthy") return "success";
  if (status === "degraded") return "warning";
  if (status === "down") return "danger";
  return "muted";
}

export default function ProductionReadinessScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const readinessQuery = useQuery({
    enabled: !!token,
    queryFn: async () => getProductionReadiness(token!),
    queryKey: ["production-readiness", token],
    refetchInterval: 30_000,
    retry: false,
  });
  const readiness = readinessQuery.data?.readiness;
  const components = Object.entries(readiness?.components ?? {});

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Production operations"
        subtitle="Live health checks for database, AI engine, storage, queue, audit pipeline, and active-user load."
        title="Production Readiness"
      />
      {readinessQuery.isError ? (
        <BoltEmpty title="Readiness unavailable" message="Unable to load production readiness checks for this account." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <BoltStat icon="activity" label="Overall" value={readiness?.status ?? "..."} />
            <BoltStat icon="users" label="Active Users" value={readiness?.activeUsers ?? "..."} />
            <BoltStat icon="clock" label="Uptime" value={`${readiness?.metrics.uptimeSeconds ?? "..."}s`} />
          </View>
          <BoltCard highlight style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={[styles.title, { color: colors.text }]}>System Status</Text>
              <BoltBadge label={readiness?.status ?? "loading"} tone={toneFor(readiness?.status)} />
            </View>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              Environment {readiness?.environment ?? "pending"} · Last checked {readiness?.timestamp?.slice(0, 19) ?? "pending"}
            </Text>
          </BoltCard>
          {components.map(([name, component]) => (
            <BoltCard key={name} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={[styles.title, { color: colors.text }]}>{name.replace(/([A-Z])/g, " $1")}</Text>
                <BoltBadge label={component.status} tone={toneFor(component.status)} />
              </View>
              <Text style={[styles.meta, { color: colors.textSecondary }]}>
                {component.ok ? "Operational" : "Attention required"} · {component.durationMs} ms
              </Text>
              <Text style={[styles.details, { color: colors.textSecondary }]} numberOfLines={4}>
                {JSON.stringify(component.details ?? {}, null, 2)}
              </Text>
            </BoltCard>
          ))}
        </>
      )}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 8 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  details: { fontFamily: "Inter_400Regular", fontSize: 11, lineHeight: 16 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  title: { flex: 1, fontFamily: "Inter_700Bold", fontSize: 18, textTransform: "capitalize" },
});
