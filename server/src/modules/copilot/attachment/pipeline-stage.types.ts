export type PipelineStageName =
  | "upload"
  | "validation"
  | "storage"
  | "preview"
  | "metadata"
  | "ocr"
  | "classification"
  | "ecg_digitization"
  | "measurements"
  | "clinical_interpretation"
  | "context_builder"
  | "completed";

export type PipelineStageStatus = "completed" | "failed" | "running" | "skipped" | "warning";

export type PipelineStageRecord = {
  durationMs?: number;
  message?: string;
  stage: PipelineStageName;
  status: PipelineStageStatus;
};
