import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listAlerts } from "@/services/collaboration";

export default function AlertDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const query = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listAlerts(authToken!.token),
    queryKey: ["central-alerts", authToken?.token],
    retry: false,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Alert Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Critical ECG, high-risk worker, pending review, expiring certificate, and security incident alerts.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Alert Center</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(query.data?.alerts ?? []).slice(0, 900)}</Text>
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
