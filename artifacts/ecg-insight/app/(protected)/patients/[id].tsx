import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getPatient } from "@/services/clinical";

export default function PatientProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { authToken } = useAuth();
  const token = authToken?.token;

  const patientQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: () => getPatient(token!, id),
    queryKey: ["enterprise-patient-profile", token, id],
    retry: false,
  });

  const patient = patientQuery.data?.patient;
  const related = patientQuery.data?.related;
  const cases = related?.cases ?? [];
  const reports = related?.reports ?? [];
  const documents = related?.documents ?? [];
  const timeline = related?.timeline ?? [];
  const criticalCases = cases.filter((item) => item.priority === "critical" || item.aiSeverity === "critical").length;
  const abnormalCases = cases.filter((item) => item.finalDiagnosis || (item.aiSeverity && item.aiSeverity !== "normal")).length;
  const pendingReviews = cases.filter((item) => item.status !== "finalized").length;

  if (patientQuery.isLoading) return <Text style={styles.muted}>Loading patient profile...</Text>;
  if (!patient) return <EmptyState title="Patient not found" message="The requested patient profile could not be loaded." />;

  return (
    <PageSection>
      <Card style={styles.profileHero}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{patient.firstName[0]}{patient.lastName[0]}</Text></View>
        <View style={styles.heroText}>
          <Text style={styles.title}>{patientDisplayName(patient)}</Text>
          <Text style={styles.muted}>{patient.patientCode ?? patient.medicalRecordNumber} • Employee {patient.employeeId ?? "N/A"} • {patient.age}y • {patient.gender}</Text>
          <View style={styles.badges}>
            <Badge label={patient.email ?? "No email"} tone="muted" />
            <Badge label={patient.phone ?? "No phone"} tone="muted" />
            <Badge label={patient.nationalId ?? "No national ID"} tone="muted" />
            <Badge label={patient.status ?? "active"} tone={patient.status === "inactive" ? "muted" : "success"} />
          </View>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Edit" onPress={() => router.push(`/patients/${patient.id}/edit` as never)} variant="outline" />
          <PrimaryButton label="Create ECG" onPress={() => router.push("/upload-ecg" as never)} />
          <PrimaryButton label="Reports" onPress={() => router.push("/reports" as never)} variant="outline" />
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Stat label="Total ECG Cases" value={String(cases.length)} />
        <Stat label="Critical ECGs" value={String(criticalCases)} tone="critical" />
        <Stat label="Abnormal ECGs" value={String(abnormalCases)} tone="warning" />
        <Stat label="Last ECG" value={cases[0] ? formatDate(cases[0].uploadDate) : "None"} />
        <Stat label="Pending Reviews" value={String(pendingReviews)} tone="warning" />
      </View>

      <View style={styles.grid}>
        <Card style={styles.panel}>
          <SectionHeader title="Personal Information" />
          <Info label="Patient ID" value={patient.patientCode ?? patient.medicalRecordNumber} />
          <Info label="DOB" value={`${patient.dateOfBirth} (${patient.age} years)`} />
          <Info label="Gender" value={patient.gender} />
          <Info label="Blood Group" value={patient.bloodGroup ?? "Not recorded"} />
          <Info label="Marital Status" value={patient.maritalStatus ?? "Not recorded"} />
          <Info label="Address" value={patient.address ?? "Not recorded"} />
          <Info label="Emergency Contact" value={`${patient.emergencyContactName ?? patient.emergencyContact ?? "Not recorded"} ${patient.emergencyContactPhone ?? ""}`.trim()} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Occupational Information" />
          <Info label="Company" value={patient.company ?? "Not recorded"} />
          <Info label="Department" value={patient.department ?? "Not recorded"} />
          <Info label="Contractor" value={patient.contractor ?? "Not recorded"} />
          <Info label="Job Title" value={patient.jobTitle ?? patient.occupation ?? "Not recorded"} />
          <Info label="Employee ID" value={patient.employeeId ?? "Not recorded"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Medical History" />
          <Info label="Medical History" value={patient.medicalHistory ?? "None recorded"} />
          <Info label="Risk Factors" value={riskFactors(patient)} />
          <Info label="Previous Interventions" value={[patient.previousMI ? "Previous MI" : null, patient.previousCABG ? "CABG" : null, patient.previousPCI ? "PCI" : null, patient.stentsHistory].filter(Boolean).join(", ") || "None recorded"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Medications" />
          <Info label="Current Medications" value={patient.medications ?? "None recorded"} />
          <Info label="Alcohol Status" value={patient.alcoholStatus ?? "Not recorded"} />
          <Info label="Smoking Status" value={patient.smokingStatus ?? "unknown"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Allergies" />
          <Info label="Known Allergies" value={patient.knownAllergies ?? patient.allergies ?? "None recorded"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Vital Statistics" />
          <Info label="Height" value={patient.heightCm ? `${patient.heightCm} cm` : "Not recorded"} />
          <Info label="Weight" value={patient.weightKg ? `${patient.weightKg} kg` : "Not recorded"} />
          <Info label="BMI" value={patient.bmi ? String(patient.bmi) : "Not recorded"} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="ECG History" />
          {cases.length ? cases.map((item) => (
            <Info key={item.id} label={item.caseId} value={`${item.aiDiagnosis ?? item.finalDiagnosis ?? "Pending"} • ${item.priority} • ${formatDate(item.uploadDate)}`} />
          )) : <Text style={styles.muted}>No ECG history yet.</Text>}
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Uploaded Documents" />
          {documents.length ? documents.map((item) => (
            <Info key={item.id} label={item.title} value={`${item.category} • ${item.mimeType} • ${formatDate(item.createdAt)}`} />
          )) : <Text style={styles.muted}>No uploaded documents yet.</Text>}
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Timeline" />
          {timeline.length ? timeline.map((item) => (
            <Info key={item.id} label={`${formatDate(item.createdAt)} • ${item.type}`} value={item.title} />
          )) : <Text style={styles.muted}>No timeline events yet.</Text>}
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="AI Clinical Summary" />
          <Info label="Major Diagnoses" value={Array.from(new Set(cases.map((item) => item.aiDiagnosis ?? item.finalDiagnosis).filter(Boolean))).join(", ") || "No AI diagnoses yet"} />
          <Info label="Risk Factors" value={riskFactors(patient)} />
          <Info label="Previous Interventions" value={[patient.previousMI ? "MI" : null, patient.previousCABG ? "CABG" : null, patient.previousPCI ? "PCI" : null].filter(Boolean).join(", ") || "None recorded"} />
          <Info label="Clinical Recommendations" value={clinicalRecommendations(patient, criticalCases, abnormalCases)} />
        </Card>
        <Card style={styles.panel}>
          <SectionHeader title="Reports" />
          {reports.length ? reports.map((item) => (
            <Info key={item.id} label={item.reportNumber} value={`${item.status} • ${formatDate(item.reportingDate)}`} />
          )) : <Text style={styles.muted}>No reports yet.</Text>}
        </Card>
      </View>
    </PageSection>
  );
}

function riskFactors(patient: { arrhythmiaHistory?: boolean; diabetes?: boolean; heartFailure?: boolean; hypertension?: boolean; ischemicHeartDisease?: boolean; smokingStatus?: string }) {
  return [
    patient.hypertension ? "Hypertension" : null,
    patient.diabetes ? "Diabetes" : null,
    patient.ischemicHeartDisease ? "Ischemic heart disease" : null,
    patient.heartFailure ? "Heart failure" : null,
    patient.arrhythmiaHistory ? "Arrhythmia history" : null,
    patient.smokingStatus === "current" ? "Current smoker" : null,
  ].filter(Boolean).join(", ") || "None recorded";
}

function clinicalRecommendations(patient: { diabetes?: boolean; hypertension?: boolean; ischemicHeartDisease?: boolean }, criticalCases: number, abnormalCases: number) {
  if (criticalCases > 0) return "Urgent cardiology review recommended due to critical ECG history.";
  if (abnormalCases > 0) return "Continue physician follow-up and correlate ECG findings with symptoms.";
  if (patient.hypertension || patient.diabetes || patient.ischemicHeartDisease) return "Routine cardiovascular risk surveillance recommended.";
  return "Routine ECG monitoring according to occupational health protocol.";
}

function Stat({ label, tone = "primary", value }: { label: string; tone?: "critical" | "primary" | "warning"; value: string }) {
  const color = tone === "critical" ? medicalTheme.critical : tone === "warning" ? medicalTheme.warning : medicalTheme.primary;
  return (
    <Card style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </Card>
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
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  heroText: { flex: 1, minWidth: 240 },
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 3, paddingVertical: 9 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "800" },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  panel: { flex: 1, gap: 8, minWidth: 300 },
  profileHero: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16 },
  statCard: { flex: 1, minWidth: 160 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  statValue: { fontSize: 22, fontWeight: "900" },
  title: { color: medicalTheme.text, fontSize: 30, fontWeight: "900" },
});
