import {
  AI_FOUNDATION_ID,
  AI_FOUNDATION_VERSION,
  PROMPT_CATALOG,
  checkAiRateLimit,
  getAiFoundationHealth,
  getAiFoundationStatus,
  hashPromptContent,
  inferenceResultCache,
  listManagedPrompts,
  listProviderDescriptors,
  promptManager,
  resetAiRateLimits,
  runClinicalReasoning,
  runEcgInterpretation,
  runInference,
  scoreEcgAnalysisConfidence,
  scoreLlmConfidence,
  validateInferenceRequest,
  validateMedicalEcgOutput,
  validateMedicalIntelligenceReport,
} from "../server/src/ai-foundation";
import { getAIProvider } from "../server/src/ai/providers";
import type { ECGAnalysisOutput } from "../server/src/ai/domain";
import type { EcgClinicalMeasurementResult } from "../server/src/modules/ecg-measurement/types";
import { runMedicalIntelligenceFromMeasurements } from "../server/src/modules/medical-intelligence";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function buildMeasurement(): EcgClinicalMeasurementResult {
  return {
    amplitudes: {
      pWaveAmplitudeMv: 0.15,
      qrsAmplitudeMv: 1.2,
      rWaveProgression: "normal",
      stDeviationMm: 0,
      tWaveAmplitudeMv: 0.4,
    },
    axis: { electricalAxisDeg: 45, frontalPlaneAxisDeg: 45, meanQrsAxisDeg: 45 },
    confidence: 0.85,
    heartRate: 75,
    intervals: {
      pWaveDurationMs: 90,
      prIntervalMs: 160,
      qrsDurationMs: 90,
      qtIntervalMs: 380,
      qtcBazettMs: 410,
      qtcFridericiaMs: 400,
      rrIntervalMs: 800,
    },
    morphology: [],
    rhythm: "sinus_rhythm",
    stDeviation: 0,
    measurements: [],
  };
}

function testVersionAndCatalog() {
  assert(AI_FOUNDATION_VERSION === "81.0.0", "Foundation version must be 81.0.0");
  assert(AI_FOUNDATION_ID === "ecg-insight-ai-foundation", "Foundation id required");
  assert(PROMPT_CATALOG.length >= 4, "Prompt catalog must include 4+ templates");
  assert(listManagedPrompts().every((prompt) => prompt.version), "All prompts must be versioned");
  console.log("  ✓ Versioning and prompt catalog");
}

function testPromptManager() {
  const rendered = promptManager.render("ecg.interpretation.v1", {
    variables: {
      heartRate: "75",
      prIntervalMs: "160",
      qrsDurationMs: "90",
      qtcBazettMs: "410",
      rhythm: "sinus_rhythm",
      stDeviationMm: "0",
    },
  });
  assert(rendered.content.includes("75"), "Prompt variables must substitute");
  assert(rendered.hash === hashPromptContent(rendered.content), "Prompt hash must be stable");
  console.log("  ✓ Prompt manager rendering and hashing");
}

async function testProviderRegistry() {
  const providers = await listProviderDescriptors();
  assert(providers.length >= 2, "ECG and LLM provider descriptors required");
  console.log("  ✓ Provider registry");
}

async function testFoundationHealth() {
  const health = await getAiFoundationHealth();
  assert(health.foundationId === AI_FOUNDATION_ID, "Health must include foundation id");
  assert(["ok", "degraded", "offline"].includes(health.status), "Health status must be valid");
  assert(health.providers.length >= 1, "Health must list providers");
  const status = getAiFoundationStatus();
  assert(status.version === AI_FOUNDATION_VERSION, "Status version required");
  console.log("  ✓ Foundation health and status");
}

function testClinicalReasoning() {
  const measurement = buildMeasurement();
  const result = runClinicalReasoning({ measurement, includePromptSummary: true });
  assert(result.report.findings.length > 0, "Clinical reasoning must produce findings");
  assert(result.confidence.score >= 0 && result.confidence.score <= 1, "Confidence must be normalized");
  assert(result.explainability.summary.length > 0, "Explainability summary required");
  assert(validateMedicalIntelligenceReport(result.report).valid, "Medical report must validate");
  console.log("  ✓ Clinical reasoning layer");
}

function testEcgInterpretationInterface() {
  const interpretation = runEcgInterpretation({ measurement: buildMeasurement() });
  assert(interpretation.engineVersion, "Interpretation must include engine version");
  assert(interpretation.rate, "Interpretation must include rate section");
  console.log("  ✓ ECG interpretation model interface");
}

function testConfidenceScoring() {
  const sampleOutput: ECGAnalysisOutput = {
    clinicalSeverity: "LOW",
    confidenceScore: 0.82,
    confidenceScorePercent: 82,
    detectedAbnormalities: [],
    featureExtraction: {
      heartRate: 75,
      prIntervalMs: 160,
      qrsDurationMs: 90,
      qtIntervalMs: 380,
      qtcIntervalMs: 410,
      rhythmRegularity: 0.9,
      stDepressionMm: 0,
      stElevationMm: 0,
      tWaveAbnormalities: [],
    },
    heartRate: 75,
    interpretation: "Normal sinus rhythm.",
    interpretationRationale: ["Regular rhythm", "Normal intervals"],
    primaryDiagnosis: "Normal Sinus Rhythm",
    provider: { modelVersion: "test", name: "rule_based" },
    recommendations: ["Routine follow-up"],
    rhythm: "sinus",
    secondaryDiagnoses: [],
    severity: "NORMAL",
    urgentActions: [],
  };

  const confidence = scoreEcgAnalysisConfidence(sampleOutput);
  assert(confidence.level === "high" || confidence.level === "medium", "ECG confidence level expected");
  assert(validateMedicalEcgOutput(sampleOutput).valid, "Structured ECG output must validate");

  const llmConfidence = scoreLlmConfidence("This may be uncertain but suggests sinus rhythm.");
  assert(llmConfidence.score < 0.7, "Uncertainty language should reduce LLM confidence");
  console.log("  ✓ Confidence scoring and medical validation");
}

function testRateLimitAndCache() {
  resetAiRateLimits();
  inferenceResultCache.clear();

  const allowed = checkAiRateLimit("test-actor", "clinical_reasoning", { maxRequests: 2, windowMs: 60_000 });
  assert(allowed.allowed, "First request must be allowed");

  checkAiRateLimit("test-actor", "clinical_reasoning", { maxRequests: 2, windowMs: 60_000 });
  const blocked = checkAiRateLimit("test-actor", "clinical_reasoning", { maxRequests: 2, windowMs: 60_000 });
  assert(!blocked.allowed, "Third request must be rate limited");

  const measurement = buildMeasurement();
  const cacheKey = `clinical-${measurement.heartRate}`;
  inferenceResultCache.set(cacheKey, { kind: "clinical_reasoning", cached: false } as never);
  assert(inferenceResultCache.get(cacheKey), "Cache must store inference results");
  console.log("  ✓ Rate limiting and caching");
}

function testInferenceValidation() {
  const invalid = validateInferenceRequest({ kind: "ecg_analysis" });
  assert(!invalid.valid, "ECG inference without case must fail validation");

  const valid = validateInferenceRequest({
    kind: "clinical_reasoning",
    measurement: buildMeasurement(),
  });
  assert(valid.valid, "Clinical reasoning with measurement must validate");
  console.log("  ✓ Inference request validation");
}

async function testClinicalReasoningInference() {
  const result = await runInference({
    actor: { actorId: "test-actor" },
    kind: "clinical_reasoning",
    measurement: buildMeasurement(),
    skipCache: true,
  });
  assert(result.kind === "clinical_reasoning", "Inference kind must match");
  assert(result.validation.valid, "Inference result must be medically valid");
  assert(result.version.foundationVersion === AI_FOUNDATION_VERSION, "Inference must tag foundation version");
  console.log("  ✓ Inference service (clinical reasoning)");
}

function testMedicalIntelligenceBridge() {
  const report = runMedicalIntelligenceFromMeasurements(buildMeasurement());
  assert(report.engineId, "Medical intelligence engine id required");
  console.log("  ✓ Medical intelligence bridge");
}

function testEcgProviderAvailable() {
  const provider = getAIProvider();
  assert(provider.name, "ECG provider must resolve");
  console.log("  ✓ ECG provider abstraction reachable");
}

async function main() {
  console.log("Sprint 81 — AI Engine Foundation tests\n");
  testVersionAndCatalog();
  testPromptManager();
  await testProviderRegistry();
  await testFoundationHealth();
  testClinicalReasoning();
  testEcgInterpretationInterface();
  testConfidenceScoring();
  testRateLimitAndCache();
  testInferenceValidation();
  await testClinicalReasoningInference();
  testMedicalIntelligenceBridge();
  testEcgProviderAvailable();
  console.log("\nAll Sprint 81 AI foundation tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
