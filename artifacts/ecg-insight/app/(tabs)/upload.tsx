import { Feather } from "@expo/vector-icons";
import { useMutation } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { StatusBadge } from "@/components/ui/Badge";
import { DiagnosisCard } from "@/components/ecg/DiagnosisCard";
import { RecommendationCard } from "@/components/ecg/RecommendationCard";
import { useAuth } from "@/context/AuthContext";
import { createCase, createPatient } from "@/services/clinical";
import { analyzeCase, type AIAnalysisResult } from "@/services/ai";
import { uploadClinicalEcgFile } from "@/services/ecgFiles";
import {
  processEcgImage,
  TARGET_ECG_UPLOAD_BYTES,
  type AcquisitionMethod,
  type EcgAcquisitionAsset,
  type ProcessedEcgImage,
  type PreviewVariant,
} from "@/services/ecgImageProcessor";

type UploadState = "idle" | "processing" | "preview" | "analyzing" | "done";

type SelectedEcgFile = EcgAcquisitionAsset;

export default function UploadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { authToken } = useAuth();

  const [state, setState] = useState<UploadState>("idle");
  const [acquisitionMethod, setAcquisitionMethod] = useState<AcquisitionMethod>("upload");
  const [processedImage, setProcessedImage] = useState<ProcessedEcgImage | null>(null);
  const [selectedFile, setSelectedFile] = useState<SelectedEcgFile | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;
  const analysisMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Select an ECG file before analysis.");
      const patient = await createPatient(authToken!.token, {
        dateOfBirth: "1964-01-01",
        firstName: "ECG",
        gender: "unknown",
        lastName: "Upload",
        medicalRecordNumber: `MRN-${Date.now()}`,
      });
      const ecgCase = await createCase(authToken!.token, {
        ecgType: selectedFile.name.toLowerCase().includes("holter") ? "Holter ECG" : "12-Lead ECG",
        patientId: patient.patient.id,
        priority: "medium",
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
      await uploadClinicalEcgFile(authToken!.token, formData);
      const analysis = await analyzeCase(authToken!.token, ecgCase.case.id);
      return { analysis: analysis.analysis, caseId: ecgCase.case.id };
    },
    onSuccess: (payload) => {
      setCreatedCaseId(payload.caseId);
      setAnalysisResult(payload.analysis);
      setProgress(100);
      setState("done");
    },
    retry: false,
  });

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  };

  const assetFromPicker = (asset: ImagePicker.ImagePickerAsset): EcgAcquisitionAsset => ({
    file: "file" in asset ? (asset.file as Blob | undefined) : undefined,
    mimeType: asset.mimeType ?? "image/jpeg",
    name: asset.fileName ?? `ecg-${Date.now()}.jpg`,
    size: asset.fileSize,
    uri: asset.uri,
  });

  const handleAcquiredAsset = async (asset: EcgAcquisitionAsset, method: AcquisitionMethod) => {
    setWorkflowError(null);
    setAcquisitionMethod(method);
    setState("processing");
    setSelectedFile(asset);
    try {
      const processed = await processEcgImage(asset, { scannerMode: method === "scanner" });
      setProcessedImage(processed);
      setSelectedFile(processed.selectedVariant === "enhanced" ? processed.enhanced : processed.original);
      setState("preview");
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "Image processing failed.");
      setState("preview");
    }
  };

  const handleSelectFile = async () => {
    setWorkflowError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: false,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });
    if (result.canceled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await handleAcquiredAsset(assetFromPicker(result.assets[0]), "upload");
  };

  const handleCapturePhoto = async () => {
    setWorkflowError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setWorkflowError("Permission denied. Camera access is required to capture an ECG photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.82,
    });
    if (result.canceled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await handleAcquiredAsset(assetFromPicker(result.assets[0]), "camera");
  };

  const handleScanPaper = async () => {
    setWorkflowError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setWorkflowError("Permission denied. Camera access is required to scan ECG paper.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      cameraType: ImagePicker.CameraType.back,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (result.canceled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await handleAcquiredAsset(assetFromPicker(result.assets[0]), "scanner");
  };

  const handleAnalyze = () => {
    if (!selectedFile || !authToken?.token) return;
    if (processedImage && !processedImage.quality.canAnalyze) {
      setWorkflowError("Image quality is too poor for safe ECG analysis. Retake or choose a clearer ECG image.");
      return;
    }
    setState("analyzing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startPulse();
    setProgress(25);
    Animated.timing(progressAnim, { toValue: 0.25, duration: 200, useNativeDriver: false }).start();
    analysisMutation.mutate(undefined, {
      onSettled: () => {
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
      },
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Animated.timing(progressAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
      },
    });
  };

  const choosePreviewVariant = (variant: PreviewVariant) => {
    if (!processedImage) return;
    setProcessedImage({ ...processedImage, selectedVariant: variant });
    setSelectedFile(variant === "enhanced" ? processedImage.enhanced : processedImage.original);
  };

  const handleReprocess = async () => {
    if (!processedImage) return;
    await handleAcquiredAsset(processedImage.original, "scanner");
  };

  const handleReset = () => {
    setState("idle");
    setWorkflowError(null);
    setProcessedImage(null);
    setSelectedFile(null);
    setCreatedCaseId(null);
    setAnalysisResult(null);
    setProgress(0);
    progressAnim.setValue(0);
    pulseAnim.setValue(1);
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingTop: topInset + 16, paddingBottom: bottomInset + 90 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>ECG Analysis</Text>
        <Text style={[styles.pageSub, { color: colors.mutedForeground }]}>
          Upload an ECG for instant AI interpretation
        </Text>
      </View>

      {state === "idle" && (
        <>
          <View
            style={[
              styles.uploadZone,
              { borderColor: colors.primary, backgroundColor: colors.primary + "06" },
            ]}
          >
            <View style={[styles.uploadIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="upload-cloud" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.uploadTitle, { color: colors.foreground }]}>
              Select ECG File
            </Text>
            <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>
              PNG and JPG ECG images supported — up to 25 MB, optimized toward {Math.round(TARGET_ECG_UPLOAD_BYTES / 1024 / 1024)} MB
            </Text>
            <TouchableOpacity
              style={[styles.analyzeBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
              onPress={handleSelectFile}
              activeOpacity={0.85}
            >
              <Feather name="folder" size={18} color="#fff" />
              <Text style={styles.analyzeBtnText}>Choose ECG Image</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={handleCapturePhoto}
              activeOpacity={0.85}
            >
              <Feather name="camera" size={18} color={colors.foreground} />
              <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Capture ECG Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={handleScanPaper}
              activeOpacity={0.85}
            >
              <Feather name="crop" size={18} color={colors.foreground} />
              <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Scan ECG Paper</Text>
            </TouchableOpacity>
          </View>
          {workflowError && (
            <View style={[styles.infoBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-triangle" size={14} color="#DC2626" />
              <Text style={[styles.infoText, { color: "#DC2626" }]}>{workflowError}</Text>
            </View>
          )}
        </>
      )}

      {state === "processing" && (
        <View style={styles.analyzingSection}>
          <Animated.View
            style={[
              styles.pulseCircle,
              { backgroundColor: colors.primary + "12", borderColor: colors.primary },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Feather name="image" size={38} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.analyzingTitle, { color: colors.foreground }]}>Preparing ECG image...</Text>
          <Text style={[styles.analyzingSub, { color: colors.mutedForeground }]}>
            Validating format, compressing when possible, and assessing ECG image quality.
          </Text>
        </View>
      )}

      {state === "preview" && processedImage && selectedFile && (
        <>
          <View style={[styles.selectedCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={[styles.fileIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="file-text" size={22} color={colors.primary} />
            </View>
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: colors.foreground }]}>{selectedFile.name}</Text>
              <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>
                {selectedFile.size ? `${Math.round(selectedFile.size / 1024)} KB` : selectedFile.mimeType} · {acquisitionMethod}
              </Text>
            </View>
            <TouchableOpacity onPress={handleReset}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.resultHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ECG Image Quality</Text>
            <View style={styles.qualityRow}>
              <Text style={[styles.qualityScore, { color: colors.foreground }]}>{processedImage.quality.score}/100</Text>
              <Text style={[styles.qualityClass, { color: colors.primary }]}>{processedImage.quality.classification}</Text>
            </View>
            <Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>
              Sharpness {processedImage.quality.metrics.sharpness} · Contrast {processedImage.quality.metrics.contrast} · Lighting {processedImage.quality.metrics.lighting} · Signal {processedImage.quality.metrics.signalVisibility} · Crop {processedImage.quality.metrics.croppingQuality}
            </Text>
          </View>

          {(processedImage.errors.length > 0 || processedImage.warnings.length > 0 || workflowError) && (
            <View style={[styles.infoBox, { backgroundColor: processedImage.errors.length ? "#FEF2F2" : "#FFFBEB", borderColor: processedImage.errors.length ? "#FECACA" : "#FDE68A" }]}>
              <Feather name={processedImage.errors.length ? "alert-triangle" : "info"} size={14} color={processedImage.errors.length ? "#DC2626" : "#D97706"} />
              <Text style={[styles.infoText, { color: processedImage.errors.length ? "#DC2626" : "#92400E" }]}>
                {[workflowError, ...processedImage.errors, ...processedImage.warnings].filter(Boolean).join(" ")}
              </Text>
            </View>
          )}

          <View style={styles.previewGrid}>
            {[
              { asset: processedImage.original, label: "Original", variant: "original" as const },
              { asset: processedImage.enhanced, label: "Enhanced", variant: "enhanced" as const },
            ].map((preview) => {
              const active = processedImage.selectedVariant === preview.variant;
              return (
                <TouchableOpacity
                  key={preview.variant}
                  style={[styles.previewCard, { borderColor: active ? colors.primary : colors.border, backgroundColor: colors.card }]}
                  onPress={() => choosePreviewVariant(preview.variant)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri: preview.asset.uri }} style={styles.previewImage} resizeMode="cover" />
                  <Text style={[styles.previewLabel, { color: active ? colors.primary : colors.foreground }]}>
                    {preview.label}{active ? " · Selected" : ""}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {processedImage.steps.length > 0 && (
            <View style={[styles.resultHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Smart Scanner Pipeline</Text>
              <View style={styles.stepList}>
                {processedImage.steps.map((step) => (
                  <View key={step.label} style={styles.stepRow}>
                    <Feather name={step.status === "completed" ? "check-circle" : step.status === "fallback" ? "alert-circle" : "circle"} size={14} color={step.status === "completed" ? colors.success : colors.mutedForeground} />
                    <Text style={[styles.stepText, { color: colors.mutedForeground }]}>{step.label} · {step.status}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => choosePreviewVariant("original")}>
              <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Use Original</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={() => choosePreviewVariant("enhanced")}>
              <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Use Enhanced</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handleReprocess}>
              <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Reprocess</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={acquisitionMethod === "upload" ? handleSelectFile : acquisitionMethod === "camera" ? handleCapturePhoto : handleScanPaper}>
              <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { borderColor: "#DC2626", backgroundColor: colors.card }]} onPress={handleReset}>
              <Text style={[styles.secondaryActionText, { color: "#DC2626" }]}>Delete</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            disabled={!processedImage.quality.canAnalyze || processedImage.errors.length > 0}
            style={[styles.analyzeBtn, { backgroundColor: colors.primary, opacity: !processedImage.quality.canAnalyze || processedImage.errors.length > 0 ? 0.5 : 1 }]}
            onPress={handleAnalyze}
            activeOpacity={0.85}
          >
            <Feather name="cpu" size={18} color="#fff" />
            <Text style={styles.analyzeBtnText}>Confirm Upload & Analyze</Text>
          </TouchableOpacity>
        </>
      )}

      {state === "analyzing" && (
        <View style={styles.analyzingSection}>
          <Animated.View
            style={[
              styles.pulseCircle,
              { backgroundColor: colors.primary + "12", borderColor: colors.primary },
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Feather name="cpu" size={40} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.analyzingTitle, { color: colors.foreground }]}>Analyzing ECG...</Text>
          <Text style={[styles.analyzingSub, { color: colors.mutedForeground }]}>
            AI is interpreting waveform patterns, intervals, and clinical features
          </Text>

          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: colors.primary,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.primary }]}>{progress}%</Text>
          </View>

          <View style={styles.stepList}>
            {[
              { label: "Creating patient and ECG case", done: progress >= 25 },
              { label: "Uploading selected ECG file", done: analysisMutation.isSuccess },
              { label: "Running AI analysis", done: analysisMutation.isSuccess },
              { label: "Persisting clinical result", done: analysisMutation.isSuccess },
            ].map((step) => (
              <View key={step.label} style={styles.stepRow}>
                <Feather
                  name={step.done ? "check-circle" : "circle"}
                  size={14}
                  color={step.done ? colors.success : colors.mutedForeground}
                />
                <Text style={[styles.stepText, { color: step.done ? colors.foreground : colors.mutedForeground }]}>
                  {step.label}
                </Text>
              </View>
            ))}
          </View>
          {analysisMutation.isError && (
            <View style={[styles.infoBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
              <Feather name="alert-triangle" size={14} color="#DC2626" />
              <Text style={[styles.infoText, { color: "#DC2626" }]}>
                {analysisMutation.error instanceof Error ? analysisMutation.error.message : "ECG upload or analysis failed."}
              </Text>
            </View>
          )}
        </View>
      )}

      {state === "done" && analysisResult && (
        <>
          <View style={[styles.resultHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultTop}>
              <View style={[styles.resultIcon, { backgroundColor: colors.success + "15" }]}>
                <Feather name="check-circle" size={22} color={colors.success} />
              </View>
              <View style={styles.resultTitle}>
                <Text style={[styles.diagnosisTitle, { color: colors.foreground }]}>
                  {analysisResult.diagnosis}
                </Text>
                <StatusBadge status={analysisResult.severity === "critical" ? "critical" : analysisResult.severity === "normal" ? "normal" : "abnormal"} />
              </View>
            </View>

            <ConfidenceBar value={analysisResult.confidenceScore} />

            <View style={styles.vitalsRow}>
              {[
                { label: "Heart Rate", value: `${analysisResult.heartRate} bpm` },
                { label: "Rhythm", value: analysisResult.rhythm },
                { label: "AI Status", value: analysisResult.status },
              ].map((v) => (
                <View key={v.label} style={[styles.vitalChip, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.vitalLabel, { color: colors.mutedForeground }]}>{v.label}</Text>
                  <Text style={[styles.vitalValue, { color: colors.foreground }]}>{v.value}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Key Findings</Text>
            <View style={styles.findingsList}>
              <DiagnosisCard
                finding={{ label: "Interpretation", severity: analysisResult.severity === "normal" ? "normal" : "mild", value: analysisResult.interpretation }}
                index={0}
              />
              <DiagnosisCard
                finding={{ label: "AI Version", severity: "normal", value: analysisResult.aiVersion }}
                index={1}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recommendations</Text>
            <View style={styles.recList}>
              {analysisResult.recommendations.slice(0, 3).map((r, i) => (
                <RecommendationCard key={i} text={r} index={i} />
              ))}
              {analysisResult.recommendations.length === 0 && (
                <Text style={[styles.infoText, { color: colors.mutedForeground }]}>No AI recommendations were generated for this analysis.</Text>
              )}
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.viewFullBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/case/${createdCaseId}` as any)}
              activeOpacity={0.85}
            >
              <Text style={[styles.viewFullText, { color: colors.primaryForeground }]}>View Full Report</Text>
              <Feather name="arrow-right" size={16} color={colors.primaryForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.newAnalysis, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={16} color={colors.foreground} />
              <Text style={[styles.newAnalysisText, { color: colors.foreground }]}>New</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  pageHeader: { gap: 4 },
  pageTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  pageSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  uploadZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 18,
    alignItems: "center",
    gap: 10,
    paddingVertical: 44,
    paddingHorizontal: 20,
  },
  uploadIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  uploadTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  uploadSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  section: { gap: 10 },
  sectionLabel: { fontSize: 12, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  fileList: { gap: 8 },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fileInfo: { flex: 1, gap: 2 },
  fileName: { fontSize: 13, fontFamily: "Inter_500Medium" },
  fileSize: { fontSize: 11, fontFamily: "Inter_400Regular" },
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  analyzeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  analyzeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" },
  secondaryAction: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    width: "100%",
  },
  secondaryActionText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  cancelText: { textAlign: "center", fontSize: 13, fontFamily: "Inter_400Regular" },
  analyzingSection: { alignItems: "center", gap: 14, paddingVertical: 20 },
  pulseCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  analyzingTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  analyzingSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, maxWidth: 280 },
  progressWrap: { width: "100%", gap: 8 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressText: { textAlign: "right", fontSize: 13, fontFamily: "Inter_700Bold" },
  stepList: { gap: 10, width: "100%", paddingHorizontal: 10 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  resultHeader: { borderRadius: 16, borderWidth: 1, padding: 18, gap: 14 },
  qualityRow: { alignItems: "baseline", flexDirection: "row", gap: 8 },
  qualityScore: { fontSize: 26, fontFamily: "Inter_700Bold" },
  qualityClass: { fontSize: 14, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  cardMeta: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  previewGrid: { flexDirection: "row", gap: 10 },
  previewCard: { borderRadius: 14, borderWidth: 2, flex: 1, gap: 8, overflow: "hidden", padding: 8 },
  previewImage: { aspectRatio: 1, borderRadius: 10, width: "100%" },
  previewLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "center" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  resultTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  resultIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  resultTitle: { flex: 1, gap: 6 },
  diagnosisTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  vitalsRow: { flexDirection: "row", gap: 8 },
  vitalChip: { flex: 1, borderRadius: 10, padding: 10, gap: 3 },
  vitalLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  vitalValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  findingsList: { gap: 8 },
  recList: { gap: 8 },
  actionRow: { flexDirection: "row", gap: 10 },
  viewFullBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  viewFullText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  newAnalysis: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  newAnalysisText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
