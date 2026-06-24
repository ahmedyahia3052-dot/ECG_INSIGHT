import type { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error";

type AuthContext = { id: string; role: Role };

function isPrivileged(auth: AuthContext) {
  return auth.role === "SUPER_ADMIN" || auth.role === "ADMIN";
}

export function canAccessOwnedResource(auth: AuthContext, ownerIds: Array<string | null | undefined>) {
  return isPrivileged(auth) || ownerIds.some((ownerId) => ownerId === auth.id);
}

export function assertResourceAccess(allowed: boolean, message = "You do not have access to this resource.") {
  if (!allowed) throw new AppError(403, message, "FORBIDDEN");
}

export async function canAccessPatient(patientId: string | null | undefined, auth: AuthContext) {
  if (!patientId) return isPrivileged(auth);
  if (isPrivileged(auth)) return true;

  const patient = await prisma.patient.findUnique({
    select: {
      auditLogs: {
        select: { actorId: true },
        where: { action: "PATIENT_CREATED", actorId: auth.id },
        take: 1,
      },
      cases: {
        select: { assignedDoctorId: true, uploadedById: true },
        where: {
          OR: [{ assignedDoctorId: auth.id }, { uploadedById: auth.id }],
        },
        take: 1,
      },
      reports: {
        select: { authorId: true },
        where: { authorId: auth.id },
        take: 1,
      },
      tasks: {
        select: { id: true },
        where: {
          OR: [{ createdById: auth.id }, { assignments: { some: { userId: auth.id } } }],
        },
        take: 1,
      },
    },
    where: { id: patientId },
  });

  if (!patient) return false;
  return patient.auditLogs.length > 0 || patient.cases.length > 0 || patient.reports.length > 0 || patient.tasks.length > 0;
}

export async function canAccessCase(caseId: string | null | undefined, auth: AuthContext) {
  if (!caseId) return isPrivileged(auth);
  if (isPrivileged(auth)) return true;

  const ecgCase = await prisma.eCGCase.findUnique({
    select: {
      assignedDoctorId: true,
      reports: {
        select: { authorId: true },
        where: { authorId: auth.id },
        take: 1,
      },
      uploadedById: true,
    },
    where: { id: caseId },
  });

  if (!ecgCase) return false;
  return ecgCase.assignedDoctorId === auth.id || ecgCase.uploadedById === auth.id || ecgCase.reports.length > 0;
}

export async function canAccessEmployee(employeeId: string | null | undefined, auth: AuthContext) {
  if (!employeeId) return isPrivileged(auth);
  if (isPrivileged(auth)) return true;

  const [employee, creatorAudit] = await Promise.all([
    prisma.employee.findUnique({
      select: {
        patient: {
          select: { id: true },
        },
      },
      where: { id: employeeId },
    }),
    prisma.auditLog.findFirst({
      select: { id: true },
      where: { action: "EMPLOYEE_CREATED", actorId: auth.id, entityId: employeeId, entityType: "Employee" },
    }),
  ]);

  if (creatorAudit) return true;

  if (!employee?.patient?.id) return false;
  return canAccessPatient(employee.patient.id, auth);
}
