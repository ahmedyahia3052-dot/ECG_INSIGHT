import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function AISummaryViewerScreen() {
  const colors = useColors();
  const sections = [
    "Clinical Findings",
    "Important Abnormalities",
    "Occupational Risk",
    "Suggested Next Action",
    "Fitness Recommendation",
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>AI Summary Viewer</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Structured summaries generated from OCR and clinical extraction are persisted with each document.
        </Text>
        {sections.map((section) => (
          <View key={section} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{section}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>Available after document extraction.</Text>
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
