import { useMemo } from "react";

import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";

import { confidencePercent } from "./ecgAiOverlayEngine";
import type { EcgClinicalFindingsModel, EcgClinicalFindingField } from "./types";
import type { EcgMeasurementWorkspace } from "./useEcgMeasurementWorkspace";

const PENDING = "Awaiting AI Analysis";

function field(label: string, value: string | number | undefined | null, unit?: string, source: EcgClinicalFindingField["source"] = "case"): EcgClinicalFindingField {
  if (value === undefined || value === null || value === "") {
    return { label, source: "pending", unit, value: PENDING };
  }
  return { label, source, unit, value: unit ? `${value} ${unit}` : String(value) };
}

function measurementValue(workspace: EcgMeasurementWorkspace | undefined, kinds: string[]) {
  const match = workspace?.present.measurements.find((item) => !item.hidden && kinds.includes(item.kind));
  return match ? { unit: match.unit, value: match.value } : null;
}

function extractAxis(explainability?: AIExplainability | null, ecgCase?: ApiECGCase) {
  const panelValue = explainability?.panel.find((item) => item.label.toLowerCase().includes("axis"))?.value;
  if (panelValue) return panelValue;
  const metadata = ecgCase?.explainabilityData as { panel?: Array<{ label: string; value: string }> } | undefined;
  return metadata?.panel?.find((item) => item.label.toLowerCase().includes("axis"))?.value;
}

export function buildEcgClinicalFindings(
  ecgCase: ApiECGCase,
  workspace?: EcgMeasurementWorkspace,
  analysis?: AIAnalysisResult | null,
  explainability?: AIExplainability | null,
): EcgClinicalFindingsModel {
  const hrMeasurement = measurementValue(workspace, ["heart_rate", "rr_interval"]);
  const prMeasurement = measurementValue(workspace, ["pr_interval"]);
  const qrsMeasurement = measurementValue(workspace, ["qrs_duration"]);
  const qtMeasurement = measurementValue(workspace, ["qt_interval"]);
  const qtcMeasurement = measurementValue(workspace, ["qtc"]);

  const heartRate = hrMeasurement
    ? field("Heart Rate", hrMeasurement.value, hrMeasurement.unit, "measurement")
    : field("Heart Rate", ecgCase.heartRate ?? analysis?.heartRate, "bpm");

  const confidenceScore = confidencePercent(ecgCase.confidenceScore ?? ecgCase.confidence ?? analysis?.confidenceScore);

  return {
    axis: field("Axis", extractAxis(explainability, ecgCase)),
    confidence: field("Confidence", confidenceScore || undefined, "%", confidenceScore ? "case" : "pending"),
    heartRate,
    interpretation: field(
      "Interpretation",
      ecgCase.finalDiagnosis ?? ecgCase.doctorDiagnosis ?? ecgCase.aiDiagnosis ?? ecgCase.diagnosis ?? analysis?.interpretation,
    ),
    prInterval: prMeasurement
      ? field("PR Interval", prMeasurement.value, prMeasurement.unit, "measurement")
      : field("PR Interval", ecgCase.prInterval, "ms"),
    qrsDuration: qrsMeasurement
      ? field("QRS Duration", qrsMeasurement.value, qrsMeasurement.unit, "measurement")
      : field("QRS Duration", ecgCase.qrsDuration, "ms"),
    qtInterval: qtMeasurement
      ? field("QT Interval", qtMeasurement.value, qtMeasurement.unit, "measurement")
      : field("QT Interval", ecgCase.qtInterval, "ms"),
    qtcInterval: qtcMeasurement
      ? field("QTc Interval", qtcMeasurement.value, qtcMeasurement.unit, "measurement")
      : field("QTc Interval", ecgCase.qtcInterval, "ms"),
    rhythm: field("Rhythm", ecgCase.rhythm ?? analysis?.rhythm),
  };
}

export function useEcgClinicalFindings(
  ecgCase: ApiECGCase,
  workspace?: EcgMeasurementWorkspace,
  analysis?: AIAnalysisResult | null,
  explainability?: AIExplainability | null,
) {
  return useMemo(
    () => buildEcgClinicalFindings(ecgCase, workspace, analysis, explainability),
    [analysis, ecgCase, explainability, workspace?.present.measurements],
  );
}
