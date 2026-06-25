import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Badge, Card, EmptyState, Field, medicalTheme, PageSection, patientDisplayName, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { createCase, listPatients, type ApiPatient } from "@/services/clinical";

type Severity = "abnormal" | "critical" | "normal";

const ecgTypes = ["Resting ECG", "Stress ECG", "Holter ECG"];
const severities: Severity[] = ["normal", "abnormal", "critical"];

export default function NewEcgCaseScreen() {
  const router = useRouter();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [patientQueryText, setPatientQueryText] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<ApiPatient | null>(null);
  const [ecgType, setEcgType] = useState("Resting ECG");
  const [acquisitionDate, setAcquisitionDate] = useState(new Date().toISOString().slice(0, 10));
  const [heartRate, setHeartRate] = useState("");
  const [prInterval, setPrInterval] = useState("");
  const [qrsDuration, setQrsDuration] = useState("");
  const [qtInterval, setQtInterval] = useState("");
  const [qtcInterval, setQtcInterval] = useState("");
  const [rhythm, setRhythm] = useState("Normal Sinus Rhythm");
  const [severity, setSeverity] = useState<Severity>("normal");
  const [error, setError] = useState("");

  const patientsQuery = useQuery({
    enabled: !!token,
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "20" });
      if (patientQueryText.trim()) params.set("q", patientQueryText.trim());
      return listPatients(token!, params);
    },
    queryKey: ["ecg-case-patient-picker", token, patientQueryText],
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Authentication required.");
      if (!selectedPatient) throw new Error("Select a patient before creating the ECG case.");
      return createCase(token, {
        acquisitionDate,
        ecgType,
        heartRate: toNumber(heartRate),
        patientId: selectedPatient.id,
        prInterval: toNumber(prInterval),
        priority: severity === "critical" ? "critical" : severity === "abnormal" ? "high" : "medium",
        qrsDuration: toNumber(qrsDuration),
        qtInterval: toNumber(qtInterval),
        qtcInterval: toNumber(qtcInterval),
        rhythm,
        severity,
      });
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Unable to create ECG case."),
    onSuccess: (payload) => router.replace(`/ecg-cases/${payload.case.id}` as never),
  });

  const patients = patientsQuery.data?.patients ?? [];

  return (
    <PageSection>
      <Card style={styles.form}>
        <SectionHeader title="New ECG Case" subtitle="Create the clinical case shell, then upload ECG files, run AI, review, and generate the final report." />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.grid}>
          <Field label="Search Patient" onChangeText={setPatientQueryText} placeholder="Patient name, MRN, employee ID..." value={patientQueryText} />
          <Field label="Acquisition Date" onChangeText={setAcquisitionDate} value={acquisitionDate} />
          <Field label="Heart Rate" onChangeText={setHeartRate} value={heartRate} />
          <Field label="PR Interval" onChangeText={setPrInterval} value={prInterval} />
          <Field label="QRS Duration" onChangeText={setQrsDuration} value={qrsDuration} />
          <Field label="QT Interval" onChangeText={setQtInterval} value={qtInterval} />
          <Field label="QTc Interval" onChangeText={setQtcInterval} value={qtcInterval} />
          <Field label="Rhythm" onChangeText={setRhythm} value={rhythm} />
        </View>
        <View style={styles.actions}>
          {ecgTypes.map((item) => <PrimaryButton key={item} label={item} onPress={() => setEcgType(item)} variant={ecgType === item ? "primary" : "outline"} />)}
        </View>
        <View style={styles.actions}>
          {severities.map((item) => <PrimaryButton key={item} label={item} onPress={() => setSeverity(item)} variant={severity === item ? "primary" : "outline"} />)}
        </View>
      </Card>

      <Card style={styles.form}>
        <SectionHeader title="Select Patient" subtitle="Each patient can have unlimited ECG cases." />
        {patientsQuery.isLoading ? <Text style={styles.muted}>Loading patients...</Text> : null}
        {!patientsQuery.isLoading && !patients.length ? <EmptyState title="No patients found" message="Adjust the search or create a patient first." /> : null}
        {patients.map((patient) => (
          <View key={patient.id} style={styles.patientRow}>
            <View style={styles.patientMain}>
              <Text style={styles.rowTitle}>{patientDisplayName(patient)}</Text>
              <Text style={styles.muted}>{patient.patientCode ?? patient.medicalRecordNumber} • {patient.employeeId ?? "No employee ID"} • {patient.company ?? "No company"}</Text>
            </View>
            {selectedPatient?.id === patient.id ? <Badge label="Selected" tone="success" /> : null}
            <PrimaryButton label="Select" onPress={() => setSelectedPatient(patient)} variant={selectedPatient?.id === patient.id ? "primary" : "outline"} />
          </View>
        ))}
        <View style={styles.actionsEnd}>
          <PrimaryButton label="Cancel" onPress={() => router.back()} variant="outline" />
          <PrimaryButton disabled={mutation.isPending} label={mutation.isPending ? "Creating..." : "Create ECG Case"} onPress={() => mutation.mutate()} />
        </View>
      </Card>
    </PageSection>
  );
}

function toNumber(value: string) {
  return value.trim() ? Number(value) || undefined : undefined;
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionsEnd: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" },
  error: { color: medicalTheme.critical, fontSize: 13, fontWeight: "800" },
  form: { gap: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  muted: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700" },
  patientMain: { flex: 1, minWidth: 240 },
  patientRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 12, paddingVertical: 12 },
  rowTitle: { color: medicalTheme.text, fontSize: 15, fontWeight: "900" },
});
