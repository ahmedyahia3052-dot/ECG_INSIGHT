import React, { memo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "./ecgCockpitColors";
import { ECG_SPACING } from "./ecgSpacingTokens";
import type { ClinicalAlert } from "./clinical-workflow";

/** Sprint 33.5 — compact collapsible clinical alerts (e.g. Lead Issues). */
export const EcgClinicalAlertsBanner = memo(function EcgClinicalAlertsBanner({
  alerts,
}: {
  alerts: ClinicalAlert[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (!alerts.length) return null;

  const primary = alerts[0];
  const count = alerts.length;
  const label = count === 1 ? primary.label : `${primary.label} (${count})`;

  return (
    <View style={styles.root} nativeID="sprint335-compact-clinical-alerts" testID="sprint30-clinical-alerts">
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.chip}>
        <Text style={styles.icon}>⚠</Text>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.toggle}>{expanded ? "▾" : "▸"}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.details}>
          {alerts.map((alert) => (
            <View key={alert.id} style={styles.detailRow} testID={`sprint30-alert-${alert.id}`}>
              <Text style={styles.detailLabel}>{alert.label}</Text>
              <Text style={styles.detailMessage}>{alert.message}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    alignItems: "center",
    backgroundColor: "rgba(251,191,36,0.1)",
    borderColor: "rgba(251,191,36,0.35)",
    borderRadius: 3,
    borderWidth: 1,
    flexDirection: "row",
    gap: ECG_SPACING.xs,
    paddingHorizontal: ECG_SPACING.sm,
    paddingVertical: 2,
  },
  detailLabel: { color: ECG_COCKPIT_COLORS.text, fontSize: 9, fontWeight: "900" },
  detailMessage: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9, fontWeight: "600", lineHeight: 12 },
  detailRow: { gap: 2, paddingVertical: 2 },
  details: {
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 3,
    borderWidth: 1,
    marginTop: ECG_SPACING.xs,
    paddingHorizontal: ECG_SPACING.sm,
    paddingVertical: ECG_SPACING.xs,
  },
  icon: { color: ECG_COCKPIT_COLORS.warning, fontSize: 10, fontWeight: "900" },
  label: { color: ECG_COCKPIT_COLORS.warning, flex: 1, fontSize: 9, fontWeight: "800" },
  root: { flexShrink: 0, paddingHorizontal: ECG_SPACING.sm, paddingVertical: ECG_SPACING.xs },
  toggle: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 8, fontWeight: "900" },
});
