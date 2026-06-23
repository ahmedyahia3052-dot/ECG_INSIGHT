import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listMfaMethods, listSecuritySessions } from "@/services/security";

export default function SessionDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Session Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>MFA, trusted sessions, session timeout, and concurrent session control.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Sessions</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(sessionsQuery.data?.sessions ?? []).slice(0, 450)}</Text>
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
  title: { fontSize: 28, fontWeight: "800" },
});
