import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listKnowledgeArticles, listKnowledgeCategories } from "@/services/intelligence";

export default function KnowledgeLibraryScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const categoriesQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listKnowledgeCategories(authToken!.token),
    queryKey: ["knowledge-categories", authToken?.token],
    retry: false,
  });
  const articlesQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listKnowledgeArticles(authToken!.token),
    queryKey: ["knowledge-articles", authToken?.token],
    retry: false,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Knowledge Library</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Guidelines, policies, protocols, references, and occupational fitness standards.
        </Text>
        <View style={styles.chips}>
          {(categoriesQuery.data?.categories ?? []).map((category) => (
            <View key={category.id} style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.chipText, { color: colors.primary }]}>{category.title}</Text>
            </View>
          ))}
        </View>
        {(articlesQuery.data?.articles ?? []).map((article) => (
          <View key={article.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{article.title}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>{article.body.slice(0, 220)}</Text>
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
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 12, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
