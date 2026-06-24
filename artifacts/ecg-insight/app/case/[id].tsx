import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/Badge";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { DiagnosisCard } from "@/components/ecg/DiagnosisCard";
import { RecommendationCard } from "@/components/ecg/RecommendationCard";
import { WaveformViewer } from "@/components/ecg/WaveformViewer";
import { PremiumCard, PremiumScreenBackground } from "@/components/ui/Premium";
import { getCaseById } from "@/data/mockData";
import { useAuth } from "@/context/AuthContext";
import { apiFileUrl } from "@/services/api";
import { apiCaseToEcgCase, getCase } from "@/services/clinical";
import { analyzeCase, getAIResult } from "@/services/ai";
import {
  digitalECGExportUrl,
  getDigitalECG,
  getECGMeasurement,
  getECGWaveform,
  processECGCase,
  reconstructDigitalECG,
} from "@/services/ecgProcessing";

export default function CaseDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authToken } = useAuth();
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const caseQuery = useQuery({
    enabled: !!authToken?.token && !!id,
    queryFn: async () => getCase(authToken!.token, id),
    queryKey: ["ecg-case", authToken?.token, id],
    retry: false,
  });
  const aiQuery = useQuery({
    enabled: !!authToken?.token && !!id,
    queryFn: async () => getAIResult(authToken!.token, id),
    queryKey: ["ai-result", authToken?.token, id],
    refetchInterval: (query) => {
      const status = query.state.data?.analysis?.status;
      return status === "queued" || status === "processing" ? 1500 : false;
    },
    retry: false,
  });
  const measurementQuery = useQuery({
    enabled: !!authToken?.token && !!id,
    queryFn: async () => getECGMeasurement(authToken!.token, id),
    queryKey: ["ecg-measurement", authToken?.token, id],
    retry: false,
  });
  const waveformQuery = useQuery({
    enabled: !!authToken?.token && !!id,
    queryFn: async () => getECGWaveform(authToken!.token, id),
    queryKey: ["ecg-waveform", authToken?.token, id],
    retry: false,
  });
  const digitalEcgQuery = useQuery({
    enabled: !!authToken?.token && !!id,
    queryFn: async () => getDigitalECG(authToken!.token, id),
    queryKey: ["digital-ecg", authToken?.token, id],
    retry: false,
  });

  const liveCase = caseQuery.data?.case;
  const ecgCase = liveCase ? apiCaseToEcgCase(liveCase) : getCaseById(id ?? "");
  const aiResult = aiQuery.data?.analysis;
  const measurement = measurementQuery.data?.measurement;
  const waveform = waveformQuery.data?.waveform;
  const digitalEcg = digitalEcgQuery.data?.digitalEcg;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  if (!ecgCase) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
          Case not found
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.backLink, { color: colors.primary }]}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDate = new Date(ecgCase.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const intervals = [
    { label: "PR Interval", value: measurement ? `${measurement.prInterval} ms` : ecgCase.prInterval ? `${ecgCase.prInterval} ms` : "—" },
    { label: "QRS Duration", value: `${measurement?.qrsDuration ?? ecgCase.qrsDuration} ms` },
    { label: "QT Interval", value: `${measurement?.qtInterval ?? ecgCase.qtInterval} ms` },
    { label: "Heart Rate", value: `${aiResult?.heartRate ?? ecgCase.heartRate} bpm` },
    ...(measurement ? [{ label: "QTc", value: `${measurement.qtcInterval} ms` }] : []),
    ...(measurement ? [{ label: "ST Segment", value: `${measurement.stDeviation} mm` }] : []),
  ];
  const aiFindings = aiResult
    ? [
        {
          label: "Rhythm",
          severity: aiResult.severity === "critical" ? ("severe" as const) : ("normal" as const),
          value: aiResult.rhythm,
        },
        {
          label: "Interpretation",
          severity: aiResult.severity === "critical" ? ("severe" as const) : ("moderate" as const),
          value: aiResult.interpretation,
        },
      ]
    : null;
  const recommendations = aiResult?.recommendations ?? ecgCase.recommendations;

  return (
    <PremiumScreenBackground>
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <PremiumCard style={styles.topCard}>
        <View style={styles.patientRow}>
          <View style={[styles.patAvatar, { backgroundColor: colors.primary + "15" }]}>
            <Text style={[styles.patInitial, { color: colors.primary }]}>
              {ecgCase.patientName.charAt(0)}
            </Text>
          </View>
          <View style={styles.patInfo}>
            <Text style={[styles.patName, { color: colors.foreground }]}>
              {ecgCase.patientName}
            </Text>
            <Text style={[styles.patMeta, { color: colors.mutedForeground }]}>
              Age {ecgCase.patientAge} · {ecgCase.patientGender === "M" ? "Male" : "Female"}
            </Text>
            <Text style={[styles.date, { color: colors.mutedForeground }]}>
              {formattedDate}
            </Text>
          </View>
          <StatusBadge status={ecgCase.status} />
        </View>
      </PremiumCard>

      <PremiumCard style={styles.ecgPreview}>
        {digitalEcg || waveform ? (
          <WaveformViewer digitalEcg={digitalEcg} waveform={waveform} />
        ) : (
          <View
            style={[
              styles.waveformArea,
              fullscreen && styles.waveformAreaFull,
              { backgroundColor: colors.primary + "06" },
            ]}
          >
          <View style={styles.waveformContent}>
            <Feather name="activity" size={28} color={colors.primary} />
            <Text style={[styles.waveformLabel, { color: colors.primary }]}>
              12-Lead ECG Trace
            </Text>
            <Text style={[styles.waveformSub, { color: colors.mutedForeground }]}>
              {liveCase?.files[0]?.originalName ?? ecgCase.rhythm}
            </Text>
          </View>
          <View
            style={[
              styles.waveformLines,
              {
                transform: [
                  { translateX: panX },
                  { rotate: `${rotation}deg` },
                  { scale: zoom },
                ],
              },
            ]}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.waveformLine,
                  {
                    height: i % 3 === 0 ? 32 : i % 3 === 1 ? 16 : 8,
                    backgroundColor: colors.primary + (i % 2 === 0 ? "40" : "20"),
                  },
                ]}
              />
            ))}
          </View>
          </View>
        )}
        <View style={styles.viewerControls}>
          <TouchableOpacity style={[styles.viewerBtn, { borderColor: colors.border }]} onPress={() => setZoom((v) => Math.min(v + 0.2, 2.4))}>
            <Text style={[styles.viewerBtnText, { color: colors.primary }]}>Zoom +</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewerBtn, { borderColor: colors.border }]} onPress={() => setZoom((v) => Math.max(v - 0.2, 0.8))}>
            <Text style={[styles.viewerBtnText, { color: colors.primary }]}>Zoom -</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewerBtn, { borderColor: colors.border }]} onPress={() => setPanX((v) => (v === 0 ? 18 : 0))}>
            <Text style={[styles.viewerBtnText, { color: colors.primary }]}>Pan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewerBtn, { borderColor: colors.border }]} onPress={() => setRotation((v) => (v + 90) % 360)}>
            <Text style={[styles.viewerBtnText, { color: colors.primary }]}>Rotate</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.viewerBtn, { borderColor: colors.border }]} onPress={() => setFullscreen((v) => !v)}>
            <Text style={[styles.viewerBtnText, { color: colors.primary }]}>Full</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewerBtn, { borderColor: colors.border }]}
            onPress={() => {
              const file = liveCase?.files[0];
              if (file) Linking.openURL(apiFileUrl(file.downloadUrl));
            }}
          >
            <Text style={[styles.viewerBtnText, { color: colors.primary }]}>Download</Text>
          </TouchableOpacity>
          {liveCase && (
            <TouchableOpacity
              style={[styles.viewerBtn, { borderColor: colors.border }]}
              onPress={() =>
                authToken?.token &&
                processECGCase(authToken.token, liveCase.id)
                  .then(() => Promise.all([measurementQuery.refetch(), waveformQuery.refetch(), digitalEcgQuery.refetch(), aiQuery.refetch()]))
                  .catch(() => {})
              }
            >
              <Text style={[styles.viewerBtnText, { color: colors.primary }]}>Process</Text>
            </TouchableOpacity>
          )}
          {liveCase && (
            <TouchableOpacity
              style={[styles.viewerBtn, { borderColor: colors.border }]}
              onPress={() =>
                authToken?.token &&
                reconstructDigitalECG(authToken.token, liveCase.id)
                  .then(() => digitalEcgQuery.refetch())
                  .catch(() => {})
              }
            >
              <Text style={[styles.viewerBtnText, { color: colors.primary }]}>Reconstruct</Text>
            </TouchableOpacity>
          )}
          {liveCase && (
            <TouchableOpacity
              style={[styles.viewerBtn, { borderColor: colors.border }]}
              onPress={() => Linking.openURL(apiFileUrl(digitalECGExportUrl(liveCase.id, "svg")))}
            >
              <Text style={[styles.viewerBtnText, { color: colors.primary }]}>Export SVG</Text>
            </TouchableOpacity>
          )}
        </View>
        {digitalEcg?.status === "fallback" && (
          <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
            Digital waveform reconstruction unavailable. Normal AI analysis remains available.
          </Text>
        )}
      </PremiumCard>

      <View style={[styles.diagnosisSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.secTitle, { color: colors.foreground }]}>
          {aiResult?.diagnosis ?? ecgCase.diagnosis}
        </Text>
        {aiResult && (
          <View
            style={[
              styles.severityBadge,
              {
                backgroundColor:
                  aiResult.severity === "critical"
                    ? colors.destructive + "20"
                    : colors.primary + "15",
              },
            ]}
          >
            <Text
              style={[
                styles.severityText,
                { color: aiResult.severity === "critical" ? colors.destructive : colors.primary },
              ]}
            >
              {aiResult.severity.toUpperCase()} · {aiResult.status}
            </Text>
          </View>
        )}
        <View style={styles.confWrap}>
          <ConfidenceBar value={aiResult ? Math.round(aiResult.confidenceScore * 100) : ecgCase.confidence} />
        </View>
        <View style={styles.analyzedBy}>
          <Feather name="cpu" size={12} color={colors.mutedForeground} />
          <Text style={[styles.analyzedText, { color: colors.mutedForeground }]}>
            {aiResult ? `${aiResult.aiVersion} · ${aiResult.processingTime}ms` : ecgCase.analyzedBy}
          </Text>
        </View>
        {liveCase && !aiResult && (
          <TouchableOpacity
            style={[styles.analyzeBtn, { backgroundColor: colors.primary }]}
            onPress={() => authToken?.token && analyzeCase(authToken.token, liveCase.id).then(() => aiQuery.refetch())}
          >
            <Text style={styles.analyzeBtnText}>Run AI Analysis</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Measurements</Text>
        <View style={styles.intervalsGrid}>
          {intervals.map((iv) => (
            <View
              key={iv.label}
              style={[styles.intervalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Text style={[styles.intervalLabel, { color: colors.mutedForeground }]}>
                {iv.label}
              </Text>
              <Text style={[styles.intervalValue, { color: colors.foreground }]}>
                {iv.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Key Findings ({(aiFindings ?? ecgCase.findings).length})
        </Text>
        <View style={styles.findingsList}>
          {(aiFindings ?? ecgCase.findings).map((f, i) => (
            <DiagnosisCard key={f.label} finding={f} index={i} />
          ))}
        </View>
      </View>

      {aiResult && aiResult.urgentActions.length > 0 && (
        <View style={[styles.urgentPanel, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
          <Text style={[styles.sectionTitle, { color: colors.destructive }]}>Urgent Actions</Text>
          {aiResult.urgentActions.map((action, index) => (
            <RecommendationCard key={action} text={action} index={index} />
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Clinical Recommendations ({recommendations.length})
        </Text>
        <View style={styles.recList}>
          {recommendations.map((r, i) => (
            <RecommendationCard key={i} text={r} index={i} />
          ))}
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Feather name="shield" size={12} color={colors.mutedForeground} />
        <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
          This report is AI-generated and intended to assist clinical decision-making. Always confirm with qualified clinical judgment.
        </Text>
      </View>
    </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFoundText: { fontSize: 16, fontFamily: "Inter_500Medium" },
  backLink: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  topCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  patientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  patAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  patInitial: { fontSize: 20, fontFamily: "Inter_700Bold" },
  patInfo: { flex: 1, gap: 2 },
  patName: { fontSize: 16, fontFamily: "Inter_700Bold" },
  patMeta: { fontSize: 13, fontFamily: "Inter_400Regular" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ecgPreview: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  waveformArea: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  waveformAreaFull: { height: 260 },
  waveformContent: { alignItems: "center", gap: 4, zIndex: 1 },
  waveformLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  waveformSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  waveformLines: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    height: 40,
  },
  waveformLine: { width: 3, borderRadius: 2 },
  viewerControls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 12,
  },
  viewerBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewerBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  diagnosisSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  secTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  severityBadge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  severityText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  confWrap: {},
  analyzedBy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  analyzedText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  analyzeBtn: { alignItems: "center", borderRadius: 12, paddingVertical: 12 },
  analyzeBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_700Bold" },
  urgentPanel: { borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 },
  section: { gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  intervalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  intervalCard: {
    width: "47%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  intervalLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  intervalValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  findingsList: { gap: 8 },
  recList: { gap: 8 },
  footer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
});
