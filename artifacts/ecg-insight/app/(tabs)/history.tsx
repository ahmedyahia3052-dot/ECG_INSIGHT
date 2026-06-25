import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  archivePatient,
  apiCaseToEcgCase,
  createPatient,
  listCases,
  listPatients,
  updatePatient,
  type ApiPatient,
  type PatientInput,
} from "@/services/clinical";
import { BoltBadge, BoltButton, BoltCard, BoltEmpty, BoltField, BoltHero, BoltScreen, BoltStat } from "@/components/bolt/BoltUI";
import { PremiumRefreshControl, SkeletonList, useToast } from "@/components/interaction/PremiumInteraction";

type GenderFilter = "all" | "female" | "male" | "other" | "unknown";
type RiskFilter = "all" | "high" | "medium" | "low";
type FormMode = "create" | "edit" | null;

const defaultForm: PatientInput = {
  dateOfBirth: "1970-01-01",
  firstName: "",
  gender: "unknown",
  lastName: "",
  medicalRecordNumber: "",
};

function patientName(patient: ApiPatient) {
  return `${patient.firstName} ${patient.lastName}`.trim();
}

function initials(patient: ApiPatient) {
  return patientName(patient).split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "PT";
}

function riskFactors(patient: ApiPatient) {
  return [
    patient.hypertension ? "HTN" : null,
    patient.diabetes ? "DM" : null,
    patient.dyslipidemia ? "DLP" : null,
    patient.obesity ? "Obesity" : null,
    patient.familyHistory ? "Family Hx" : null,
    patient.smokingStatus === "current" ? "Smoker" : null,
  ].filter(Boolean) as string[];
}

function riskLevel(patient: ApiPatient): "high" | "low" | "medium" {
  const count = riskFactors(patient).length;
  if (count >= 3) return "high";
  if (count >= 1) return "medium";
  return "low";
}

function riskTone(risk: "high" | "low" | "medium") {
  if (risk === "high") return "danger";
  if (risk === "medium") return "warning";
  return "success";
}

export default function PatientsScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<GenderFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<FormMode>(null);
  const [selected, setSelected] = useState<ApiPatient | null>(null);
  const [form, setForm] = useState<PatientInput>(defaultForm);

  useEffect(() => {
    if (__DEV__) console.info("[route-mount] PatientsPage", { page, search });
  }, [page, search]);

  const queryKey = useMemo(() => ["patients", token, page, search, gender], [gender, page, search, token]);
  const patientsQuery = useQuery({
    enabled: !!token,
    queryFn: async () => {
      const params = new URLSearchParams({ archived: "false", page: String(page), pageSize: "10" });
      if (search.trim()) params.set("q", search.trim());
      if (gender !== "all") params.set("gender", gender);
      return listPatients(token!, params);
    },
    queryKey,
    retry: false,
  });

  const casesQuery = useQuery({
    enabled: !!token,
    queryFn: async () => listCases(token!, new URLSearchParams({ page: "1", pageSize: "100" })),
    queryKey: ["patients-ecg-history", token],
    retry: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["patients", token] });
  };

  const createMutation = useMutation({
    mutationFn: async () => createPatient(token!, form),
    onSuccess: async () => {
      setMode(null);
      setForm(defaultForm);
      toast.success("Patient created", "The patient record is now available for ECG workflows.");
      await invalidate();
    },
    onError: (error) => toast.error("Create patient failed", error instanceof Error ? error.message : "Request failed."),
  });

  const updateMutation = useMutation({
    mutationFn: async () => updatePatient(token!, selected!.id, form),
    onSuccess: async () => {
      setMode(null);
      setSelected(null);
      toast.success("Patient updated", "The patient record was updated.");
      await invalidate();
    },
    onError: (error) => toast.error("Update patient failed", error instanceof Error ? error.message : "Request failed."),
  });

  const archiveMutation = useMutation({
    mutationFn: async (patientId: string) => archivePatient(token!, patientId),
    onSuccess: async () => {
      toast.info("Patient archived", "The patient was removed from the active patient list.");
      await invalidate();
    },
    onError: (error) => toast.error("Archive patient failed", error instanceof Error ? error.message : "Request failed."),
  });

  const patients = patientsQuery.data?.patients ?? [];
  const filteredPatients = risk === "all" ? patients : patients.filter((patient) => riskLevel(patient) === risk);
  const total = patientsQuery.data?.total ?? patients.length;
  const totalPages = patientsQuery.data?.totalPages ?? 1;
  const isSaving = createMutation.isPending || updateMutation.isPending;
  const ecgCases = (casesQuery.data?.cases ?? []).map(apiCaseToEcgCase);
  const highRiskCount = patients.filter((patient) => riskLevel(patient) === "high").length;
  const mediumRiskCount = patients.filter((patient) => riskLevel(patient) === "medium").length;
  const recentEcgCount = ecgCases.length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([patientsQuery.refetch(), casesQuery.refetch()]);
    setRefreshing(false);
  }, [casesQuery, patientsQuery]);

  const startCreate = () => {
    setSelected(null);
    setForm(defaultForm);
    setMode("create");
  };

  const startEdit = (patient: ApiPatient) => {
    setSelected(patient);
    setForm({
      dateOfBirth: patient.dateOfBirth?.slice(0, 10) ?? "1970-01-01",
      firstName: patient.firstName,
      gender: patient.gender,
      lastName: patient.lastName,
      medicalRecordNumber: patient.medicalRecordNumber,
    });
    setMode("edit");
  };

  const confirmArchive = (patient: ApiPatient) => {
    const perform = () => archiveMutation.mutate(patient.id);
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (window.confirm(`Archive ${patientName(patient)}?`)) perform();
      return;
    }
    Alert.alert("Archive patient", `Archive ${patientName(patient)}?`, [
      { style: "cancel", text: "Cancel" },
      { onPress: perform, style: "destructive", text: "Archive" },
    ]);
  };

  return (
    <BoltScreen refreshControl={<PremiumRefreshControl onRefresh={onRefresh} refreshing={refreshing} />}>
      <BoltHero
        actions={<BoltButton icon="user-plus" label="Add Patient" onPress={startCreate} />}
        eyebrow="Live patient registry"
        subtitle="Create, search, filter, edit, archive, and open real backend patient records."
        title="Patients"
      />

      <View style={styles.summaryGrid}>
        <BoltStat icon="users" label="Active Patients" value={total} />
        <BoltStat accent={colors.destructive} icon="alert-triangle" label="High Risk" value={highRiskCount} />
        <BoltStat accent={colors.warning} icon="activity" label="Medium Risk" value={mediumRiskCount} />
        <BoltStat icon="heart" label="Recent ECGs" value={recentEcgCount} />
      </View>

      <BoltCard style={styles.filters}>
        <BoltField
          icon="search"
          onChangeText={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name, MRN, email, employee ID, or organization..."
          value={search}
        />
        <View style={styles.filterRow}>
          {(["all", "male", "female", "other", "unknown"] as GenderFilter[]).map((item) => (
            <View key={item} style={styles.filterButton}>
              <BoltButton
                label={item[0].toUpperCase() + item.slice(1)}
                onPress={() => {
                  setGender(item);
                  setPage(1);
                }}
                variant={gender === item ? "primary" : "outline"}
              />
            </View>
          ))}
        </View>
        <View style={styles.filterRow}>
          {(["all", "high", "medium", "low"] as RiskFilter[]).map((item) => (
            <View key={item} style={styles.filterButton}>
              <BoltButton
                label={item === "all" ? "All risk" : `${item[0].toUpperCase()}${item.slice(1)} risk`}
                onPress={() => {
                  setRisk(item);
                  setPage(1);
                }}
                variant={risk === item ? "primary" : "outline"}
              />
            </View>
          ))}
        </View>
      </BoltCard>

      {mode ? (
        <BoltCard style={styles.form}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{mode === "create" ? "Add Patient" : `Edit ${selected ? patientName(selected) : "Patient"}`}</Text>
          <View style={styles.formGrid}>
            <BoltField icon="user" onChangeText={(value) => setForm((current) => ({ ...current, firstName: value }))} placeholder="First name" value={form.firstName} />
            <BoltField icon="user" onChangeText={(value) => setForm((current) => ({ ...current, lastName: value }))} placeholder="Last name" value={form.lastName} />
            <BoltField icon="calendar" onChangeText={(value) => setForm((current) => ({ ...current, dateOfBirth: value }))} placeholder="Date of birth YYYY-MM-DD" value={form.dateOfBirth} />
            <BoltField icon="hash" onChangeText={(value) => setForm((current) => ({ ...current, medicalRecordNumber: value }))} placeholder="Medical record number" value={form.medicalRecordNumber} />
          </View>
          <View style={styles.filterRow}>
            {(["male", "female", "other", "unknown"] as const).map((item) => (
              <View key={item} style={styles.filterButton}>
                <BoltButton
                  label={item[0].toUpperCase() + item.slice(1)}
                  onPress={() => setForm((current) => ({ ...current, gender: item }))}
                  variant={form.gender === item ? "primary" : "outline"}
                />
              </View>
            ))}
          </View>
          <View style={styles.actions}>
            <BoltButton
              label={isSaving ? "Saving..." : "Save Patient"}
              loading={isSaving}
              onPress={() => (mode === "create" ? createMutation.mutate() : updateMutation.mutate())}
            />
            <BoltButton label="Cancel" onPress={() => setMode(null)} variant="outline" />
          </View>
        </BoltCard>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {patientsQuery.isLoading ? "Loading patients..." : `${total} active patients`}
        </Text>
        <Text style={[styles.pageText, { color: colors.textSecondary }]}>Page {page} of {Math.max(totalPages, 1)}</Text>
      </View>

      {patientsQuery.isError ? (
        <BoltEmpty actionLabel="Retry" onAction={() => void patientsQuery.refetch()} title="Patients unavailable" message="Unable to load live patients from the backend." />
      ) : patientsQuery.isLoading ? (
        <SkeletonList count={5} />
      ) : filteredPatients.length === 0 ? (
        <BoltEmpty actionLabel="Add Patient" message="Create the first patient record or adjust the active search/filter." onAction={startCreate} title="No patients found" />
      ) : (
        <>
          <BoltCard style={styles.tableCard}>
            <View style={[styles.tableHeader, { borderColor: colors.border }]}>
              <Text style={[styles.tablePatient, styles.tableHead, { color: colors.textSecondary }]}>Patient</Text>
              <Text style={[styles.tableSmall, styles.tableHead, { color: colors.textSecondary }]}>Age</Text>
              <Text style={[styles.tableSmall, styles.tableHead, { color: colors.textSecondary }]}>Gender</Text>
              <Text style={[styles.tableStatus, styles.tableHead, { color: colors.textSecondary }]}>Risk</Text>
              <Text style={[styles.tableEcg, styles.tableHead, { color: colors.textSecondary }]}>Last ECG</Text>
              <Text style={[styles.tableAction, styles.tableHead, { color: colors.textSecondary }]}>Action</Text>
            </View>
            {filteredPatients.map((patient) => {
              const patientCases = ecgCases.filter((item) => item.patientName.toLowerCase() === patientName(patient).toLowerCase());
              const latest = patientCases[0];
              const currentRisk = riskLevel(patient);
              return (
                <View key={patient.id} style={[styles.tableRow, { borderColor: colors.border }]}>
                  <View style={styles.tablePatient}>
                    <View style={styles.patientIdentity}>
                      <View style={styles.patientAvatar}>
                        <Text style={styles.patientInitials}>{initials(patient)}</Text>
                      </View>
                      <View style={styles.patientMain}>
                        <Text style={[styles.patientName, { color: colors.text }]}>{patientName(patient)}</Text>
                        <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>MRN {patient.medicalRecordNumber}</Text>
                      </View>
                    </View>
                  </View>
                  <Text style={[styles.tableSmall, styles.tableText, { color: colors.text }]}>{patient.age}</Text>
                  <Text style={[styles.tableSmall, styles.tableText, { color: colors.text }]}>{patient.gender}</Text>
                  <View style={styles.tableStatus}>
                    <BoltBadge label={currentRisk} tone={riskTone(currentRisk)} />
                  </View>
                  <Text numberOfLines={1} style={[styles.tableEcg, styles.tableText, { color: colors.textSecondary }]}>{latest ? latest.date.slice(0, 10) : "No ECG"}</Text>
                  <View style={styles.tableAction}>
                    <BoltButton label="Open" onPress={() => router.push(`/(tabs)/upload?patientId=${patient.id}` as never)} variant="outline" />
                  </View>
                </View>
              );
            })}
          </BoltCard>

          <View style={styles.mobileCards}>
            {filteredPatients.map((patient) => (
              <PatientEnterpriseCard
                key={patient.id}
                cases={ecgCases.filter((item) => item.patientName.toLowerCase() === patientName(patient).toLowerCase())}
                onArchive={() => confirmArchive(patient)}
                onEdit={() => startEdit(patient)}
                onOpen={() => router.push(`/(tabs)/upload?patientId=${patient.id}` as never)}
                patient={patient}
              />
            ))}
          </View>
        </>
      )}

      <View style={styles.pagination}>
        <BoltButton disabled={page <= 1} label="Previous" onPress={() => setPage((current) => Math.max(1, current - 1))} variant="outline" />
        <BoltButton disabled={page >= totalPages} label="Next" onPress={() => setPage((current) => current + 1)} variant="outline" />
      </View>
    </BoltScreen>
  );
}

function PatientEnterpriseCard({
  cases,
  onArchive,
  onEdit,
  onOpen,
  patient,
}: {
  cases: ReturnType<typeof apiCaseToEcgCase>[];
  onArchive: () => void;
  onEdit: () => void;
  onOpen: () => void;
  patient: ApiPatient;
}) {
  const colors = useColors();
  const factors = riskFactors(patient);
  const risk = riskLevel(patient);
  const latest = cases[0];
  return (
    <BoltCard style={styles.patientCard}>
      <View style={styles.patientCardTop}>
        <View style={styles.patientIdentity}>
          <View style={styles.patientAvatar}>
            <Text style={styles.patientInitials}>{initials(patient)}</Text>
          </View>
          <View style={styles.patientMain}>
            <Text style={[styles.patientName, { color: colors.text }]}>{patientName(patient)}</Text>
            <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>
              {patient.age}y · {patient.gender} · MRN {patient.medicalRecordNumber}
            </Text>
            <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>
              {patient.phone ?? patient.email ?? patient.occupation ?? "No contact details"}
            </Text>
          </View>
        </View>
        <BoltBadge label={`${risk} risk`} tone={riskTone(risk)} />
      </View>

      <View style={styles.riskRow}>
        {factors.length ? factors.slice(0, 4).map((factor) => <BoltBadge key={factor} label={factor} tone="warning" />) : <BoltBadge label="No risk flags" tone="success" />}
      </View>

      <View style={[styles.medicalSummary, { borderColor: colors.border }]}>
        <SummaryItem label="Last ECG" value={latest ? latest.date.slice(0, 10) : "No ECG"} />
        <SummaryItem label="ECG Status" value={latest?.status ?? "Pending"} />
        <SummaryItem label="Medication" value={patient.medications ?? "Not recorded"} />
        <SummaryItem label="Allergies" value={patient.allergies ?? "None recorded"} />
      </View>

      {latest ? (
        <View style={[styles.ecgHistoryRow, { borderColor: colors.border }]}>
          <View style={styles.patientMain}>
            <Text style={[styles.patientName, { color: colors.text }]}>Recent ECG History</Text>
            <Text numberOfLines={2} style={[styles.patientMeta, { color: colors.textSecondary }]}>{latest.diagnosis}</Text>
          </View>
          <BoltBadge label={latest.status} tone={latest.status === "critical" ? "danger" : latest.status === "normal" ? "success" : "warning"} />
        </View>
      ) : null}

      <View style={styles.actions}>
        <BoltButton label="Open" onPress={onOpen} variant="outline" />
        <BoltButton label="Edit" onPress={onEdit} variant="outline" />
        <BoltButton label="Archive" onPress={onArchive} variant="danger" />
      </View>
    </BoltCard>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  ecgHistoryRow: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  filterButton: { minWidth: 96 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filters: { gap: 10 },
  form: { gap: 12 },
  formGrid: { gap: 10 },
  pageText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  pagination: { flexDirection: "row", gap: 10, justifyContent: "center" },
  patientAvatar: { alignItems: "center", backgroundColor: "#0D9488", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  patientCard: { gap: 12 },
  patientCardTop: { alignItems: "flex-start", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  patientIdentity: { alignItems: "center", flex: 1, flexDirection: "row", gap: 10, minWidth: 220 },
  patientInitials: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  patientMain: { flex: 1, gap: 3, minWidth: 180 },
  patientMeta: { fontFamily: "Inter_400Regular", fontSize: 12 },
  patientName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  medicalSummary: { borderRadius: 16, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 10, padding: 12 },
  mobileCards: { gap: 10 },
  riskRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryItem: { flex: 1, gap: 3, minWidth: "45%" },
  summaryLabel: { fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase" },
  summaryValue: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  tableAction: { alignItems: "flex-end", flex: 0.9 },
  tableCard: { gap: 0 },
  tableEcg: { flex: 0.9 },
  tableHead: { fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase" },
  tableHeader: { borderBottomWidth: 1, flexDirection: "row", gap: 8, paddingBottom: 10 },
  tablePatient: { flex: 1.8 },
  tableRow: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", gap: 8, paddingVertical: 10 },
  tableSmall: { flex: 0.55 },
  tableStatus: { flex: 0.85 },
  tableText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
});
