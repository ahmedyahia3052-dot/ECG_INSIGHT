import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { formatDate, medicalTheme } from "@/components/enterprise/EnterpriseUI";

export const EcgPatientWorkspacePanel = memo(function EcgPatientWorkspacePanel({
  caseNumber,
  clinicalNotes,
  department,
  hospital,
  patient,
  previousEcgCount,
  previousDiagnosis,
  referringPhysician,
  riskLevel,
  studyDate,
  visitId,
}: {
  caseNumber?: string;
  clinicalNotes?: string;
  department?: string;
  hospital?: string;
  patient?: { age?: number; gender?: string; id: string; name: string };
  previousDiagnosis?: string;
  previousEcgCount?: number;
  referringPhysician?: string;
  riskLevel?: string;
  studyDate?: string;
  visitId?: string;
}) {
  if (!patient) return null;
  return (
    <View style={styles.root} testID="sprint30-patient-workspace">
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{patient.name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <Text style={styles.name}>{patient.name}</Text>
      <Text style={styles.meta}>
        {patient.gender ?? "N/A"} · Age {patient.age ?? "N/A"}
      </Text>
      <View style={styles.grid}>
        <Field label="MRN" value={patient.id.slice(0, 14)} />
        <Field label="Visit ID" value={visitId ?? caseNumber ?? "Pending"} />
        <Field label="Organization" value={hospital ?? "Not specified"} />
        <Field label="Department" value={department ?? "Cardiology"} />
        <Field label="Referring Physician" value={referringPhysician ?? "Not assigned"} />
        <Field label="Previous ECGs" value={previousEcgCount != null ? `${previousEcgCount}` : "0"} />
        <Field label="Previous Diagnosis" value={previousDiagnosis ?? "None recorded"} />
        <Field label="Risk Level" value={riskLevel ?? "Pending"} />
        {studyDate ? <Field label="Study Date" value={formatDate(studyDate)} /> : null}
      </View>
      {clinicalNotes ? (
        <View style={styles.notes}>
          <Text style={styles.notesLabel}>Pinned Notes</Text>
          <Text style={styles.notesBody}>{clinicalNotes}</Text>
        </View>
      ) : null}
    </View>
  );
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.fieldValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: "rgba(56,189,248,0.15)",
    borderRadius: 28,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  avatarText: { color: "#38BDF8", fontSize: 16, fontWeight: "900" },
  field: { flexBasis: "48%", gap: 2, minWidth: 120 },
  fieldLabel: { color: medicalTheme.muted, fontSize: 9, fontWeight: "800" },
  fieldValue: { color: medicalTheme.text, fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  meta: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700" },
  name: { color: medicalTheme.text, fontSize: 16, fontWeight: "900" },
  notes: {
    backgroundColor: "rgba(250,204,21,0.08)",
    borderColor: "rgba(250,204,21,0.25)",
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 8,
  },
  notesBody: { color: medicalTheme.text, fontSize: 11, lineHeight: 16 },
  notesLabel: { color: "#FACC15", fontSize: 9, fontWeight: "900" },
  root: { gap: 8 },
});
