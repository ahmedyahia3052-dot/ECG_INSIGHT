import { log } from "../../../utils/logger";

export type ClinicalPipelineMetricEvent =
  | "copilot_upload_completed"
  | "copilot_upload_failed"
  | "copilot_ocr_completed"
  | "copilot_llm_completed";

export function recordClinicalPipelineMetric(
  event: ClinicalPipelineMetricEvent,
  metadata: Record<string, string | number | boolean | undefined>,
) {
  log("info", event, {
    metric: event,
    service: "clinical-pipeline",
    ...metadata,
  });
}
