import { performance } from "node:perf_hooks";
import type { Patient, ECGCase } from "@prisma/client";
import type { ComposedAiReport } from "../ai-report-generator/types";
import {
  buildMeasurementEngineResult,
  createDefaultDiagnosticPipelineDependencies,
  enrichFindingsWithClinicalKnowledge,
  resolvePrimaryLead,
  type EcgDiagnosticPipelineDependencies,
} from "./dependencies";
import type { DiagnosticPipelineStageRecord, EcgDiagnosticPipelineInput, EcgDiagnosticPipelineResult } from "./types";
import { DIAGNOSTIC_PIPELINE_VERSION } from "./types";

function stageRecord(
  stage: DiagnosticPipelineStageRecord["stage"],
  started: number,
  status: DiagnosticPipelineStageRecord["status"] = "completed",
): DiagnosticPipelineStageRecord {
  return {
    durationMs: Math.round(performance.now() - started),
    stage,
    status,
  };
}

function buildSyntheticReportContext() {
  const ecgCase: Pick<ECGCase, "caseId" | "caseNumber" | "clinicalNotes" | "finalDiagnosis"> = {
    caseId: "pipeline-synthetic",
    caseNumber: "PIPE-0001",
    clinicalNotes: null,
    finalDiagnosis: null,
  };
  const patient: Pick<
    Patient,
    "company" | "dateOfBirth" | "departmentName" | "firstName" | "gender" | "lastName" | "middleName" | "occupation" | "patientCode"
  > = {
    company: null,
    dateOfBirth: new Date("1980-01-01"),
    departmentName: null,
    firstName: "Synthetic",
    gender: "UNKNOWN",
    lastName: "Patient",
    middleName: null,
    occupation: null,
    patientCode: "SYN-001",
  };
  return { ecgCase, patient };
}

async function composePipelineAiReport(
  deps: EcgDiagnosticPipelineDependencies,
  measurementLegacy: EcgDiagnosticPipelineResult["artifacts"]["measurementLegacy"],
  context?: {
    ecgCase: Pick<ECGCase, "caseId" | "caseNumber" | "clinicalNotes" | "finalDiagnosis">;
    patient: Pick<
      Patient,
      "company" | "dateOfBirth" | "departmentName" | "firstName" | "gender" | "lastName" | "middleName" | "occupation" | "patientCode"
    >;
  },
): Promise<ComposedAiReport> {
  const reportContext = context ?? buildSyntheticReportContext();
  return deps.composeAiReport({
    ecgCase: reportContext.ecgCase,
    measurement: measurementLegacy,
    patient: reportContext.patient,
  });
}

/** Unified diagnostic pipeline — runs each backend engine once via dependency injection. */
export async function runEcgDiagnosticPipelineAsync(
  input: EcgDiagnosticPipelineInput,
  deps: EcgDiagnosticPipelineDependencies = createDefaultDiagnosticPipelineDependencies(),
  reportContext?: Parameters<typeof composePipelineAiReport>[2],
): Promise<EcgDiagnosticPipelineResult> {
  const pipelineStarted = performance.now();
  const stages: DiagnosticPipelineStageRecord[] = [];
  const qualityScore = input.qualityScore ?? 0.75;
  const primaryLead = resolvePrimaryLead(input);

  if (!primaryLead?.samples.length) {
    throw new Error("Diagnostic pipeline requires at least one lead with samples.");
  }

  const digitizationStarted = performance.now();
  stages.push(stageRecord("image_processing", digitizationStarted));
  stages.push(stageRecord("lead_detection", digitizationStarted));
  stages.push(stageRecord("signal_digitization", digitizationStarted));

  const diagnosticStarted = performance.now();
  const diagnostic = deps.runDiagnosticPipeline({ calibration: input.calibration, leads: input.leads });
  stages.push(stageRecord("diagnostic_engine", diagnosticStarted));

  const measurementStarted = performance.now();
  const measurementLegacy = deps.toLegacyMeasurement(diagnostic, primaryLead.samplingRate);
  const measurementEngine = buildMeasurementEngineResult(diagnostic, deps);
  stages.push(stageRecord("measurement_engine", measurementStarted));

  const knowledgeStarted = performance.now();
  const clinicalKnowledge = enrichFindingsWithClinicalKnowledge(diagnostic.structuredFindings, deps);
  stages.push(stageRecord("clinical_knowledge_engine", knowledgeStarted));

  const interpretation = deps.interpretMeasurementBundle(measurementLegacy);

  const medIntelStarted = performance.now();
  const medicalIntelligence = deps.runMedicalIntelligence(measurementLegacy);
  stages.push(stageRecord("differential_diagnosis", medIntelStarted));
  stages.push(stageRecord("clinical_recommendation", medIntelStarted));

  const aiDiagnosisStarted = performance.now();
  const aiDiagnosis = await deps.diagnoseClinicalBundle({
    imageAvailable: input.imageAvailable ?? true,
    interpretation,
    leads: input.leads,
    measurement: measurementLegacy,
    qualityScore,
  });
  stages.push(stageRecord("ai_report_generation", aiDiagnosisStarted, "skipped"));

  const aiReportStarted = performance.now();
  const aiReport = await composePipelineAiReport(deps, measurementLegacy, reportContext);
  stages.push(stageRecord("ai_report_generation", aiReportStarted));
  stages.push(stageRecord("enterprise_report", aiReportStarted, "skipped"));

  return {
    artifacts: {
      aiDiagnosis,
      aiReport,
      clinicalKnowledge,
      diagnostic,
      interpretation,
      measurementEngine,
      measurementLegacy,
      medicalIntelligence,
    },
    confidence: diagnostic.confidence.overall,
    performanceMs: Math.round(performance.now() - pipelineStarted),
    pipelineVersion: DIAGNOSTIC_PIPELINE_VERSION,
    stages,
  };
}
