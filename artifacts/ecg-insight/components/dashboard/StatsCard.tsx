import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { PremiumCard } from "@/components/ui/Premium";

interface StatsCardProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}

export function StatsCard({
  icon,
  label,
  value,
  sub,
  accent,
  danger,
}: StatsCardProps) {
  const colors = useColors();

  const iconBg = danger
    ? colors.destructive + "18"
    : accent
      ? colors.accent + "18"
      : colors.primary + "18";

  const iconColor = danger
    ? colors.destructive
    : accent
      ? colors.accent
      : colors.primary;

  return (
    <PremiumCard style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Feather name={icon} size={18} color={iconColor} />
        </View>
        <View style={[styles.signal, { backgroundColor: iconColor + "33" }]} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      {sub && (
        <Text style={[styles.sub, { color: iconColor }]}>{sub}</Text>
      )}
    </PremiumCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 14,
    gap: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  signal: { borderRadius: 999, height: 6, width: 34 },
  topRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  sub: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 2,
  },
});
