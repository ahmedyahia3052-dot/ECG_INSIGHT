import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import type { ECGStatus } from "@/data/mockData";
import type { UserRole } from "@/context/AuthContext";

interface StatusBadgeProps {
  status: ECGStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const colors = useColors();

  const config = {
    normal: { label: "Normal", bg: colors.success + "20", text: colors.success },
    abnormal: { label: "Abnormal", bg: colors.warning + "20", text: colors.warning },
    critical: { label: "Critical", bg: colors.destructive + "20", text: colors.destructive },
  };

  const c = config[status];
  const isSmall = size === "sm";

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.bg },
        isSmall && styles.small,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: c.text }]} />
      <Text
        style={[
          styles.label,
          { color: c.text },
          isSmall && styles.labelSmall,
        ]}
      >
        {c.label}
      </Text>
    </View>
  );
}

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const colors = useColors();

  const config: Record<UserRole, { label: string; bg: string; text: string }> = {
    super_admin: { label: "Super Admin", bg: "#7C3AED20", text: "#7C3AED" },
    admin: { label: "Admin", bg: colors.info + "20", text: colors.info },
    doctor: { label: "Doctor", bg: colors.primary + "20", text: colors.primary },
    student: { label: "Student", bg: colors.accent + "20", text: colors.accent },
  };

  const c = config[role];

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.label, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

interface SeverityBadgeProps {
  severity: "normal" | "mild" | "moderate" | "severe";
}

export function SeverityBadge({ severity }: SeverityBadgeProps) {
  const colors = useColors();

  const config = {
    normal: { label: "Normal", color: colors.success },
    mild: { label: "Mild", color: colors.info },
    moderate: { label: "Moderate", color: colors.warning },
    severe: { label: "Severe", color: colors.destructive },
  };

  const c = config[severity];

  return (
    <View style={[styles.sevBadge, { borderColor: c.color }]}>
      <Text style={[styles.sevLabel, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
    alignSelf: "flex-start",
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  labelSmall: {
    fontSize: 11,
  },
  sevBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  sevLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
