import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listSecurityEvents } from "@/services/security";

export default function SecurityDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const eventsQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listSecurityEvents(authToken!.token),
    queryKey: ["security-events", authToken?.token],
    retry: false,
  });
  const events = eventsQuery.data?.events ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Security Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Failed logins, suspicious access, unusual IP, and device events.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Security Events</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(events).slice(0, 900)}</Text>
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
