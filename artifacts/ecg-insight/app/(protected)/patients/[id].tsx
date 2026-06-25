import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, patientDisplayName, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getCase, listCases, listPatients } from "@/services/clinical";
import { listReports } from "@/services/reports";

export default function PatientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authToken } = useAuth();
  const token = authToken?.token;

  const patientQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: async () => {
      const patients = await listPatients(token!, new URLSearchParams({ pageSize: "100" }));
      return patients.patients.find((patient) => patient.id === id) ?? null;
    },
    queryKey: ["enterprise-patient-profile", token, id],
    retry: false,
  });
  const casesQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => listCases(token!, new URLSearchParams({ pageSize: "50" })),
    queryKey: ["enterprise-patient-cases", token, id],
    retry: false,
  });
  const reportsQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => listReports(token!, new URLSearchParams({ pageSize: "50" })),
    queryKey: ["enterprise-patient-reports", token, id],
    retry: false,
  });

  const patient = patientQuery.data;
  const cases = (casesQuery.data?.cases ?? []).filter((item) => item.patient.id === id);
  const reports = (reportsQuery.data?.reports ?? []).filter((item) => item.patientId === id);

  if (patientQuery.isLoading) return <Text style={styles.muted}>Loading patient profile...</Text>;
  if (!patient) return <EmptyState title="Patient not found" message="The requested patient profile could not be loaded." />;

  return (
    <PageSection>
      <Card style={styles.profileHero}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{patient.firstName[0]}{patient.lastName[0]}</Text></View>
        <View style={styles.heroText}>
          <Text style={styles.title}>{patientDisplayName(patient)}</Text>
          <Text style={styles.muted}>MRN {patient.medicalRecordNumber} • {patient.age}y • {patient.gender}</Text>
          <View style={styles.badges}>
            <Badge label={patient.email ?? "No email"} tone="muted" />
            <Badge label={patient.phone ?? "No phone"} tone="muted" />
            <Badge label={patient.nationalId ?? "No national ID"} tone="muted" />
          </View>
        </View>
      </Card>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="Demographics" />
          <Info label="DOB" value={patient.dateOfBirth} />
          <Info label="Company / Contractor / Department" value={patient.occupation ?? "Not recorded"} />
          <Info label="Address" value={patient.address ?? "Not recorded"} />
          <Info label="Emergency Contact" value={patient.emergencyContact ?? "Not recorded"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Medical Summary" />
          <Info label="Medical History" value={patient.medicalHistory ?? "None recorded"} />
          <Info label="Medications" value={patient.medications ?? "None recorded"} />
          <Info label="Allergies" value={patient.allergies ?? "None recorded"} />
          <Info label="Risk Factors" value={[patient.hypertension ? "HTN" : null, patient.diabetes ? "Diabetes" : null, patient.smokingStatus === "current" ? "Smoker" : null].filter(Boolean).join(", ") || "None recorded"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="ECG History" />
          {cases.length ? cases.map((item) => (
            <Info key={item.id} label={item.caseId} value={`${item.ecgType} • ${item.priority} • ${formatDate(item.uploadDate)}`} />
          )) : <Text style={styles.muted}>No ECG history yet.</Text>}
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Reports & Timeline" />
          {reports.length ? reports.map((item) => (
            <Info key={item.id} label={item.reportNumber} value={`${item.status} • ${formatDate(item.reportingDate)}`} />
          )) : <Text style={styles.muted}>No reports yet.</Text>}
          <Info label="Uploaded Documents" value="Document uploads are shown when attached to clinical records." />
          <Info label="Timeline" value={`${cases.length} ECG events and ${reports.length} reports available.`} />
        </Card>
      </View>
    </PageSection>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#123B4A", borderRadius: 22, height: 68, justifyContent: "center", width: 68 },
  avatarText: { color: medicalTheme.primary, fontSize: 22, fontWeight: "900" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  heroText: { flex: 1, minWidth: 240 },
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 3, paddingVertical: 9 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "800" },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  panel: { flex: 1, gap: 8, minWidth: 300 },
  profileHero: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16 },
  title: { color: medicalTheme.text, fontSize: 30, fontWeight: "900" },
});
