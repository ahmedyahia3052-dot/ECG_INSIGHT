import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listConsents, listDataRequests } from "@/services/security";

export default function ComplianceDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const consentsQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listConsents(authToken!.token),
    queryKey: ["patient-consents", authToken?.token],
    retry: false,
  });
  const requestsQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listDataRequests(authToken!.token),
    queryKey: ["data-requests", authToken?.token],
    retry: false,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Compliance Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>HIPAA/GDPR consent, access, export, erasure, and retention workflows.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Consents</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(consentsQuery.data?.consents ?? []).slice(0, 450)}</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Data Requests</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(requestsQuery.data?.requests ?? []).slice(0, 450)}</Text>
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
