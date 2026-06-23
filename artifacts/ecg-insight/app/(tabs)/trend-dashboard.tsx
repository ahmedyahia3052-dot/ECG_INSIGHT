import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listTrends } from "@/services/clinicalIntelligence";

export default function TrendDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const trendsQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listTrends(authToken!.token),
    queryKey: ["patient-trends", authToken?.token],
    retry: false,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Trend Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>EF, heart rate, QTc, blood pressure, and weight trends.</Text>
        {(trendsQuery.data?.trends ?? []).slice(0, 12).map((trend, index) => (
          <View key={index} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Trend #{index + 1}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(trend).slice(0, 220)}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, gap: 8, padding: 16 },
  cardText: { fontSize: 13, lineHeight: 19 },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
