import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { SeverityBadge } from "@/components/ui/Badge";
import type { ECGFinding } from "@/data/mockData";

interface DiagnosisCardProps {
  finding: ECGFinding;
  index: number;
}

export function DiagnosisCard({ finding, index }: DiagnosisCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.num, { backgroundColor: colors.primary + "15" }]}>
          <Text style={[styles.numText, { color: colors.primary }]}>
            {index + 1}
          </Text>
        </View>
        <Text style={[styles.label, { color: colors.foreground }]}>
          {finding.label}
        </Text>
        <SeverityBadge severity={finding.severity} />
      </View>
      <Text style={[styles.value, { color: colors.mutedForeground }]}>
        {finding.value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  num: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  label: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  value: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
    paddingLeft: 34,
  },
});
