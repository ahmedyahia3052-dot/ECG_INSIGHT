import { runMedicalIntelligenceFromMeasurements, evaluateAllMedicalRules, KNOWLEDGE_BASE, listRuleDefinitions } from "../server/src/modules/medical-intelligence";
import type { EcgClinicalMeasurementResult } from "../server/src/modules/ecg-measurement/types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function buildMeasurement(overrides: Partial<EcgClinicalMeasurementResult> = {}): EcgClinicalMeasurementResult {
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
    ...overrides,
  };
}

function testKnowledgeBase() {
  assert(KNOWLEDGE_BASE.length >= 35, "Knowledge base must contain 35+ diagnoses");
  const required = ["NSR", "AF", "STEMI", "VT", "LBBB", "HYPERK", "WPW", "BRUGADA"];
  for (const code of required) {
    assert(KNOWLEDGE_BASE.some((e) => e.code === code), `Missing knowledge entry: ${code}`);
  }
  for (const entry of KNOWLEDGE_BASE) {
    assert(entry.diagnosticCriteria.length > 0, `${entry.code} must have diagnostic criteria`);
    assert(entry.ecgCharacteristics.length > 0, `${entry.code} must have ECG characteristics`);
    assert(entry.differentialDiagnosis.length > 0, `${entry.code} must have differential diagnosis`);
    assert(entry.guidelineReferences.length > 0, `${entry.code} must have guideline references`);
  }
  console.log("  ✓ Knowledge base structure validated");
}

function testRuleEngine() {
  const rules = listRuleDefinitions();
  assert(rules.length >= 30, "Rule engine must define 30+ rules");

  const nsrMeasurement = buildMeasurement();
  const nsrFindings = evaluateAllMedicalRules(nsrMeasurement);
  assert(nsrFindings.some((f) => f.code === "NSR"), "NSR must be detected for normal sinus rhythm");

  const afMeasurement = buildMeasurement({ rhythm: "irregular", heartRate: 110 });
  const afFindings = evaluateAllMedicalRules(afMeasurement);
  assert(afFindings.some((f) => f.code === "AF"), "AF must be detected for irregular tachycardia");

  const stemiMeasurement = buildMeasurement({
    amplitudes: { pWaveAmplitudeMv: 0.15, qrsAmplitudeMv: 1.2, rWaveProgression: "normal", stDeviationMm: 2.5, tWaveAmplitudeMv: 0.6 },
    stDeviation: 0.3,
  });
  const stemiFindings = evaluateAllMedicalRules(stemiMeasurement);
  assert(stemiFindings.some((f) => f.code === "STEMI"), "STEMI must be detected for ST elevation");

  const bradycardiaMeasurement = buildMeasurement({ heartRate: 48, rhythm: "sinus_bradycardia" });
  const bradFindings = evaluateAllMedicalRules(bradycardiaMeasurement);
  assert(bradFindings.some((f) => f.code === "SBRAD"), "Sinus bradycardia must be detected");

  console.log("  ✓ Rule engine clinical validation passed");
}

function testFullPipeline() {
  const report = runMedicalIntelligenceFromMeasurements(buildMeasurement());
  assert(report.version === "1.0.0", "Report version required");
  assert(report.engineId === "ecg-medical-intelligence-engine", "Engine ID required");
  assert(report.findings.length > 0, "Findings required");
  assert(report.primaryDiagnosis.label.length > 0, "Primary diagnosis required");
  assert(["high", "medium", "low", "unknown"].includes(report.overallConfidence.level), "Confidence level required");
  assert(report.recommendations.length > 0, "Recommendations required");
  assert(report.explainabilitySummary.length > 0, "Explainability summary required");
  assert(Object.keys(report.measurements).length >= 10, "Measurements bundle required");

  for (const finding of report.findings) {
    assert(finding.confidence.explanation.length > 0, "Each finding must have confidence explanation");
    assert(finding.explainability.supportingEvidence.length > 0, "Each finding must have supporting evidence");
    assert(finding.differentialDiagnosis.length <= 5, "Max 5 differential diagnoses");
    assert(finding.differentialDiagnosis.every((d) => d.rank >= 1), "Differential must be ranked");
  }

  const criticalReport = runMedicalIntelligenceFromMeasurements(buildMeasurement({
    amplitudes: { pWaveAmplitudeMv: 0.15, qrsAmplitudeMv: 1.2, rWaveProgression: "normal", stDeviationMm: 2.5, tWaveAmplitudeMv: 0.6 },
    stDeviation: 0.3,
  }));
  assert(criticalReport.criticalFindings.length > 0, "STEMI must produce critical findings");
  assert(criticalReport.recommendations.some((r) => r.type === "emergency_referral" || r.type === "serial_troponin"), "STEMI must trigger ACS recommendations");

  console.log("  ✓ Full pipeline integration validated");
}

function testConcurrentFindings() {
  const measurement = buildMeasurement({
    intervals: {
      pWaveDurationMs: 90,
      prIntervalMs: 220,
      qrsDurationMs: 130,
      qtIntervalMs: 380,
      qtcBazettMs: 410,
      qtcFridericiaMs: 400,
      rrIntervalMs: 800,
    },
    axis: { electricalAxisDeg: -60, frontalPlaneAxisDeg: -60, meanQrsAxisDeg: -60 },
  });
  const report = runMedicalIntelligenceFromMeasurements(measurement);
  assert(report.findings.length >= 2, "Multiple concurrent findings must be supported");
  const categories = new Set(report.findings.map((f) => f.category));
  assert(categories.size >= 2, "Findings should span multiple categories");
  console.log("  ✓ Concurrent findings validated");
}

function main() {
  console.log("medical-intelligence-engine.test.ts");
  testKnowledgeBase();
  testRuleEngine();
  testFullPipeline();
  testConcurrentFindings();
  console.log("medical-intelligence-engine.test.ts: all tests passed");
}

main();
