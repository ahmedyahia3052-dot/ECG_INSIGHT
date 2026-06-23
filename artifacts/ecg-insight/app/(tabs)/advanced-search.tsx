import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { globalSearch } from "@/services/intelligence";

export default function AdvancedSearchScreen() {
  const colors = useColors();
  const { authToken } = useAuth();
  const [query, setQuery] = useState("ischemia");
  const searchQuery = useQuery({
    enabled: !!authToken?.token && query.length > 1,
    queryFn: async () => globalSearch(authToken!.token, query),
    queryKey: ["advanced-search", authToken?.token, query],
    retry: false,
  });
  const payload = searchQuery.data;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>Advanced Search</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search EF < 40, CABG, stents, ischemia..."
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
        />
        {(["patients", "documents", "employees", "articles"] as const).map((section) => (
          <View key={section} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>{section.toUpperCase()}</Text>
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>
              {JSON.stringify(payload?.[section] ?? []).slice(0, 500)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, gap: 8, padding: 16 },
  cardText: { fontSize: 12, lineHeight: 18 },
  cardTitle: { fontSize: 14, fontWeight: "800" },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  input: { borderRadius: 14, borderWidth: 1, fontSize: 15, padding: 14 },
  title: { fontSize: 28, fontWeight: "800" },
});
