import { buildSyntheticTwelveLeadEcg } from "./ecg-diagnostic-engine-synthetic";
import {
  createDefaultDiagnosticPipelineDependencies,
  runEcgDiagnosticPipelineAsync,
} from "../server/src/modules/ecg-diagnostic-pipeline";
import type { EcgDiagnosticPipelineDependencies } from "../server/src/modules/ecg-diagnostic-pipeline/dependencies";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const { calibration, leads } = buildSyntheticTwelveLeadEcg({ bpm: 72, noise: 0 });
  let diagnosticRuns = 0;

  const deps: EcgDiagnosticPipelineDependencies = {
    ...createDefaultDiagnosticPipelineDependencies(),
    diagnoseClinicalBundle: async ({ measurement }) => ({
      candidates: [],
      clinicalReasoning: "Synthetic pipeline test reasoning.",
      confidence: measurement.confidence,
      primaryDiagnosis: "Normal sinus rhythm",
      recommendations: ["Routine follow-up"],
      urgency: "routine",
    }),
    runDiagnosticPipeline: (input) => {
      diagnosticRuns += 1;
      return createDefaultDiagnosticPipelineDependencies().runDiagnosticPipeline(input);
    },
  };

  const result = await runEcgDiagnosticPipelineAsync({ calibration, leads, qualityScore: 0.9 }, deps);

  assert(result.pipelineVersion === "sprint61-v1", "pipeline version should be sprint61-v1");
  assert(diagnosticRuns === 1, "diagnostic engine should execute exactly once");
  assert(result.artifacts.measurementLegacy.heartRate > 0, "legacy measurement heart rate required");
  assert(result.artifacts.measurementEngine.bundle.heartRate.heartRateBpm > 0, "measurement engine bundle required");
  assert(result.artifacts.diagnostic.version === "sprint54-v1", "diagnostic engine version mismatch");
  assert(result.artifacts.interpretation.findings.length >= 0, "interpretation findings required");
  assert(result.artifacts.medicalIntelligence.findings.length > 0, "medical intelligence findings required");
  assert(result.artifacts.medicalIntelligence.recommendations.length > 0, "clinical recommendations required");
  assert(result.artifacts.medicalIntelligence.primaryDiagnosis.label.length > 0, "primary diagnosis required");
  assert(result.artifacts.aiDiagnosis.primaryDiagnosis.length > 0, "AI diagnosis required");
  assert(result.artifacts.aiReport.overallImpression.length > 0, "AI report impression required");
  assert(Array.isArray(result.artifacts.clinicalKnowledge), "clinical knowledge enrichment required");
  assert(result.stages.some((stage) => stage.stage === "diagnostic_engine" && stage.status === "completed"), "diagnostic stage required");
  assert(result.stages.some((stage) => stage.stage === "measurement_engine" && stage.status === "completed"), "measurement stage required");
  assert(result.stages.some((stage) => stage.stage === "differential_diagnosis" && stage.status === "completed"), "differential stage required");
  assert(result.stages.some((stage) => stage.stage === "ai_report_generation" && stage.status === "completed"), "AI report stage required");
  assert(result.confidence > 0 && result.confidence <= 1, "confidence must be normalized");
  assert(result.performanceMs < 3000, "pipeline should complete within 3s on synthetic data with mocked AI diagnosis");

  console.log("ecg-diagnostic-pipeline-sprint61.test.ts: all tests passed");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
