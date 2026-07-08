import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { DEFAULT_ZOOM_PRESETS } from "./types";

export class EcgViewerRepository {
  async getPreference(userId: string) {
    return prisma.ecgViewerPreference.findUnique({ where: { userId } });
  }

  async upsertPreference(userId: string, data: Prisma.EcgViewerPreferenceUpdateInput) {
    return prisma.ecgViewerPreference.upsert({
      create: {
        defaultZoom: (data.defaultZoom as number | undefined) ?? 1,
        gainMmPerMv: (data.gainMmPerMv as number | undefined) ?? 10,
        layoutJson: data.layoutJson as Prisma.InputJsonValue | undefined,
        overlayDefaults: data.overlayDefaults as Prisma.InputJsonValue | undefined,
        paperSpeedMmSec: (data.paperSpeedMmSec as number | undefined) ?? 25,
        userId,
        zoomPresets: (data.zoomPresets as Prisma.InputJsonValue | undefined) ?? DEFAULT_ZOOM_PRESETS,
      },
      update: data,
      where: { userId },
    });
  }

  async listPhysicianAnnotations(caseId: string) {
    return prisma.ecgPhysicianAnnotation.findMany({
      orderBy: { createdAt: "asc" },
      where: { caseId },
    });
  }

  async createPhysicianAnnotation(input: {
    authorId: string;
    caseId: string;
    color?: string;
    ecgFileId?: string;
    geometry: Prisma.InputJsonValue;
    label?: string;
    lead: string;
    metadata?: Prisma.InputJsonValue;
    type: string;
    visible?: boolean;
  }) {
    return prisma.ecgPhysicianAnnotation.create({ data: input });
  }

  async updatePhysicianAnnotation(id: string, data: Prisma.EcgPhysicianAnnotationUpdateInput) {
    return prisma.ecgPhysicianAnnotation.update({ data, where: { id } });
  }

  async deletePhysicianAnnotation(id: string) {
    return prisma.ecgPhysicianAnnotation.delete({ where: { id } });
  }

  async findPhysicianAnnotation(id: string, caseId: string) {
    return prisma.ecgPhysicianAnnotation.findFirst({ where: { caseId, id } });
  }

  async getOverlay(caseId: string) {
    return prisma.ecgViewerCaseOverlay.findUnique({ where: { caseId } });
  }

  async upsertOverlay(caseId: string, updatedBy: string, config: Prisma.InputJsonValue) {
    return prisma.ecgViewerCaseOverlay.upsert({
      create: { caseId, config, updatedBy },
      update: { config, updatedBy },
      where: { caseId },
    });
  }
}

export const ecgViewerRepository = new EcgViewerRepository();
