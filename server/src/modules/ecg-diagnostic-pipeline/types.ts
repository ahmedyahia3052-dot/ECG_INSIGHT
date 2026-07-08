import type { ComposedAiReport } from "../ai-report-generator/types";
import type { EcgAiDiagnosisResult } from "../ecg-ai-diagnosis/types";
import type { EcgClinicalKnowledgeEntry } from "../clinical-knowledge-engine/types";
import type { DigitizedLead, DigitizationQuality, GridCalibration } from "../ecg-digitization/types";
import type { DiagnosticPipelineResult } from "../ecg-diagnostic-engine/types";
import type { EcgMeasurementEngineResult } from "../ecg-measurement-engine/types";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import type { EcgClinicalInterpretation } from "../ecg-interpretation/types";
import type { MedicalIntelligenceReport } from "../medical-intelligence/types";

export const DIAGNOSTIC_PIPELINE_VERSION = "sprint61-v1" as const;

export type DiagnosticPipelineStageName =
  | "image_processing"
  | "lead_detection"
  | "signal_digitization"
  | "measurement_engine"
  | "clinical_knowledge_engine"
  | "diagnostic_engine"
  | "differential_diagnosis"
  | "clinical_recommendation"
  | "ai_report_generation"
  | "enterprise_report";

export type DiagnosticPipelineStageStatus = "pending" | "completed" | "skipped" | "failed";

export interface DiagnosticPipelineStageRecord {
  durationMs: number;
  stage: DiagnosticPipelineStageName;
  status: DiagnosticPipelineStageStatus;
}

export interface ClinicalKnowledgeMatch {
  differentialDiagnoses: Array<{
    clinicalName: string;
    diagnosisId?: string;
    emergencyLevel?: string;
    severity?: string;
  }>;
  entry: EcgClinicalKnowledgeEntry | null;
  findingCode: string;
  findingLabel: string;
}

export interface EcgDiagnosticPipelineInput {
  calibration: GridCalibration;
  imageAvailable?: boolean;
  leads: DigitizedLead[];
  qualityScore?: number;
}

export interface EcgDiagnosticPipelineArtifacts {
  aiDiagnosis: EcgAiDiagnosisResult;
  aiReport: ComposedAiReport;
  clinicalKnowledge: ClinicalKnowledgeMatch[];
  diagnostic: DiagnosticPipelineResult;
  interpretation: EcgClinicalInterpretation;
  measurementEngine: EcgMeasurementEngineResult;
  measurementLegacy: EcgClinicalMeasurementResult;
  medicalIntelligence: MedicalIntelligenceReport;
}

export interface EcgDiagnosticPipelineResult {
  artifacts: EcgDiagnosticPipelineArtifacts;
  confidence: number;
  performanceMs: number;
  pipelineVersion: typeof DIAGNOSTIC_PIPELINE_VERSION;
  stages: DiagnosticPipelineStageRecord[];
}

export interface EcgDiagnosticCasePipelineOptions {
  clinicalIndication?: string;
  digitize?: boolean;
  generateAiReport?: boolean;
  generateEnterpriseReport?: boolean;
  persist?: boolean;
}

export interface EcgDiagnosticCasePipelineInput {
  actorId: string;
  caseId: string;
  options?: EcgDiagnosticCasePipelineOptions;
}

export interface EcgDiagnosticCasePipelineResult extends EcgDiagnosticPipelineResult {
  caseId: string;
  digitizationQuality?: DigitizationQuality;
  enterpriseReportId?: string;
  generatedReportId?: string;
}
