import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";

type AuthIcon = keyof typeof Feather.glyphMap;

const authTheme = {
  background: "#030712",
  border: "rgba(148, 163, 184, 0.22)",
  card: "rgba(8, 18, 35, 0.72)",
  cyan: "#22D3EE",
  danger: "#FB7185",
  field: "rgba(15, 23, 42, 0.78)",
  muted: "#94A3B8",
  success: "#34D399",
  text: "#F8FAFC",
  warning: "#FBBF24",
};

export const accountTypes = [
  { description: "Independent cardiology and review workspace", icon: "activity" as AuthIcon, label: "Doctor", role: "doctor" as const },
  { description: "Small practice ECG operations and reporting", icon: "heart" as AuthIcon, label: "Clinic", role: "corporate_client" as const },
  { description: "Enterprise hospital cardiology command center", icon: "crosshair" as AuthIcon, label: "Hospital", role: "corporate_client" as const },
  { description: "Occupational health and workforce screening", icon: "briefcase" as AuthIcon, label: "Company", role: "corporate_client" as const },
  { description: "Medical education and supervised learning", icon: "book-open" as AuthIcon, label: "Student", role: "student" as const },
];

const complianceLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/contact-support", label: "Contact Support" },
  { href: "/system-status", label: "System Status" },
];

function AnimatedMedicalBackground() {
  const pulse = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const heartbeat = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 620, easing: Easing.out(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 980, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true }),
      ]),
    );
    const particles = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { duration: 18000, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(drift, { duration: 18000, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true }),
      ]),
    );
    heartbeat.start();
    particles.start();
    return () => {
      heartbeat.stop();
      particles.stop();
    };
  }, [drift, pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.34] });
  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [22, -22] });

  return (
    <View pointerEvents="none" style={styles.backgroundLayer}>
      <LinearGradient colors={["#020617", "#06162A", "#0F172A"]} style={StyleSheet.absoluteFill} />
      <View style={styles.grid}>
        {Array.from({ length: 18 }).map((_, index) => (
          <View key={`v-${index}`} style={[styles.gridVertical, { left: `${index * 6}%` }]} />
        ))}
        {Array.from({ length: 14 }).map((_, index) => (
          <View key={`h-${index}`} style={[styles.gridHorizontal, { top: `${index * 8}%` }]} />
        ))}
      </View>
      <Animated.View style={[styles.ecgBackground, { opacity, transform: [{ scale }] }]}>
        <Svg height="100%" viewBox="0 0 1200 220" width="100%">
          <Polyline
            fill="none"
            points="0,112 110,112 126,112 142,72 158,158 176,38 194,112 330,112 350,112 370,88 390,146 410,28 430,112 580,112 604,112 624,74 646,162 668,50 690,112 850,112 872,112 892,92 912,140 932,64 952,112 1200,112"
            stroke="#22D3EE"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.particles, { transform: [{ translateY }] }]}>
        {Array.from({ length: 18 }).map((_, index) => (
          <View
            key={`p-${index}`}
            style={[
              styles.particle,
              {
                height: 4 + (index % 4),
                left: `${(index * 17) % 96}%`,
                opacity: 0.18 + (index % 4) * 0.04,
                top: `${(index * 23) % 92}%`,
                width: 4 + (index % 4),
              },
            ]}
          />
        ))}
      </Animated.View>
      <View style={styles.neuralLayer}>
        {Array.from({ length: 9 }).map((_, index) => (
          <View key={`n-${index}`} style={[styles.neuralNode, { left: `${8 + ((index * 13) % 82)}%`, top: `${12 + ((index * 19) % 72)}%` }]} />
        ))}
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={`nl-${index}`} style={[styles.neuralLine, { left: `${10 + index * 13}%`, top: `${22 + (index % 3) * 18}%`, transform: [{ rotate: `${index % 2 ? "-" : ""}18deg` }] }]} />
        ))}
      </View>
      <View style={styles.glowOne} />
      <View style={styles.glowTwo} />
    </View>
  );
}

export function PremiumAuthShell({
  children,
  eyebrow,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  subtitle: string;
  title: string;
}) {
  const router = useRouter();

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <AnimatedMedicalBackground />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        style={styles.contentLayer}
      >
        <View style={styles.authPanel}>
          <View style={styles.shellBrand}>
            <View style={styles.logo}>
              <Feather name="activity" size={22} color="#03131B" />
            </View>
            <Text style={styles.brand}>ECG Insight</Text>
            <Text style={styles.brandSub}>Enterprise Medical AI Platform</Text>
            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
          {children}
        </View>
        <View style={styles.complianceFooter}>
          {complianceLinks.map((item) => (
            <Pressable accessibilityRole="link" key={item.href} onPress={() => router.push(item.href as never)}>
              <Text style={styles.complianceLink}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthCard({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
}

export function AuthTextField({
  icon,
  label,
  right,
  ...props
}: TextInputProps & {
  icon: AuthIcon;
  label: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldShell}>
        <Feather name={icon} size={16} color={authTheme.muted} />
        <TextInput
          placeholderTextColor="rgba(148, 163, 184, 0.78)"
          selectionColor={authTheme.cyan}
          style={styles.fieldInput}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

export function AuthPrimaryButton({
  disabled,
  icon,
  label,
  onPress,
  variant = "primary",
}: {
  disabled?: boolean;
  icon?: AuthIcon;
  label: string;
  onPress: () => void;
  variant?: "ghost" | "outline" | "primary";
}) {
  const primary = variant === "primary";
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary ? styles.buttonPrimary : variant === "outline" ? styles.buttonOutline : styles.buttonGhost,
        disabled && styles.disabled,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      {icon ? <Feather name={icon} size={16} color={primary ? "#03131B" : authTheme.text} /> : null}
      <Text style={[styles.buttonText, primary ? styles.buttonTextPrimary : styles.buttonTextSecondary]}>{label}</Text>
    </Pressable>
  );
}

export function AuthToggle({
  checked,
  label,
  onPress,
}: {
  checked: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.toggleRow}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked ? <Feather name="check" size={13} color="#03131B" /> : null}
      </View>
      <Text style={styles.toggleText}>{label}</Text>
    </Pressable>
  );
}

export function AuthMessage({ message, tone = "info" }: { message: string; tone?: "error" | "info" | "success" }) {
  const color = tone === "error" ? authTheme.danger : tone === "success" ? authTheme.success : authTheme.cyan;
  return <Text style={[styles.message, { color }]}>{message}</Text>;
}

export function AuthToast({ message, tone = "info" }: { message: string; tone?: "error" | "info" | "success" }) {
  const icon = tone === "error" ? "alert-triangle" : tone === "success" ? "check-circle" : "info";
  return (
    <View style={[styles.toast, tone === "error" ? styles.toastError : tone === "success" ? styles.toastSuccess : styles.toastInfo]}>
      <Feather name={icon} size={16} color={authTheme.text} />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

export function AuthSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <View style={[styles.skeleton, { width: "72%" }]} />
      <View style={[styles.skeleton, { width: "100%" }]} />
      <View style={[styles.skeleton, { width: "86%" }]} />
    </View>
  );
}

export function SocialAuthGrid({
  onProvider,
}: {
  onProvider: (provider: "APPLE" | "FACEBOOK" | "GOOGLE" | "LINKEDIN" | "MICROSOFT") => void;
}) {
  const providers = [
    { icon: "chrome" as AuthIcon, label: "Google", provider: "GOOGLE" as const },
    { icon: "smartphone" as AuthIcon, label: "Apple", provider: "APPLE" as const },
    { icon: "monitor" as AuthIcon, label: "Microsoft", provider: "MICROSOFT" as const },
    { icon: "facebook" as AuthIcon, label: "Facebook", provider: "FACEBOOK" as const },
    { icon: "linkedin" as AuthIcon, label: "LinkedIn", provider: "LINKEDIN" as const },
  ];
  return (
    <View style={styles.socialGrid}>
      {providers.map((item) => (
        <Pressable accessibilityRole="button" key={item.provider} onPress={() => onProvider(item.provider)} style={styles.socialButton}>
          <Feather name={item.icon} size={15} color={authTheme.text} />
          <Text style={styles.socialText}>{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function AuthDivider({ label = "or continue with" }: { label?: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

export const premiumAuthTheme = authTheme;

const styles = StyleSheet.create({
  authPanel: { alignItems: "center", maxWidth: 480, width: "100%", zIndex: 20 },
  background: { flex: 1 },
  backgroundLayer: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  brand: { color: authTheme.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.5, marginTop: 12, textAlign: "center" },
  brandSub: { color: authTheme.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.3, marginTop: 4, textAlign: "center", textTransform: "uppercase" },
  button: { alignItems: "center", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 9, justifyContent: "center", minHeight: 52, paddingHorizontal: 16 },
  buttonGhost: { backgroundColor: "transparent", borderColor: "transparent" },
  buttonOutline: { backgroundColor: "rgba(15,23,42,0.42)", borderColor: authTheme.border },
  buttonPrimary: { backgroundColor: authTheme.cyan, borderColor: authTheme.cyan, shadowColor: authTheme.cyan, shadowOpacity: 0.22, shadowRadius: 18 },
  buttonText: { fontSize: 14, fontWeight: "900" },
  buttonTextPrimary: { color: "#03131B" },
  buttonTextSecondary: { color: authTheme.text },
  card: { backgroundColor: "rgba(8,18,35,0.68)", borderColor: "rgba(226,232,240,0.16)", borderRadius: 28, borderWidth: 1, maxWidth: 480, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.34, shadowRadius: 34, width: "100%" },
  cardContent: { gap: 18, padding: 26, position: "relative", zIndex: 2 },
  checkbox: { alignItems: "center", borderColor: authTheme.border, borderRadius: 7, borderWidth: 1, height: 22, justifyContent: "center", width: 22 },
  checkboxChecked: { backgroundColor: authTheme.cyan, borderColor: authTheme.cyan },
  complianceFooter: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: "center", maxWidth: 480, paddingTop: 18, width: "100%", zIndex: 20 },
  complianceLink: { color: "rgba(226, 232, 240, 0.72)", fontSize: 12, fontWeight: "800" },
  contentLayer: { flex: 1, position: "relative", zIndex: 20 },
  disabled: { opacity: 0.5 },
  divider: { alignItems: "center", flexDirection: "row", gap: 10 },
  dividerLine: { backgroundColor: authTheme.border, flex: 1, height: 1 },
  dividerText: { color: authTheme.muted, fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  ecgBackground: { height: 220, left: 0, position: "absolute", right: 0, top: "34%" },
  eyebrow: { color: authTheme.cyan, fontSize: 12, fontWeight: "900", letterSpacing: 1.6, textTransform: "uppercase" },
  fieldInput: { color: authTheme.text, flex: 1, fontSize: 14, fontWeight: "700", minHeight: 46, outlineStyle: "none" as never },
  fieldLabel: { color: authTheme.text, fontSize: 12, fontWeight: "900", letterSpacing: 0.3 },
  fieldShell: { alignItems: "center", backgroundColor: authTheme.field, borderColor: authTheme.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, minHeight: 50, paddingHorizontal: 14 },
  fieldWrap: { gap: 8 },
  glowOne: { backgroundColor: "rgba(34,211,238,0.14)", borderRadius: 999, height: 360, position: "absolute", right: -120, top: -120, width: 360 },
  glowTwo: { backgroundColor: "rgba(20,184,166,0.12)", borderRadius: 999, bottom: -160, height: 420, left: -160, position: "absolute", width: 420 },
  grid: { ...StyleSheet.absoluteFillObject, opacity: 0.78 },
  gridHorizontal: { backgroundColor: "rgba(34,211,238,0.055)", height: 1, left: 0, position: "absolute", right: 0 },
  gridVertical: { backgroundColor: "rgba(34,211,238,0.055)", bottom: 0, position: "absolute", top: 0, width: 1 },
  heroSubtitle: { color: "rgba(203,213,225,0.84)", fontSize: 14, lineHeight: 21, marginTop: 8, textAlign: "center" },
  heroTitle: { color: authTheme.text, fontSize: 24, fontWeight: "900", letterSpacing: -0.7, lineHeight: 30, marginTop: 10, textAlign: "center" },
  logo: { alignItems: "center", backgroundColor: authTheme.cyan, borderRadius: 16, height: 48, justifyContent: "center", shadowColor: authTheme.cyan, shadowOpacity: 0.36, shadowRadius: 24, width: 48 },
  message: { fontSize: 13, fontWeight: "800", lineHeight: 19 },
  neuralLayer: { ...StyleSheet.absoluteFillObject, opacity: 0.36 },
  neuralLine: { backgroundColor: "rgba(34,211,238,0.16)", height: 1, position: "absolute", width: 120 },
  neuralNode: { backgroundColor: "rgba(34,211,238,0.42)", borderColor: "rgba(255,255,255,0.16)", borderRadius: 999, borderWidth: 1, height: 9, position: "absolute", width: 9 },
  particle: { backgroundColor: authTheme.cyan, borderRadius: 999, position: "absolute" },
  particles: { ...StyleSheet.absoluteFillObject },
  pressed: { transform: [{ scale: 0.985 }] },
  root: { backgroundColor: authTheme.background, flex: 1 },
  scroll: { alignItems: "center", flexGrow: 1, justifyContent: "center", minHeight: "100%", paddingHorizontal: 18, paddingVertical: 32, width: "100%" },
  shellBrand: { alignItems: "center", paddingBottom: 20, width: "100%" },
  socialButton: { alignItems: "center", backgroundColor: "rgba(15,23,42,0.64)", borderColor: authTheme.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 44, paddingHorizontal: 10 },
  socialGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  skeleton: { backgroundColor: "rgba(148,163,184,0.18)", borderRadius: 999, height: 14 },
  skeletonWrap: { gap: 10, paddingVertical: 4 },
  toast: { alignItems: "flex-start", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 10, padding: 12 },
  toastError: { backgroundColor: "rgba(251,113,133,0.12)", borderColor: "rgba(251,113,133,0.34)" },
  toastInfo: { backgroundColor: "rgba(34,211,238,0.10)", borderColor: "rgba(34,211,238,0.28)" },
  toastSuccess: { backgroundColor: "rgba(52,211,153,0.12)", borderColor: "rgba(52,211,153,0.32)" },
  toastText: { color: authTheme.text, flex: 1, fontSize: 12, fontWeight: "800", lineHeight: 18 },
  socialText: { color: authTheme.text, fontSize: 12, fontWeight: "900" },
  toggleRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  toggleText: { color: authTheme.text, flex: 1, fontSize: 13, fontWeight: "800" },
});
