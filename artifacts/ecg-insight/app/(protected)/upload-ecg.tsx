import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Badge, Card, Field, medicalTheme, PageSection, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";
import { useAuth } from "@/context/AuthContext";
import { analyzeCase, getAIResult, type AIAnalysisResult } from "@/services/ai";
import { createCase, createPatient } from "@/services/clinical";
import { uploadClinicalEcgFile } from "@/services/ecgFiles";
import { generateReport, type ClinicalReport } from "@/services/reports";

type SelectedAsset = {
  file?: Blob;
  mimeType: string;
  name: string;
  source: "camera_capture" | "drag_and_drop" | "upload";
  uri: string;
};

type WorkflowStage = "idle" | "creating_case" | "uploading" | "preprocessing" | "analyzing" | "reporting" | "complete";

const acceptedFormats = ["jpg", "jpeg", "png", "pdf"];
const processingSteps = ["Auto crop", "Border detection", "Deskew", "Perspective correction", "Contrast enhancement", "Shadow removal", "ECG grid cleanup"];

export default function UploadEcgScreen() {
  const router = useRouter();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [patientName, setPatientName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("1970-01-01");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [mrn, setMrn] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [assets, setAssets] = useState<SelectedAsset[]>([]);
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const [caseId, setCaseId] = useState("");
  const [error, setError] = useState("");
  const [report, setReport] = useState<ClinicalReport | null>(null);
  const [stage, setStage] = useState<WorkflowStage>("idle");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("Authentication required.");
      if (!assets.length) throw new Error("Select, drop, or capture at least one ECG image/PDF first.");
      if (!patientName.trim()) throw new Error("Patient name is required.");
      setStage("creating_case");
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
      setStage("uploading");
      for (const item of assets) {
        const formData = new FormData();
        formData.append("patientId", patient.patient.id);
        formData.append("caseId", ecgCase.case.id);
        formData.append("source", item.source);
        formData.append(
          "file",
          item.file ?? ({
            name: item.name,
            type: item.mimeType,
            uri: item.uri,
          } as unknown as Blob),
        );
        await uploadClinicalEcgFile(token, formData);
      }
      setStage("preprocessing");
      await wait(300);
      setStage("analyzing");
      await analyzeCase(token, ecgCase.case.id);
      const completed = await waitForAnalysis(token, ecgCase.case.id);
      setStage("reporting");
      const generated = await generateReport(token, ecgCase.case.id);
      setStage("complete");
      return { analysis: completed, caseId: ecgCase.case.id, report: generated.report };
    },
    onError: (uploadError) => setError(uploadError instanceof Error ? uploadError.message : "Upload failed."),
    onSuccess: (payload) => {
      setError("");
      setAnalysis(payload.analysis);
      setCaseId(payload.caseId);
      setReport(payload.report);
    },
  });

  const pick = async (source: "camera" | "library") => {
    setError("");
    const result = source === "camera"
      ? await ImagePicker.launchCameraAsync({ allowsEditing: false, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: false, allowsMultipleSelection: true, mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.9 });
    if (result.canceled) return;
    setAssets((current) => [
      ...current,
      ...result.assets.map((selected, index) => ({
        file: "file" in selected ? selected.file as Blob | undefined : undefined,
        mimeType: selected.mimeType ?? "image/jpeg",
        name: selected.fileName ?? `ecg-${Date.now()}-${index}.jpg`,
        source: source === "camera" ? "camera_capture" as const : "upload" as const,
        uri: selected.uri,
      })),
    ]);
  };

  const pickWebFiles = () => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      void pick("library");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      setAssets((current) => [
        ...current,
        ...files.map((file) => ({
          file,
          mimeType: file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg"),
          name: file.name,
          source: "drag_and_drop" as const,
          uri: URL.createObjectURL(file),
        })),
      ]);
    };
    input.click();
  };

  const removeAsset = (name: string) => {
    setAssets((current) => current.filter((item) => item.name !== name));
  };

  return (
    <PageSection>
      <Card style={styles.workflow}>
        <SectionHeader title="Upload ECG" subtitle="Capture or upload, preview, analyze, validate, save, and generate reports through existing APIs." />
        <View style={styles.actions}>
          <PrimaryButton icon="folder" label="Select Images/PDF" onPress={pickWebFiles} />
          <PrimaryButton icon="camera" label="Capture ECG" onPress={() => void pick("camera")} variant="outline" />
        </View>
        <View style={styles.formatRow}>
          {acceptedFormats.map((format) => <Badge key={format} label={format.toUpperCase()} tone="primary" />)}
        </View>
        <Pressable onPress={pickWebFiles} style={styles.dropzone}>
          {assets.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.previewStrip}>
              {assets.map((item) => (
                <View key={item.name} style={styles.assetCard}>
                  {item.mimeType.includes("pdf") || item.name.toLowerCase().endsWith(".pdf") ? (
                    <View style={styles.pdfPreview}><Text style={styles.pdfText}>PDF</Text></View>
                  ) : (
                    <Image source={{ uri: item.uri }} resizeMode="cover" style={styles.previewThumb} />
                  )}
                  <Text numberOfLines={1} style={styles.assetName}>{item.name}</Text>
                  <Text style={styles.muted}>{item.source.replace(/_/g, " ")}</Text>
                  <PrimaryButton label="Remove" onPress={() => removeAsset(item.name)} variant="outline" />
                </View>
              ))}
            </ScrollView>
          ) : (
            <>
              <Text style={styles.dropTitle}>Smart ECG Upload</Text>
              <Text style={styles.muted}>{Platform.OS === "web" ? "Click to select or drag/drop ECG images and PDFs." : "Tap to select images or use camera capture."}</Text>
            </>
          )}
        </Pressable>
        <View style={styles.progressGrid}>
          {processingSteps.map((step, index) => (
            <View key={step} style={[styles.progressStep, stage !== "idle" && index <= progressIndex(stage) && styles.progressStepActive]}>
              <Text style={styles.progressText}>{step}</Text>
            </View>
          ))}
        </View>
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
        <PrimaryButton disabled={mutation.isPending} icon="activity" label={mutation.isPending ? stageLabel(stage) : "Analyze ECG"} onPress={() => mutation.mutate()} />
      </Card>

      {analysis ? (
        <Card style={styles.form}>
          <SectionHeader title="AI Results" action={<PrimaryButton label="Open Analysis" onPress={() => router.push("/ecg-analysis" as never)} variant="outline" />} />
          <View style={styles.resultRow}>
            <Badge label={severityBand(analysis.severity)} tone={analysis.severity === "critical" || analysis.severity === "severe" ? "critical" : "success"} />
            <Text style={styles.resultTitle}>{analysis.diagnosis}</Text>
            <Text style={styles.muted}>Case {caseId} • HR {analysis.heartRate} • Confidence {confidencePercent(analysis.confidenceScore)}%</Text>
          </View>
          <Text style={styles.body}>{analysis.interpretation}</Text>
          {report ? <Text style={styles.muted}>Enterprise report generated: {report.reportNumber}</Text> : null}
        </Card>
      ) : null}
    </PageSection>
  );
}

function confidencePercent(value: number) {
  return Math.round(value <= 1 ? value * 100 : value);
}

function progressIndex(stage: WorkflowStage) {
  if (stage === "uploading") return 0;
  if (stage === "preprocessing") return 6;
  if (stage === "analyzing" || stage === "reporting" || stage === "complete") return 6;
  return -1;
}

function severityBand(severity: AIAnalysisResult["severity"]) {
  if (severity === "critical") return "CRITICAL";
  if (severity === "severe") return "HIGH";
  if (severity === "moderate") return "MODERATE";
  return "LOW";
}

function stageLabel(stage: WorkflowStage) {
  if (stage === "creating_case") return "Creating case...";
  if (stage === "uploading") return "Uploading files...";
  if (stage === "preprocessing") return "Preprocessing ECG...";
  if (stage === "analyzing") return "Analyzing ECG...";
  if (stage === "reporting") return "Generating report...";
  return "Processing...";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAnalysis(token: string, id: string) {
  for (let attempt = 0; attempt < 8; attempt++) {
    await wait(250);
    const result = await getAIResult(token, id);
    if (result.analysis?.status === "completed") return result.analysis;
  }
  const latest = await getAIResult(token, id);
  if (latest.analysis) return latest.analysis;
  throw new Error("AI analysis did not return a result.");
}

function normalizeGender(value: string): "female" | "male" | "other" | "unknown" {
  const normalized = value.toLowerCase();
  if (normalized === "male" || normalized === "female" || normalized === "other") return normalized;
  return "unknown";
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  assetCard: { backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, gap: 8, padding: 10, width: 190 },
  assetName: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  body: { color: medicalTheme.text, fontSize: 14, lineHeight: 21 },
  dropTitle: { color: medicalTheme.text, fontSize: 18, fontWeight: "900" },
  dropzone: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 18, borderStyle: "dashed", borderWidth: 1, gap: 10, justifyContent: "center", minHeight: 260, overflow: "hidden", padding: 18 },
  error: { color: medicalTheme.critical, fontSize: 13, fontWeight: "800" },
  form: { gap: 14 },
  formatRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  muted: { color: medicalTheme.muted, fontSize: 13, fontWeight: "700" },
  pdfPreview: { alignItems: "center", backgroundColor: "#3F1421", borderRadius: 12, height: 120, justifyContent: "center" },
  pdfText: { color: medicalTheme.critical, fontSize: 24, fontWeight: "900" },
  previewStrip: { gap: 12 },
  previewThumb: { borderRadius: 12, height: 120, width: "100%" },
  progressGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  progressStep: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 7 },
  progressStepActive: { backgroundColor: "#073A34", borderColor: medicalTheme.primary },
  progressText: { color: medicalTheme.text, fontSize: 11, fontWeight: "800" },
  resultRow: { gap: 8 },
  resultTitle: { color: medicalTheme.text, fontSize: 20, fontWeight: "900" },
  workflow: { gap: 14 },
});
