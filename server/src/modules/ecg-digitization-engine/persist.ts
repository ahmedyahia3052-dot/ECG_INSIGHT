import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { DigitizationPipelineResult } from "../ecg-digitization/types";

const DEFAULT_SAMPLING_RATE = 500;

export async function persistDigitizationArtifacts(input: {
  actorId: string;
  caseId: string;
  ecgFileId: string;
  pipeline: DigitizationPipelineResult;
  processingJobId?: string;
}) {
  const { pipeline } = input;
  const existing = await prisma.eCGFile.findUnique({
    select: { metadataJson: true },
    where: { id: input.ecgFileId },
  });
  const priorMetadata = existing?.metadataJson && typeof existing.metadataJson === "object"
    ? (existing.metadataJson as Record<string, unknown>)
    : {};

  const metadata = {
    ...priorMetadata,
    digitization: {
      calibration: pipeline.calibration,
      digitizationStatus: "completed",
      durationSeconds: pipeline.durationSeconds,
      enhancedImagePath: pipeline.enhancedImagePath,
      leadSegments: pipeline.leadSegments,
      pipelineVersion: pipeline.pipelineVersion,
      preprocessing: pipeline.preprocessing,
      processedAt: new Date().toISOString(),
      quality: pipeline.quality,
      validation: pipeline.validation,
    },
    digitizationEngine: "sprint94-ecg-digitization-v1",
    ...(input.processingJobId ? { linkedProcessingJobId: input.processingJobId } : {}),
  };

  await prisma.eCGFile.update({
    data: {
      duration: pipeline.durationSeconds,
      metadataJson: metadata as unknown as Prisma.InputJsonValue,
      numberOfLeads: pipeline.leads.length,
      samplingRate: DEFAULT_SAMPLING_RATE,
    },
    where: { id: input.ecgFileId },
  });

  await prisma.$transaction(
    pipeline.leads.map((lead) =>
      prisma.eCGLeadSignal.upsert({
        create: {
          duration: lead.durationSeconds,
          ecgFileId: input.ecgFileId,
          gain: pipeline.calibration.gainMmPerMv,
          leadName: lead.lead,
          paperSpeed: pipeline.calibration.paperSpeedMmPerSec,
          samplingRate: lead.samplingRate,
          signalData: lead.samples,
        },
        update: {
          duration: lead.durationSeconds,
          gain: pipeline.calibration.gainMmPerMv,
          paperSpeed: pipeline.calibration.paperSpeedMmPerSec,
          samplingRate: lead.samplingRate,
          signalData: lead.samples,
        },
        where: {
          ecgFileId_leadName: {
            ecgFileId: input.ecgFileId,
            leadName: lead.lead,
          },
        },
      }),
    ),
  );

  await prisma.eCGCase.update({
    data: { aiStatus: "PROCESSING" },
    where: { id: input.caseId },
  });
}
