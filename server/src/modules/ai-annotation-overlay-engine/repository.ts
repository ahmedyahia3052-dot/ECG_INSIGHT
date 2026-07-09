import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AiOverlayWorkspaceDto } from "../ai-overlay/ai-overlay.contracts";
import type { AiOverlayLayerConfigDto, PersistedAiOverlayWorkspaceDto } from "./dto";
import { DEFAULT_AI_OVERLAY_LAYER_CONFIG, emptyWorkspace } from "./dto";

/** Persists overlay state in `EcgAiOverlayWorkspace` with history in `EcgAiOverlayVersion`. */

export async function findOverlayWorkspace(caseId: string) {
  return prisma.ecgAiOverlayWorkspace.findUnique({ where: { caseId } });
}

export async function upsertOverlayWorkspace(input: {
  authorId: string; caseId: string; enabled?: boolean; layerConfig: AiOverlayLayerConfigDto; workspace: AiOverlayWorkspaceDto;
}) {
  const existing = await findOverlayWorkspace(input.caseId);
  const nextVersion = (existing?.version ?? 0) + 1;
  return prisma.ecgAiOverlayWorkspace.upsert({
    create: { caseId: input.caseId, enabled: input.enabled ?? true, layerConfig: input.layerConfig as unknown as Prisma.InputJsonValue, updatedById: input.authorId, version: nextVersion, workspaceJson: input.workspace as unknown as Prisma.InputJsonValue },
    update: { enabled: input.enabled ?? existing?.enabled ?? true, layerConfig: input.layerConfig as unknown as Prisma.InputJsonValue, updatedById: input.authorId, version: nextVersion, workspaceJson: input.workspace as unknown as Prisma.InputJsonValue },
    where: { caseId: input.caseId },
  });
}

export async function createOverlayVersion(input: {
  authorId: string; caseId: string; layerConfig: AiOverlayLayerConfigDto; snapshot: AiOverlayWorkspaceDto; versionNumber: number; workspaceId: string;
}) {
  return prisma.ecgAiOverlayVersion.create({
    data: { caseId: input.caseId, createdById: input.authorId, layerConfig: input.layerConfig as unknown as Prisma.InputJsonValue, snapshot: input.snapshot as unknown as Prisma.InputJsonValue, versionNumber: input.versionNumber, workspaceId: input.workspaceId },
  });
}

export async function listOverlayVersions(caseId: string) {
  return prisma.ecgAiOverlayVersion.findMany({ orderBy: { versionNumber: "desc" }, where: { caseId } });
}

export async function findOverlayVersion(caseId: string, versionNumber: number) {
  return prisma.ecgAiOverlayVersion.findUnique({ where: { caseId_versionNumber: { caseId, versionNumber } } });
}

export function toPersistedOverlayDto(record: {
  caseId: string; enabled: boolean; layerConfig: unknown; updatedAt: Date; updatedById: string; version: number; workspaceJson: unknown;
}): PersistedAiOverlayWorkspaceDto {
  return {
    caseId: record.caseId, enabled: record.enabled,
    layerConfig: (record.layerConfig as AiOverlayLayerConfigDto) ?? DEFAULT_AI_OVERLAY_LAYER_CONFIG,
    updatedAt: record.updatedAt.toISOString(), updatedById: record.updatedById, version: record.version,
    workspace: (record.workspaceJson as AiOverlayWorkspaceDto) ?? emptyWorkspace(),
  };
}
