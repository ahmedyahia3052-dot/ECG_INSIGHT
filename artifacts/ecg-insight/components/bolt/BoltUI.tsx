import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  ActivityIndicator,
  Easing,
  Pressable,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { useColors } from "@/hooks/useColors";

export type BoltIcon = keyof typeof Feather.glyphMap;

export function BoltScreen({
  children,
  padded = true,
  refreshControl,
}: {
  children: React.ReactNode;
  padded?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}) {
  const colors = useColors();
  const fade = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { duration: 280, easing: Easing.out(Easing.cubic), toValue: 1, useNativeDriver: true }),
      Animated.timing(translate, { duration: 280, easing: Easing.out(Easing.cubic), toValue: 0, useNativeDriver: true }),
    ]).start();
  }, [fade, translate]);

  return (
    <LinearGradient
      colors={
        colors.resolvedScheme === "dark"
          ? ["#050816", "#07111F", "#101833"]
          : ["#F8FAFC", "#EFF6FF", "#FFFFFF"]
      }
      style={styles.screen}
    >
      <Animated.View style={[styles.screen, { opacity: fade, transform: [{ translateY: translate }] }]}>
        <ScrollView
          contentContainerStyle={[styles.scroll, padded && styles.padded]}
          refreshControl={refreshControl}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </Animated.View>
    </LinearGradient>
  );
}

export function BoltBrand({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.brandRow}>
      <View style={[styles.logo, { backgroundColor: colors.primary }]}>
        <Feather name="activity" size={compact ? 16 : 20} color="#fff" />
      </View>
      {!compact && (
        <View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>ECG Insight</Text>
          <Text style={[styles.brandSub, { color: colors.textSecondary }]}>Medical AI Platform</Text>
        </View>
      )}
    </View>
  );
}

export function BoltEcgLine({ height = 74, opacity = 0.14 }: { height?: number; opacity?: number }) {
  const colors = useColors();
  return (
    <View style={{ height, opacity }}>
      <Svg height="100%" viewBox="0 0 1200 100" width="100%">
        <Polyline
          fill="none"
          points="0,50 100,50 120,50 140,20 160,80 180,10 200,90 220,50 340,50 360,50 380,20 400,80 420,10 440,90 460,50 580,50 600,50 620,20 640,80 660,10 680,90 700,50 820,50 840,50 860,20 880,80 900,10 920,90 940,50 1060,50 1080,50 1100,20 1120,80 1140,10 1160,90 1180,50 1200,50"
          stroke={colors.primary}
          strokeWidth="3"
        />
      </Svg>
    </View>
  );
}

export function BoltCard({
  children,
  highlight,
  style,
}: {
  children: React.ReactNode;
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.resolvedScheme === "dark" ? "rgba(15,23,42,0.86)" : "rgba(255,255,255,0.92)",
          borderColor: highlight ? colors.primary + "55" : colors.border,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function BoltHero({
  actions,
  eyebrow,
  subtitle,
  title,
}: {
  actions?: React.ReactNode;
  eyebrow?: string;
  subtitle: string;
  title: string;
}) {
  const colors = useColors();
  return (
    <BoltCard highlight style={styles.hero}>
      <BoltBrand />
      <BoltEcgLine />
      {eyebrow ? <BoltBadge icon="zap" label={eyebrow} /> : null}
      <Text style={[styles.heroTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.heroSub, { color: colors.textSecondary }]}>{subtitle}</Text>
      {actions ? <View style={styles.heroActions}>{actions}</View> : null}
    </BoltCard>
  );
}

export function BoltButton({
  disabled,
  icon,
  label,
  loading,
  onPress,
  variant = "primary",
}: {
  disabled?: boolean;
  icon?: BoltIcon;
  label: string;
  loading?: boolean;
  onPress?: () => void;
  variant?: "primary" | "outline" | "ghost" | "danger";
}) {
  const colors = useColors();
  const isPrimary = variant === "primary" || variant === "danger";
  const backgroundColor =
    variant === "danger"
      ? colors.destructive
      : variant === "primary"
        ? colors.primary
        : variant === "outline"
          ? "transparent"
          : colors.muted;
  const textColor = isPrimary ? "#fff" : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      android_ripple={{ color: isPrimary ? "rgba(255,255,255,0.25)" : colors.primary + "22" }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: variant === "outline" ? colors.border : backgroundColor,
          opacity: disabled ? 0.55 : pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
      ]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : icon ? <Feather name={icon} size={16} color={textColor} /> : null}
      <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function BoltStat({
  accent,
  icon,
  label,
  value,
}: {
  accent?: string;
  icon: BoltIcon;
  label: string;
  value: string | number;
}) {
  const colors = useColors();
  const tint = accent ?? colors.primary;
  return (
    <BoltCard style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: tint + "18" }]}>
        <Feather name={icon} size={18} color={tint} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </BoltCard>
  );
}

export function BoltBadge({
  icon,
  label,
  tone = "primary",
}: {
  icon?: BoltIcon;
  label: string;
  tone?: "primary" | "success" | "warning" | "danger" | "muted";
}) {
  const colors = useColors();
  const tint =
    tone === "success"
      ? colors.success
      : tone === "warning"
        ? colors.warning
        : tone === "danger"
          ? colors.destructive
          : tone === "muted"
            ? colors.textSecondary
            : colors.primary;
  return (
    <View style={[styles.badge, { backgroundColor: tint + "16", borderColor: tint + "33" }]}>
      {icon ? <Feather name={icon} size={12} color={tint} /> : null}
      <Text style={[styles.badgeText, { color: tint }]}>{label}</Text>
    </View>
  );
}

export function BoltField({
  icon,
  keyboardType,
  multiline,
  onChangeText,
  placeholder,
  secureTextEntry,
  value,
}: {
  icon?: BoltIcon;
  keyboardType?: "default" | "email-address" | "number-pad" | "phone-pad";
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  value: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
      {icon ? <Feather name={icon} size={16} color={colors.textSecondary} /> : null}
      <TextInput
        autoCapitalize={keyboardType === "email-address" ? "none" : undefined}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        style={[styles.input, multiline && styles.multiline, { color: colors.text }]}
        value={value}
      />
    </View>
  );
}

export function BoltNavCard({
  description,
  icon,
  route,
  title,
}: {
  description: string;
  icon: BoltIcon;
  route: string;
  title: string;
}) {
  const colors = useColors();
  const router = useRouter();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(route as never)}>
      <BoltCard style={styles.navCard}>
        <View style={[styles.navIcon, { backgroundColor: colors.primary + "18" }]}>
          <Feather name={icon} size={18} color={colors.primary} />
        </View>
        <View style={styles.navText}>
          <Text style={[styles.navTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.navDescription, { color: colors.textSecondary }]}>{description}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.textSecondary} />
      </BoltCard>
    </Pressable>
  );
}

export function BoltEmpty({
  actionLabel,
  message,
  onAction,
  title,
}: {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
}) {
  const colors = useColors();
  return (
    <BoltCard style={styles.empty}>
      <View style={[styles.emptyIllustration, { borderColor: colors.primary + "33" }]}>
        <Feather name="activity" size={30} color={colors.primary} />
        <BoltEcgLine height={34} opacity={0.36} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction ? <BoltButton icon="arrow-right" label={actionLabel} onPress={onAction} variant="outline" /> : null}
    </BoltCard>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontFamily: "Inter_700Bold", fontSize: 11, textTransform: "uppercase" },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 10 },
  brandSub: { fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  brandTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  button: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    elevation: 5,
    padding: 16,
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 22,
  },
  empty: { alignItems: "center", gap: 10, paddingVertical: 28 },
  emptyIllustration: {
    alignItems: "center",
    borderRadius: 24,
    borderWidth: 1,
    gap: 4,
    overflow: "hidden",
    padding: 14,
    width: "100%",
  },
  emptyMessage: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19, textAlign: "center" },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  hero: { gap: 14, overflow: "hidden" },
  heroActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 22 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 34, letterSpacing: -1.1, lineHeight: 39 },
  input: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 14, minHeight: 24 },
  inputWrap: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  logo: { alignItems: "center", borderRadius: 10, height: 38, justifyContent: "center", width: 38 },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  navCard: { alignItems: "center", flexDirection: "row", gap: 12 },
  navDescription: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  navIcon: { alignItems: "center", borderRadius: 12, height: 42, justifyContent: "center", width: 42 },
  navText: { flex: 1, gap: 2 },
  navTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  padded: { padding: 16, paddingBottom: 112, paddingTop: 62 },
  screen: { flex: 1 },
  scroll: { flexGrow: 1, gap: 14 },
  stat: { flex: 1, gap: 7, minWidth: "46%" },
  statIcon: { alignItems: "center", borderRadius: 10, height: 38, justifyContent: "center", width: 38 },
  statLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 25 },
});
