import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useColors } from "@/hooks/useColors";

interface PremiumCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function PremiumCard({ children, style }: PremiumCardProps) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.glass,
          borderColor: colors.gradientBorder,
          shadowColor: colors.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function BrandLogo({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.logoRow} accessibilityRole="image" accessibilityLabel="ECG Insight logo">
      <LinearGradient colors={colors.gradients.brand as [string, string, string]} style={styles.logoMark}>
        <Feather name="heart" size={compact ? 18 : 22} color="#fff" />
        <View style={styles.ecgWave}>
          <View style={styles.waveFlat} />
          <View style={styles.wavePeak} />
          <View style={styles.waveFlat} />
        </View>
      </LinearGradient>
      {!compact && (
        <View>
          <Text style={[styles.brandTitle, { color: colors.text }]}>ECG Insight</Text>
          <Text style={[styles.brandSub, { color: colors.textSecondary }]}>Medical AI Platform</Text>
        </View>
      )}
    </View>
  );
}

export function HeartbeatLine({ height = 56 }: { height?: number }) {
  const colors = useColors();
  const translate = useRef(new Animated.Value(-80)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translate, {
        duration: 1600,
        easing: Easing.inOut(Easing.cubic),
        toValue: 80,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translate]);

  return (
    <View style={[styles.heartbeatWrap, { height }]} accessibilityLabel="Animated ECG heartbeat line">
      <View style={[styles.heartbeatBase, { backgroundColor: colors.primary + "22" }]} />
      <Animated.View style={[styles.heartbeatGlow, { transform: [{ translateX: translate }] }]}>
        <LinearGradient colors={colors.gradients.health as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heartbeatGradient} />
      </Animated.View>
      <View style={[styles.traceSegment, { left: "8%", top: "50%", backgroundColor: colors.primary }]} />
      <View style={[styles.traceSpike, { left: "28%", backgroundColor: colors.brandCyan }]} />
      <View style={[styles.traceSegment, { left: "40%", top: "50%", backgroundColor: colors.primary }]} />
      <View style={[styles.traceSpikeSmall, { left: "58%", backgroundColor: colors.accentPurple }]} />
      <View style={[styles.traceSegment, { left: "68%", top: "50%", backgroundColor: colors.primary }]} />
    </View>
  );
}

export function PremiumButton({
  label,
  icon,
  onPress,
  variant = "primary",
}: {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  onPress?: () => void;
  variant?: "primary" | "secondary";
}) {
  const colors = useColors();
  const content = (
    <>
      {icon ? <Feather name={icon} size={16} color={variant === "primary" ? "#fff" : colors.primary} /> : null}
      <Text style={[styles.buttonText, { color: variant === "primary" ? "#fff" : colors.primary }]}>{label}</Text>
    </>
  );
  if (variant === "secondary") {
    return (
      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.82}
        onPress={onPress}
        style={[styles.secondaryButton, { borderColor: colors.gradientBorder, backgroundColor: colors.glass }]}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity accessibilityRole="button" activeOpacity={0.86} onPress={onPress}>
      <LinearGradient colors={colors.gradients.brand as [string, string, string]} style={styles.primaryButton}>
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function SkeletonBlock({ height = 18, style }: { height?: number; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { duration: 700, toValue: 0.75, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 700, toValue: 0.35, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.skeleton, { backgroundColor: colors.primaryLight, height, opacity }, style]} />;
}

export function PremiumScreenBackground({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  return (
    <LinearGradient colors={colors.resolvedScheme === "dark" ? colors.gradients.dark as [string, string, string] : ["#EFF6FF", "#F8FAFC", "#FFFFFF"]} style={styles.background}>
      <View style={[styles.orb, styles.orbOne, { backgroundColor: colors.primary + "28" }]} />
      <View style={[styles.orb, styles.orbTwo, { backgroundColor: colors.accentPurple + "22" }]} />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  brandSub: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  brandTitle: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.4 },
  buttonText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    elevation: 8,
    overflow: "hidden",
    padding: 18,
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 30,
  },
  ecgWave: { alignItems: "center", flexDirection: "row", gap: 2, marginTop: -8 },
  heartbeatBase: { borderRadius: 999, height: 2, left: 0, position: "absolute", right: 0, top: "50%" },
  heartbeatGlow: { height: "100%", left: "35%", position: "absolute", width: 110 },
  heartbeatGradient: { borderRadius: 999, height: "100%", opacity: 0.22 },
  heartbeatWrap: { overflow: "hidden", width: "100%" },
  logoMark: { alignItems: "center", borderRadius: 18, height: 54, justifyContent: "center", width: 54 },
  logoRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  orb: { borderRadius: 999, height: 220, opacity: 0.9, position: "absolute", width: 220 },
  orbOne: { right: -92, top: -70 },
  orbTwo: { bottom: 120, left: -120 },
  primaryButton: {
    alignItems: "center",
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  skeleton: { borderRadius: 999 },
  traceSegment: { borderRadius: 999, height: 3, position: "absolute", width: 52 },
  traceSpike: { borderRadius: 999, height: 38, position: "absolute", top: 9, transform: [{ rotate: "24deg" }], width: 3 },
  traceSpikeSmall: { borderRadius: 999, height: 28, position: "absolute", top: 15, transform: [{ rotate: "-22deg" }], width: 3 },
  waveFlat: { backgroundColor: "#fff", borderRadius: 999, height: 2, width: 12 },
  wavePeak: { backgroundColor: "#fff", borderRadius: 999, height: 16, transform: [{ rotate: "22deg" }], width: 2 },
});
