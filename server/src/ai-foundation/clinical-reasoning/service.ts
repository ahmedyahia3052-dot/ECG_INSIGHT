import {
  ENGINE_ID,
  ENGINE_VERSION,
  runMedicalIntelligenceFromMeasurements,
} from "../../modules/medical-intelligence/orchestrator";
import type { MedicalIntelligenceInput, MedicalIntelligenceReport } from "../../modules/medical-intelligence/types";
import { promptManager } from "../prompts/manager";
import { validateMedicalIntelligenceReport } from "../validation/medical-validator";
import { scoreClinicalReasoningConfidence } from "../confidence/service";
import { buildClinicalExplainability } from "../explainability/service";
import type { AiInferenceResult } from "../types";
import { buildVersionTag } from "../version";

export interface ClinicalReasoningOptions {
  measurement: MedicalIntelligenceInput["measurement"];
  clinicalContext?: MedicalIntelligenceInput["clinicalContext"];
  includePromptSummary?: boolean;
}

export function runClinicalReasoning(options: ClinicalReasoningOptions): {
  report: MedicalIntelligenceReport;
  confidence: ReturnType<typeof scoreClinicalReasoningConfidence>;
  explainability: ReturnType<typeof buildClinicalExplainability>;
  validation: ReturnType<typeof validateMedicalIntelligenceReport>;
  promptSummary?: string;
} {
  const report = runMedicalIntelligenceFromMeasurements(options.measurement, options.clinicalContext);
  const confidence = scoreClinicalReasoningConfidence(report);
  const explainability = buildClinicalExplainability(report);
  const validation = validateMedicalIntelligenceReport(report);

  let promptSummary: string | undefined;
  if (options.includePromptSummary && report.findings[0]) {
    const primary = report.findings[0];
    const rendered = promptManager.render("clinical.reasoning.v1", {
      variables: {
        confidenceScore: String(confidence.score),
        primaryFinding: primary.label,
        severity: primary.severity,
        urgency: primary.urgency,
      },
    });
    promptSummary = rendered.content;
  }

  return { confidence, explainability, promptSummary, report, validation };
}

export function toClinicalReasoningResult(
  options: ClinicalReasoningOptions,
  latencyMs: number,
): AiInferenceResult<MedicalIntelligenceReport> {
  const { confidence, explainability, report, validation } = runClinicalReasoning(options);
  return {
    cached: false,
    confidence,
    explainability,
    kind: "clinical_reasoning",
    latencyMs,
    output: report,
    validation,
    version: buildVersionTag({
      engineVersion: `${ENGINE_ID}:${ENGINE_VERSION}`,
      providerName: "rule_engine",
    }),
  };
}
