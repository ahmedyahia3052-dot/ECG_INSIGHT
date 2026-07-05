import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";

import type { EcgWorkstationViewMode } from "./types";

const MODES: Array<{ id: EcgWorkstationViewMode; label: string }> = [
  { id: "image", label: "Image" },
  { id: "processed", label: "Processed" },
  { id: "waveform", label: "Waveform" },
  { id: "monitor", label: "Monitor" },
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
  return (
    <View style={styles.root} testID="sprint18-view-mode-switcher">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {MODES.map((mode) => {
          const active = value === mode.id;
          return (
            <Pressable
              key={mode.id}
              onPress={() => onChange(mode.id)}
              style={[styles.chip, active && styles.chipActive]}
              testID={`sprint18-view-mode-${mode.id}`}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{mode.label}</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: { backgroundColor: medicalTheme.primary, borderColor: medicalTheme.primary },
  chipLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800" },
  chipLabelActive: { color: "#03131B" },
  root: { paddingVertical: 2 },
  row: { gap: 6 },
});
