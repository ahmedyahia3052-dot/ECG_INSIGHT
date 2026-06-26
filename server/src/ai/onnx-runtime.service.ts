import fs from "node:fs";
import path from "node:path";
import type { AISeverity } from "@prisma/client";
import type { InferenceSession } from "onnxruntime-node";
import { prisma } from "../config/prisma";
import { reconstructCaseEcg } from "../modules/ecg-processing/ecg-digitization.service";
import type { ECGAnalysisInput, ECGAnalysisOutput, ECGDiagnosis, ECGFeatureExtraction } from "./domain";
import { analyzeECG } from "./engine";
import type { AIProvider } from "./providers";

const WORKSPACE_ROOT = path.resolve(__dirname, "../../..");
const LABELS = [
  "normal_ecg",
  "atrial_fibrillation",
  "left_bundle_branch_block",
  "right_bundle_branch_block",
  "myocardial_infarction",
] as const;

const DIAGNOSIS_BY_LABEL: Record<(typeof LABELS)[number], ECGDiagnosis> = {
  atrial_fibrillation: "Atrial Fibrillation",
  left_bundle_branch_block: "LBBB",
  myocardial_infarction: "Myocardial Infarction",
  normal_ecg: "Normal ECG",
  right_bundle_branch_block: "RBBB",
};

type OnnxRuntimeModule = typeof import("onnxruntime-node");

let cachedRuntime: OnnxRuntimeModule | null = null;
let cachedSession: InferenceSession | null = null;
let cachedModelPath: string | null = null;

function candidateModelPaths() {
  return [
    process.env["AI_ONNX_MODEL_PATH"],
    path.join(WORKSPACE_ROOT, "ai-engine", "runs", "first-real-ecg-model", "model.onnx"),
    path.join(WORKSPACE_ROOT, "ai-engine", "artifacts", "model.onnx"),
    path.join(WORKSPACE_ROOT, "ai-engine", "model.onnx"),
  ].filter(Boolean) as string[];
}

export function resolveOnnxModelPath() {
  return candidateModelPaths().find((candidate) => fs.existsSync(candidate)) ?? null;
}

export function hasLocalOnnxModel() {
  return resolveOnnxModelPath() !== null;
}

async function loadRuntime() {
  cachedRuntime ??= await import("onnxruntime-node");
  return cachedRuntime;
}

async function loadSession() {
  const modelPath = resolveOnnxModelPath();
  if (!modelPath) return null;
  if (cachedSession && cachedModelPath === modelPath) return cachedSession;
  const ort = await loadRuntime();
  cachedSession = await ort.InferenceSession.create(modelPath);
  cachedModelPath = modelPath;
  return cachedSession;
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function inputSampleCount(session: InferenceSession) {
  const inputName = session.inputNames[0];
  const metadataByName = session.inputMetadata as unknown as Record<string, { dimensions?: Array<number | string | null> }>;
  const metadata = inputName ? metadataByName[inputName] : undefined;
  const dims = metadata?.dimensions ?? [];
  const sampleDim = dims[2];
  return typeof sampleDim === "number" && Number.isFinite(sampleDim) && sampleDim > 0 ? sampleDim : 2500;
}

function normalizeLead(samples: number[], targetLength: number) {
  const clipped = samples.slice(0, targetLength);
  while (clipped.length < targetLength) clipped.push(0);
  const mean = clipped.reduce((sum, value) => sum + value, 0) / Math.max(clipped.length, 1);
  const variance = clipped.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(clipped.length, 1);
  const std = Math.sqrt(variance) || 1;
  return clipped.map((value) => (value - mean) / std);
}

async function loadCaseTensor(input: ECGAnalysisInput, actorId: string, targetLength: number) {
  const latestFile = await prisma.eCGFile.findFirst({
    orderBy: { createdAt: "desc" },
    where: { caseId: input.case.id },
  });
  if (!latestFile) return null;

  let leadSignals = await prisma.eCGLeadSignal.findMany({
    orderBy: { leadName: "asc" },
    where: { ecgFileId: latestFile.id },
  });
  if (leadSignals.length < 12) {
    await reconstructCaseEcg(input.case.id, actorId).catch(() => null);
    leadSignals = await prisma.eCGLeadSignal.findMany({
      orderBy: { leadName: "asc" },
      where: { ecgFileId: latestFile.id },
    });
  }
  if (leadSignals.length < 12) return null;

  const orderedLeadNames = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
  const byName = new Map(leadSignals.map((lead) => [lead.leadName, lead.signalData]));
  const values = new Float32Array(12 * targetLength);
  orderedLeadNames.forEach((leadName, leadIndex) => {
    const normalized = normalizeLead(byName.get(leadName) ?? leadSignals[leadIndex]?.signalData ?? [], targetLength);
    normalized.forEach((value, sampleIndex) => {
      values[leadIndex * targetLength + sampleIndex] = value;
    });
  });
  return values;
}

function severityForDiagnosis(diagnosis: ECGDiagnosis): AISeverity {
  if (diagnosis === "Myocardial Infarction" || diagnosis === "STEMI") return "SEVERE";
  if (diagnosis === "Atrial Fibrillation" || diagnosis === "LBBB") return "MODERATE";
  if (diagnosis === "RBBB") return "MILD";
  return "NORMAL";
}

function featureExtractionFor(input: ECGAnalysisInput, diagnosis: ECGDiagnosis): ECGFeatureExtraction {
  const measurement = input.measurement;
  return {
    heartRate: measurement?.heartRate ?? (diagnosis === "Atrial Fibrillation" ? 92 : diagnosis === "Myocardial Infarction" ? 88 : 72),
    prIntervalMs: measurement?.prInterval ?? 160,
    qrsDurationMs: measurement?.qrsDuration ?? (diagnosis === "LBBB" || diagnosis === "RBBB" ? 132 : 92),
    qtIntervalMs: measurement?.qtInterval ?? 390,
    qtcIntervalMs: measurement?.qtcInterval ?? 420,
    rhythmRegularity: measurement?.rhythmRegularity ?? (diagnosis === "Atrial Fibrillation" ? 0.56 : 0.94),
    stDepressionMm: measurement?.stDeviation && measurement.stDeviation < 0 ? Math.abs(measurement.stDeviation) : 0,
    stElevationMm: measurement?.stDeviation && measurement.stDeviation > 0 ? measurement.stDeviation : 0,
    tWaveAbnormalities: diagnosis === "Myocardial Infarction" ? ["Ischemic ST-T pattern requires physician review"] : [],
  };
}

export class LocalOnnxProvider implements AIProvider {
  modelVersion = "ecg-insight-onnx-runtime-v1.0.0";
  name = "onnx_runtime" as const;

  async analyze(input: ECGAnalysisInput & { actorId?: string }): Promise<ECGAnalysisOutput> {
    try {
      const session = await loadSession();
      if (!session) return fallbackAnalysis(input);
      const inputName = session.inputNames[0];
      const outputName = session.outputNames[0];
      if (!inputName || !outputName) return fallbackAnalysis(input);

      const targetLength = inputSampleCount(session);
      const tensorValues = await loadCaseTensor(input, input.actorId ?? input.case.uploadedById, targetLength);
      if (!tensorValues) {
        return fallbackWithReason(input, "Local ONNX model found, but digitized 12-lead signal extraction was unavailable; rule-based engine used.");
      }

      const ort = await loadRuntime();
      const started = Date.now();
      const feeds = {
        [inputName]: new ort.Tensor("float32", tensorValues, [1, 12, targetLength]),
      };
      const outputs = await session.run(feeds);
      const output = outputs[outputName];
      const logits = Array.from(output.data as Float32Array | number[]).slice(0, LABELS.length);
      const probabilities = logits.map(sigmoid);
      const bestIndex = probabilities.reduce((best, value, index) => (value > probabilities[best] ? index : best), 0);
      const label = LABELS[bestIndex] ?? "normal_ecg";
      const diagnosis = DIAGNOSIS_BY_LABEL[label];
      const confidenceScore = Number((probabilities[bestIndex] ?? 0).toFixed(4));
      const severity = severityForDiagnosis(diagnosis);
      const featureExtraction = featureExtractionFor(input, diagnosis);
      const positiveLabels = LABELS
        .map((candidate, index) => ({ confidenceScore: probabilities[index] ?? 0, diagnosis: DIAGNOSIS_BY_LABEL[candidate] }))
        .filter((candidate) => candidate.confidenceScore >= 0.5 && candidate.diagnosis !== diagnosis);

      return {
        clinicalSeverity: severity === "SEVERE" || severity === "CRITICAL" ? "HIGH" : severity === "MODERATE" ? "MODERATE" : "LOW",
        confidenceScore,
        confidenceScorePercent: Math.round(confidenceScore * 100),
        detectedAbnormalities: diagnosis === "Normal ECG" ? [] : [diagnosis],
        featureExtraction,
        heartRate: featureExtraction.heartRate,
        interpretation:
          `Local ONNX ECG model predicted ${diagnosis} with ${Math.round(confidenceScore * 100)}% confidence. ` +
          "This result must be reviewed by a qualified clinician before clinical use.",
        interpretationRationale: [
          `Model path: ${cachedModelPath}`,
          `ONNX Runtime inference completed in ${Date.now() - started}ms.`,
          ...LABELS.map((candidate, index) => `${DIAGNOSIS_BY_LABEL[candidate]}: ${Math.round((probabilities[index] ?? 0) * 100)}%`),
        ],
        primaryDiagnosis: diagnosis,
        provider: {
          modelVersion: `${this.modelVersion}:${path.basename(cachedModelPath ?? "model.onnx")}`,
          name: this.name,
        },
        recommendations: [
          "Review AI prediction alongside the original ECG image and extracted measurements.",
          "Confirm diagnosis and management plan by physician review.",
        ],
        rhythm: diagnosis === "Atrial Fibrillation" ? "Irregularly irregular" : "Model-derived rhythm assessment",
        secondaryDiagnoses: positiveLabels.map((candidate) => ({
          confidenceScore: Number(candidate.confidenceScore.toFixed(4)),
          diagnosis: candidate.diagnosis,
          evidence: ["Secondary ONNX model probability above threshold."],
          severity: severityForDiagnosis(candidate.diagnosis),
        })),
        severity,
        urgentActions: severity === "SEVERE" ? ["Expedite clinician review for possible ischemic ECG pattern."] : [],
      };
    } catch (error) {
      return fallbackWithReason(input, `Local ONNX inference failed: ${error instanceof Error ? error.message : "unknown error"}. Rule-based engine used.`);
    }
  }
}

function fallbackAnalysis(input: ECGAnalysisInput): ECGAnalysisOutput {
  return analyzeECG(input);
}

function fallbackWithReason(input: ECGAnalysisInput, reason: string): ECGAnalysisOutput {
  const fallback = fallbackAnalysis(input);
  return {
    ...fallback,
    interpretationRationale: [...fallback.interpretationRationale, reason],
  };
}
