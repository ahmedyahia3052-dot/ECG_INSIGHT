import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { analyzeCase, type AIAnalysisResult } from "@/services/ai";
import { createCase, createPatient } from "@/services/clinical";
import { uploadClinicalEcgFile } from "@/services/ecgFiles";
import {
  processEcgImage,
  type AcquisitionMethod,
  type EcgAcquisitionAsset,
  type ProcessedEcgImage,
} from "@/services/ecgImageProcessor";
import {
  BoltBadge,
  BoltButton,
  BoltCard,
  BoltEcgLine,
  BoltField,
  BoltHero,
  BoltScreen,
} from "@/components/bolt/BoltUI";

export default function UploadScreen() {
  const colors = useColors();
  const router = useRouter();
  const { authToken } = useAuth();
  const [patientName, setPatientName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("1970-01-01");
  const [gender, setGender] = useState<"male" | "female" | "other" | "unknown">("unknown");
  const [mrn, setMrn] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [selectedFile, setSelectedFile] = useState<EcgAcquisitionAsset | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedEcgImage | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!authToken?.token) throw new Error("You must be signed in.");
      if (!selectedFile) throw new Error("Select or capture an ECG image first.");
      const [firstName, ...rest] = patientName.trim().split(/\s+/);
      const patient = await createPatient(authToken.token, {
        dateOfBirth,
        firstName: firstName || "ECG",
        gender,
        lastName: rest.join(" ") || "Patient",
        medicalRecordNumber: mrn.trim() || `MRN-${Date.now()}`,
      });
      const ecgCase = await createCase(authToken.token, {
        ecgType: "12-Lead ECG",
        patientId: patient.patient.id,
        priority,
      });
      const formData = new FormData();
      formData.append("patientId", patient.patient.id);
      formData.append("caseId", ecgCase.case.id);
      formData.append(
        "file",
        selectedFile.file ?? ({
          name: selectedFile.name,
          type: selectedFile.mimeType,
          uri: selectedFile.uri,
        } as unknown as Blob),
      );
      await uploadClinicalEcgFile(authToken.token, formData);
      const analysis = await analyzeCase(authToken.token, ecgCase.case.id);
      return { analysis: analysis.analysis, caseId: ecgCase.case.id };
    },
    onError: (loadError) => setError(loadError instanceof Error ? loadError.message : "Upload failed."),
    onSuccess: (payload) => {
      setAnalysisResult(payload.analysis);
      setCaseId(payload.caseId);
      setError("");
    },
    retry: false,
  });

  async function pickAsset(method: AcquisitionMethod) {
    setError("");
    const result =
      method === "upload"
        ? await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.86,
          })
        : await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            cameraType: ImagePicker.CameraType.back,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: method === "scanner" ? 0.92 : 0.86,
          });
    if (result.canceled) return;
    const asset = result.assets[0];
    const ecgAsset: EcgAcquisitionAsset = {
      file: "file" in asset ? (asset.file as Blob | undefined) : undefined,
      mimeType: asset.mimeType ?? "image/jpeg",
      name: asset.fileName ?? `ecg-${Date.now()}.jpg`,
      size: asset.fileSize,
      uri: asset.uri,
    };
    try {
      const processed = await processEcgImage(ecgAsset, { scannerMode: method === "scanner" });
      setProcessedImage(processed);
      setSelectedFile(processed.selectedVariant === "enhanced" ? processed.enhanced : processed.original);
    } catch (processingError) {
      setSelectedFile(ecgAsset);
      setProcessedImage(null);
      setError(processingError instanceof Error ? processingError.message : "Image preprocessing failed.");
    }
  }

  async function capture(method: AcquisitionMethod) {
    if (method !== "upload") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera permission is required for ECG capture and smart paper scanning.");
        return;
      }
    }
    await pickAsset(method);
  }

  const canAnalyze = !!selectedFile && !!patientName.trim() && !mutation.isPending;

  return (
    <BoltScreen>
      <BoltHero
        eyebrow="Upload, camera, or smart paper scan"
        subtitle="Bolt-style acquisition connected to the existing ECG image processor, clinical case API, file upload endpoint, and AI analysis engine."
        title="Upload ECG"
      />

      <BoltCard style={styles.form}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>ECG Image</Text>
        <View style={styles.actionRow}>
          <View style={styles.actionButton}>
            <BoltButton icon="folder" label="Upload ECG" onPress={() => capture("upload")} variant="outline" />
          </View>
          <View style={styles.actionButton}>
            <BoltButton icon="camera" label="Capture ECG" onPress={() => capture("camera")} variant="outline" />
          </View>
          <View style={styles.actionButton}>
            <BoltButton icon="crop" label="Scan ECG Paper" onPress={() => capture("scanner")} variant="outline" />
          </View>
        </View>
        {selectedFile ? (
          <View style={styles.preview}>
            <Image source={{ uri: selectedFile.uri }} resizeMode="contain" style={styles.image} />
            <View style={styles.previewMeta}>
              <BoltBadge icon="check-circle" label={selectedFile.name} tone="success" />
              {processedImage ? (
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                  Quality {processedImage.quality.score}/100 · {processedImage.quality.classification}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.dropzone}>
            <Feather name="upload-cloud" size={34} color={colors.primary} />
            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              Select an ECG image to preview, enhance, upload, and analyze.
            </Text>
          </View>
        )}
      </BoltCard>

      <BoltCard style={styles.form}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Patient Information</Text>
        <BoltField icon="user" onChangeText={setPatientName} placeholder="Patient full name" value={patientName} />
        <BoltField icon="calendar" onChangeText={setDateOfBirth} placeholder="Date of birth YYYY-MM-DD" value={dateOfBirth} />
        <View style={styles.actionRow}>
          {(["male", "female", "other", "unknown"] as const).map((item) => (
            <View key={item} style={styles.optionButton}>
              <BoltButton label={item} onPress={() => setGender(item)} variant={gender === item ? "primary" : "outline"} />
            </View>
          ))}
        </View>
        <BoltField icon="hash" onChangeText={setMrn} placeholder="Medical record number" value={mrn} />
        <BoltField icon="file-text" multiline onChangeText={setClinicalNotes} placeholder="Clinical notes, symptoms, medications..." value={clinicalNotes} />
      </BoltCard>

      <BoltCard style={styles.form}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Priority</Text>
        <View style={styles.actionRow}>
          {(["low", "medium", "high", "critical"] as const).map((item) => (
            <View key={item} style={styles.optionButton}>
              <BoltButton label={item} onPress={() => setPriority(item)} variant={priority === item ? "primary" : "outline"} />
            </View>
          ))}
        </View>
      </BoltCard>

      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}

      <BoltButton
        disabled={!canAnalyze}
        icon="activity"
        label={mutation.isPending ? "Analyzing ECG..." : "Upload and Analyze"}
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      />

      {analysisResult && caseId ? (
        <BoltCard highlight style={styles.resultCard}>
          <BoltEcgLine height={44} opacity={0.2} />
          <BoltBadge icon="check-circle" label="Analysis complete" tone="success" />
          <Text style={[styles.resultTitle, { color: colors.text }]}>{analysisResult.diagnosis}</Text>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            Confidence {analysisResult.confidenceScore}% · {analysisResult.severity.toUpperCase()}
          </Text>
          <BoltButton icon="arrow-right" label="Open Analysis Results" onPress={() => router.push(`/case/${caseId}` as never)} />
        </BoltCard>
      ) : null}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  actionButton: { flex: 1, minWidth: 142 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dropzone: { alignItems: "center", gap: 10, padding: 28 },
  error: { fontFamily: "Inter_700Bold", fontSize: 13 },
  form: { gap: 12 },
  image: { height: 230, width: "100%" },
  muted: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  optionButton: { minWidth: 92 },
  preview: { borderRadius: 16, overflow: "hidden" },
  previewMeta: { gap: 8, paddingTop: 10 },
  resultCard: { gap: 10 },
  resultTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
