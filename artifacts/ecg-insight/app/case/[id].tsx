import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { getAIResult } from "@/services/ai";
import { apiCaseToEcgCase, getCase } from "@/services/clinical";
import { getDigitalECG, getECGMeasurement } from "@/services/ecgProcessing";
import {
  BoltBadge,
  BoltButton,
  BoltCard,
  BoltEcgLine,
  BoltEmpty,
  BoltHero,
  BoltScreen,
  BoltStat,
} from "@/components/bolt/BoltUI";
import { WaveformViewer } from "@/components/ecg/WaveformViewer";

export default function CaseDetailScreen() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authToken } = useAuth();
  const token = authToken?.token;

  const caseQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: async () => getCase(token!, id),
    queryKey: ["bolt-case", token, id],
    retry: false,
  });
  const aiQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: async () => getAIResult(token!, id),
    queryKey: ["bolt-ai-result", token, id],
    refetchInterval: (query) => {
      const status = query.state.data?.analysis?.status;
      return status === "queued" || status === "processing" ? 1500 : false;
    },
    retry: false,
  });
  const measurementQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: async () => getECGMeasurement(token!, id),
    queryKey: ["bolt-ecg-measurement", token, id],
    retry: false,
  });
  const digitalQuery = useQuery({
    enabled: !!token && !!id,
    queryFn: async () => getDigitalECG(token!, id),
    queryKey: ["bolt-digital-ecg", token, id],
    retry: false,
  });

  const liveCase = caseQuery.data?.case;
  const ecgCase = liveCase ? apiCaseToEcgCase(liveCase) : null;
  const ai = aiQuery.data?.analysis;
  const measurement = measurementQuery.data?.measurement;
  const digitalEcg = digitalQuery.data?.digitalEcg;

  if (caseQuery.isError) {
    return (
      <BoltScreen>
        <BoltEmpty title="Case not found" message="The live clinical API could not find this ECG case. Mock fallback has been removed." />
        <BoltButton label="Back to Patients" onPress={() => router.replace("/(tabs)/history")} variant="outline" />
      </BoltScreen>
    );
  }

  return (
    <BoltScreen>
      <BoltHero
        actions={<BoltButton icon="chevron-left" label="Patients" onPress={() => router.back()} variant="outline" />}
        eyebrow="Analysis Results"
        subtitle={ecgCase ? `${ecgCase.patientAge}y · ${ecgCase.patientGender} · ${ecgCase.date.slice(0, 10)}` : "Loading live ECG case..."}
        title={ecgCase?.patientName ?? "ECG Case"}
      />

      {!ecgCase ? (
        <BoltEmpty title="Loading case" message="Retrieving live case details, measurements, digital waveform, and AI interpretation." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <BoltStat icon="heart" label="Heart Rate" value={`${ai?.heartRate ?? measurement?.heartRate ?? ecgCase.heartRate} bpm`} />
            <BoltStat icon="activity" label="Confidence" value={`${ai?.confidenceScore ?? ecgCase.confidence}%`} />
          </View>
          <View style={styles.statsRow}>
            <BoltStat icon="clock" label="QRS" value={`${measurement?.qrsDuration ?? ecgCase.qrsDuration} ms`} />
            <BoltStat icon="zap" label="QT" value={`${measurement?.qtInterval ?? ecgCase.qtInterval} ms`} />
          </View>

          <BoltCard style={styles.waveformCard}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Digital ECG</Text>
              <BoltBadge
                label={digitalEcg?.status === "available" ? "Reconstructed" : "Image/Waveform pending"}
                tone={digitalEcg?.status === "available" ? "success" : "warning"}
              />
            </View>
            {digitalEcg?.status === "available" ? (
              <WaveformViewer digitalEcg={digitalEcg} />
            ) : (
              <View style={styles.waveformFallback}>
                <BoltEcgLine height={100} opacity={0.28} />
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                  Digital waveform reconstruction unavailable. AI analysis and clinical review remain available.
                </Text>
              </View>
            )}
          </BoltCard>

          <BoltCard highlight style={styles.analysisCard}>
            <View style={styles.cardHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Interpretation</Text>
              <BoltBadge
                label={ai?.severity ?? ecgCase.status}
                tone={ai?.severity === "critical" || ecgCase.status === "critical" ? "danger" : "primary"}
              />
            </View>
            <Text style={[styles.diagnosis, { color: colors.text }]}>{ai?.diagnosis ?? ecgCase.diagnosis}</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>{ai?.interpretation ?? "AI result is still pending for this case."}</Text>
          </BoltCard>

          <BoltCard style={styles.analysisCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recommendations</Text>
            {(ai?.urgentActions?.length ? ai.urgentActions : ai?.recommendations ?? ecgCase.recommendations).map((item, index) => (
              <View key={`${item}-${index}`} style={styles.recommendation}>
                <BoltBadge label={String(index + 1)} tone={index === 0 ? "primary" : "muted"} />
                <Text style={[styles.recommendationText, { color: colors.text }]}>{item}</Text>
              </View>
            ))}
          </BoltCard>

          <BoltCard style={styles.analysisCard}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Patient Details</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>Case ID: {liveCase?.caseId ?? ecgCase.id}</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>Rhythm: {ai?.rhythm ?? ecgCase.rhythm}</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>PR: {measurement?.prInterval ?? ecgCase.prInterval} ms</Text>
            <Text style={[styles.muted, { color: colors.textSecondary }]}>QTc: {measurement?.qtcInterval ?? "Pending"} ms</Text>
          </BoltCard>
        </>
      )}
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  analysisCard: { gap: 10 },
  cardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  diagnosis: { fontFamily: "Inter_700Bold", fontSize: 20, lineHeight: 26 },
  muted: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20 },
  recommendation: { alignItems: "center", flexDirection: "row", gap: 10 },
  recommendationText: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statsRow: { flexDirection: "row", gap: 10 },
  waveformCard: { gap: 10 },
  waveformFallback: { gap: 10 },
});
