import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EcgWorkstationViewMode } from "./types";

/** Sprint 26 — compact single-row mode switcher (7 primary modes). */
const MODES: Array<{ id: EcgWorkstationViewMode; label: string }> = [
  { id: "image", label: "Original" },
  { id: "processed", label: "Processed" },
  { id: "waveform", label: "Digitized" },
  { id: "monitor", label: "Live Monitor" },
  { id: "ai-review", label: "AI Review" },
  { id: "compare", label: "Compare" },
  { id: "overlay", label: "Overlay" },
];

export const EcgViewModeSwitcher = memo(function EcgViewModeSwitcher({
  onChange,
  value,
}: {
  onChange: (mode: EcgWorkstationViewMode) => void;
  value: EcgWorkstationViewMode;
}) {
  const activeValue = value === "overlay" ? "overlay" : value;

  return (
    <View nativeID="sprint26-view-mode-switcher" style={styles.root} testID="sprint29-view-mode-switcher">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {MODES.map((mode) => {
          const active = activeValue === mode.id || (mode.id === "ai-review" && value === "overlay");
          return (
            <Pressable
              accessibilityLabel={`${mode.label} view mode`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              key={mode.id}
              onPress={() => onChange(mode.id)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`sprint21-view-mode-${mode.id}`}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]} numberOfLines={1}>
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
    borderColor: medicalTheme.border,
    borderRadius: 4,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  chipActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  chipLabel: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  chipLabelActive: { color: "#03131B" },
  root: { flex: 1, maxHeight: 32, minWidth: 0 },
  row: { alignItems: "center", flexDirection: "row", gap: 4 },
});
