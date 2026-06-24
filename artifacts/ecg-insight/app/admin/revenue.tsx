import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getSuperAdminRevenue } from "@/services/superAdmin";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function RevenueDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const [revenue, setRevenue] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!authToken?.token) return;
    getSuperAdminRevenue(authToken.token).then((payload) => setRevenue(payload.revenue)).catch(() => setRevenue(null));
  }, [authToken?.token]);

  const styles = StyleSheet.create({
    card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: colors.radius.lg, borderWidth: 1, marginBottom: 10, padding: 16 },
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 120 },
    title: { color: colors.text, fontSize: 24, fontWeight: "800", marginBottom: 6 },
  });

  const byDay = (revenue?.["byDay"] as Array<{ amount: number; date: string }> | undefined) ?? [];
  const byMonth = (revenue?.["byMonth"] as Array<{ amount: number; month: string }> | undefined) ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Revenue Dashboard</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>Revenue trend, user growth, payment status, and ECG usage trend.</Text>
        <View style={styles.card}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>Revenue by Day</Text>
          {byDay.slice(0, 12).map((item) => <Text key={item.date} style={{ color: colors.textSecondary }}>{item.date}: ${(item.amount / 100).toLocaleString()}</Text>)}
        </View>
        <View style={styles.card}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>Revenue by Month</Text>
          {byMonth.slice(0, 12).map((item) => <Text key={item.month} style={{ color: colors.textSecondary }}>{item.month}: ${(item.amount / 100).toLocaleString()}</Text>)}
        </View>
        <View style={styles.card}>
          <Text style={{ color: colors.text, fontWeight: "800" }}>Raw Analytics</Text>
          <Text style={{ color: colors.textSecondary }}>{JSON.stringify(revenue ?? {}, null, 2).slice(0, 1200)}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
