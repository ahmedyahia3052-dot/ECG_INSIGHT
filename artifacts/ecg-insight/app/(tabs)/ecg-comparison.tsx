import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

export default function EcgComparisonScreen() {
  const colors = useColors();
  const comparisons = ["New ST changes", "Rhythm changes", "Rate changes", "Interval changes"];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>ECG Comparison</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Serial ECG comparison highlights clinically meaningful changes against previous studies.
        </Text>
        {comparisons.map((item) => (
          <View key={item} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{item}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>Computed from parsed ECG measurements.</Text>
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
