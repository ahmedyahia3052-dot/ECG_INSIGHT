import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import type { EcgClinicalInterpretation } from "../ecg-interpretation/types";
import { LlmClient } from "../../llm/llm-client";
import type { DiagnosisProbability } from "./dl-predictor";
import type { AiDiagnosisLabel } from "./diagnosis-codes";

export async function generateLlmClinicalReasoning(input: {
  ensemblePrimary: AiDiagnosisLabel;
  measurement: EcgClinicalMeasurementResult;
  probabilities: DiagnosisProbability[];
  rulePrimary: string;
  ruleFindings: EcgClinicalInterpretation["findings"];
}): Promise<string> {
  const topFive = input.probabilities.slice(0, 5).map((item) => `${item.label}: ${Math.round(item.probability * 100)}%`).join(", ");
  const findings = input.ruleFindings.slice(0, 6).map((item) => `${item.label} (${item.evidence.map((row) => `${row.feature}=${row.value}`).join("; ")})`).join("\n");

  try {
    const result = await LlmClient.generateStream([
      {
        role: "system",
        content: "You are a cardiology assistant. Synthesize ECG ensemble results for physician review. Do not provide final treatment orders. Keep response under 180 words.",
      },
      {
        role: "user",
        content: [
          `Primary ensemble diagnosis: ${input.ensemblePrimary}`,
          `Rule engine primary: ${input.rulePrimary}`,
          `Top AI probabilities: ${topFive}`,
          `Heart rate: ${input.measurement.heartRate} bpm`,
          `PR/QRS/QT: ${input.measurement.intervals.prIntervalMs}/${input.measurement.intervals.qrsDurationMs}/${input.measurement.intervals.qtIntervalMs} ms`,
          `Rule findings:\n${findings}`,
          "Provide concise clinical reasoning and key differentials.",
        ].join("\n"),
      },
    ]);
    return result.content.trim();
  } catch {
    return `Ensemble diagnosis ${input.ensemblePrimary} combines rule-engine evidence (${input.rulePrimary}) with waveform model probabilities (${topFive}). Physician correlation with symptoms and repeat ECG is recommended.`;
  }
}
