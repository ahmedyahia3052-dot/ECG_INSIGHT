import React, { memo, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { medicalTheme } from "@/components/enterprise/EnterpriseUI";
import type { DigitalEcg } from "@/services/ecgProcessing";
import type { AIAnalysisResult } from "@/services/ai";

type StageId =
  | "upload"
  | "preprocess"
  | "grid"
  | "leads"
  | "digitize"
  | "quality"
  | "measurements"
  | "ai"
  | "review"
  | "report"
  | "export";

type Stage = { id: StageId; label: string; status: "complete" | "current" | "pending" };

const STAGE_ORDER: Array<{ id: StageId; label: string }> = [
  { id: "upload", label: "Upload" },
  { id: "preprocess", label: "Pre-processing" },
  { id: "grid", label: "Grid Detection" },
  { id: "leads", label: "Lead Detection" },
  { id: "digitize", label: "Digitization" },
  { id: "quality", label: "Signal Quality" },
  { id: "measurements", label: "Measurements" },
  { id: "ai", label: "AI Review" },
  { id: "review", label: "Doctor Review" },
  { id: "report", label: "Report" },
  { id: "export", label: "Export" },
];

function buildStages(input: {
  analysis?: AIAnalysisResult | null;
  digitalEcg?: DigitalEcg | null;
  digitizing?: boolean;
  hasReport?: boolean;
  reviewed?: boolean;
}): Stage[] {
  const d = input.digitalEcg;
  const hasDigitized = d?.status === "available" && (d.leads?.length ?? 0) > 0;
  const hasGrid = !!d?.calibration?.gridDetected;
  const hasPreprocess = !!d?.preprocessing;
  const hasQuality = d?.quality?.score != null;
  const hasMeasurements = !!d?.measurementEngine || !!d?.measurements;
  const hasAi = !!input.analysis?.diagnosis;

  let currentSet = false;
  const resolve = (complete: boolean): Stage["status"] => {
    if (complete) return "complete";
    if (!currentSet) {
      currentSet = true;
      return "current";
    }
    return "pending";
  };

  return STAGE_ORDER.map((item) => {
    let complete = false;
    switch (item.id) {
      case "upload":
        complete = true;
        break;
      case "preprocess":
        complete = hasPreprocess || hasDigitized;
        break;
      case "grid":
        complete = hasGrid;
        break;
      case "leads":
        complete = (d?.leads?.length ?? 0) > 0;
        break;
      case "digitize":
        complete = hasDigitized;
        break;
      case "quality":
        complete = hasQuality;
        break;
      case "measurements":
        complete = hasMeasurements;
        break;
      case "ai":
        complete = hasAi;
        break;
      case "review":
        complete = !!input.reviewed;
        break;
      case "report":
        complete = !!input.hasReport;
        break;
      case "export":
        complete = false;
        break;
      default:
        break;
    }
    if (input.digitizing && item.id === "digitize") {
      return { ...item, status: "current" as const };
    }
    return { ...item, status: resolve(complete) };
  });
}

/** Sprint 25 — visible clinical workflow timeline with progress. */
export const EcgClinicalWorkflowTimeline = memo(function EcgClinicalWorkflowTimeline({
  analysis,
  digitalEcg,
  digitizing = false,
  hasReport = false,
  reviewed = false,
}: {
  analysis?: AIAnalysisResult | null;
  digitalEcg?: DigitalEcg | null;
  digitizing?: boolean;
  hasReport?: boolean;
  reviewed?: boolean;
}) {
  const stages = useMemo(
    () => buildStages({ analysis, digitalEcg, digitizing, hasReport, reviewed }),
    [analysis, digitalEcg, digitizing, hasReport, reviewed],
  );
  const completed = stages.filter((s) => s.status === "complete").length;
  const progress = Math.round((completed / stages.length) * 100);
  const current = stages.find((s) => s.status === "current");

  return (
    <View nativeID="sprint25-clinical-workflow-timeline" style={styles.root} testID="sprint25-clinical-workflow-timeline">
      <View style={styles.header}>
        <Text style={styles.title}>Clinical Workflow</Text>
        <Text style={styles.progress}>{progress}% · {current?.label ?? "Complete"}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.stages}>
        {stages.map((stage) => (
          <View
            key={stage.id}
            style={[
              styles.chip,
              stage.status === "complete" && styles.chipComplete,
              stage.status === "current" && styles.chipCurrent,
            ]}
            testID={`sprint25-workflow-${stage.id}`}
          >
            <Text
              style={[
                styles.chipLabel,
                stage.status === "complete" && styles.chipLabelComplete,
                stage.status === "current" && styles.chipLabelCurrent,
              ]}
              numberOfLines={1}
            >
              {stage.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  chip: {
    backgroundColor: "rgba(12,26,45,0.92)",
    borderColor: medicalTheme.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  chipComplete: { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "rgba(34,197,94,0.35)" },
  chipCurrent: { backgroundColor: "rgba(56,189,248,0.12)", borderColor: "rgba(56,189,248,0.45)" },
  chipLabel: { color: medicalTheme.muted, fontSize: 9, fontWeight: "700" },
  chipLabelComplete: { color: medicalTheme.success },
  chipLabelCurrent: { color: "#38BDF8" },
  fill: { backgroundColor: medicalTheme.primary, borderRadius: 999, height: "100%" },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  progress: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800" },
  root: {
    backgroundColor: "rgba(8,20,36,0.96)",
    borderColor: medicalTheme.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
    padding: 10,
  },
  stages: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  title: { color: medicalTheme.text, fontSize: 12, fontWeight: "900" },
  track: { backgroundColor: "rgba(30,58,74,0.6)", borderRadius: 999, height: 4, overflow: "hidden" },
});
