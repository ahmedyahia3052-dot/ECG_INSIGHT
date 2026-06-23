import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listNotifications } from "@/services/collaboration";

export default function NotificationCenterScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const query = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listNotifications(authToken!.token),
    queryKey: ["notification-center", authToken?.token],
    retry: false,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Notification Center</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Browser/mobile push abstraction and priority notification feed.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Notifications</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(query.data?.notifications ?? []).slice(0, 900)}</Text>
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
