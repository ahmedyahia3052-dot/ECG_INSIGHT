import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Badge, Card, Field, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { analyzeCase, type AIAnalysisResult } from "@/services/ai";
import { createCase, createPatient } from "@/services/clinical";
import { uploadClinicalEcgFile } from "@/services/ecgFiles";

type SelectedAsset = {
  file?: Blob;
  mimeType: string;
  name: string;
  uri: string;
};

export default function UploadEcgScreen() {
  const router = useRouter();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [patientName, setPatientName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("1970-01-01");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [mrn, setMrn] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [asset, setAsset] = useState<SelectedAsset | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [caseId, setCaseId] = useState("");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Authentication required.");
      if (!asset) throw new Error("Select or capture an ECG image first.");
      if (!patientName.trim()) throw new Error("Patient name is required.");
      const [firstName, ...rest] = patientName.trim().split(/\s+/);
      const patient = await createPatient(token, {
        dateOfBirth,
        firstName: firstName || "ECG",
        gender,
        lastName: rest.join(" ") || "Patient",
        medicalRecordNumber: mrn.trim() || `MRN-${Date.now()}`,
      });
      const ecgCase = await createCase(token, {
        ecgType: "12-Lead ECG",
        patientId: patient.patient.id,
        priority,
      });
      const formData = new FormData();
      formData.append("patientId", patient.patient.id);
      formData.append("caseId", ecgCase.case.id);
      formData.append(
        "file",
        asset.file ?? ({
          name: asset.name,
          type: asset.mimeType,
          uri: asset.uri,
        } as unknown as Blob),
      );
      await uploadClinicalEcgFile(token, formData);
      const result = await analyzeCase(token, ecgCase.case.id);
      return { analysis: result.analysis, caseId: ecgCase.case.id };
    },
    onError: (uploadError) => setError(uploadError instanceof Error ? uploadError.message : "Upload failed."),
    onSuccess: (payload) => {
      setError("");
      setAnalysis(payload.analysis);
      setCaseId(payload.caseId);
    },
  });

  const pick = async (source: "camera" | "library") => {
    setError("");
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (result.canceled) return;
    const selected = result.assets[0];
    setAsset({
      file: "file" in selected ? selected.file as Blob | undefined : undefined,
      mimeType: selected.mimeType ?? "image/jpeg",
      name: selected.fileName ?? `ecg-${Date.now()}.jpg`,
      uri: selected.uri,
    });
  };

  return (
    <PageSection>
      <Card style={styles.workflow}>
        <SectionHeader title="Upload ECG" subtitle="Capture or upload, preview, analyze, validate, save, and generate reports through existing APIs." />
        <View style={styles.actions}>
          <PrimaryButton icon="folder" label="Select ECG Image" onPress={() => void pick("library")} />
          <PrimaryButton icon="camera" label="Capture ECG" onPress={() => void pick("camera")} variant="outline" />
        </View>
        <Pressable onPress={() => void pick("library")} style={styles.dropzone}>
          {asset ? <Image source={{ uri: asset.uri }} resizeMode="contain" style={styles.preview} /> : (
            <>
              <Text style={styles.dropTitle}>ECG Preview</Text>
              <Text style={styles.muted}>{Platform.OS === "web" ? "Click to select an ECG image." : "Tap to select or capture an ECG image."}</Text>
            </>
          )}
        </Pressable>
      </Card>

      <Card style={styles.form}>
        <SectionHeader title="Patient & Case Details" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.grid}>
          <Field label="Full Name" onChangeText={setPatientName} value={patientName} />
          <Field label="Employee ID / MRN" onChangeText={setMrn} value={mrn} />
          <Field label="DOB" onChangeText={setDateOfBirth} value={dateOfBirth} />
          <Field label="Gender" onChangeText={(value) => setGender(normalizeGender(value))} value={gender} />
        </View>
        <View style={styles.actions}>
          {(["low", "medium", "high", "critical"] as const).map((value) => (
            <PrimaryButton key={value} label={value} onPress={() => setPriority(value)} variant={priority === value ? "primary" : "outline"} />
          ))}
        </View>
        <PrimaryButton disabled={mutation.isPending} icon="activity" label={mutation.isPending ? "Analyzing..." : "Analyze ECG"} onPress={() => mutation.mutate()} />
      </Card>

      {analysis ? (
        <Card style={styles.form}>
          <SectionHeader title="AI Results" action={<PrimaryButton label="Open Analysis" onPress={() => router.push("/ecg-analysis" as never)} variant="outline" />} />
          <View style={styles.resultRow}>
            <Badge label={analysis.severity} tone={analysis.severity === "critical" || analysis.severity === "severe" ? "critical" : "success"} />
            <Text style={styles.resultTitle}>{analysis.diagnosis}</Text>
            <Text style={styles.muted}>Case {caseId} • HR {analysis.heartRate} • Confidence {Math.round(analysis.confidenceScore)}%</Text>
          </View>
          <Text style={styles.body}>{analysis.interpretation}</Text>
        </Card>
      ) : null}
    </PageSection>
  );
}

function normalizeGender(value: string): "female" | "male" | "other" | "unknown" {
  const normalized = value.toLowerCase();
  if (normalized === "male" || normalized === "female" || normalized === "other") return normalized;
  return "unknown";
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  body: { color: medicalTheme.text, fontSize: 14, lineHeight: 21 },
  dropTitle: { color: medicalTheme.text, fontSize: 18, fontWeight: "900" },
  dropzone: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 18, borderStyle: "dashed", borderWidth: 1, gap: 10, justifyContent: "center", minHeight: 260, overflow: "hidden", padding: 18 },
  error: { color: medicalTheme.critical, fontSize: 13, fontWeight: "800" },
  form: { gap: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  preview: { height: 300, width: "100%" },
  resultRow: { gap: 8 },
  resultTitle: { color: medicalTheme.text, fontSize: 20, fontWeight: "900" },
  workflow: { gap: 14 },
});
