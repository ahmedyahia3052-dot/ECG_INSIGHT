import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { archivePatient, listPatients, type ApiPatient } from "@/services/clinical";

export default function PatientsIndexScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("all");
  const [page, setPage] = useState(1);

  const patientsQuery = useQuery({
    enabled: !!token,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "12" });
      if (search.trim()) params.set("q", search.trim());
      if (gender !== "all") params.set("gender", gender);
      return listPatients(token!, params);
    },
    queryKey: ["enterprise-patients", token, page, search, gender],
    retry: false,
  });

  const archiveMutation = useMutation({
    mutationFn: (patientId: string) => archivePatient(token!, patientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["enterprise-patients", token] }),
  });

  const patients = patientsQuery.data?.patients ?? [];
  const totalPages = patientsQuery.data?.totalPages ?? 1;
  const highRiskCount = useMemo(() => patients.filter((patient) => patient.hypertension || patient.diabetes || patient.smokingStatus === "current").length, [patients]);

  return (
    <PageSection>
      <View style={styles.summaryGrid}>
        <Summary label="Total Patients" value={String(patientsQuery.data?.total ?? patients.length)} />
        <Summary label="High Risk" value={String(highRiskCount)} tone="critical" />
        <Summary label="Current Page" value={`${page}/${totalPages}`} />
      </View>

      <Card style={styles.controls}>
        <Field label="Search" onChangeText={setSearch} placeholder="Name, MRN, employee ID, phone..." value={search} />
        <View style={styles.filterRow}>
          {["all", "male", "female", "other", "unknown"].map((value) => (
            <PrimaryButton key={value} label={value} onPress={() => { setGender(value); setPage(1); }} variant={gender === value ? "primary" : "outline"} />
          ))}
          <PrimaryButton icon="user-plus" label="Create Patient" onPress={() => router.push("/patients/create" as never)} />
        </View>
      </Card>

      <Card style={styles.table}>
        <SectionHeader title="Patient Registry" subtitle="Search, filter, view, edit, and archive patient records." />
        {patientsQuery.isLoading ? <Text style={styles.muted}>Loading patients...</Text> : null}
        {patientsQuery.isError ? <Text style={styles.error}>Unable to load patients.</Text> : null}
        {!patientsQuery.isLoading && !patients.length ? (
          <EmptyState title="No patients found" message="Create a patient profile to begin ECG tracking." action={<PrimaryButton label="Add Patient" onPress={() => router.push("/patients/create" as never)} />} />
        ) : null}
        {patients.map((patient) => (
          <PatientRow
            key={patient.id}
            onArchive={() => archiveMutation.mutate(patient.id)}
            onOpen={() => router.push(`/patients/${patient.id}` as never)}
            patient={patient}
          />
        ))}
        <View style={styles.pagination}>
          <PrimaryButton disabled={page <= 1} label="Previous" onPress={() => setPage((value) => Math.max(1, value - 1))} variant="outline" />
          <Text style={styles.muted}>Page {page} of {totalPages}</Text>
          <PrimaryButton disabled={page >= totalPages} label="Next" onPress={() => setPage((value) => Math.min(totalPages, value + 1))} variant="outline" />
        </View>
      </Card>
    </PageSection>
  );
}

function PatientRow({ onArchive, onOpen, patient }: { onArchive: () => void; onOpen: () => void; patient: ApiPatient }) {
  const risk = patient.hypertension || patient.diabetes || patient.smokingStatus === "current" ? "High Risk" : "Standard";
  return (
    <View style={styles.patientRow}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{patient.firstName[0]}{patient.lastName[0]}</Text></View>
      <View style={styles.patientMain}>
        <Text style={styles.patientName}>{patientDisplayName(patient)}</Text>
        <Text style={styles.patientMeta}>MRN {patient.medicalRecordNumber} • {patient.age}y • {patient.gender} • {patient.email ?? patient.phone ?? "No contact"}</Text>
        <Text style={styles.patientMeta}>{patient.occupation ?? "Department not recorded"} • {patient.medicalHistory ?? "No medical history recorded"}</Text>
      </View>
      <Badge label={risk} tone={risk === "High Risk" ? "critical" : "success"} />
      <View style={styles.rowActions}>
        <PrimaryButton label="View" onPress={onOpen} variant="outline" />
        <PrimaryButton label="Archive" onPress={onArchive} variant="danger" />
      </View>
    </View>
  );
}

function Summary({ label, tone = "primary", value }: { label: string; tone?: "critical" | "primary"; value: string }) {
  return (
    <Card style={styles.summary}>
      <Text style={[styles.summaryValue, tone === "critical" && { color: medicalTheme.critical }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#123B4A", borderRadius: 99, height: 44, justifyContent: "center", width: 44 },
  avatarText: { color: medicalTheme.primary, fontSize: 13, fontWeight: "900" },
  controls: { gap: 12 },
  error: { color: medicalTheme.critical, fontWeight: "800" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  pagination: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "flex-end", paddingTop: 10 },
  patientMain: { flex: 1, minWidth: 220 },
  patientMeta: { color: medicalTheme.muted, fontSize: 12, lineHeight: 18 },
  patientName: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
  patientRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  rowActions: { flexDirection: "row", gap: 8 },
  summary: { flex: 1, minWidth: 160 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  summaryLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  summaryValue: { color: medicalTheme.text, fontSize: 24, fontWeight: "900" },
  table: { gap: 10 },
});
