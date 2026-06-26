import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AuthCard, AuthMessage, AuthPrimaryButton, premiumAuthTheme, PremiumAuthShell } from "@/components/auth/PremiumAuth";
import { getSystemStatus, type StatusCheck } from "@/services/systemStatus";

export default function SystemStatusScreen() {
  const [checks, setChecks] = useState<StatusCheck[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    try {
      setChecks(await getSystemStatus());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load system status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  return (
    <PremiumAuthShell subtitle="Live status from ECG Insight runtime health checks." title="System Status">
      <AuthCard>
        <View style={styles.header}>
          <Text style={styles.title}>System status</Text>
          <Text style={styles.subtitle}>Operational status is based on live application health endpoints.</Text>
        </View>
        {loading ? <AuthMessage message="Checking live service health..." /> : null}
        {error ? <AuthMessage message={error} tone="error" /> : null}
        <View style={styles.list}>
          {checks.map((check) => (
            <View key={check.name} style={styles.statusRow}>
              <View style={[styles.dot, check.status === "operational" ? styles.green : check.status === "degraded" ? styles.yellow : styles.red]} />
              <View style={styles.statusTextWrap}>
                <Text style={styles.statusName}>{check.name}</Text>
                <Text style={styles.statusMeta}>{check.status === "operational" ? "Operational" : check.status === "degraded" ? "Degraded" : check.details ?? "Offline"}</Text>
              </View>
            </View>
          ))}
        </View>
        <AuthPrimaryButton icon="refresh-cw" label="Refresh Status" onPress={() => void loadStatus()} variant="outline" />
        <Link href="/login" style={styles.link}>Back to login</Link>
      </AuthCard>
    </PremiumAuthShell>
  );
}

const styles = StyleSheet.create({
  dot: { borderRadius: 999, height: 11, marginTop: 4, width: 11 },
  green: { backgroundColor: premiumAuthTheme.success },
  header: { gap: 6 },
  link: { color: premiumAuthTheme.cyan, fontSize: 13, fontWeight: "900", textAlign: "center" },
  list: { gap: 10 },
  red: { backgroundColor: premiumAuthTheme.danger },
  statusMeta: { color: premiumAuthTheme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18 },
  statusName: { color: premiumAuthTheme.text, fontSize: 14, fontWeight: "900" },
  statusRow: { alignItems: "flex-start", backgroundColor: "rgba(15,23,42,0.56)", borderColor: premiumAuthTheme.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, padding: 12 },
  statusTextWrap: { flex: 1 },
  subtitle: { color: premiumAuthTheme.muted, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  title: { color: premiumAuthTheme.text, fontSize: 28, fontWeight: "900", letterSpacing: -0.7 },
  yellow: { backgroundColor: premiumAuthTheme.warning },
});
