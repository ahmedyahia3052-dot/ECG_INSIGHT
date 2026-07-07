import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import type { EcgLeadId } from "./types";

/** Sprint 32 — hospital 12-lead selector grid. */
const LEAD_ROWS: EcgLeadId[][] = [
  ["I", "II", "III"],
  ["aVR", "aVL", "aVF"],
  ["V1", "V2", "V3"],
  ["V4", "V5", "V6"],
];

export const EcgLeadSelectorGrid = memo(function EcgLeadSelectorGrid({
  onSelectLead,
  selectedLead,
}: {
  onSelectLead?: (lead: EcgLeadId) => void;
  selectedLead?: EcgLeadId;
}) {
  return (
    <View style={styles.grid} testID="sprint32-lead-selector-grid">
      {LEAD_ROWS.map((row) => (
        <View key={row.join("-")} style={styles.row}>
          {row.map((lead) => {
            const active = selectedLead === lead;
            return (
              <Pressable
                accessibilityLabel={`Lead ${lead}`}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                key={lead}
                onPress={() => onSelectLead?.(lead)}
                style={({ hovered, pressed }) => [
                  styles.cell,
                  active && styles.cellActive,
                  (hovered || pressed) && !active && styles.cellHover,
                ]}
                testID={`sprint32-lead-${lead}`}
              >
                <Text style={[styles.cellLabel, active && styles.cellLabelActive]}>{lead}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  cell: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 28,
    paddingVertical: 4,
    transitionDuration: "150ms",
  } as never,
  cellActive: {
    backgroundColor: ECG_COCKPIT_COLORS.accent,
    borderColor: ECG_COCKPIT_COLORS.accent,
    shadowColor: ECG_COCKPIT_COLORS.accentGlow,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  cellHover: { borderColor: ECG_COCKPIT_COLORS.accentMuted },
  cellLabel: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 10, fontWeight: "800" },
  cellLabelActive: { color: ECG_COCKPIT_COLORS.bgDeep },
  grid: { gap: 4 },
  row: { flexDirection: "row", gap: 4 },
});
