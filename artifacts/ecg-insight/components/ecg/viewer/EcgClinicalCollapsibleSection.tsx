import { Feather } from "@expo/vector-icons";
import React, { memo, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_SPACING } from "./ecgSpacingTokens";

type Props = {
  badge?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  id: string;
  onToggle?: () => void;
  open?: boolean;
  title: string;
};

export const EcgClinicalCollapsibleSection = memo(function EcgClinicalCollapsibleSection({
  badge,
  children,
  defaultOpen = false,
  id,
  onToggle,
  open: controlledOpen,
  title,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;

  useEffect(() => {
    if (controlledOpen !== undefined) return;
    setInternalOpen(defaultOpen);
  }, [controlledOpen, defaultOpen]);

  const toggle = () => {
    if (onToggle) {
      onToggle();
      return;
    }
    setInternalOpen((value) => !value);
  };

  return (
    <View style={styles.root} testID={`sprint99-clinical-section-${id}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={toggle}
        style={({ hovered, pressed }) => [styles.header, (hovered || pressed) && styles.headerHover]}
        testID={`sprint99-clinical-section-toggle-${id}`}
      >
        <View style={styles.headerLeft}>
          <Feather color={ECG_COCKPIT_COLORS.accent} name={open ? "chevron-down" : "chevron-right"} size={14} />
          <Text style={styles.title}>{title}</Text>
          {badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      {open ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "rgba(20,221,230,0.12)",
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: ECG_COCKPIT_COLORS.accent, fontSize: 9, fontWeight: "800" },
  body: { gap: ECG_SPACING.xs, paddingBottom: ECG_SPACING.sm, paddingHorizontal: ECG_SPACING.xs },
  header: {
    alignItems: "center",
    borderBottomColor: ECG_COCKPIT_COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 32,
    paddingHorizontal: ECG_SPACING.xs,
    paddingVertical: ECG_SPACING.xs,
  },
  headerHover: { backgroundColor: "rgba(20,221,230,0.04)" },
  headerLeft: { alignItems: "center", flexDirection: "row", flex: 1, gap: 6, minWidth: 0 },
  root: { flexShrink: 0 },
  title: { color: ECG_COCKPIT_COLORS.text, flex: 1, fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
});
