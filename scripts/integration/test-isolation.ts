import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

/** Unique, process-scoped identifier safe for parallel and sequential runs. */
export function integrationStamp(prefix = "it"): string {
  return `${prefix}-${Date.now()}-${process.pid}-${randomBytes(3).toString("hex")}`;
}

export function uniqueEmail(prefix: string, stamp = integrationStamp(prefix)): string {
  return `${prefix}.${stamp}@ecginsight.test`.toLowerCase();
}

export function uniqueEmployeeId(prefix: string, stamp = integrationStamp(prefix)): string {
  return `${prefix}-${stamp}`;
}

export function uniqueMedicalRecordNumber(prefix: string, stamp = integrationStamp(prefix)): string {
  return `${prefix}-MRN-${stamp}`;
}

export async function deletePatientsByIds(prisma: PrismaClient, patientIds: string[]) {
  if (!patientIds.length) return;
  await prisma.notification.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  await prisma.timelineEvent.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.clinicalDocument.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  await prisma.task.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  await prisma.alert.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  await prisma.conversation.deleteMany({ where: { patientId: { in: patientIds } } }).catch(() => undefined);
  await prisma.auditLog.deleteMany({ where: { patientId: { in: patientIds } } });
  await prisma.patient.deleteMany({ where: { id: { in: patientIds } } });
}

export async function deleteCasesByIds(prisma: PrismaClient, caseIds: string[]) {
  if (!caseIds.length) return;
  await prisma.notification.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.reportVersion.deleteMany({ where: { report: { caseId: { in: caseIds } } } });
  await prisma.clinicalReport.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.aIAnalysis.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.eCGMeasurement.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.eCGFile.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.timelineEvent.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.auditLog.deleteMany({ where: { caseId: { in: caseIds } } });
  await prisma.eCGCase.deleteMany({ where: { id: { in: caseIds } } });
}
