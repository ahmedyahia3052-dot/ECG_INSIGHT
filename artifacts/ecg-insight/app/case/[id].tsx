import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
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
import { getCaseById } from "@/data/mockData";

export default function CaseDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const ecgCase = getCaseById(id ?? "");
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
    { label: "PR Interval", value: ecgCase.prInterval ? `${ecgCase.prInterval} ms` : "—" },
    { label: "QRS Duration", value: `${ecgCase.qrsDuration} ms` },
    { label: "QT Interval", value: `${ecgCase.qtInterval} ms` },
    { label: "Heart Rate", value: `${ecgCase.heartRate} bpm` },
  ];

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.scroll, { paddingBottom: bottomInset + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.topCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
      </View>

      <View style={[styles.ecgPreview, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.waveformArea, { backgroundColor: colors.primary + "06" }]}>
          <View style={styles.waveformContent}>
            <Feather name="activity" size={28} color={colors.primary} />
            <Text style={[styles.waveformLabel, { color: colors.primary }]}>
              12-Lead ECG Trace
            </Text>
            <Text style={[styles.waveformSub, { color: colors.mutedForeground }]}>
              {ecgCase.rhythm}
            </Text>
          </View>
          <View style={styles.waveformLines}>
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
      </View>

      <View style={[styles.diagnosisSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.secTitle, { color: colors.foreground }]}>
          {ecgCase.diagnosis}
        </Text>
        <View style={styles.confWrap}>
          <ConfidenceBar value={ecgCase.confidence} />
        </View>
        <View style={styles.analyzedBy}>
          <Feather name="cpu" size={12} color={colors.mutedForeground} />
          <Text style={[styles.analyzedText, { color: colors.mutedForeground }]}>
            {ecgCase.analyzedBy}
          </Text>
        </View>
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
          Key Findings ({ecgCase.findings.length})
        </Text>
        <View style={styles.findingsList}>
          {ecgCase.findings.map((f, i) => (
            <DiagnosisCard key={f.label} finding={f} index={i} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          Clinical Recommendations ({ecgCase.recommendations.length})
        </Text>
        <View style={styles.recList}>
          {ecgCase.recommendations.map((r, i) => (
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
  diagnosisSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  secTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  confWrap: {},
  analyzedBy: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  analyzedText: { fontSize: 11, fontFamily: "Inter_400Regular" },
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
