import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
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
import { MOCK_CASES } from "@/data/mockData";

type UploadState = "idle" | "selected" | "analyzing" | "done";

const MOCK_RESULT = MOCK_CASES[1];

const MOCK_FILES = [
  { name: "ECG_12Lead_Resting.pdf", size: "2.4 MB" },
  { name: "ECG_Holter_24h.png", size: "1.1 MB" },
  { name: "ECG_Stress_Test.jpg", size: "3.7 MB" },
];

export default function UploadScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [state, setState] = useState<UploadState>("idle");
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string } | null>(null);
  const [progress, setProgress] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  };

  const handleSelectFile = (file: { name: string; size: string }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFile(file);
    setState("selected");
  };

  const handleAnalyze = () => {
    setState("analyzing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    startPulse();

    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 18 + 7;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => {
          pulseAnim.stopAnimation();
          pulseAnim.setValue(1);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setState("done");
        }, 400);
      }
      setProgress(Math.min(Math.round(p), 100));
      Animated.timing(progressAnim, {
        toValue: Math.min(p / 100, 1),
        duration: 200,
        useNativeDriver: false,
      }).start();
    }, 220);
  };

  const handleReset = () => {
    setState("idle");
    setSelectedFile(null);
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
              PDF, PNG, JPG supported — up to 25 MB
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              Sample Files (tap to select)
            </Text>
            <View style={styles.fileList}>
              {MOCK_FILES.map((f) => (
                <TouchableOpacity
                  key={f.name}
                  style={[styles.fileRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => handleSelectFile(f)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.fileIcon, { backgroundColor: colors.primary + "15" }]}>
                    <Feather name="file-text" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={[styles.fileName, { color: colors.foreground }]}>{f.name}</Text>
                    <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>{f.size}</Text>
                  </View>
                  <Feather name="plus-circle" size={20} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {state === "selected" && selectedFile && (
        <>
          <View style={[styles.selectedCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={[styles.fileIcon, { backgroundColor: colors.primary + "15" }]}>
              <Feather name="file-text" size={22} color={colors.primary} />
            </View>
            <View style={styles.fileInfo}>
              <Text style={[styles.fileName, { color: colors.foreground }]}>{selectedFile.name}</Text>
              <Text style={[styles.fileSize, { color: colors.mutedForeground }]}>{selectedFile.size} · Ready to analyze</Text>
            </View>
            <TouchableOpacity onPress={handleReset}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.infoBox, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "25" }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>
              AI will analyze rhythm, intervals, ST-segment changes, and provide clinical recommendations.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.analyzeBtn, { backgroundColor: colors.primary }]}
            onPress={handleAnalyze}
            activeOpacity={0.85}
          >
            <Feather name="cpu" size={18} color="#fff" />
            <Text style={styles.analyzeBtnText}>Run AI Analysis</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReset}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Select different file</Text>
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
              { label: "Loading ECG image", done: progress > 15 },
              { label: "Detecting waveform features", done: progress > 40 },
              { label: "Measuring intervals & amplitudes", done: progress > 65 },
              { label: "Generating clinical report", done: progress > 90 },
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
        </View>
      )}

      {state === "done" && (
        <>
          <View style={[styles.resultHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.resultTop}>
              <View style={[styles.resultIcon, { backgroundColor: colors.success + "15" }]}>
                <Feather name="check-circle" size={22} color={colors.success} />
              </View>
              <View style={styles.resultTitle}>
                <Text style={[styles.diagnosisTitle, { color: colors.foreground }]}>
                  {MOCK_RESULT.diagnosis}
                </Text>
                <StatusBadge status={MOCK_RESULT.status} />
              </View>
            </View>

            <ConfidenceBar value={MOCK_RESULT.confidence} />

            <View style={styles.vitalsRow}>
              {[
                { label: "Heart Rate", value: `${MOCK_RESULT.heartRate} bpm` },
                { label: "Rhythm", value: MOCK_RESULT.rhythm },
                { label: "QRS", value: `${MOCK_RESULT.qrsDuration} ms` },
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
              {MOCK_RESULT.findings.slice(0, 3).map((f, i) => (
                <DiagnosisCard key={f.label} finding={f} index={i} />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recommendations</Text>
            <View style={styles.recList}>
              {MOCK_RESULT.recommendations.slice(0, 3).map((r, i) => (
                <RecommendationCard key={i} text={r} index={i} />
              ))}
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.viewFullBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/case/${MOCK_RESULT.id}` as any)}
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
