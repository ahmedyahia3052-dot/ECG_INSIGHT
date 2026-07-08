import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { DigitizationPipelineResult } from "../ecg-digitization/types";
import type { EcgMeasurementEngineResult } from "../ecg-measurement-engine/types";

const DEFAULT_SAMPLING_RATE = 500;

export async function persistProcessingArtifacts(input: {
  actorId: string;
  caseId: string;
  ecgFileId: string;
  measurement: EcgMeasurementEngineResult;
  pipeline: DigitizationPipelineResult;
}) {
  const { pipeline } = input;
  const metadata = {
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
    measurementEngine: input.measurement,
    processingEngine: "sprint82-ecg-processing-v1",
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
    data: {
      aiStatus: "COMPLETED",
      heartRate: input.measurement.bundle.heartRate.heartRateBpm,
      prInterval: input.measurement.bundle.intervals.prIntervalMs,
      qrsDuration: input.measurement.bundle.intervals.qrsDurationMs,
      qtInterval: input.measurement.bundle.intervals.qtIntervalMs,
      qtcInterval: input.measurement.bundle.intervals.qtcBazettMs,
    },
    where: { id: input.caseId },
  });
}
