import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EcgWorkstationViewMode } from "./types";

const MODES: Array<{ id: EcgWorkstationViewMode; label: string }> = [
  { id: "image", label: "Original" },
  { id: "processed", label: "Processed" },
  { id: "waveform", label: "Digitized" },
  { id: "monitor", label: "Monitor" },
  { id: "ai-review", label: "AI Review" },
  { id: "compare", label: "Compare" },
];

export const EcgViewModeSwitcher = memo(function EcgViewModeSwitcher({
  onChange,
  value,
}: {
  onChange: (mode: EcgWorkstationViewMode) => void;
  value: EcgWorkstationViewMode;
}) {
  const activeValue = value === "overlay" ? "ai-review" : value;

  return (
    <View style={styles.root} testID="sprint22-view-mode-switcher">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {MODES.map((mode) => {
          const active = activeValue === mode.id;
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
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  chipLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  chipLabelActive: { color: "#03131B" },
  root: { flexShrink: 1, maxWidth: "100%", paddingVertical: 2 },
  row: { alignItems: "center", gap: 6 },
});
