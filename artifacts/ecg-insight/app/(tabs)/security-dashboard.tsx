import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  getSecurityMonitoringSummary,
  listAuditLogs,
  listConsents,
  listDataRequests,
  listMfaMethods,
  listRetentionPolicies,
  listSecurityEvents,
  listSecurityPolicies,
  listSecuritySessions,
  listTrustedDevices,
} from "@/services/security";

export default function SecurityDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const enabled = !!authToken?.token;
  const token = authToken?.token ?? "";
  const summaryQuery = useQuery({
    enabled,
    queryFn: async () => getSecurityMonitoringSummary(token),
    queryKey: ["security-monitoring-summary", token],
    retry: false,
  });
  const eventsQuery = useQuery({
    enabled,
    queryFn: async () => listSecurityEvents(token),
    queryKey: ["security-events", token],
    retry: false,
  });
  const sessionsQuery = useQuery({
    enabled,
    queryFn: async () => listSecuritySessions(token),
    queryKey: ["security-sessions", token],
    retry: false,
  });
  const devicesQuery = useQuery({
    enabled,
    queryFn: async () => listTrustedDevices(token),
    queryKey: ["trusted-devices", token],
    retry: false,
  });
  const mfaQuery = useQuery({
    enabled,
    queryFn: async () => listMfaMethods(token),
    queryKey: ["mfa-methods", token],
    retry: false,
  });
  const complianceQuery = useQuery({
    enabled,
    queryFn: async () => Promise.all([listConsents(token), listDataRequests(token), listRetentionPolicies(token), listSecurityPolicies(token), listAuditLogs(token)]),
    queryKey: ["security-compliance-center", token],
    retry: false,
  });
  const events = eventsQuery.data?.events ?? [];
  const summary = summaryQuery.data?.summary;
  const sessions = sessionsQuery.data?.sessions ?? [];
  const devices = devicesQuery.data?.devices ?? [];
  const methods = mfaQuery.data?.methods ?? [];
  const [consents, dataRequests, retentionPolicies, policies, auditLogs] = complianceQuery.data ?? [
    { consents: [] },
    { requests: [] },
    { policies: [] },
    { policies: [] },
    { logs: [] },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Enterprise Security Center</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Security posture, MFA, sessions, trusted devices, compliance, auditability, and SIEM-ready alerts.</Text>
        <View style={styles.metricGrid}>
          <Metric title="Risk score" value={String(summary?.riskScore ?? "N/A")} colors={colors} />
          <Metric title="Failed logins 24h" value={String(summary?.failedLogins24h ?? 0)} colors={colors} />
          <Metric title="Active sessions" value={String(summary?.activeSessions ?? sessions.length)} colors={colors} />
          <Metric title="Trusted devices" value={String(summary?.trustedDevices ?? devices.filter((device) => device.trusted).length)} colors={colors} />
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>MFA Settings</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            {methods.length ? `${methods.filter((method) => method.enabled).length}/${methods.length} methods enabled with recovery-code support.` : "No MFA methods configured."}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Active Sessions</Text>
          {sessions.slice(0, 4).map((session) => (
            <Text key={session.id} style={[styles.cardText, { color: colors.textSecondary }]}>
              {session.active ? "Active" : "Revoked"} - {session.ipAddress ?? "Unknown IP"} - {new Date(session.lastActivityAt).toLocaleString()}
            </Text>
          ))}
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Trusted Devices</Text>
          {devices.slice(0, 4).map((device) => (
            <Text key={device.id} style={[styles.cardText, { color: colors.textSecondary }]}>
              {device.deviceName} - {device.trusted ? "Trusted" : "Revoked"} - {device.ipAddress ?? "No IP"}
            </Text>
          ))}
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Consent and Privacy</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            {consents.consents.length} consents, {dataRequests.requests.length} data requests, {retentionPolicies.policies.length} retention policies.
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Security Policies</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            {policies.policies.length} enterprise policies configured for password, session, rate limiting, retention, and device trust.
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Security Alerts</Text>
          {events.slice(0, 5).map((event) => (
            <Text key={event.id} style={[styles.cardText, { color: colors.textSecondary }]}>
              {event.severity} - {event.eventType}: {event.message}
            </Text>
          ))}
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Audit Explorer</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>
            {auditLogs.logs.length} latest immutable audit entries available for access, report, export, delete, and permission events.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ colors, title, value }: { colors: ReturnType<typeof useColors>; title: string; value: string }) {
  return (
    <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, gap: 8, padding: 16 },
  cardText: { fontSize: 12, lineHeight: 18 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  metric: { borderRadius: 18, borderWidth: 1, flex: 1, minWidth: "45%", padding: 16 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metricLabel: { fontSize: 12, lineHeight: 18 },
  metricValue: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
