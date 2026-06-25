import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listMfaMethods, listSecuritySessions, revokeAllSecuritySessions, revokeSecuritySession } from "@/services/security";

export default function SessionDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const queryClient = useQueryClient();
  const sessionsQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listSecuritySessions(authToken!.token),
    queryKey: ["security-sessions", authToken?.token],
    retry: false,
  });
  const mfaQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listMfaMethods(authToken!.token),
    queryKey: ["mfa-methods", authToken?.token],
    retry: false,
  });
  const revokeSession = useMutation({
    mutationFn: async (sessionId: string) => revokeSecuritySession(authToken!.token, sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["security-sessions"] }),
  });
  const revokeAll = useMutation({
    mutationFn: async () => revokeAllSecuritySessions(authToken!.token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["security-sessions"] }),
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Session Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>MFA, trusted sessions, session timeout, and concurrent session control.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Sessions</Text>
          <Pressable style={[styles.revokeAll, { borderColor: colors.destructive }]} onPress={() => revokeAll.mutate()}>
            <Text style={[styles.revokeText, { color: colors.destructive }]}>Revoke All Sessions</Text>
          </Pressable>
          {(sessionsQuery.data?.sessions ?? []).map((session) => (
            <View key={session.id} style={[styles.sessionRow, { borderColor: colors.border }]}>
              <Text style={[styles.sessionTitle, { color: colors.text }]}>{session.deviceName ?? browserName(session.userAgent) ?? "Unknown device"}</Text>
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>Browser: {browserName(session.userAgent) ?? "Unknown"}</Text>
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>IP: {session.ipAddress ?? "Unknown"}</Text>
              <Text style={[styles.cardText, { color: colors.textSecondary }]}>Last activity: {new Date(session.lastActivityAt).toLocaleString()}</Text>
              <Text style={[styles.cardText, { color: session.active ? colors.primary : colors.textSecondary }]}>{session.active ? "Active" : "Revoked"}</Text>
              {session.active ? (
                <Pressable style={[styles.revokeBtn, { borderColor: colors.destructive }]} onPress={() => revokeSession.mutate(session.id)}>
                  <Text style={[styles.revokeText, { color: colors.destructive }]}>Revoke Session</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
          <Text style={[styles.cardTitle, { color: colors.text }]}>MFA Methods</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(mfaQuery.data?.methods ?? []).slice(0, 450)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, gap: 8, padding: 16 },
  cardText: { fontSize: 12, lineHeight: 18 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  revokeAll: { alignItems: "center", borderRadius: 12, borderWidth: 1, paddingVertical: 10 },
  revokeBtn: { alignItems: "center", alignSelf: "flex-start", borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  revokeText: { fontSize: 12, fontWeight: "700" },
  sessionRow: { borderRadius: 14, borderWidth: 1, gap: 4, padding: 12 },
  sessionTitle: { fontSize: 14, fontWeight: "800" },
  title: { fontSize: 28, fontWeight: "800" },
});

function browserName(userAgent?: string | null) {
  if (!userAgent) return "Unknown browser";
  if (userAgent.includes("Edg/")) return "Microsoft Edge";
  if (userAgent.includes("Chrome/")) return "Chrome";
  if (userAgent.includes("Safari/")) return "Safari";
  if (userAgent.includes("Firefox/")) return "Firefox";
  return userAgent.slice(0, 42);
}
