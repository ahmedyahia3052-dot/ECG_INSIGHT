import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, formatDate, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { getPatient } from "@/services/clinical";
import { API_URL } from "@/services/api";
import { deleteClinicalDocument, uploadClinicalDocument } from "@/services/documents";
import { downloadReportPdf, generateReport } from "@/services/reports";

type PatientTab = "ai" | "documents" | "ecg" | "history" | "overview" | "reports" | "timeline";

const tabs: Array<{ id: PatientTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "ecg", label: "ECG Cases" },
  { id: "timeline", label: "Timeline" },
  { id: "documents", label: "Documents" },
  { id: "history", label: "Medical History" },
  { id: "ai", label: "AI Summary" },
  { id: "reports", label: "Reports" },
];

export default function PatientProfileScreen() {
  const { created, id } = useLocalSearchParams<{ created?: string; id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [activeTab, setActiveTab] = useState<PatientTab>("overview");
  const [documentCategory, setDocumentCategory] = useState("ecg");
  const [documentMessage, setDocumentMessage] = useState("");

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
  const lastReportDate = reports[0] ? formatDate(reports[0].reportingDate) : "None";
  const highRisk = criticalCases > 0 || patient?.hypertension || patient?.diabetes || patient?.ischemicHeartDisease;
  const createdToast = created === "1";

  const documentUploadMutation = useMutation({
    mutationFn: (formData: FormData) => uploadClinicalDocument(token!, formData),
    onSuccess: async () => {
      setDocumentMessage("Document uploaded successfully.");
      await queryClient.invalidateQueries({ queryKey: ["enterprise-patient-profile", token, id] });
    },
  });
  const documentDeleteMutation = useMutation({
    mutationFn: (documentId: string) => deleteClinicalDocument(token!, documentId),
    onSuccess: async () => {
      setDocumentMessage("Document deleted successfully.");
      await queryClient.invalidateQueries({ queryKey: ["enterprise-patient-profile", token, id] });
    },
  });
  const reportMutation = useMutation({
    mutationFn: (caseId: string) => generateReport(token!, caseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["enterprise-patient-profile", token, id] });
      setActiveTab("reports");
    },
  });

  if (patientQuery.isLoading) return <Text style={styles.muted}>Loading patient profile...</Text>;
  if (!patient) return <EmptyState title="Patient not found" message="The requested patient profile could not be loaded." />;

  return (
    <PageSection>
      {createdToast ? <Card style={styles.toast}><Text style={styles.success}>Patient profile created successfully.</Text></Card> : null}
      <Card style={styles.profileHero}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{patient.firstName[0]}{patient.lastName[0]}</Text></View>
        <View style={styles.heroText}>
          <Text style={styles.title}>{patientDisplayName(patient)}</Text>
          <Text style={styles.muted}>{patient.patientCode ?? patient.medicalRecordNumber} • Employee {patient.employeeId ?? "N/A"} • {patient.company ?? "Company N/A"} • {patient.department ?? "Department N/A"} • {patient.age}y • {patient.gender}</Text>
          <View style={styles.badges}>
            <Badge label={patient.status ?? "active"} tone={patient.status === "inactive" ? "muted" : "success"} />
            {highRisk ? <Badge label="High Risk" tone="critical" /> : null}
            {patient.smokingStatus === "current" ? <Badge label="Smoker" tone="warning" /> : null}
            {patient.diabetes ? <Badge label="Diabetic" tone="warning" /> : null}
            {patient.hypertension ? <Badge label="Hypertensive" tone="warning" /> : null}
          </View>
        </View>
        <View style={styles.actions}>
          <PrimaryButton label="Upload ECG" onPress={() => router.push("/upload-ecg" as never)} />
          <PrimaryButton label="Analyze ECG" onPress={() => router.push("/ecg-analysis" as never)} variant="outline" />
          <PrimaryButton label="Generate Report" onPress={() => cases[0] ? reportMutation.mutate(cases[0].id) : router.push("/reports" as never)} variant="outline" />
          <PrimaryButton label="Upload Document" onPress={() => setActiveTab("documents")} variant="outline" />
          <PrimaryButton label="Edit" onPress={() => router.push(`/patients/${patient.id}/edit` as never)} variant="outline" />
        </View>
      </Card>

      <View style={styles.statsGrid}>
        <Stat label="Total ECG Cases" value={String(cases.length)} />
        <Stat label="Critical ECGs" value={String(criticalCases)} tone="critical" />
        <Stat label="Last ECG" value={cases[0] ? formatDate(cases[0].uploadDate) : "None"} />
        <Stat label="Last Report" value={lastReportDate} />
      </View>

      <Card style={styles.tabsCard}>
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <PrimaryButton key={tab.id} label={tab.label} onPress={() => setActiveTab(tab.id)} variant={activeTab === tab.id ? "primary" : "outline"} />
          ))}
        </View>
      </Card>

      {activeTab === "overview" ? <OverviewTab patient={patient} cases={cases} reports={reports} criticalCases={criticalCases} abnormalCases={abnormalCases} pendingReviews={pendingReviews} /> : null}
      {activeTab === "ecg" ? <EcgCasesTab cases={cases} onGenerateReport={(caseId) => reportMutation.mutate(caseId)} onNew={() => router.push("/ecg-cases/new" as never)} onOpen={(caseId) => router.push(`/ecg-cases/${caseId}` as never)} onReview={(caseId) => router.push(`/ecg-cases/${caseId}/review` as never)} /> : null}
      {activeTab === "timeline" ? <TimelineTab cases={cases} timeline={timeline} /> : null}
      {activeTab === "documents" ? (
        <DocumentsTab
          category={documentCategory}
          documents={documents}
          message={documentMessage}
          onCategoryChange={setDocumentCategory}
          onDelete={(documentId) => documentDeleteMutation.mutate(documentId)}
          onUpload={() => uploadDocument(id, documentCategory, documentUploadMutation.mutate)}
        />
      ) : null}
      {activeTab === "history" ? <MedicalHistoryTab patient={patient} onEdit={() => router.push(`/patients/${patient.id}/edit` as never)} /> : null}
      {activeTab === "ai" ? <AiSummaryTab patient={patient} cases={cases} criticalCases={criticalCases} abnormalCases={abnormalCases} /> : null}
      {activeTab === "reports" ? <ReportsTab reports={reports} token={token} /> : null}
    </PageSection>
  );
}

function OverviewTab({ abnormalCases, cases, criticalCases, patient, pendingReviews, reports }: {
  abnormalCases: number;
  cases: Array<{ aiDiagnosis?: string; caseId: string; finalDiagnosis?: string; id: string; priority: string; uploadDate: string }>;
  criticalCases: number;
  patient: NonNullable<Awaited<ReturnType<typeof getPatient>>["patient"]>;
  pendingReviews: number;
  reports: Array<{ reportingDate: string }>;
}) {
  return (
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
          <SectionHeader title="Dashboard Widgets" />
          <Info label="ECG Trends" value={`${cases.length} ECG cases in longitudinal record`} />
          <Info label="Diagnosis Distribution" value={`${abnormalCases} abnormal, ${criticalCases} critical`} />
          <Info label="Monthly ECG Activity" value={`Last ECG: ${cases[0] ? formatDate(cases[0].uploadDate) : "None"}`} />
          <Info label="Pending Reviews" value={String(pendingReviews)} />
          <Info label="Last Report" value={reports[0] ? formatDate(reports[0].reportingDate) : "None"} />
        </Card>
      </View>
  );
}

function EcgCasesTab({ cases, onGenerateReport, onNew, onOpen, onReview }: {
  cases: Array<{ aiDiagnosis?: string; aiSeverity?: string; caseId: string; caseNumber?: string; finalDiagnosis?: string; heartRate?: number; id: string; priority: string; rhythm?: string; severity?: string; status: string; uploadDate: string }>;
  onGenerateReport: (caseId: string) => void;
  onNew: () => void;
  onOpen: (caseId: string) => void;
  onReview: (caseId: string) => void;
}) {
  return (
    <Card style={styles.panelFull}>
      <SectionHeader title="ECG Cases" subtitle="All ECG cases linked to this patient." action={<PrimaryButton label="+ New ECG Case" onPress={onNew} />} />
      {cases.length ? cases.map((item) => (
        <View key={item.id} style={styles.tableRow}>
          <Info label="Case ID" value={item.caseNumber ?? item.caseId} />
          <Info label="Date" value={formatDate(item.uploadDate)} />
          <Info label="AI Diagnosis" value={item.aiDiagnosis ?? item.finalDiagnosis ?? "Pending"} />
          <Info label="Measurements" value={`HR ${item.heartRate ?? "N/A"} • ${item.rhythm ?? "Rhythm pending"}`} />
          <Badge label={item.severity ?? item.aiSeverity ?? item.priority} tone={item.priority === "critical" || item.aiSeverity === "critical" || item.severity === "critical" ? "critical" : item.severity === "normal" ? "success" : "primary"} />
          <Info label="Doctor Status" value={item.status} />
          <View style={styles.actions}>
            <PrimaryButton label="Open" onPress={() => onOpen(item.id)} variant="outline" />
            <PrimaryButton label="Review" onPress={() => onReview(item.id)} variant="outline" />
            <PrimaryButton label="Generate Report" onPress={() => onGenerateReport(item.id)} variant="outline" />
          </View>
        </View>
      )) : <EmptyState title="No ECG cases" message="Create a new ECG case to begin AI analysis." action={<PrimaryButton label="+ New ECG Case" onPress={onNew} />} />}
    </Card>
  );
}

function TimelineTab({ cases, timeline }: {
  cases: Array<{ aiDiagnosis?: string; caseId: string; caseNumber?: string; finalDiagnosis?: string; id: string; severity?: string; uploadDate: string }>;
  timeline: Array<{ createdAt: string; id: string; notes?: string; title: string; type: string }>;
}) {
  return (
    <Card style={styles.panelFull}>
      <SectionHeader title="Clinical Timeline" subtitle="Newest clinical events first." />
      <View style={styles.ecgTimeline}>
        <Text style={styles.infoValue}>ECG Timeline</Text>
        {cases.length ? cases.slice().reverse().map((item) => (
          <View key={item.id} style={styles.ecgTimelineItem}>
            <Text style={styles.timelineYear}>{new Date(item.uploadDate).getFullYear()}</Text>
            <View style={[styles.timelineDot, item.severity === "critical" && styles.timelineDotCritical]} />
            <Text style={styles.infoLabel}>{item.caseNumber ?? item.caseId}</Text>
            <Text style={styles.infoValue}>{item.aiDiagnosis ?? item.finalDiagnosis ?? "Pending interpretation"}</Text>
          </View>
        )) : <Text style={styles.muted}>No ECG trend history yet.</Text>}
      </View>
      {timeline.length ? timeline.map((item) => (
        <View key={item.id} style={styles.timelineCard}>
          <View style={styles.timelineDot} />
          <View style={styles.heroText}>
            <Text style={styles.infoValue}>{item.title}</Text>
            <Text style={styles.muted}>{formatDate(item.createdAt)} • {new Date(item.createdAt).toLocaleTimeString()} • {item.type.replace(/_/g, " ")}</Text>
            <Text style={styles.infoLabel}>{item.notes ?? "Clinical event persisted in patient timeline."}</Text>
          </View>
          <PrimaryButton label="Open Item" onPress={() => {}} variant="outline" />
        </View>
      )) : <EmptyState title="No timeline events" message="ECG uploads, AI analysis, reports, procedures, and document events will appear here." />}
    </Card>
  );
}

function DocumentsTab({
  category,
  documents,
  message,
  onCategoryChange,
  onDelete,
  onUpload,
}: {
  category: string;
  documents: Array<{ category: string; createdAt: string; downloadUrl: string; id: string; mimeType: string; originalName: string; title: string; uploadedById: string }>;
  message: string;
  onCategoryChange: (category: string) => void;
  onDelete: (documentId: string) => void;
  onUpload: () => void;
}) {
  return (
    <Card style={styles.panelFull}>
      <SectionHeader title="Document Center" subtitle="Upload, preview, download, and delete patient documents." />
      <View style={styles.actions}>
        {["ecg", "echocardiography", "stress_ecg", "cath_reports", "angiography", "laboratory_results", "discharge_summary", "prescription", "other"].map((item) => (
          <PrimaryButton key={item} label={item.replace(/_/g, " ")} onPress={() => onCategoryChange(item)} variant={category === item ? "primary" : "outline"} />
        ))}
      </View>
      <PrimaryButton label="Upload Document" onPress={onUpload} />
      {message ? <Text style={styles.success}>{message}</Text> : null}
      {documents.length ? documents.map((item) => (
        <View key={item.id} style={styles.tableRow}>
          <Info label="Document Name" value={item.title || item.originalName} />
          <Info label="Category" value={item.category} />
          <Info label="Uploaded By" value={item.uploadedById} />
          <Info label="Date" value={formatDate(item.createdAt)} />
          <View style={styles.actions}>
            <PrimaryButton label="Preview" onPress={() => openUrl(`${API_URL.replace(/\/api$/, "")}${item.downloadUrl}`)} variant="outline" />
            <PrimaryButton label="Download" onPress={() => openUrl(`${API_URL.replace(/\/api$/, "")}${item.downloadUrl}`)} variant="outline" />
            <PrimaryButton label="Delete" onPress={() => onDelete(item.id)} variant="danger" />
          </View>
        </View>
      )) : <EmptyState title="No documents" message="Upload ECG, Echo, Stress Test, Cath Report, Angiography, Lab Results, Discharge Summary, Prescription, or other documents." />}
    </Card>
  );
}

function MedicalHistoryTab({ onEdit, patient }: { onEdit: () => void; patient: NonNullable<Awaited<ReturnType<typeof getPatient>>["patient"]> }) {
  return (
    <Card style={styles.panelFull}>
      <SectionHeader title="Medical History" action={<PrimaryButton label="Edit" onPress={onEdit} variant="outline" />} />
      <View style={styles.grid}>
        <Info label="Diabetes" value={patient.diabetes ? "Yes" : "No"} />
        <Info label="Hypertension" value={patient.hypertension ? "Yes" : "No"} />
        <Info label="Smoking" value={patient.smokingStatus ?? "unknown"} />
        <Info label="Heart Failure" value={patient.heartFailure ? "Yes" : "No"} />
        <Info label="Arrhythmias" value={patient.arrhythmiaHistory ? "Yes" : "No"} />
        <Info label="Previous MI" value={patient.previousMI ? "Yes" : "No"} />
        <Info label="Previous CABG" value={patient.previousCABG ? "Yes" : "No"} />
        <Info label="Previous PCI" value={patient.previousPCI ? "Yes" : "No"} />
        <Info label="Stents" value={patient.stentsHistory ?? "None recorded"} />
        <Info label="Medications" value={patient.medications ?? "None recorded"} />
        <Info label="Allergies" value={patient.knownAllergies ?? patient.allergies ?? "None recorded"} />
      </View>
    </Card>
  );
}

function AiSummaryTab({ abnormalCases, cases, criticalCases, patient }: {
  abnormalCases: number;
  cases: Array<{ aiDiagnosis?: string; finalDiagnosis?: string; uploadDate: string }>;
  criticalCases: number;
  patient: NonNullable<Awaited<ReturnType<typeof getPatient>>["patient"]>;
}) {
  return (
    <Card style={styles.aiCard}>
      <SectionHeader title="AI Clinical Summary" subtitle="Automatic clinical summary from patient risk factors, ECG cases, AI analyses, and reports." />
      <Info label="Major Diagnoses" value={Array.from(new Set(cases.map((item) => item.aiDiagnosis ?? item.finalDiagnosis).filter(Boolean))).join(", ") || "No AI diagnoses yet"} />
      <Info label="Risk Factors" value={riskFactors(patient)} />
      <Info label="Past Cardiac Procedures" value={[patient.previousMI ? "MI" : null, patient.previousCABG ? "CABG" : null, patient.previousPCI ? "PCI" : null, patient.stentsHistory].filter(Boolean).join(", ") || "None recorded"} />
      <Info label="Clinical Trends" value={`${cases.length} ECG cases, ${abnormalCases} abnormal findings, ${criticalCases} critical findings.`} />
      <Info label="Recommended Follow-up" value={clinicalRecommendations(patient, criticalCases, abnormalCases)} />
    </Card>
  );
}

function ReportsTab({ reports, token }: { reports: Array<{ id: string; reportNumber: string; reportingDate: string; status: string }>; token?: string }) {
  return (
    <Card style={styles.panelFull}>
      <SectionHeader title="Report Center" />
      {reports.length ? reports.map((item) => (
        <View key={item.id} style={styles.tableRow}>
          <Info label="Report ID" value={item.reportNumber} />
          <Info label="Type" value="ECG Clinical Report" />
          <Info label="Created Date" value={formatDate(item.reportingDate)} />
          <Badge label={item.status} tone={item.status === "signed" ? "success" : "primary"} />
          <View style={styles.actions}>
            <PrimaryButton label="View" onPress={() => void openReportPdf(token, item.id)} variant="outline" />
            <PrimaryButton label="Print" onPress={() => void openReportPdf(token, item.id, "print")} variant="outline" />
            <PrimaryButton label="Download PDF" onPress={() => void openReportPdf(token, item.id)} variant="outline" />
          </View>
        </View>
      )) : <EmptyState title="No reports" message="Generate a report from an ECG case to populate the report center." />}
    </Card>
  );
}

function openUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined") window.open(url, "_blank");
}

async function openReportPdf(token: string | undefined, reportId: string, watermark?: string) {
  if (!token || Platform.OS !== "web" || typeof window === "undefined") return;
  const blob = await downloadReportPdf(token, reportId, watermark);
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function uploadDocument(patientId: string, category: string, mutate: (formData: FormData) => void) {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".pdf,.png,.jpg,.jpeg,.dcm,.dicom,application/pdf,image/png,image/jpeg,application/dicom";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("patientId", patientId);
    formData.append("category", category);
    formData.append("title", file.name);
    formData.append("file", file);
    mutate(formData);
  };
  input.click();
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
  aiCard: { backgroundColor: "#081F33", borderColor: "#1F7085", gap: 12 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  ecgTimeline: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 16, borderWidth: 1, gap: 10, padding: 12 },
  ecgTimelineItem: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  heroText: { flex: 1, minWidth: 240 },
  info: { borderBottomColor: medicalTheme.border, borderBottomWidth: 1, gap: 3, paddingVertical: 9 },
  infoLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  infoValue: { color: medicalTheme.text, fontSize: 14, fontWeight: "800" },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  panel: { flex: 1, gap: 8, minWidth: 300 },
  panelFull: { gap: 12 },
  profileHero: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 16 },
  success: { color: medicalTheme.success, fontSize: 14, fontWeight: "900" },
  statCard: { flex: 1, minWidth: 160 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  statValue: { fontSize: 22, fontWeight: "900" },
  tableRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tabsCard: { padding: 12 },
  timelineCard: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, padding: 14 },
  timelineDot: { backgroundColor: medicalTheme.primary, borderRadius: 99, height: 12, width: 12 },
  timelineDotCritical: { backgroundColor: medicalTheme.critical },
  timelineYear: { color: medicalTheme.primary, fontSize: 14, fontWeight: "900", minWidth: 48 },
  title: { color: medicalTheme.text, fontSize: 30, fontWeight: "900" },
  toast: { backgroundColor: "#073A34", borderColor: medicalTheme.success },
});
