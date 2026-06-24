import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  BoltBadge,
  BoltButton,
  BoltCard,
  BoltEcgLine,
  BoltHero,
  BoltScreen,
  BoltStat,
} from "@/components/bolt/BoltUI";
import { ONBOARDING_STORAGE_KEY } from "@/app/onboarding";

const FEATURES = [
  {
    body: "Live ECG analysis, measurements, confidence scoring, and report-ready clinical interpretation.",
    title: "AI-Powered Analysis",
  },
  {
    body: "Role-based access, protected owner privileges, audit trails, subscriptions, and secure sessions.",
    title: "Enterprise Security",
  },
  {
    body: "Upload, camera capture, smart paper scanning, waveform reconstruction, and clinical case review.",
    title: "Complete ECG Workflow",
  },
];

export default function LandingScreen() {
  const { isAuthenticated, isLoading } = useAuth();
  const colors = useColors();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => setOnboardingComplete(value === "true"))
      .catch(() => setOnboardingComplete(true))
      .finally(() => setOnboardingChecked(true));
  }, []);

  if (isLoading || !onboardingChecked) {
    return (
      <BoltScreen>
        <View style={styles.loading}>
          <BoltEcgLine height={86} opacity={0.32} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Preparing ECG Insight
          </Text>
        </View>
      </BoltScreen>
    );
  }

  if (isAuthenticated) return <Redirect href="/(tabs)" />;
  if (!onboardingComplete) return <Redirect href="/onboarding" />;

  return (
    <BoltScreen>
      <BoltHero
        actions={
          <>
            <BoltButton icon="log-in" label="Sign In" onPress={() => router.push("/(auth)/login")} />
            <BoltButton icon="user-plus" label="Create Account" onPress={() => router.push("/(auth)/register")} variant="outline" />
          </>
        }
        eyebrow="Powered by Advanced Medical AI"
        subtitle="A production ECG SaaS platform for modern cardiology teams, built with live AI analysis, subscriptions, protected administration, and secure clinical workflows."
        title="AI-Powered ECG Interpretation for Modern Medicine"
      />

      <View style={styles.statsRow}>
        <BoltStat icon="activity" label="Live ECG workflows" value="12-lead" />
        <BoltStat icon="shield" label="Security posture" value="Enterprise" />
      </View>
      <View style={styles.statsRow}>
        <BoltStat icon="file-text" label="Clinical reports" value="PDF/JSON" />
        <BoltStat icon="credit-card" label="SaaS billing" value="Active" />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Why ECG Insight</Text>
        {FEATURES.map((feature) => (
          <BoltCard key={feature.title} style={styles.featureCard}>
            <BoltBadge icon="check-circle" label={feature.title} tone="success" />
            <Text style={[styles.featureBody, { color: colors.textSecondary }]}>{feature.body}</Text>
          </BoltCard>
        ))}
      </View>

      <BoltCard highlight style={styles.workflow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Clinical Flow</Text>
        {["Upload ECG", "Enter patient context", "Run AI analysis", "Review waveform and report"].map((step, index) => (
          <View key={step} style={styles.stepRow}>
            <Text style={[styles.stepNumber, { color: colors.primary }]}>{String(index + 1).padStart(2, "0")}</Text>
            <Text style={[styles.stepLabel, { color: colors.text }]}>{step}</Text>
          </View>
        ))}
      </BoltCard>
    </BoltScreen>
  );
}

const styles = StyleSheet.create({
  featureBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  featureCard: { gap: 10 },
  loading: { flex: 1, gap: 20, justifyContent: "center", padding: 24 },
  loadingText: { fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "center" },
  section: { gap: 10 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  statsRow: { flexDirection: "row", gap: 10 },
  stepLabel: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  stepNumber: { fontFamily: "Inter_700Bold", fontSize: 13, width: 34 },
  stepRow: { alignItems: "center", flexDirection: "row", gap: 10, paddingVertical: 8 },
  workflow: { gap: 6 },
});
