import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { CaseListItem } from "@/components/history/CaseListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { MOCK_CASES, type ECGStatus } from "@/data/mockData";
import { apiCaseToEcgCase, listCases } from "@/services/clinical";

type FilterStatus = "all" | ECGStatus;

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "normal", label: "Normal" },
  { key: "abnormal", label: "Abnormal" },
  { key: "critical", label: "Critical" },
];

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { authToken } = useAuth();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const accessToken = authToken?.token;

  const casesQuery = useQuery({
    enabled: !!accessToken,
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (search) params.set("q", search);
      return listCases(accessToken!, params);
    },
    queryKey: ["ecg-cases", accessToken, search],
  });

  const allCases = casesQuery.data?.cases.map(apiCaseToEcgCase) ?? MOCK_CASES;

  const filtered = allCases.filter((c) => {
    const matchSearch =
      search === "" ||
      c.patientName.toLowerCase().includes(search.toLowerCase()) ||
      c.diagnosis.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            paddingTop: topInset + 12,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>
          ECG History
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {casesQuery.isLoading ? "Loading cases..." : `${filtered.length} case${filtered.length !== 1 ? "s" : ""} · Digital ECG viewer enabled`}
        </Text>
        {casesQuery.isError && (
          <Text style={[styles.sub, { color: colors.destructive }]}>
            Live case data unavailable. Showing local clinical examples.
          </Text>
        )}

        <View
          style={[
            styles.searchWrap,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search by patient or diagnosis..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search !== "" && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const dotColor =
              f.key === "normal"
                ? colors.success
                : f.key === "abnormal"
                  ? colors.warning
                  : f.key === "critical"
                    ? colors.destructive
                    : colors.primary;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? colors.primary
                      : colors.muted,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => {
                  setFilter(f.key);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                {f.key !== "all" && (
                  <View
                    style={[
                      styles.filterDot,
                      {
                        backgroundColor: active ? "#fff" : dotColor,
                      },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: active
                        ? colors.primaryForeground
                        : colors.foreground,
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CaseListItem ecgCase={item} />}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: bottomInset + 90 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        scrollEnabled={!!filtered.length}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="inbox"
            title="No cases found"
            description={
              search
                ? `No results for "${search}"`
                : "No cases match the selected filter"
            }
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -4 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  list: { paddingHorizontal: 16, paddingTop: 14, flexGrow: 1 },
});
