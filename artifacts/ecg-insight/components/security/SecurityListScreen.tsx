import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

interface SecurityListScreenProps<T> {
  emptyText: string;
  queryKey: string;
  renderItem: (item: T) => string;
  subtitle: string;
  title: string;
  load: (token: string) => Promise<T[]>;
}

export function SecurityListScreen<T>({ emptyText, load, queryKey, renderItem, subtitle, title }: SecurityListScreenProps<T>) {
  const colors = useColors();
  const { authToken } = useAuth();
  const token = authToken?.token ?? "";
  const query = useQuery({
    enabled: Boolean(token),
    queryFn: async () => load(token),
    queryKey: [queryKey, token],
    retry: false,
  });
  const items = query.data ?? [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {items.length === 0 ? (
            <Text style={[styles.cardText, { color: colors.textSecondary }]}>{emptyText}</Text>
          ) : (
            items.map((item, index) => (
              <Text key={index} style={[styles.cardText, { color: colors.textSecondary }]}>
                {renderItem(item)}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  cardText: { fontSize: 13, lineHeight: 19 },
  container: { flex: 1 },
  content: { gap: 14, padding: 20, paddingBottom: 120 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  title: { fontSize: 28, fontWeight: "800" },
});
