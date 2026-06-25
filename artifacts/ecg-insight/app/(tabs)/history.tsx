import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  archivePatient,
  createPatient,
  listPatients,
  updatePatient,
  type ApiPatient,
  type PatientInput,
} from "@/services/clinical";
import { BoltBadge, BoltButton, BoltCard, BoltEmpty, BoltField, BoltHero, BoltScreen } from "@/components/bolt/BoltUI";
import { PremiumRefreshControl, SkeletonList, useToast } from "@/components/interaction/PremiumInteraction";

type GenderFilter = "all" | "female" | "male" | "other" | "unknown";
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

export default function PatientsScreen() {
  const colors = useColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<GenderFilter>("all");
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
  const total = patientsQuery.data?.total ?? patients.length;
  const totalPages = patientsQuery.data?.totalPages ?? 1;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await patientsQuery.refetch();
    setRefreshing(false);
  }, [patientsQuery]);

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
        <BoltEmpty title="Patients unavailable" message="Unable to load live patients from the backend." />
      ) : patientsQuery.isLoading ? (
        <SkeletonList count={5} />
      ) : patients.length === 0 ? (
        <BoltEmpty actionLabel="Add Patient" message="Create the first patient record or adjust the active search/filter." onAction={startCreate} title="No patients found" />
      ) : (
        patients.map((patient) => (
          <BoltCard key={patient.id} style={styles.patientCard}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientInitials}>{initials(patient)}</Text>
            </View>
            <View style={styles.patientMain}>
              <Text style={[styles.patientName, { color: colors.text }]}>{patientName(patient)}</Text>
              <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>
                {patient.age}y · {patient.gender} · MRN {patient.medicalRecordNumber}
              </Text>
              <Text style={[styles.patientMeta, { color: colors.textSecondary }]}>Patient ID {patient.id}</Text>
            </View>
            <BoltBadge label={patient.gender} tone="muted" />
            <View style={styles.actions}>
              <BoltButton label="Open" onPress={() => router.push(`/(tabs)/upload?patientId=${patient.id}` as never)} variant="outline" />
              <BoltButton label="Edit" onPress={() => startEdit(patient)} variant="outline" />
              <BoltButton label="Archive" onPress={() => confirmArchive(patient)} variant="danger" />
            </View>
          </BoltCard>
        ))
      )}

      <View style={styles.pagination}>
        <BoltButton disabled={page <= 1} label="Previous" onPress={() => setPage((current) => Math.max(1, current - 1))} variant="outline" />
        <BoltButton disabled={page >= totalPages} label="Next" onPress={() => setPage((current) => current + 1)} variant="outline" />
      </View>
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterButton: { minWidth: 96 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filters: { gap: 10 },
  form: { gap: 12 },
  formGrid: { gap: 10 },
  pageText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  pagination: { flexDirection: "row", gap: 10, justifyContent: "center" },
  patientAvatar: { alignItems: "center", backgroundColor: "#0D9488", borderRadius: 16, height: 48, justifyContent: "center", width: 48 },
  patientCard: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  patientInitials: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 13 },
  patientMain: { flex: 1, gap: 3, minWidth: 180 },
  patientMeta: { fontFamily: "Inter_400Regular", fontSize: 12 },
  patientName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
