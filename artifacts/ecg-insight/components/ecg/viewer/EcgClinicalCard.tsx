import React, { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

/** Sprint 25 — collapsible clinical card for workstation sidebars. */
export const EcgClinicalCard = memo(function EcgClinicalCard({
  badge,
  children,
  defaultCollapsed = false,
  id,
  title,
}: {
  badge?: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  id: string;
  title: string;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <View nativeID={`sprint25-clinical-card-${id}`} style={styles.card} testID={`sprint25-clinical-card-${id}`}>
      <Pressable
        accessibilityLabel={`${title} section`}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        onPress={() => setCollapsed((value) => !value)}
        style={({ hovered, pressed }) => [styles.header, (hovered || pressed) && styles.headerHover]}
      >
        <View style={styles.headerLeft}>
          <Feather color={medicalTheme.primary} name={collapsed ? "chevron-right" : "chevron-down"} size={14} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </Pressable>
      {!collapsed ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.35)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: { color: medicalTheme.success, fontSize: 10, fontWeight: "800" },
  body: { gap: 6, paddingBottom: 10, paddingHorizontal: 10 },
  card: {
    backgroundColor: "rgba(8,20,36,0.96)",
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  headerHover: { backgroundColor: "rgba(34,197,94,0.06)" },
  headerLeft: { alignItems: "center", flexDirection: "row", flex: 1, gap: 6, minWidth: 0 },
  title: { color: medicalTheme.text, flex: 1, fontSize: 12, fontWeight: "900", letterSpacing: 0.3 },
});
