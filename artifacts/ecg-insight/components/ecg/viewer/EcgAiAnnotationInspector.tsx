import React, { memo } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";

import { Badge, Card, medicalTheme, PrimaryButton, SectionHeader } from "@/components/enterprise/EnterpriseUI";

import { annotationTypeLabel, buildAnnotationInspectorModel, confidenceColor, confidencePercent } from "./ecgAiOverlayEngine";
import type { EcgAiOverlayWorkspace } from "./useEcgAiOverlayWorkspace";

type Props = {
  workspace: EcgAiOverlayWorkspace;
};

export const EcgAiAnnotationInspector = memo(function EcgAiAnnotationInspector({ workspace }: Props) {
  const selected = workspace.primarySelected;
  if (!selected) {
    return (
      <View testID="sprint14-ecg-ai-annotation-inspector">
        <Card style={styles.card}>
          <SectionHeader
            subtitle="Select an AI annotation on the ECG image to inspect measurements, confidence, and clinical meaning."
            title="AI Annotation Inspector"
          />
          <Text style={styles.muted}>No annotation selected.</Text>
        </Card>
      </View>
    );
  }

  const model = buildAnnotationInspectorModel(selected);
  const confidence = confidencePercent(selected.confidence);

  return (
    <View testID="sprint14-ecg-ai-annotation-inspector">
      <Card style={styles.card}>
      <SectionHeader
        subtitle="Live clinical annotation review with AI explainability and physician notes."
        title="AI Annotation Inspector"
      />
      <View style={styles.row}>
        <Badge label={annotationTypeLabel(selected.type)} tone="primary" />
        <Badge label={`Lead ${selected.lead}`} tone="success" />
        {selected.confirmed ? <Badge label="Confirmed" tone="success" /> : null}
        {selected.rejected ? <Badge label="Rejected" tone="critical" /> : null}
        {selected.locked ? <Badge label="Locked" tone="warning" /> : null}
      </View>
      <InfoRow label="Measurement" value={`${selected.measurement ?? "—"}${selected.units ? ` ${selected.units}` : ""}`} />
      <InfoRow label="Confidence" value={`${confidence}%`} valueColor={confidenceColor(confidence)} />
      <InfoRow label="Clinical Meaning" value={model.clinicalSignificance ?? "—"} />
      <InfoRow label="AI Explanation" value={selected.medicalExplanation ?? "—"} />
      {selected.supportingMeasurements?.length ? (
        <InfoRow label="Supporting Measurements" value={selected.supportingMeasurements.join(" · ")} />
      ) : null}
      {selected.differentialDiagnosis?.length ? (
        <InfoRow label="Differential Diagnosis" value={selected.differentialDiagnosis.join(" · ")} />
      ) : null}
      {selected.suggestedAction ? <InfoRow label="Suggested Action" value={selected.suggestedAction} /> : null}
      <Text style={styles.sectionLabel}>Supporting Evidence</Text>
      {selected.evidence.map((item) => (
        <Text key={item} style={styles.evidence}>
          • {item}
        </Text>
      ))}
      <Text style={styles.sectionLabel}>Doctor Notes</Text>
      <TextInput
        accessibilityLabel="Doctor notes"
        multiline
        onChangeText={(value) => workspace.updateDoctorNotes(selected.id, value)}
        placeholder="Add physician review notes"
        style={styles.notes}
        value={selected.doctorNotes ?? ""}
      />
      <View style={styles.actions}>
        <PrimaryButton label="Confirm" onPress={() => workspace.confirmAnnotation(selected.id)} variant="outline" />
        <PrimaryButton label="Reject" onPress={() => workspace.rejectAnnotation(selected.id)} variant="outline" />
        <PrimaryButton label={selected.locked ? "Unlock" : "Lock"} onPress={() => workspace.toggleAnnotationLock(selected.id)} variant="outline" />
        <PrimaryButton label={selected.visible ? "Hide" : "Show"} onPress={() => workspace.toggleAnnotationVisibility(selected.id)} variant="outline" />
        <PrimaryButton label="Delete" onPress={() => workspace.removeAnnotation(selected.id)} variant="outline" />
        <PrimaryButton
          label="Explain in Copilot"
          onPress={() => {
            if (Platform.OS !== "web" || typeof window === "undefined") return;
            window.dispatchEvent(
              new CustomEvent("medical-copilot:ask", {
                detail: {
                  prompt: `Explain ECG finding: Lead ${selected.lead} ${annotationTypeLabel(selected.type)}. Measurement: ${selected.measurement ?? "N/A"}. Evidence: ${selected.evidence.join("; ")}.`,
                },
              }),
            );
          }}
          variant="outline"
        />
      </View>
    </Card>
    </View>
  );
});

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { gap: 10 },
  evidence: { color: medicalTheme.text, fontSize: 12, lineHeight: 18 },
  infoLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  infoRow: { gap: 2 },
  infoValue: { color: medicalTheme.text, fontSize: 13, fontWeight: "600" },
  muted: { color: medicalTheme.muted, fontSize: 13 },
  notes: {
    backgroundColor: medicalTheme.background,
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    color: medicalTheme.text,
    minHeight: 72,
    padding: 10,
    textAlignVertical: "top",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  sectionLabel: { color: medicalTheme.muted, fontSize: 11, fontWeight: "800", letterSpacing: 0.4, marginTop: 4 },
});
