import type {
  DigitizationPipelineResult,
  DigitizationPreprocessing,
  DigitizationQuality,
  DigitizedLead,
  GridCalibration,
  LeadSegment,
  SignalValidationMetrics,
} from "../ecg-digitization/types";

export const ECG_DIGITIZATION_ENGINE_VERSION = "sprint94-ecg-digitization-v1" as const;

export const DIGITIZATION_STAGE_ORDER = [
  "UPLOAD_INGEST",
  "PAPER_DETECT",
  "DECODE",
  "PREPROCESS",
  "PERSPECTIVE_CORRECT",
  "ROTATION_CORRECT",
  "DESKEW",
  "NOISE_REDUCE",
  "SHADOW_REMOVE",
  "CONTRAST_ENHANCE",
  "GRID_DETECT",
  "LEAD_SEGMENT",
  "TWELVE_LEAD_DETECT",
  "WAVEFORM_EXTRACT",
  "RECONSTRUCT",
  "VALIDATE",
  "PERSIST",
  "COMPLETE",
] as const;

export type EcgDigitizationStageName = (typeof DIGITIZATION_STAGE_ORDER)[number];

export const DIGITIZATION_STAGE_PROGRESS: Record<EcgDigitizationStageName, number> = {
  UPLOAD_INGEST: 4,
  PAPER_DETECT: 8,
  DECODE: 12,
  PREPROCESS: 18,
  PERSPECTIVE_CORRECT: 24,
  ROTATION_CORRECT: 28,
  DESKEW: 32,
  NOISE_REDUCE: 38,
  SHADOW_REMOVE: 42,
  CONTRAST_ENHANCE: 46,
  GRID_DETECT: 54,
  LEAD_SEGMENT: 62,
  TWELVE_LEAD_DETECT: 68,
  WAVEFORM_EXTRACT: 78,
  RECONSTRUCT: 84,
  VALIDATE: 90,
  PERSIST: 96,
  COMPLETE: 100,
};

export type DigitizationStageLogEntry = {
  durationMs?: number;
  message?: string;
  stage: EcgDigitizationStageName;
  status: "completed" | "failed" | "running" | "skipped";
  timestamp: string;
};

export type EcgDigitizationJobResult = {
  calibration: GridCalibration;
  durationSeconds: number;
  engineVersion: string;
  leadSegments: LeadSegment[];
  leads: DigitizedLead[];
  pipelineVersion: string;
  preprocessing: DigitizationPreprocessing;
  quality: DigitizationQuality;
  twelveLeadDetected: boolean;
  validation?: SignalValidationMetrics;
};

export type DigitizationPipelineContext = {
  actorId: string;
  caseId: string;
  ecgFileId: string;
  jobId: string;
  pipeline?: DigitizationPipelineResult;
  processingJobId?: string;
  result?: EcgDigitizationJobResult;
};

export type SerializedEcgDigitizationJob = {
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
  processingJobId?: string;
  progress: number;
  qualityScore?: number;
  requestedById: string;
  result?: EcgDigitizationJobResult;
  stage: EcgDigitizationStageName;
  stageLog: DigitizationStageLogEntry[];
  startedAt?: string;
  status: string;
  updatedAt: string;
};
