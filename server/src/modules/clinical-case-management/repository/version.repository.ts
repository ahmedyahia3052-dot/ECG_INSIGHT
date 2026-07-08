import type { ECGCase } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import type { CaseSnapshotFields } from "../domain/types";
import { serializeCaseVersion } from "../domain/types";

function snapshotFromCase(ecgCase: ECGCase): CaseSnapshotFields {
  return {
    assignedDoctorId: ecgCase.assignedDoctorId,
    clinicalComments: ecgCase.clinicalComments,
    clinicalNotes: ecgCase.clinicalNotes,
    doctorDiagnosis: ecgCase.doctorDiagnosis,
    ecgType: ecgCase.ecgType,
    finalDiagnosis: ecgCase.finalDiagnosis,
    heartRate: ecgCase.heartRate,
    managementStatus: ecgCase.managementStatus,
    priority: ecgCase.priority,
    recommendations: ecgCase.recommendations,
    reviewerId: ecgCase.reviewerId,
    rhythm: ecgCase.rhythm,
    severity: ecgCase.severity,
    status: ecgCase.status,
    tags: ecgCase.tags,
  };
}

export class VersionRepository {
  async nextVersionNumber(caseId: string) {
    const latest = await prisma.caseVersion.findFirst({
      orderBy: { version: "desc" },
      select: { version: true },
      where: { caseId },
    });
    return (latest?.version ?? 0) + 1;
  }

  async list(caseId: string) {
    const versions = await prisma.caseVersion.findMany({
      orderBy: { version: "desc" },
      where: { caseId },
    });
    return versions.map(serializeCaseVersion);
  }

  async findById(caseId: string, versionId: string) {
    const version = await prisma.caseVersion.findFirst({ where: { caseId, id: versionId } });
    return version ? serializeCaseVersion(version) : null;
  }

  async create(caseId: string, actorId: string, reason?: string) {
    const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
    if (!ecgCase) return null;
    const version = await prisma.caseVersion.create({
      data: {
        caseId,
        createdById: actorId,
        reason,
        snapshot: snapshotFromCase(ecgCase),
        version: await this.nextVersionNumber(caseId),
      },
    });
    return serializeCaseVersion(version);
  }

  async markRestored(versionId: string) {
    const version = await prisma.caseVersion.update({
      data: { restoredAt: new Date() },
      where: { id: versionId },
    });
    return serializeCaseVersion(version);
  }
}

export const versionRepository = new VersionRepository();
