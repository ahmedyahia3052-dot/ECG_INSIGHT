import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { BrandLogo, HeartbeatLine, PremiumCard, PremiumScreenBackground } from "@/components/ui/Premium";
import { useColors } from "@/hooks/useColors";

export const ONBOARDING_STORAGE_KEY = "ecg-insight-onboarding-complete";

const SCREENS = [
  {
    icon: "cpu" as const,
    title: "AI ECG Analysis",
    body: "Clinical-grade AI interpretation, confidence scoring, measurements, and recommendations built for mobile triage.",
  },
  {
    icon: "camera" as const,
    title: "Smart ECG Scanner",
    body: "Capture paper ECGs, enhance image quality, and prepare clean inputs for analysis from any phone.",
  },
  {
    icon: "file-text" as const,
    title: "Clinical Reports",
    body: "Generate professional cardiology reports with ECG images, reconstructed waveforms, signatures, and exports.",
  },
  {
    icon: "shield" as const,
    title: "Secure Enterprise Platform",
    body: "Enterprise identity, subscriptions, auditability, MFA readiness, and protected medical workflows.",
  },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(22)).current;
  const current = SCREENS[index];

  useEffect(() => {
    fade.setValue(0);
    translate.setValue(22);
    Animated.parallel([
      Animated.timing(fade, { duration: 420, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
      Animated.timing(translate, { duration: 420, easing: Easing.out(Easing.cubic), toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [fade, index, translate]);

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true").catch(() => {});
    router.replace("/(auth)/login");
  }

  return (
    <PremiumScreenBackground>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <BrandLogo compact />
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Skip onboarding" onPress={finish}>
            <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.animated, { opacity: fade, transform: [{ translateY: translate }] }]}>
          <PremiumCard style={styles.hero}>
            <LinearGradient colors={colors.gradients.brand as [string, string, string]} style={styles.illustration}>
              <Feather name={current.icon} size={54} color="#fff" />
              <View style={styles.illustrationWave}>
                <HeartbeatLine height={54} />
              </View>
            </LinearGradient>
            <Text style={[styles.kicker, { color: colors.primary }]}>ECG Insight</Text>
            <Text style={[styles.title, { color: colors.text, maxWidth: Math.min(width - 72, 420) }]}>{current.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>{current.body}</Text>
          </PremiumCard>
        </Animated.View>

        <View style={styles.dots}>
          {SCREENS.map((screen, dotIndex) => (
            <View
              key={screen.title}
              style={[
                styles.dot,
                {
                  backgroundColor: dotIndex === index ? colors.primary : colors.border,
                  width: dotIndex === index ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={index === SCREENS.length - 1 ? "Finish onboarding" : "Next onboarding screen"}
            activeOpacity={0.86}
            onPress={() => (index === SCREENS.length - 1 ? finish() : setIndex((value) => value + 1))}
          >
            <LinearGradient colors={colors.gradients.purple as [string, string, string]} style={styles.nextButton}>
              <Text style={styles.nextText}>{index === SCREENS.length - 1 ? "Finish" : "Next"}</Text>
              <Feather name={index === SCREENS.length - 1 ? "check" : "arrow-right"} size={17} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </PremiumScreenBackground>
  );
}

const styles = StyleSheet.create({
  actions: { width: "100%" },
  animated: { width: "100%" },
  body: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 23, textAlign: "center" },
  container: { alignItems: "center", flexGrow: 1, gap: 24, justifyContent: "space-between", padding: 24, paddingBottom: 36, paddingTop: 56 },
  dot: { borderRadius: 999, height: 8 },
  dots: { alignItems: "center", flexDirection: "row", gap: 8 },
  hero: { alignItems: "center", gap: 16, padding: 22 },
  illustration: { alignItems: "center", borderRadius: 34, height: 220, justifyContent: "center", overflow: "hidden", width: "100%" },
  illustrationWave: { bottom: 18, left: 28, position: "absolute", right: 28 },
  kicker: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 1.4, textTransform: "uppercase" },
  nextButton: { alignItems: "center", borderRadius: 20, flexDirection: "row", gap: 10, justifyContent: "center", paddingVertical: 16 },
  nextText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 16 },
  skip: { fontFamily: "Inter_700Bold", fontSize: 14 },
  title: { fontFamily: "Inter_700Bold", fontSize: 32, letterSpacing: -1, lineHeight: 38, textAlign: "center" },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", width: "100%" },
});
