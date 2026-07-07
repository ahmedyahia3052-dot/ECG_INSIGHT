import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import type { EcgWorkspaceLayoutMode } from "./types";
import { workspaceLayoutModes } from "./useEcgWorkspaceLayoutMode";

/** Sprint 53 — instant workspace layout presets (static interpretation). */
export const EcgWorkspaceLayoutSwitcher = memo(function EcgWorkspaceLayoutSwitcher({
  onChange,
  value,
}: {
  onChange: (mode: EcgWorkspaceLayoutMode) => void;
  value: EcgWorkspaceLayoutMode;
}) {
  const modes = workspaceLayoutModes();

  return (
    <View style={styles.root} testID="sprint53-workspace-layout-switcher">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {modes.map((mode) => {
          const active = value === mode.id;
          return (
            <Pressable
              accessibilityLabel={`${mode.label} layout`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={mode.id}
              onPress={() => onChange(mode.id)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`sprint53-layout-${mode.id}`}
            >
              <Text numberOfLines={1} style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {mode.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  chipActive: { backgroundColor: ECG_COCKPIT_COLORS.accent, borderColor: ECG_COCKPIT_COLORS.accent },
  chipLabel: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, fontWeight: "800" },
  chipLabelActive: { color: ECG_COCKPIT_COLORS.bgDeep },
  root: { flexShrink: 0, maxHeight: 30, minWidth: 0 },
  row: { alignItems: "center", flexDirection: "row", gap: 4 },
});
