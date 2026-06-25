import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Polyline, Stop } from "react-native-svg";
import { useColors } from "@/hooks/useColors";
import { BoltBadge, type BoltIcon } from "./BoltUI";

export function LiveEcgWave({ height = 92 }: { height?: number }) {
  const colors = useColors();
  const translate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translate, {
        duration: 1800,
        easing: Easing.linear,
        toValue: -240,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [translate]);

  const points =
    "0,52 38,52 48,28 58,78 68,14 78,86 88,52 140,52 152,38 166,66 178,52 230,52 240,28 250,78 260,14 270,86 280,52 332,52 344,38 358,66 370,52 422,52 432,28 442,78 452,14 462,86 472,52 524,52 536,38 550,66 562,52";

  return (
    <View style={[styles.waveWrap, { height }]}>
      <Animated.View style={[styles.waveTrack, { transform: [{ translateX: translate }] }]}>
        {[0, 1, 2].map((item) => (
          <Svg key={item} height={height} viewBox="0 0 562 104" width={562}>
            <Defs>
              <SvgGradient id={`ecgGlow-${item}`} x1="0" x2="1" y1="0" y2="0">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.1" />
                <Stop offset="0.5" stopColor={colors.accent} stopOpacity="1" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="0.1" />
              </SvgGradient>
            </Defs>
            <Polyline fill="none" points={points} stroke={`url(#ecgGlow-${item})`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
          </Svg>
        ))}
      </Animated.View>
    </View>
  );
}

export function AnimatedCounter({
  suffix = "",
  value,
}: {
  suffix?: string;
  value: number;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 700;
    const startedAt = Date.now();
    const start = 0;
    const delta = value;
    const timer = setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / duration, 1);
      setDisplay(Math.round(start + delta * progress));
      if (progress >= 1) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return <>{display.toLocaleString()}{suffix}</>;
}

export function Sparkline({
  data,
  tone,
}: {
  data: number[];
  tone?: string;
}) {
  const colors = useColors();
  const stroke = tone ?? colors.primary;
  const points = useMemo(() => {
    const width = 112;
    const height = 34;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    return data
      .map((value, index) => {
        const x = (index / Math.max(data.length - 1, 1)) * width;
        const y = height - ((value - min) / Math.max(max - min, 1)) * height;
        return `${x},${y}`;
      })
      .join(" ");
  }, [data]);

  return (
    <Svg height={38} viewBox="0 0 112 38" width={112}>
      <Polyline fill="none" points={points} stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      <Circle cx="108" cy={points.split(" ").at(-1)?.split(",")[1] ?? "18"} fill={stroke} r="3" />
    </Svg>
  );
}

export function PremiumMetricCard({
  icon,
  label,
  sparkline,
  subtitle,
  suffix,
  trend,
  trendTone = "success",
  value,
}: {
  icon: BoltIcon;
  label: string;
  sparkline: number[];
  subtitle?: string;
  suffix?: string;
  trend: string;
  trendTone?: "success" | "warning" | "danger" | "primary";
  value: number;
}) {
  const colors = useColors();
  const translate = useRef(new Animated.Value(0)).current;
  const tint = trendTone === "danger" ? colors.destructive : trendTone === "warning" ? colors.warning : trendTone === "success" ? colors.success : colors.primary;

  return (
    <Pressable
      accessibilityRole="button"
      onHoverIn={() => Animated.timing(translate, { duration: 160, toValue: -4, useNativeDriver: true }).start()}
      onHoverOut={() => Animated.timing(translate, { duration: 160, toValue: 0, useNativeDriver: true }).start()}
    >
      <Animated.View style={[styles.metricCard, { borderColor: colors.gradientBorder, shadowColor: colors.primary, transform: [{ translateY: translate }] }]}>
        <LinearGradient colors={["rgba(255,255,255,0.12)", "rgba(255,255,255,0.03)"]} style={StyleSheet.absoluteFill} />
        <View style={styles.metricTop}>
          <View style={[styles.metricIcon, { backgroundColor: tint + "1F" }]}>
            <Feather name={icon} size={19} color={tint} />
          </View>
          <BoltBadge label={trend} tone={trendTone === "primary" ? "primary" : trendTone} />
        </View>
        <Text style={[styles.metricValue, { color: colors.text }]}>
          <AnimatedCounter suffix={suffix} value={value} />
        </Text>
        <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
        {subtitle ? <Text style={[styles.metricSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text> : null}
        <Sparkline data={sparkline} tone={tint} />
      </Animated.View>
    </Pressable>
  );
}

export function ShimmerBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { duration: 650, toValue: 0.78, useNativeDriver: true }),
        Animated.timing(opacity, { duration: 650, toValue: 0.25, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.shimmer, { backgroundColor: colors.primary + "22", opacity }, style]} />;
}

export function EcgMonitorWidget({
  heartRate,
  rhythm,
  status = "AI monitoring active",
}: {
  heartRate: number;
  rhythm: string;
  status?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.monitorCard, { borderColor: colors.gradientBorder, shadowColor: colors.primary }]}>
      <LinearGradient colors={["rgba(0,229,255,0.16)", "rgba(20,184,166,0.05)"]} style={StyleSheet.absoluteFill} />
      <View style={styles.monitorHeader}>
        <View>
          <Text style={[styles.monitorKicker, { color: colors.primary }]}>Real-Time ECG Monitor</Text>
          <Text style={[styles.monitorRhythm, { color: colors.text }]}>{rhythm}</Text>
        </View>
        <BoltBadge icon="radio" label={status} tone="success" />
      </View>
      <LiveEcgWave height={96} />
      <View style={styles.monitorFooter}>
        <Text style={[styles.bpm, { color: colors.primary }]}>{heartRate}</Text>
        <Text style={[styles.bpmLabel, { color: colors.textSecondary }]}>BPM</Text>
        <Text style={[styles.monitorMeta, { color: colors.textSecondary }]}>
          Continuous waveform visualization · mobile optimized
        </Text>
      </View>
    </View>
  );
}

export function AnalyticsChartCard({
  data,
  icon,
  title,
  tone,
}: {
  data: number[];
  icon: BoltIcon;
  title: string;
  tone?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.analyticsCard, { borderColor: colors.border }]}>
      <View style={styles.analyticsHeader}>
        <Text style={[styles.analyticsTitle, { color: colors.text }]}>{title}</Text>
        <Feather name={icon} size={16} color={tone ?? colors.primary} />
      </View>
      <Sparkline data={data} tone={tone ?? colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  analyticsCard: {
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    minWidth: "47%",
    padding: 14,
  },
  analyticsHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  analyticsTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  bpm: { fontFamily: "Inter_700Bold", fontSize: 42, letterSpacing: -1.2 },
  bpmLabel: { fontFamily: "Inter_700Bold", fontSize: 12, marginTop: Platform.OS === "web" ? 21 : 20 },
  metricCard: {
    borderRadius: 22,
    borderWidth: 1,
    elevation: 10,
    flex: 1,
    gap: 8,
    minWidth: "47%",
    overflow: "hidden",
    padding: 16,
    shadowOffset: { height: 16, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
  },
  metricIcon: { alignItems: "center", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  metricLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  metricSubtitle: { fontFamily: "Inter_500Medium", fontSize: 11, lineHeight: 15 },
  metricTop: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  metricValue: { fontFamily: "Inter_700Bold", fontSize: 28, letterSpacing: -0.8 },
  monitorCard: {
    borderRadius: 26,
    borderWidth: 1,
    elevation: 12,
    gap: 12,
    overflow: "hidden",
    padding: 18,
    shadowOffset: { height: 18, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
  },
  monitorFooter: { alignItems: "flex-start", flexDirection: "row", gap: 8 },
  monitorHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  monitorKicker: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  monitorMeta: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, marginTop: 16 },
  monitorRhythm: { fontFamily: "Inter_700Bold", fontSize: 20, marginTop: 2 },
  shimmer: { borderRadius: 16, height: 18 },
  waveTrack: { flexDirection: "row", width: 1686 },
  waveWrap: { overflow: "hidden", width: "100%" },
});
