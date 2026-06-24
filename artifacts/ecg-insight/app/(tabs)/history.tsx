import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { apiCaseToEcgCase, listCases } from "@/services/clinical";
import {
  BoltBadge,
  BoltButton,
  BoltCard,
  BoltEmpty,
  BoltField,
  BoltHero,
  BoltScreen,
} from "@/components/bolt/BoltUI";

type FilterStatus = "all" | "normal" | "abnormal" | "critical";

export default function PatientsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (search.trim()) params.set("q", search.trim());
      return listCases(token!, params);
    },
    queryKey: ["bolt-patients-cases", token, search],
  });

  const cases = casesQuery.data?.cases.map(apiCaseToEcgCase) ?? [];
  const filtered = useMemo(
    () => cases.filter((item) => filter === "all" || item.status === filter),
    [cases, filter],
  );

  return (
    <BoltScreen>
      <BoltHero
        actions={<BoltButton icon="upload-cloud" label="Upload New ECG" onPress={() => router.push("/(tabs)/upload")} />}
        eyebrow="Live patient records"
        subtitle="Search and filter ECG cases directly from the existing clinical API. Mock patient examples have been removed from this production screen."
        title="Patients"
      />

      <BoltCard style={styles.filters}>
        <BoltField icon="search" onChangeText={setSearch} placeholder="Search by patient, case ID, or diagnosis..." value={search} />
        <View style={styles.filterRow}>
          {(["all", "normal", "abnormal", "critical"] as FilterStatus[]).map((item) => (
            <View key={item} style={styles.filterButton}>
              <BoltButton
                label={item[0].toUpperCase() + item.slice(1)}
                onPress={() => setFilter(item)}
                variant={filter === item ? "primary" : "outline"}
              />
            </View>
          ))}
        </View>
      </BoltCard>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {casesQuery.isLoading ? "Loading records..." : `${filtered.length} ECG records`}
        </Text>
      </View>

      {casesQuery.isError ? (
        <BoltEmpty title="Unable to load patients" message="The live API returned an error. No mock data is displayed." />
      ) : filtered.length === 0 ? (
        <BoltEmpty title={casesQuery.isLoading ? "Loading..." : "No patients found"} message="Upload an ECG or adjust search/filter criteria." />
      ) : (
        filtered.map((item) => (
          <BoltCard key={item.id} style={styles.patientCard}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientInitials}>
                {item.patientName.split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </Text>
            </View>
            <View style={styles.patientMain}>
              <Text style={[styles.patientName, { color: colors.text }]}>{item.patientName}</Text>
              <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>
                {item.patientAge}y · {item.patientGender} · {item.rhythm}
              </Text>
              <Text numberOfLines={1} style={[styles.patientMeta, { color: colors.textSecondary }]}>
                {item.diagnosis}
              </Text>
            </View>
            <BoltBadge
              label={item.status}
              tone={item.status === "critical" ? "danger" : item.status === "normal" ? "success" : "warning"}
            />
            <BoltButton label="Open" onPress={() => router.push(`/case/${item.id}` as never)} variant="outline" />
          </BoltCard>
        ))
      )}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  filterButton: { minWidth: 96 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filters: { gap: 10 },
  patientAvatar: {
    alignItems: "center",
    backgroundColor: "#0D9488",
    borderRadius: 16,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  patientCard: { alignItems: "center", flexDirection: "row", gap: 10 },
  patientInitials: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  patientMain: { flex: 1, gap: 3 },
  patientMeta: { fontFamily: "Inter_400Regular", fontSize: 12 },
  patientName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
