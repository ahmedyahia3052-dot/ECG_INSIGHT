import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "../ecgCockpitColors";
import type { CardiologistStructuredFinding } from "../ai-cardiologist/types";
import type { DoctorFindingReview } from "./types";

function ReviewGroup({
  findings,
  title,
  tone,
}: {
  findings: DoctorFindingReview[];
  title: string;
  tone: "accent" | "muted" | "success" | "warning";
}) {
  if (!findings.length) return null;
  const color =
    tone === "success"
      ? ECG_COCKPIT_COLORS.success
      : tone === "warning"
        ? ECG_COCKPIT_COLORS.warning
        : tone === "accent"
          ? ECG_COCKPIT_COLORS.accent
          : ECG_COCKPIT_COLORS.textMuted;
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color }]}>{title} ({findings.length})</Text>
      {findings.map((row) => (
        <View key={row.findingId} style={styles.row}>
          <Text style={styles.label}>{row.modifiedText ?? row.label}</Text>
          {row.reason ? <Text style={styles.reason}>Reason: {row.reason}</Text> : null}
        </View>
      ))}
    </View>
  );
}

export const EcgExaminationDoctorReviewPanel = memo(function EcgExaminationDoctorReviewPanel({
  doctorFindings,
  onReview,
  pendingFindings,
}: {
  doctorFindings: DoctorFindingReview[];
  onReview?: (finding: CardiologistStructuredFinding, status: "accepted" | "modified" | "rejected", reason?: string) => void;
  pendingFindings: CardiologistStructuredFinding[];
}) {
  const pending = doctorFindings.filter((row) => row.status === "pending");
  const accepted = doctorFindings.filter((row) => row.status === "accepted");
  const rejected = doctorFindings.filter((row) => row.status === "rejected");
  const modified = doctorFindings.filter((row) => row.status === "modified");

  return (
    <View testID="sprint48-examination-doctor-review">
      <Text style={styles.title}>Doctor Review Mode</Text>
      <ReviewGroup findings={pending} title="Pending" tone="muted" />
      <ReviewGroup findings={accepted} title="Accepted" tone="success" />
      <ReviewGroup findings={rejected} title="Rejected" tone="warning" />
      <ReviewGroup findings={modified} title="Modified" tone="accent" />
      {pendingFindings.slice(0, 4).map((finding) => (
        <View key={finding.id} style={styles.pendingCard} testID={`sprint48-pending-finding-${finding.id}`}>
          <Text style={styles.label}>{finding.label}</Text>
          <View style={styles.actions}>
            {(["accepted", "modified", "rejected"] as const).map((status) => (
              <Pressable
                key={status}
                onPress={() => onReview?.(finding, status, status === "rejected" ? "Clinician rejected AI finding" : undefined)}
                style={styles.actionBtn}
                testID={`sprint48-review-${status}-${finding.id}`}
              >
                <Text style={styles.actionLabel}>{status}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  actionBtn: {
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 3,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  actionLabel: { color: ECG_COCKPIT_COLORS.text, fontSize: 8, fontWeight: "900", textTransform: "capitalize" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  group: { marginTop: 6 },
  groupTitle: { fontSize: 9, fontWeight: "900", letterSpacing: 0.3 },
  label: { color: ECG_COCKPIT_COLORS.text, fontSize: 9, fontWeight: "800", lineHeight: 13 },
  pendingCard: {
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderRadius: 4,
    marginTop: 6,
    padding: 6,
  },
  reason: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 8, fontWeight: "700", marginTop: 2 },
  row: { marginTop: 4 },
  title: { color: ECG_COCKPIT_COLORS.accent, fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
});
