import { Feather } from "@expo/vector-icons";
import React, { memo, useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import { ECG_WORKSTATION_VISUAL } from "./ecgWorkstationVisualTokens";

type NavItem = {
  href: string;
  icon: keyof typeof Feather.glyphMap;
  id: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", icon: "home", id: "dashboard", label: "Dashboard" },
  { href: "/patients", icon: "users", id: "patients", label: "Patients" },
  { href: "/ecg-cases", icon: "folder", id: "cases", label: "ECG Cases" },
  { href: "/upload-ecg", icon: "upload", id: "upload", label: "Upload" },
  { href: "/reports", icon: "file-text", id: "reports", label: "Reports" },
  { href: "/copilot", icon: "cpu", id: "copilot", label: "AI Assistant" },
  { href: "/team-management", icon: "briefcase", id: "organizations", label: "Organizations" },
  { href: "/settings", icon: "settings", id: "settings", label: "Settings" },
];

export const EcgWorkstationLeftNav = memo(function EcgWorkstationLeftNav({
  collapsed = false,
  onToggleCollapse,
  pinned = true,
  onTogglePin,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onTogglePin?: () => void;
  pinned?: boolean;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = useState("cases");

  const navigate = useCallback(
    (item: NavItem) => {
      setActiveId(item.id);
      router.push(item.href as never);
    },
    [router],
  );

  return (
    <View style={styles.shell} testID="sprint24-workstation-left-nav">
      <View style={styles.header}>
        {!collapsed ? <Text style={styles.headerLabel}>WORKSTATION</Text> : null}
        <View style={styles.headerActions}>
          <Pressable accessibilityLabel={pinned ? "Unpin navigation" : "Pin navigation"} onPress={onTogglePin} style={styles.iconBtn}>
            <Feather color={pinned ? medicalTheme.primary : medicalTheme.muted} name="anchor" size={14} />
          </Pressable>
          <Pressable accessibilityLabel={collapsed ? "Expand navigation" : "Collapse navigation"} onPress={onToggleCollapse} style={styles.iconBtn}>
            <Feather color={medicalTheme.muted} name={collapsed ? "chevrons-right" : "chevrons-left"} size={14} />
          </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} style={styles.fill}>
        {NAV_ITEMS.map((item) => {
          const active = activeId === item.id;
          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="button"
              key={item.id}
              onPress={() => navigate(item)}
              style={[styles.navItem, active && styles.navItemActive, collapsed && styles.navItemCollapsed]}
              testID={`sprint24-nav-${item.id}`}
            >
              <Feather color={active ? "#03131B" : medicalTheme.primary} name={item.icon} size={16} />
              {!collapsed ? <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1, minHeight: 0 },
  header: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingVertical: 6 },
  headerActions: { flexDirection: "row", gap: 4 },
  headerLabel: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  iconBtn: { alignItems: "center", borderRadius: 6, height: 28, justifyContent: "center", width: 28 },
  navItem: {
    alignItems: "center",
    backgroundColor: "rgba(12,26,45,0.72)",
    borderColor: medicalTheme.border,
    borderRadius: 6,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navItemActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  navItemCollapsed: { justifyContent: "center", paddingHorizontal: 8 },
  navLabel: { color: medicalTheme.text, flex: 1, fontSize: 12, fontWeight: "800" },
  navLabelActive: { color: "#03131B" },
  scroll: { gap: 6, paddingBottom: 12, paddingTop: 8 },
  shell: { backgroundColor: "#06111F", borderColor: medicalTheme.border, borderRadius: ECG_WORKSTATION_VISUAL.panelBorderRadius, borderWidth: 1, flex: 1, minHeight: 0, overflow: "hidden", width: "100%" },
});
