import type { CaseManagementStatus, ECGCaseStatus, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import type { ClinicalCaseRecord } from "../domain/types";

const caseInclude = {
  assignedDoctor: { select: { email: true, id: true, name: true, role: true } },
  reviewedBy: { select: { email: true, id: true, name: true, role: true } },
  reviewer: { select: { email: true, id: true, name: true, role: true } },
  uploadedBy: { select: { email: true, id: true, name: true, role: true } },
} satisfies Prisma.ECGCaseInclude;

export class CaseRepository {
  async findByRef(caseRef: string): Promise<ClinicalCaseRecord | null> {
    return prisma.eCGCase.findFirst({
      include: caseInclude,
      where: { OR: [{ caseId: caseRef }, { caseNumber: caseRef }, { id: caseRef }] },
    });
  }

  async findById(caseId: string): Promise<ClinicalCaseRecord | null> {
    return prisma.eCGCase.findUnique({ include: caseInclude, where: { id: caseId } });
  }

  async updateLifecycle(
    caseId: string,
    input: {
      managementStatus: CaseManagementStatus;
      status: ECGCaseStatus;
      actorId?: string;
      archivedAt?: Date | null;
    },
  ): Promise<ClinicalCaseRecord> {
    return prisma.eCGCase.update({
      data: {
        archivedAt: input.archivedAt,
        managementStatus: input.managementStatus,
        status: input.status,
        ...(input.status === "UNDER_REVIEW" && input.actorId ? { reviewerId: undefined } : {}),
      },
      include: caseInclude,
      where: { id: caseId },
    });
  }

  async updateReviewer(caseId: string, reviewerId: string): Promise<ClinicalCaseRecord> {
    return prisma.eCGCase.update({
      data: { reviewerId },
      include: caseInclude,
      where: { id: caseId },
    });
  }

  async updatePriority(
    caseId: string,
    priority: Prisma.ECGCaseUpdateInput["priority"],
    severity?: Prisma.ECGCaseUpdateInput["severity"],
  ): Promise<ClinicalCaseRecord> {
    return prisma.eCGCase.update({
      data: { priority, ...(severity !== undefined ? { severity } : {}) },
      include: caseInclude,
      where: { id: caseId },
    });
  }

  async updateLabels(caseId: string, tags: string[]): Promise<ClinicalCaseRecord> {
    return prisma.eCGCase.update({
      data: { tags },
      include: caseInclude,
      where: { id: caseId },
    });
  }

  async restoreFromSnapshot(caseId: string, snapshot: Record<string, unknown>): Promise<ClinicalCaseRecord> {
    return prisma.eCGCase.update({
      data: {
        assignedDoctorId: snapshot.assignedDoctorId as string | null | undefined,
        clinicalComments: snapshot.clinicalComments as string | null | undefined,
        clinicalNotes: snapshot.clinicalNotes as string | null | undefined,
        doctorDiagnosis: snapshot.doctorDiagnosis as string | null | undefined,
        ecgType: snapshot.ecgType as string | undefined,
        finalDiagnosis: snapshot.finalDiagnosis as string | null | undefined,
        heartRate: snapshot.heartRate as number | null | undefined,
        managementStatus: snapshot.managementStatus as CaseManagementStatus | undefined,
        priority: snapshot.priority as Prisma.ECGCaseUpdateInput["priority"],
        recommendations: snapshot.recommendations as string | null | undefined,
        reviewerId: snapshot.reviewerId as string | null | undefined,
        rhythm: snapshot.rhythm as string | null | undefined,
        severity: snapshot.severity as Prisma.ECGCaseUpdateInput["severity"],
        status: snapshot.status as ECGCaseStatus | undefined,
        tags: snapshot.tags as string[] | undefined,
      },
      include: caseInclude,
      where: { id: caseId },
    });
  }
}

export const caseRepository = new CaseRepository();
