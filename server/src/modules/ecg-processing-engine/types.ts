import type {
  DigitizationPipelineResult,
  DigitizationPreprocessing,
  DigitizationQuality,
  DigitizedLead,
  GridCalibration,
  LeadSegment,
  SignalValidationMetrics,
} from "../ecg-digitization/types";
import type { EcgMeasurementEngineResult } from "../ecg-measurement-engine/types";

export const ECG_PROCESSING_ENGINE_VERSION = "sprint82-ecg-processing-v1" as const;

export const PROCESSING_STAGE_ORDER = [
  "UPLOAD_INGEST",
  "PREPROCESS",
  "NORMALIZE",
  "GRID_DETECT",
  "PERSPECTIVE_CORRECT",
  "NOISE_REDUCE",
  "LEAD_MAP",
  "WAVEFORM_EXTRACT",
  "MEASURE",
  "QUALITY_SCORE",
  "VALIDATE",
  "PERSIST",
  "COMPLETE",
] as const;

export type EcgProcessingStageName = (typeof PROCESSING_STAGE_ORDER)[number];

export const STAGE_PROGRESS: Record<EcgProcessingStageName, number> = {
  UPLOAD_INGEST: 5,
  PREPROCESS: 12,
  NORMALIZE: 18,
  GRID_DETECT: 28,
  PERSPECTIVE_CORRECT: 34,
  NOISE_REDUCE: 40,
  LEAD_MAP: 50,
  WAVEFORM_EXTRACT: 62,
  MEASURE: 74,
  QUALITY_SCORE: 82,
  VALIDATE: 88,
  PERSIST: 95,
  COMPLETE: 100,
};

export type ProcessingStageLogEntry = {
  durationMs?: number;
  message?: string;
  stage: EcgProcessingStageName;
  status: "completed" | "failed" | "running" | "skipped";
  timestamp: string;
};

export type EcgProcessingJobResult = {
  calibration: GridCalibration;
  durationSeconds: number;
  engineVersion: string;
  leadSegments: LeadSegment[];
  leads: DigitizedLead[];
  measurement?: EcgMeasurementEngineResult;
  pipelineVersion: string;
  preprocessing: DigitizationPreprocessing;
  quality: DigitizationQuality;
  validation?: SignalValidationMetrics;
};

export type ProcessingPipelineContext = {
  actorId: string;
  caseId: string;
  ecgFileId: string;
  jobId: string;
  pipeline?: DigitizationPipelineResult;
  result?: EcgProcessingJobResult;
};

export type SerializedEcgProcessingJob = {
  attemptCount: number;
  caseId: string;
  completedAt?: string;
  createdAt: string;
  ecgFileId: string;
  engineVersion: string;
  errorCode?: string;
  errorMessage?: string;
  id: string;
  jobGroupId: string;
  maxAttempts: number;
  nextRetryAt?: string;
  patientId?: string;
  progress: number;
  qualityScore?: number;
  requestedById: string;
  result?: EcgProcessingJobResult;
  stage: EcgProcessingStageName;
  stageLog: ProcessingStageLogEntry[];
  startedAt?: string;
  status: string;
  updatedAt: string;
};
