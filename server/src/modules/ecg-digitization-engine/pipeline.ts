import type { ECGFile } from "@prisma/client";
import { executeDigitizationPipeline } from "./orchestrator";
import type { DigitizationPipelineResult } from "../ecg-digitization/types";
import { prisma } from "../../config/prisma";

/** Inline digitization for Sprint 82 processing engine — no duplicate algorithm logic. */
export async function runDigitizationPipelineForFile(input: {
  actorId: string;
  caseId: string;
  ecgFileId: string;
  file: ECGFile;
  processingJobId?: string;
}): Promise<DigitizationPipelineResult> {
  const ephemeralJob = await prisma.ecgDigitizationJob.create({
    data: {
      caseId: input.caseId,
      ecgFileId: input.ecgFileId,
      engineVersion: "sprint94-inline",
      jobGroupId: `inline-${input.processingJobId ?? input.ecgFileId}`,
      processingJobId: input.processingJobId,
      requestedById: input.actorId,
      status: "PROCESSING",
    },
  });

  try {
    const result = await executeDigitizationPipeline({
      actorId: input.actorId,
      caseId: input.caseId,
      ecgFileId: input.ecgFileId,
      jobId: ephemeralJob.id,
      processingJobId: input.processingJobId,
    });
    await prisma.ecgDigitizationJob.update({
      data: { completedAt: new Date(), progress: 100, status: "COMPLETED" },
      where: { id: ephemeralJob.id },
    });
    return {
      calibration: result.calibration,
      durationSeconds: result.durationSeconds,
      leadSegments: result.leadSegments,
      leads: result.leads,
      pipelineVersion: result.pipelineVersion,
      preprocessing: result.preprocessing,
      quality: result.quality,
      validation: result.validation,
    };
  } catch (error) {
    await prisma.ecgDigitizationJob.update({
      data: {
        errorMessage: error instanceof Error ? error.message : "Digitization failed.",
        status: "FAILED",
      },
      where: { id: ephemeralJob.id },
    });
    throw error;
  }
}
