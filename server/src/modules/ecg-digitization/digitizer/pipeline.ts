import { runEnterpriseDigitizationPipeline } from "../engine/enterprise-pipeline";
import type { DigitizationPipelineResult, GridCalibration } from "../types";
import type { ECGFile } from "@prisma/client";

export async function runDigitizationPipeline(
  file: Pick<ECGFile, "id" | "metadataJson" | "mimeType" | "originalName" | "sizeBytes" | "storagePath">,
  override?: Partial<GridCalibration>,
): Promise<DigitizationPipelineResult> {
  return runEnterpriseDigitizationPipeline(file, override);
}
