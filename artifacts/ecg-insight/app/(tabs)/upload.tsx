import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { analyzeCase, type AIAnalysisResult } from "@/services/ai";
import { createCase, createPatient } from "@/services/clinical";
import { listClinicalEcgFiles, uploadClinicalEcgFile } from "@/services/ecgFiles";
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
import { type EcgSeverity, useVisualExperience } from "@/context/VisualExperienceContext";
import { useToast } from "@/components/interaction/PremiumInteraction";

function visualSeverity(value: string): EcgSeverity {
  const normalized = value.toLowerCase();
  if (normalized === "critical" || normalized === "severe") return "critical";
  if (normalized === "normal") return "normal";
  return "abnormal";
}

export default function UploadScreen() {
  const colors = useColors();
  const router = useRouter();
  const { authToken } = useAuth();
  const { setSeverity, triggerHaptic } = useVisualExperience();
  const toast = useToast();
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
  const [progress, setProgress] = useState(0);

  const uploadHistoryQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: async () => listClinicalEcgFiles(authToken!.token, new URLSearchParams({ pageSize: "5" })),
    queryKey: ["premium-upload-history", authToken?.token],
    retry: false,
  });

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
    onError: (loadError) => {
      setProgress(0);
      setError(loadError instanceof Error ? loadError.message : "Upload failed.");
      toast.error("ECG upload failed", loadError instanceof Error ? loadError.message : "Upload failed.");
      void triggerHaptic("error");
    },
    onSuccess: (payload) => {
      setAnalysisResult(payload.analysis);
      setCaseId(payload.caseId);
      setProgress(100);
      setError("");
      setSeverity(visualSeverity(payload.analysis.severity));
      toast.success("ECG analysis complete", "The ECG was uploaded and queued for clinical review.");
      void triggerHaptic("upload");
    },
    retry: false,
  });

  useEffect(() => {
    setSeverity(analysisResult ? visualSeverity(analysisResult.severity) : priority === "critical" ? "critical" : priority === "high" ? "abnormal" : "normal");
    return () => setSeverity("normal");
  }, [analysisResult, priority, setSeverity]);

  useEffect(() => {
    if (!mutation.isPending) return;
    setProgress(8);
    const timer = setInterval(() => {
      setProgress((value) => Math.min(value + 13, 88));
    }, 420);
    return () => clearInterval(timer);
  }, [mutation.isPending]);

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
        eyebrow="Premium ECG acquisition"
        subtitle="Drag, preview, quality-check, upload, and analyze ECG records through the existing clinical APIs and AI engine."
        title="Upload ECG"
      />

      <BoltCard style={styles.form}>
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>ECG Image</Text>
          <BoltBadge icon="shield" label="Quality validation" tone={processedImage ? "success" : "primary"} />
        </View>
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
                <View style={styles.qualityGrid}>
                  <QualityPill label="Quality" value={`${processedImage.quality.score}/100`} tone="success" />
                  <QualityPill label="Classification" value={processedImage.quality.classification} tone="primary" />
                  <QualityPill label="Ready" value={processedImage.quality.canAnalyze ? "Analyze" : "Review"} tone={processedImage.quality.canAnalyze ? "success" : "warning"} />
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <Pressable onPress={() => capture("upload")} style={[styles.dropzone, { borderColor: colors.primary + "55" }]}>
            <Feather name="upload-cloud" size={34} color={colors.primary} />
            <Text style={[styles.dropTitle, { color: colors.text }]}>Drag & Drop ECG File</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              {Platform.OS === "web" ? "Drop an ECG image here or tap to browse." : "Tap to select, capture, preview, enhance, upload, and analyze."}
            </Text>
          </Pressable>
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

      {mutation.isPending || progress === 100 ? (
        <BoltCard style={styles.progressCard}>
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {progress === 100 ? "Upload Complete" : "Clinical Processing"}
            </Text>
            <BoltBadge icon={progress === 100 ? "check-circle" : "activity"} label={`${progress}%`} tone={progress === 100 ? "success" : "primary"} />
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${progress}%` }]} />
          </View>
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            {progress === 100 ? "ECG uploaded, analyzed, and ready for clinical review." : "Creating patient record, uploading ECG file, and running AI analysis."}
          </Text>
        </BoltCard>
      ) : null}

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

      <BoltCard style={styles.form}>
        <View style={styles.headerRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Upload History</Text>
          <BoltBadge icon="clock" label={`${uploadHistoryQuery.data?.files.length ?? 0} recent`} />
        </View>
        {(uploadHistoryQuery.data?.files ?? []).length ? (
          uploadHistoryQuery.data!.files.map((file) => (
            <View key={file.id} style={[styles.historyRow, { borderColor: colors.border }]}>
              <Feather name="file" size={16} color={colors.primary} />
              <View style={styles.historyMain}>
                <Text style={[styles.historyName, { color: colors.text }]} numberOfLines={1}>{file.originalName}</Text>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                  {(file.sizeBytes / 1024).toFixed(1)} KB · {new Date(file.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <BoltBadge label={file.fileType} tone="primary" />
            </View>
          ))
        ) : (
          <Text style={[styles.muted, { color: colors.textSecondary }]}>
            No uploaded ECG files yet. Live upload history will appear from the ECG files API.
          </Text>
        )}
      </BoltCard>
    </BoltScreen>
  );
}

function QualityPill({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "primary" | "success" | "warning";
  value: string;
}) {
  const colors = useColors();
  const color = tone === "success" ? colors.success : tone === "warning" ? colors.warning : colors.primary;
  return (
    <View style={[styles.qualityPill, { borderColor: color + "55" }]}>
      <Text style={[styles.qualityLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.qualityValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: { flex: 1, minWidth: 142 },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dropTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  dropzone: { alignItems: "center", borderRadius: 24, borderStyle: "dashed", borderWidth: 1, gap: 10, padding: 34 },
  error: { fontFamily: "Inter_700Bold", fontSize: 13 },
  form: { gap: 12 },
  headerRow: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  historyMain: { flex: 1 },
  historyName: { fontFamily: "Inter_700Bold", fontSize: 13 },
  historyRow: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  image: { height: 230, width: "100%" },
  muted: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  optionButton: { minWidth: 92 },
  preview: { borderRadius: 16, overflow: "hidden" },
  previewMeta: { gap: 8, paddingTop: 10 },
  progressCard: { gap: 12 },
  progressFill: { borderRadius: 999, height: "100%" },
  progressTrack: { borderRadius: 999, height: 10, overflow: "hidden" },
  qualityGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  qualityLabel: { fontFamily: "Inter_600SemiBold", fontSize: 10, textTransform: "uppercase" },
  qualityPill: { borderRadius: 14, borderWidth: 1, gap: 3, paddingHorizontal: 10, paddingVertical: 8 },
  qualityValue: { fontFamily: "Inter_700Bold", fontSize: 12 },
  resultCard: { gap: 10 },
  resultTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
});
