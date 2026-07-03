import { runDigitizationPipeline } from "../ecg-digitization/digitizer";
import { measureFromLeads } from "../ecg-measurement";
import { interpretFromMeasurement } from "../ecg-interpretation";
import { runEnsembleDiagnosis } from "../ecg-ai-diagnosis";
import type { AiDiagnosisLabel } from "../ecg-ai-diagnosis/diagnosis-codes";
import { ensureSampleImage } from "./datasets";
import type { BenchmarkCasePipelineResult, BenchmarkSample } from "./types";

function predictedLabels(primary: AiDiagnosisLabel, topDiagnoses: Array<{ label: AiDiagnosisLabel; probability: number }>) {
  const labels = new Set<AiDiagnosisLabel>([primary]);
  for (const item of topDiagnoses) {
    if (item.probability >= 0.25) labels.add(item.label);
  }
  return [...labels];
}

function isCorrect(groundTruth: AiDiagnosisLabel[], primaryPrediction: AiDiagnosisLabel, predicted: AiDiagnosisLabel[]) {
  if (groundTruth.includes(primaryPrediction)) return true;
  return predicted.some((label) => groundTruth.includes(label));
}

export async function runBenchmarkPipelineCase(sample: BenchmarkSample, imageDir: string): Promise<BenchmarkCasePipelineResult> {
  const started = Date.now();
  const imagePath = await ensureSampleImage(sample, imageDir);
  const file = {
    id: sample.externalId,
    metadataJson: {},
    mimeType: "image/png",
    originalName: `${sample.externalId}.png`,
    sizeBytes: 0,
    storagePath: imagePath,
  };

  const digitization = await runDigitizationPipeline(file);
  const measurement = measureFromLeads({ calibration: digitization.calibration, leads: digitization.leads });
  const interpretation = interpretFromMeasurement(measurement);
  const aiDiagnosis = await runEnsembleDiagnosis({
    imageAvailable: true,
    interpretation,
    leads: digitization.leads,
    measurement,
    qualityScore: digitization.quality.score,
  });

  const primaryGroundTruth = sample.groundTruthLabels[0] ?? "Normal ECG";
  const primaryPrediction = aiDiagnosis.primaryDiagnosis;
  const labels = predictedLabels(primaryPrediction, aiDiagnosis.topDiagnoses);

  return {
    aiDiagnosis,
    correct: isCorrect(sample.groundTruthLabels, primaryPrediction, labels),
    digitization,
    durationMs: Date.now() - started,
    externalId: sample.externalId,
    groundTruthLabels: sample.groundTruthLabels,
    interpretation,
    measurement,
    predictedLabels: labels,
    primaryGroundTruth,
    primaryPrediction,
  };
}
