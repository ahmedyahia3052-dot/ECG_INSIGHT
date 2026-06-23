import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { listIntelligentDocuments } from "@/services/intelligence";

export default function DocumentCenterScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const documentsQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listIntelligentDocuments(authToken!.token),
    queryKey: ["document-center", authToken?.token],
    retry: false,
  });
  const documents = documentsQuery.data?.documents ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Document Center</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          AI document intelligence, OCR extraction, and permanent indexing.
        </Text>
        {documents.map((document, index) => (
          <View key={index} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Clinical Document #{index + 1}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>{JSON.stringify(document).slice(0, 180)}</Text>
          </View>
        ))}
        {documents.length === 0 && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>No documents indexed yet</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              Upload clinical documents to populate OCR summaries and searchable evidence.
            </Text>
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
