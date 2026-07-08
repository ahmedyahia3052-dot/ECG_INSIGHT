import { composeAiClinicalReport } from "../ai-report-generator/composer";
import { generateClinicalReport as generateAiClinicalReport } from "../ai-report-generator/ai-report-generator.service";
import { diagnoseFromClinicalBundle, persistAiDiagnosis } from "../ecg-ai-diagnosis";
import { getClinicalKnowledgeById, getDifferentialForDiagnosis } from "../clinical-knowledge-engine";
import { runDiagnosticPipelineSync, toLegacyMeasurementResult } from "../ecg-diagnostic-engine";
import type { StructuredClinicalFinding } from "../ecg-diagnostic-engine/types";
import { runDigitizationPipeline } from "../ecg-digitization/digitizer";
import { mapPipelineToMeasurementDto, persistMeasurementEngineResult, validateMeasurementBundle } from "../ecg-measurement-engine";
import { MEASUREMENT_ENGINE_VERSION } from "../ecg-measurement-engine/types";
import { persistCaseMeasurement } from "../ecg-measurement";
import { interpretMeasurementBundle, persistCaseInterpretation } from "../ecg-interpretation";
import { runMedicalIntelligenceFromMeasurements } from "../medical-intelligence/orchestrator";
import { persistMedicalIntelligenceReport } from "../medical-intelligence/persist";
import { generateEnterpriseReport } from "../enterprise-report-engine/enterprise-report.service";
import type { EcgDiagnosticPipelineInput } from "./types";

export interface EcgDiagnosticPipelineDependencies {
  composeAiReport: typeof composeAiClinicalReport;
  diagnoseClinicalBundle: typeof diagnoseFromClinicalBundle;
  generateAiReport: typeof generateAiClinicalReport;
  generateEnterpriseReport: typeof generateEnterpriseReport;
  getClinicalKnowledgeById: typeof getClinicalKnowledgeById;
  getDifferentialForDiagnosis: typeof getDifferentialForDiagnosis;
  interpretMeasurementBundle: typeof interpretMeasurementBundle;
  mapPipelineToMeasurementDto: typeof mapPipelineToMeasurementDto;
  persistAiDiagnosis: typeof persistAiDiagnosis;
  persistCaseInterpretation: typeof persistCaseInterpretation;
  persistCaseMeasurement: typeof persistCaseMeasurement;
  persistMeasurementEngineResult: typeof persistMeasurementEngineResult;
  persistMedicalIntelligenceReport: typeof persistMedicalIntelligenceReport;
  runDiagnosticPipeline: typeof runDiagnosticPipelineSync;
  runDigitizationPipeline: typeof runDigitizationPipeline;
  runMedicalIntelligence: typeof runMedicalIntelligenceFromMeasurements;
  toLegacyMeasurement: typeof toLegacyMeasurementResult;
  validateMeasurementBundle: typeof validateMeasurementBundle;
}

export function createDefaultDiagnosticPipelineDependencies(): EcgDiagnosticPipelineDependencies {
  return {
    composeAiReport: composeAiClinicalReport,
    diagnoseClinicalBundle: diagnoseFromClinicalBundle,
    generateAiReport: generateAiClinicalReport,
    generateEnterpriseReport: generateEnterpriseReport,
    getClinicalKnowledgeById: getClinicalKnowledgeById,
    getDifferentialForDiagnosis: getDifferentialForDiagnosis,
    interpretMeasurementBundle: interpretMeasurementBundle,
    mapPipelineToMeasurementDto: mapPipelineToMeasurementDto,
    persistAiDiagnosis: persistAiDiagnosis,
    persistCaseInterpretation: persistCaseInterpretation,
    persistCaseMeasurement: persistCaseMeasurement,
    persistMeasurementEngineResult: persistMeasurementEngineResult,
    persistMedicalIntelligenceReport: persistMedicalIntelligenceReport,
    runDiagnosticPipeline: runDiagnosticPipelineSync,
    runDigitizationPipeline: runDigitizationPipeline,
    runMedicalIntelligence: runMedicalIntelligenceFromMeasurements,
    toLegacyMeasurement: toLegacyMeasurementResult,
    validateMeasurementBundle: validateMeasurementBundle,
  };
}

export function enrichFindingsWithClinicalKnowledge(
  findings: StructuredClinicalFinding[],
  deps: Pick<EcgDiagnosticPipelineDependencies, "getClinicalKnowledgeById" | "getDifferentialForDiagnosis">,
) {
  return findings.map((finding) => ({
    differentialDiagnoses: deps.getDifferentialForDiagnosis(finding.code),
    entry: deps.getClinicalKnowledgeById(finding.code),
    findingCode: finding.code,
    findingLabel: finding.label,
  }));
}

export function buildMeasurementEngineResult(
  diagnostic: ReturnType<typeof runDiagnosticPipelineSync>,
  deps: Pick<EcgDiagnosticPipelineDependencies, "mapPipelineToMeasurementDto" | "validateMeasurementBundle">,
) {
  const bundle = deps.mapPipelineToMeasurementDto(diagnostic);
  return {
    bundle,
    confidence: diagnostic.confidence.overall,
    engineVersion: MEASUREMENT_ENGINE_VERSION,
    performanceMs: diagnostic.performanceMs,
    validation: deps.validateMeasurementBundle(bundle),
  };
}

export function resolvePrimaryLead(input: EcgDiagnosticPipelineInput) {
  return input.leads.find((lead) => lead.lead === "II") ?? input.leads[0];
}
