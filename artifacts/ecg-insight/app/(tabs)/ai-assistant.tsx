import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function AIAssistantScreen() {
  const colors = useColors();
  const capabilities = [
    "Summarize patient and cardiac history",
    "Explain occupational fitness decisions",
    "Compare current and previous ECGs",
    "Summarize medications and procedures",
    "Answer clinician questions with confidence and evidence",
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>AI Clinical Assistant</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Patient-scoped clinical assistant backed by persisted conversations.
        </Text>
        {capabilities.map((capability) => (
          <View key={capability} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{capability}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>Available through `/api/assistant/chat`.</Text>
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
