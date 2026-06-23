import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/ui/Badge";
import type { ECGCase } from "@/data/mockData";

interface RecentCaseCardProps {
  ecgCase: ECGCase;
}

export function RecentCaseCard({ ecgCase }: RecentCaseCardProps) {
  const colors = useColors();
  const router = useRouter();

  const formattedDate = new Date(ecgCase.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/case/${ecgCase.id}` as any)}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: colors.primary + "15" }]}
      >
        <Feather name="activity" size={18} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.patient, { color: colors.foreground }]}>
          {ecgCase.patientName}
        </Text>
        <Text style={[styles.diagnosis, { color: colors.mutedForeground }]}>
          {ecgCase.diagnosis}
        </Text>
        <View style={styles.row}>
          <StatusBadge status={ecgCase.status} size="sm" />
          <Text style={[styles.conf, { color: colors.mutedForeground }]}>
            {ecgCase.confidence}% confidence
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formattedDate}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    gap: 4,
  },
  patient: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  diagnosis: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  conf: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 8,
  },
  date: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
