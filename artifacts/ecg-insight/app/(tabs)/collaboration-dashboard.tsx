import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listConversations, listTeams } from "@/services/collaboration";

export default function CollaborationDashboardScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const teamsQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listTeams(authToken!.token),
    queryKey: ["teams", authToken?.token],
    retry: false,
  });
  const messagesQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listConversations(authToken!.token),
    queryKey: ["conversations", authToken?.token],
    retry: false,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Collaboration Dashboard</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Clinical teams, secure messaging, case discussion, and multi-review workflow.</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Teams</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(teamsQuery.data?.teams ?? []).slice(0, 450)}</Text>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Conversations</Text>
          <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(messagesQuery.data?.conversations ?? []).slice(0, 450)}</Text>
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
