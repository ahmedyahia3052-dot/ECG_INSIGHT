import React, { memo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ECG_COCKPIT_COLORS } from "../ecgCockpitColors";
import { EcgClinicalCard } from "../EcgClinicalCard";
import { EcgExaminationDoctorReviewPanel } from "./EcgExaminationDoctorReviewPanel";
import { EcgExaminationFinalReportPanel } from "./EcgExaminationFinalReportPanel";
import { EcgExaminationQualityControlPanel } from "./EcgExaminationQualityControlPanel";
import { EcgExaminationTimelinePanel } from "./EcgExaminationTimelinePanel";
import type { useExaminationWorkflowEngine } from "./useExaminationWorkflowEngine";
import type { ExaminationStepId } from "./types";

type Engine = ReturnType<typeof useExaminationWorkflowEngine>;

export const EcgExaminationWorkflowPanel = memo(function EcgExaminationWorkflowPanel({
  engine,
}: {
  engine: Engine;
}) {
  const {
    advance,
    advancePending,
    lifecycleLabel,
    localClinicalInfo,
    navigateStep,
    pendingFindings,
    progress,
    quality,
    refreshQuality,
    reportModel,
    reviewFinding,
    saveClinicalInfo,
    saveImpression,
    session,
    sessionLoading,
    setLocalClinicalInfo,
    sign,
    signPending,
    stepViews,
    timeline,
  } = engine;

  return (
    <ScrollView contentContainerStyle={styles.root} testID="sprint48-examination-workflow-ready">
      <View>
        <EcgClinicalCard id="session" title="Examination Session">
          <View style={styles.sessionRow}>
            <Text style={styles.badge} testID="sprint48-lifecycle-status">
              {lifecycleLabel}
            </Text>
            <Text style={styles.progress} testID="sprint48-examination-progress">
              {progress}% complete
            </Text>
          </View>
          <Text style={styles.currentStep}>
            Current: {stepViews.find((row) => row.status === "current")?.label ?? "Create Examination"}
          </Text>
        </EcgClinicalCard>

        <EcgClinicalCard id="steps" title="Workflow Steps">
          <View style={styles.stepGrid}>
            {stepViews.map((step) => (
              <Pressable
                key={step.id}
                onPress={() => {
                  navigateStep(step.id);
                  void advance(step.id as ExaminationStepId);
                }}
                style={[
                  styles.stepChip,
                  step.status === "complete" && styles.stepComplete,
                  step.status === "current" && styles.stepCurrent,
                ]}
                testID={`sprint48-step-${step.id}`}
              >
                <Text style={styles.stepLabel}>{step.label.split(" ")[0]}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            disabled={advancePending || sessionLoading}
            onPress={() => void advance()}
            style={styles.primaryBtn}
            testID="sprint48-advance-step"
          >
            <Text style={styles.primaryLabel}>{advancePending ? "Advancing…" : "Advance to Next Step"}</Text>
          </Pressable>
        </EcgClinicalCard>

        <EcgClinicalCard id="clinical-info" title="Clinical Information">
          <TextInput
            multiline
            onChangeText={(value) => setLocalClinicalInfo((current) => ({ ...current, chiefComplaint: value }))}
            placeholder="Chief complaint / symptoms"
            style={styles.input}
            value={localClinicalInfo.chiefComplaint}
          />
          <TextInput
            multiline
            onChangeText={(value) => setLocalClinicalInfo((current) => ({ ...current, medications: value }))}
            placeholder="Medications"
            style={styles.input}
            value={localClinicalInfo.medications}
          />
          <TextInput
            multiline
            onChangeText={(value) => setLocalClinicalInfo((current) => ({ ...current, history: value }))}
            placeholder="Medical history"
            style={styles.input}
            value={localClinicalInfo.history}
          />
          <Pressable onPress={() => void saveClinicalInfo()} style={styles.secondaryBtn} testID="sprint48-save-clinical-info">
            <Text style={styles.secondaryLabel}>Save Clinical Info</Text>
          </Pressable>
        </EcgClinicalCard>

        <EcgClinicalCard id="quality" title="Quality Control">
          <EcgExaminationQualityControlPanel loading={sessionLoading} onRefresh={() => void refreshQuality()} quality={quality} />
        </EcgClinicalCard>

        <EcgClinicalCard id="doctor-review" title="Doctor Review">
          <EcgExaminationDoctorReviewPanel
            doctorFindings={session?.doctorFindings ?? []}
            onReview={(finding, status, reason) =>
              void reviewFinding({
                findingId: finding.id,
                label: finding.label,
                modifiedText: status === "modified" ? `${finding.label} (clinician modified)` : undefined,
                reason,
                status,
              })
            }
            pendingFindings={pendingFindings}
          />
        </EcgClinicalCard>

        <EcgClinicalCard id="impression" title="Final Impression">
          <Pressable
            onPress={() =>
              void saveImpression({
                finalDiagnosis: reportModel.finalDiagnosis,
                finalImpression: reportModel.finalImpression,
                finalRecommendations: reportModel.recommendations,
              })
            }
            style={styles.secondaryBtn}
            testID="sprint48-save-impression"
          >
            <Text style={styles.secondaryLabel}>Save Impression from AI + Measurements</Text>
          </Pressable>
          <Pressable
            disabled={signPending}
            onPress={() => void sign()}
            style={styles.primaryBtn}
            testID="sprint48-sign-examination"
          >
            <Text style={styles.primaryLabel}>{signPending ? "Signing…" : "Apply Electronic Signature"}</Text>
          </Pressable>
        </EcgClinicalCard>

        <EcgClinicalCard id="timeline" title="Timeline">
          <EcgExaminationTimelinePanel timeline={timeline} />
        </EcgClinicalCard>

        <EcgClinicalCard id="final-report" title="Examination Summary">
          <EcgExaminationFinalReportPanel report={reportModel} />
        </EcgClinicalCard>
      </View>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "rgba(20,221,230,0.12)",
    borderRadius: 4,
    color: ECG_COCKPIT_COLORS.accent,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  currentStep: { color: ECG_COCKPIT_COLORS.text, fontSize: 10, fontWeight: "800", marginTop: 6 },
  input: {
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderColor: ECG_COCKPIT_COLORS.border,
    borderRadius: 4,
    borderWidth: 1,
    color: ECG_COCKPIT_COLORS.text,
    fontSize: 10,
    marginTop: 6,
    minHeight: 44,
    padding: 8,
  },
  primaryBtn: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.accent,
    borderRadius: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  primaryLabel: { color: ECG_COCKPIT_COLORS.bgDeep, fontSize: 10, fontWeight: "900" },
  progress: { color: ECG_COCKPIT_COLORS.textMuted, fontSize: 9, fontWeight: "900" },
  root: { gap: 6, paddingBottom: 12 },
  secondaryBtn: {
    alignItems: "center",
    borderColor: ECG_COCKPIT_COLORS.accentMuted,
    borderRadius: 4,
    borderWidth: 1,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  secondaryLabel: { color: ECG_COCKPIT_COLORS.accent, fontSize: 9, fontWeight: "900" },
  sessionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  stepChip: {
    alignItems: "center",
    backgroundColor: ECG_COCKPIT_COLORS.surface,
    borderRadius: 3,
    minWidth: 44,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  stepComplete: { backgroundColor: "rgba(34,197,94,0.15)" },
  stepCurrent: { borderColor: ECG_COCKPIT_COLORS.accent, borderWidth: 1 },
  stepGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  stepLabel: { color: ECG_COCKPIT_COLORS.text, fontSize: 8, fontWeight: "800" },
});
