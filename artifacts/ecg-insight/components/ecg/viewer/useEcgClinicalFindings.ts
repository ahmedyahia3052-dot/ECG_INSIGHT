import { useMemo } from "react";

import type { AIAnalysisResult, AIExplainability } from "@/services/ai";
import type { ApiECGCase } from "@/services/clinical";
import type { DigitalEcg } from "@/services/ecgProcessing";

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
  digitalEcg?: DigitalEcg | null,
): EcgClinicalFindingsModel {
  const engine = digitalEcg?.measurementEngine;
  const engineFlat = digitalEcg?.measurements;
  const hrMeasurement = measurementValue(workspace, ["heart_rate", "rr_interval"]);
  const prMeasurement = measurementValue(workspace, ["pr_interval"]);
  const qrsMeasurement = measurementValue(workspace, ["qrs_duration"]);
  const qtMeasurement = measurementValue(workspace, ["qt_interval"]);
  const qtcMeasurement = measurementValue(workspace, ["qtc"]);

  const heartRate = hrMeasurement
    ? field("Heart Rate", hrMeasurement.value, hrMeasurement.unit, "measurement")
    : field("Heart Rate", engine?.heartRate ?? engineFlat?.heartRate ?? ecgCase.heartRate ?? analysis?.heartRate, "bpm");

  const confidenceScore = confidencePercent(ecgCase.confidenceScore ?? ecgCase.confidence ?? analysis?.confidenceScore);

  return {
    axis: field("Axis", extractAxis(explainability, ecgCase) ?? (engine?.axis?.meanQrsAxisDeg !== undefined ? `${engine.axis.meanQrsAxisDeg}°` : undefined)),
    confidence: field("Confidence", confidenceScore || undefined, "%", confidenceScore ? "case" : "pending"),
    heartRate,
    interpretation: field(
      "Interpretation",
      ecgCase.finalDiagnosis ?? ecgCase.doctorDiagnosis ?? ecgCase.aiDiagnosis ?? ecgCase.diagnosis ?? analysis?.interpretation,
    ),
    prInterval: prMeasurement
      ? field("PR Interval", prMeasurement.value, prMeasurement.unit, "measurement")
      : field("PR Interval", engine?.intervals?.prIntervalMs ?? engineFlat?.prIntervalMs ?? ecgCase.prInterval, "ms"),
    qrsDuration: qrsMeasurement
      ? field("QRS Duration", qrsMeasurement.value, qrsMeasurement.unit, "measurement")
      : field("QRS Duration", engine?.intervals?.qrsDurationMs ?? engineFlat?.qrsDurationMs ?? ecgCase.qrsDuration, "ms"),
    qtInterval: qtMeasurement
      ? field("QT Interval", qtMeasurement.value, qtMeasurement.unit, "measurement")
      : field("QT Interval", engine?.intervals?.qtIntervalMs ?? engineFlat?.qtIntervalMs ?? ecgCase.qtInterval, "ms"),
    qtcInterval: qtcMeasurement
      ? field("QTc Interval", qtcMeasurement.value, qtcMeasurement.unit, "measurement")
      : field("QTc Interval", engine?.intervals?.qtcBazettMs ?? engineFlat?.qtcBazettMs ?? ecgCase.qtcInterval, "ms"),
    rhythm: field("Rhythm", engine?.rhythm ?? ecgCase.rhythm ?? analysis?.rhythm),
  };
}

export function useEcgClinicalFindings(
  ecgCase: ApiECGCase,
  workspace?: EcgMeasurementWorkspace,
  analysis?: AIAnalysisResult | null,
  explainability?: AIExplainability | null,
  digitalEcg?: DigitalEcg | null,
) {
  return useMemo(
    () => buildEcgClinicalFindings(ecgCase, workspace, analysis, explainability, digitalEcg),
    [analysis, digitalEcg, ecgCase, explainability, workspace?.present.measurements],
  );
}
