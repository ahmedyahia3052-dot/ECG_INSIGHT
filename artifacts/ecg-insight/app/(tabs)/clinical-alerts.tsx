import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listClinicalAlerts } from "@/services/clinicalIntelligence";

export default function ClinicalAlertsScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const alertsQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listClinicalAlerts(authToken!.token),
    queryKey: ["clinical-alerts", authToken?.token],
    retry: false,
  });
  const alerts = alertsQuery.data?.alerts ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Clinical Alerts</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          EF below 35%, STEMI, long QT, critical arrhythmia, and expiring certificate alerts.
        </Text>
        {alerts.map((alert, index) => (
          <View key={index} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Alert #{index + 1}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(alert).slice(0, 300)}</Text>
          </View>
        ))}
        {alerts.length === 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>No open alerts</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>Generate alerts from structured ECG, imaging, and fitness evidence.</Text>
          </View>
        )}
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
