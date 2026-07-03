import type { DigitizedLead } from "../ecg-digitization/types";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import type { EcgClinicalInterpretation } from "../ecg-interpretation/types";
import { AI_DIAGNOSIS_LABELS, ONNX_LABEL_TO_DIAGNOSIS, RULE_CODE_TO_LABEL, type AiDiagnosisLabel } from "./diagnosis-codes";

export interface DiagnosisProbability {
  label: AiDiagnosisLabel;
  probability: number;
  source: "deep_learning" | "feature_model" | "onnx";
}

function softmax(scores: Record<AiDiagnosisLabel, number>) {
  const labels = AI_DIAGNOSIS_LABELS;
  const max = Math.max(...labels.map((label) => scores[label]));
  const exps = labels.map((label) => Math.exp(scores[label] - max));
  const sum = exps.reduce((total, value) => total + value, 0);
  return labels.map((label, index) => ({
    label,
    probability: Number((exps[index] / Math.max(sum, 1e-6)).toFixed(4)),
    source: "feature_model" as const,
  }));
}

function baseScores(): Record<AiDiagnosisLabel, number> {
  return Object.fromEntries(AI_DIAGNOSIS_LABELS.map((label) => [label, -4])) as Record<AiDiagnosisLabel, number>;
}

export function predictFromFeatureModel(
  measurement: EcgClinicalMeasurementResult,
  interpretation: EcgClinicalInterpretation,
): DiagnosisProbability[] {
  const scores = baseScores();

  for (const finding of interpretation.findings) {
    const label = RULE_CODE_TO_LABEL[finding.code];
    if (!label) continue;
    scores[label] += finding.confidence * 2.4;
  }

  const { heartRate, intervals, morphology, stDeviation, amplitudes } = measurement;
  if (heartRate >= 60 && heartRate <= 100 && measurement.rhythm !== "irregular") scores["Normal ECG"] += 1.8;
  if (heartRate < 60) scores["Sinus Bradycardia"] += 1.6;
  if (heartRate > 100 && heartRate < 150) scores["Sinus Tachycardia"] += 1.5;
  if (measurement.rhythm === "irregular" && heartRate >= 90) scores["Atrial Fibrillation"] += 2.0;
  if (measurement.rhythm === "irregular" && heartRate >= 130) scores["Atrial Flutter"] += 1.2;
  if (intervals.qrsDurationMs >= 120 && measurement.axis.meanQrsAxisDeg >= 0) scores["RBBB"] += 1.4;
  if (intervals.qrsDurationMs >= 120 && measurement.axis.meanQrsAxisDeg < 0) scores["LBBB"] += 1.4;
  if (morphology.includes("lvh_criteria")) scores["LVH"] += 1.8;
  if (morphology.includes("rvh_criteria")) scores["RVH"] += 1.7;
  if (stDeviation >= 0.2 || amplitudes.stDeviationMm >= 1) {
    scores["Anterior STEMI"] += 1.3;
    if (measurement.axis.meanQrsAxisDeg < -30) scores["Inferior STEMI"] += 1.5;
    if (measurement.axis.meanQrsAxisDeg > 60) scores["Lateral STEMI"] += 1.4;
  }
  if (stDeviation <= -0.1 || amplitudes.stDeviationMm <= -0.5) scores["NSTEMI pattern"] += 1.6;
  if (morphology.includes("poor_r_progression") && stDeviation >= 0.1) scores["Posterior MI"] += 1.2;
  if (intervals.qrsDurationMs >= 120 && heartRate >= 150) scores["SVT"] += 1.0;
  if (intervals.qrsDurationMs >= 120 && heartRate >= 170) scores["VT"] += 1.5;
  if (heartRate >= 200) scores["VF"] += 1.2;
  if (measurement.rhythm === "irregular" && intervals.qrsDurationMs < 120) scores["PAC"] += 0.9;
  if (measurement.rhythm === "irregular" && intervals.qrsDurationMs >= 120) scores["PVC"] += 1.0;
  if (amplitudes.tWaveAmplitudeMv >= 0.7 && intervals.qrsDurationMs >= 110) scores["Hyperkalemia"] += 1.5;
  if (intervals.qtIntervalMs >= 440) scores["Hypokalemia"] += 1.1;

  return softmax(scores);
}

export async function predictFromOnnxLeads(leads: DigitizedLead[]): Promise<DiagnosisProbability[] | null> {
  try {
    const { hasLocalOnnxModel, resolveOnnxModelPath } = await import("../../ai/onnx-runtime.service.js");
    if (!hasLocalOnnxModel()) return null;
    const ort = await import("onnxruntime-node");
    const modelPath = resolveOnnxModelPath();
    if (!modelPath) return null;
    const session = await ort.InferenceSession.create(modelPath);
    const inputName = session.inputNames[0];
    const outputName = session.outputNames[0];
    if (!inputName || !outputName) return null;

    const inputMeta = session.inputMetadata as unknown as Record<string, { dimensions?: Array<number | string | null> }>;
    const metadata = inputMeta[inputName];
    const targetLength = typeof metadata?.dimensions?.[2] === "number" ? metadata.dimensions[2] : 2500;
    const ordered = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
    const byName = new Map(leads.map((lead) => [lead.lead, lead.samples]));
    const values = new Float32Array(12 * targetLength);
    ordered.forEach((leadName, leadIndex) => {
      const samples = byName.get(leadName) ?? [];
      const clipped = samples.slice(0, targetLength);
      while (clipped.length < targetLength) clipped.push(0);
      const mean = clipped.reduce((sum, value) => sum + value, 0) / Math.max(clipped.length, 1);
      const variance = clipped.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(clipped.length, 1);
      const std = Math.sqrt(variance) || 1;
      clipped.forEach((value, sampleIndex) => {
        values[leadIndex * targetLength + sampleIndex] = (value - mean) / std;
      });
    });

    const outputs = await session.run({
      [inputName]: new ort.Tensor("float32", values, [1, 12, targetLength]),
    });
    const logits = Array.from(outputs[outputName].data as Float32Array).slice(0, 5);
    const onnxLabels = [
      "normal_ecg",
      "atrial_fibrillation",
      "left_bundle_branch_block",
      "right_bundle_branch_block",
      "myocardial_infarction",
    ] as const;
    const probabilities = logits.map((value) => 1 / (1 + Math.exp(-value)));
    return onnxLabels.map((label, index) => ({
      label: ONNX_LABEL_TO_DIAGNOSIS[label],
      probability: Number((probabilities[index] ?? 0).toFixed(4)),
      source: "onnx" as const,
    }));
  } catch {
    return null;
  }
}

export async function predictDeepLearning(
  measurement: EcgClinicalMeasurementResult,
  interpretation: EcgClinicalInterpretation,
  leads: DigitizedLead[],
): Promise<DiagnosisProbability[]> {
  const feature = predictFromFeatureModel(measurement, interpretation);
  const onnx = await predictFromOnnxLeads(leads);
  if (!onnx) return feature.map((item) => ({ ...item, source: "deep_learning" as const }));

  const merged = new Map<AiDiagnosisLabel, number>();
  for (const item of feature) merged.set(item.label, (merged.get(item.label) ?? 0) + item.probability * 0.45);
  for (const item of onnx) merged.set(item.label, (merged.get(item.label) ?? 0) + item.probability * 0.55);
  const total = [...merged.values()].reduce((sum, value) => sum + value, 0) || 1;
  return AI_DIAGNOSIS_LABELS
    .map((label) => ({
      label,
      probability: Number(((merged.get(label) ?? 0) / total).toFixed(4)),
      source: "deep_learning" as const,
    }))
    .filter((item) => item.probability > 0.001)
    .sort((a, b) => b.probability - a.probability);
}
