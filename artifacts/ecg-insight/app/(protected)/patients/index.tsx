import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { archivePatient, listPatients, type ApiPatient } from "@/services/clinical";
import { safeArray } from "@/utils/collections";

export default function PatientsIndexScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState("all");
  const [status, setStatus] = useState("active");
  const [sortBy, setSortBy] = useState("fullName");
  const [page, setPage] = useState(1);

  const patientsQuery = useQuery({
    enabled: !!token,
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), pageSize: "12" });
      if (search.trim()) params.set("q", search.trim());
      if (gender !== "all") params.set("gender", gender);
      if (status !== "all") params.set("status", status);
      params.set("sortBy", sortBy);
      params.set("sortDir", sortBy === "createdAt" ? "desc" : "asc");
      return listPatients(token!, params);
    },
    queryKey: ["enterprise-patients", token, page, search, gender, status, sortBy],
    retry: false,
  });

  const archiveMutation = useMutation({
    mutationFn: (patientId: string) => archivePatient(token!, patientId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["enterprise-patients", token] }),
  });

  const patients = safeArray(patientsQuery.data?.patients);
  const totalPages = patientsQuery.data?.totalPages ?? 1;
  const highRiskCount = useMemo(() => safeArray(patients).filter((patient) => patient.hypertension || patient.diabetes || patient.smokingStatus === "current").length, [patients]);
  const lastEcgPatients = useMemo(() => safeArray(patients).filter((patient) => patient.status === "active").length, [patients]);

  return (
    <PageSection>
      <View style={styles.summaryGrid}>
        <Summary label="Total Patients" value={String(patientsQuery.data?.total ?? patients.length)} />
        <Summary label="High Risk" value={String(highRiskCount)} tone="critical" />
        <Summary label="Active Records" value={String(lastEcgPatients)} />
        <Summary label="Current Page" value={`${page}/${totalPages}`} />
      </View>

      <Card style={styles.controls}>
        <SectionHeader title="Patient Command Search" subtitle="Search, filter, sort, export, print, and manage enterprise patient records." />
        <Field label="Global Search" onChangeText={(value) => { setSearch(value); setPage(1); }} placeholder="Patient ID, employee ID, name, company, department, phone..." value={search} />
        <View style={styles.filterRow}>
          {["all", "male", "female", "other", "unknown"].map((value) => (
            <PrimaryButton key={value} label={value} onPress={() => { setGender(value); setPage(1); }} variant={gender === value ? "primary" : "outline"} />
          ))}
        </View>
        <View style={styles.filterRow}>
          {["all", "active", "inactive"].map((value) => (
            <PrimaryButton key={value} label={value} onPress={() => { setStatus(value); setPage(1); }} variant={status === value ? "primary" : "outline"} />
          ))}
          {["fullName", "patientCode", "employeeId", "status", "createdAt"].map((value) => (
            <PrimaryButton key={value} label={`Sort ${value}`} onPress={() => setSortBy(value)} variant={sortBy === value ? "primary" : "outline"} />
          ))}
        </View>
        <View style={styles.filterRow}>
          <PrimaryButton icon="user-plus" label="Create Patient" onPress={() => router.push("/patients/new" as never)} />
          <PrimaryButton label="Export CSV" onPress={() => exportRows(patients, "csv")} variant="outline" />
          <PrimaryButton label="Export Excel" onPress={() => exportRows(patients, "xls")} variant="outline" />
          <PrimaryButton label="Print" onPress={printPage} variant="outline" />
        </View>
      </Card>

      <Card style={styles.table}>
        <SectionHeader title="Patient Registry" subtitle="Search, filter, view, edit, and archive patient records." />
        <View style={styles.tableHeader}>
          {["Patient ID", "Employee ID", "Full Name", "Age", "Gender", "Company", "Department", "Phone", "Last ECG Date", "Status", "Actions"].map((item) => (
            <Text key={item} style={styles.headerCell}>{item}</Text>
          ))}
        </View>
        {patientsQuery.isLoading ? <Text style={styles.muted}>Loading patients...</Text> : null}
        {patientsQuery.isError ? <Text style={styles.error}>Unable to load patients.</Text> : null}
        {!patientsQuery.isLoading && !patients.length ? (
          <EmptyState title="No patients found" message="Create a patient profile to begin ECG tracking." action={<PrimaryButton label="Add Patient" onPress={() => router.push("/patients/create" as never)} />} />
        ) : null}
        {patients.map((patient) => (
          <PatientRow
            key={patient.id}
            onArchive={() => archiveMutation.mutate(patient.id)}
            onCreateEcg={() => router.push("/upload-ecg" as never)}
            onEdit={() => router.push(`/patients/${patient.id}/edit` as never)}
            onGenerateReport={() => router.push(`/patients/${patient.id}` as never)}
            onTimeline={() => router.push(`/patients/${patient.id}` as never)}
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

function PatientRow({
  onArchive,
  onCreateEcg,
  onEdit,
  onGenerateReport,
  onOpen,
  onTimeline,
  patient,
}: {
  onArchive: () => void;
  onCreateEcg: () => void;
  onEdit: () => void;
  onGenerateReport: () => void;
  onOpen: () => void;
  onTimeline: () => void;
  patient: ApiPatient;
}) {
  const risk = patient.hypertension || patient.diabetes || patient.smokingStatus === "current" ? "High Risk" : "Standard";
  return (
    <View style={styles.patientRow}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{patient.firstName[0]}{patient.lastName[0]}</Text></View>
      <View style={styles.patientMain}>
        <Text style={styles.patientName}>{patientDisplayName(patient)}</Text>
        <Text style={styles.patientMeta}>{patient.patientCode ?? patient.medicalRecordNumber} • Employee {patient.employeeId ?? "N/A"} • {patient.age}y • {patient.gender}</Text>
        <Text style={styles.patientMeta}>{patient.company ?? "Company N/A"} • {patient.department ?? "Department N/A"} • {patient.phone ?? "No phone"}</Text>
      </View>
      <Badge label={risk} tone={risk === "High Risk" ? "critical" : "success"} />
      <Badge label={patient.status ?? "active"} tone={patient.status === "inactive" ? "muted" : "primary"} />
      <View style={styles.rowActions}>
        <PrimaryButton label="View" onPress={onOpen} variant="outline" />
        <PrimaryButton label="Edit" onPress={onEdit} variant="outline" />
        <PrimaryButton label="Create ECG" onPress={onCreateEcg} variant="outline" />
        <PrimaryButton label="Timeline" onPress={onTimeline} variant="outline" />
        <PrimaryButton label="Report" onPress={onGenerateReport} variant="outline" />
        <PrimaryButton label="Delete" onPress={onArchive} variant="danger" />
      </View>
    </View>
  );
}

function exportRows(patients: ApiPatient[], extension: "csv" | "xls") {
  const header = ["Patient ID", "Employee ID", "Full Name", "Age", "Gender", "Company", "Department", "Phone", "Status"];
  const rows = patients.map((patient) => [
    patient.patientCode ?? patient.medicalRecordNumber,
    patient.employeeId ?? "",
    patient.fullName ?? patientDisplayName(patient),
    patient.age,
    patient.gender,
    patient.company ?? "",
    patient.department ?? "",
    patient.phone ?? "",
    patient.status ?? "active",
  ]);
  const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
  if (Platform.OS === "web" && typeof document !== "undefined") {
    const blob = new Blob([csv], { type: extension === "xls" ? "application/vnd.ms-excel" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `patients.${extension}`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

function printPage() {
  if (Platform.OS === "web" && typeof window !== "undefined") window.print();
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
  headerCell: { color: medicalTheme.primary, flex: 1, fontSize: 11, fontWeight: "900", minWidth: 96, textTransform: "uppercase" },
  tableHeader: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 10 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  summaryLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  summaryValue: { color: medicalTheme.text, fontSize: 24, fontWeight: "900" },
  table: { gap: 10 },
});
