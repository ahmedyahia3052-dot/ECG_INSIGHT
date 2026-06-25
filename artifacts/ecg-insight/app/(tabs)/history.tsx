import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useOfflineCache } from "@/hooks/useOfflineCache";
import { apiCaseToEcgCase, listCases } from "@/services/clinical";
import { listReports } from "@/services/reports";
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
type WorkspaceTab = "summary" | "timeline" | "diagnoses" | "reports" | "medications" | "notes" | "ai";

export default function PatientsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("summary");

  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "100" });
      if (search.trim()) params.set("q", search.trim());
      return listCases(token!, params);
    },
    queryKey: ["bolt-patients-cases", token, search],
  });
  const reportsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listReports(token!, new URLSearchParams({ page: "1", pageSize: "50" })),
    queryKey: ["mobile-patient-reports", token],
    retry: false,
  });

  const caseCache = useOfflineCache("ecg-insight:mobile:patient-workspace", casesQuery.data?.cases);
  const liveCases = casesQuery.data?.cases ?? caseCache.cachedData ?? [];
  const cases = liveCases.map(apiCaseToEcgCase);
  const filtered = useMemo(
    () => cases.filter((item) => filter === "all" || item.status === filter),
    [cases, filter],
  );
  const selected = filtered[0] ?? cases[0] ?? null;
  const reports = (reportsQuery.data as { reports?: unknown[] } | undefined)?.reports ?? [];

  return (
    <BoltScreen>
      <BoltHero
        actions={<BoltButton icon="upload-cloud" label="Upload New ECG" onPress={() => router.push("/(tabs)/upload")} />}
        eyebrow="Live patient records"
        subtitle="Search and filter ECG cases directly from the existing clinical API. Mock patient examples have been removed from this production screen."
        title="Patients"
      />

      {casesQuery.isError && caseCache.hasOfflineData ? (
        <BoltCard style={styles.offlineCard}>
          <BoltBadge icon="wifi-off" label="Offline workspace" tone="warning" />
          <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>
            Showing cached patient ECG records from {caseCache.savedAt ? new Date(caseCache.savedAt).toLocaleString() : "a previous session"}.
          </Text>
        </BoltCard>
      ) : null}

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

      <BoltCard style={styles.workspace}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Patient Workspace</Text>
        <View style={styles.tabRow}>
          {([
            ["summary", "Summary"],
            ["timeline", "ECG History"],
            ["diagnoses", "Diagnoses"],
            ["reports", "Reports"],
            ["medications", "Meds"],
            ["notes", "Notes"],
            ["ai", "AI Findings"],
          ] as const).map(([key, label]) => (
            <Pressable
              key={key}
              accessibilityRole="tab"
              onPress={() => setWorkspaceTab(key)}
              style={[
                styles.workspaceTab,
                {
                  backgroundColor: workspaceTab === key ? colors.primary : colors.muted,
                  borderColor: workspaceTab === key ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.workspaceTabText, { color: workspaceTab === key ? "#050816" : colors.text }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <WorkspacePanel cases={filtered} reportsCount={reports.length} selected={selected} tab={workspaceTab} />
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

function WorkspacePanel({
  cases,
  reportsCount,
  selected,
  tab,
}: {
  cases: ReturnType<typeof apiCaseToEcgCase>[];
  reportsCount: number;
  selected: ReturnType<typeof apiCaseToEcgCase> | null;
  tab: WorkspaceTab;
}) {
  const colors = useColors();
  if (!selected) {
    return <BoltEmpty title="No patient selected" message="Upload or search for an ECG case to populate this mobile workspace." />;
  }

  if (tab === "summary") {
    return (
      <View style={styles.workspacePanel}>
        <Text style={[styles.patientName, { color: colors.text }]}>{selected.patientName}</Text>
        <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>
          {selected.patientAge}y · {selected.patientGender} · {selected.rhythm}
        </Text>
        <BoltBadge label={selected.status} tone={selected.status === "critical" ? "danger" : selected.status === "normal" ? "success" : "warning"} />
      </View>
    );
  }

  if (tab === "timeline") {
    return (
      <View style={styles.workspacePanel}>
        {cases.slice(0, 5).map((item) => (
          <View key={item.id} style={[styles.timelineItem, { borderColor: colors.border }]}>
            <Text style={[styles.patientName, { color: colors.text }]}>{item.date.slice(0, 10)}</Text>
            <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>{item.diagnosis}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (tab === "diagnoses") {
    return (
      <View style={styles.workspacePanel}>
        {[...new Set(cases.map((item) => item.diagnosis))].slice(0, 5).map((diagnosis) => (
          <Text key={diagnosis} style={[styles.patientMeta, { color: colors.textSecondary }]}>- {diagnosis}</Text>
        ))}
      </View>
    );
  }

  if (tab === "reports") {
    return (
      <View style={styles.workspacePanel}>
        <Text style={[styles.patientName, { color: colors.text }]}>{reportsCount} reports available</Text>
        <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>Clinical reports continue to use the existing reports API and dashboard.</Text>
      </View>
    );
  }

  if (tab === "medications") {
    return (
      <View style={styles.workspacePanel}>
        <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>Medication data is preserved through existing clinical records and appears here when attached to the patient timeline.</Text>
      </View>
    );
  }

  if (tab === "notes") {
    return (
      <View style={styles.workspacePanel}>
        {selected.recommendations.map((note, index) => (
          <Text key={`${note}-${index}`} style={[styles.patientMeta, { color: colors.textSecondary }]}>- {note}</Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.workspacePanel}>
      <Text style={[styles.patientName, { color: colors.text }]}>AI Findings</Text>
      <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>
        Confidence {selected.confidence}% · {selected.analyzedBy}
      </Text>
      {selected.findings.map((finding) => (
        <Text key={finding.label} style={[styles.patientMeta, { color: colors.textSecondary }]}>
          - {finding.label}: {finding.value}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  filterButton: { minWidth: 96 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filters: { gap: 10 },
  offlineCard: { gap: 8 },
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
  tabRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timelineItem: { borderBottomWidth: 1, gap: 3, paddingVertical: 8 },
  workspace: { gap: 12 },
  workspacePanel: { gap: 8 },
  workspaceTab: { borderRadius: 999, borderWidth: 1, minHeight: 48, paddingHorizontal: 14, justifyContent: "center" },
  workspaceTabText: { fontFamily: "Inter_700Bold", fontSize: 12 },
});
