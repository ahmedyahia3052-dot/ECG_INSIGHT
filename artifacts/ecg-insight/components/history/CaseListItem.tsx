import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/Badge";
import type { ECGCase } from "@/data/mockData";
import { PremiumCard } from "@/components/ui/Premium";

interface CaseListItemProps {
  ecgCase: ECGCase;
}

export function CaseListItem({ ecgCase }: CaseListItemProps) {
  const colors = useColors();
  const router = useRouter();

  const formattedDate = new Date(ecgCase.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const hrColor =
    ecgCase.heartRate > 100
      ? colors.warning
      : ecgCase.heartRate < 50
        ? colors.info
        : colors.success;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Open case for ${ecgCase.patientName}`}
      onPress={() => router.push(`/case/${ecgCase.id}` as any)}
      activeOpacity={0.7}
    >
      <PremiumCard style={styles.item}>
      <View style={styles.left}>
        <View
          style={[styles.avatar, { backgroundColor: colors.primary + "15" }]}
        >
          <Feather name="activity" size={16} color={colors.primary} />
        </View>
      </View>
      <View style={styles.middle}>
        <View style={styles.topRow}>
          <Text style={[styles.name, { color: colors.foreground }]}>
            {ecgCase.patientName}
          </Text>
          <Text style={[styles.age, { color: colors.mutedForeground }]}>
            {ecgCase.patientAge}
            {ecgCase.patientGender}
          </Text>
        </View>
        <Text
          style={[styles.diagnosis, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {ecgCase.diagnosis}
        </Text>
        <View style={styles.metaRow}>
          <StatusBadge status={ecgCase.status} size="sm" />
          <View style={styles.hrChip}>
            <Feather name="heart" size={10} color={hrColor} />
            <Text style={[styles.hrText, { color: hrColor }]}>
              {ecgCase.heartRate} bpm
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formattedDate}
        </Text>
        <Text style={[styles.conf, { color: colors.primary }]}>
          {ecgCase.confidence}%
        </Text>
        <Feather
          name="chevron-right"
          size={14}
          color={colors.mutedForeground}
        />
      </View>
      </PremiumCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  left: {
    flexShrink: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  middle: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  age: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  diagnosis: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  hrChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  hrText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  right: {
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  date: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  conf: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
