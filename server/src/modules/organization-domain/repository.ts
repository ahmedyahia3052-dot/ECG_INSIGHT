/**
 * Sprint 84 — Organization domain repository layer (Prisma + Sprint 80 foundation).
 */

import type { DepartmentCategory, OrganizationType, Prisma, Role } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  buildCreateUpdateAudit,
  buildUpdateAudit,
  notDeletedWhere,
  softDeleteData,
  withNotDeleted,
} from "../../database/foundation";
import type { ListQuery } from "./list-query";
import { paginatedResult, resolveOrderBy } from "./list-query";

const genderMap = {
  female: "FEMALE",
  male: "MALE",
  other: "OTHER",
  unknown: "UNKNOWN",
} as const;

const priorityMap = {
  critical: "CRITICAL",
  high: "HIGH",
  low: "LOW",
  medium: "MEDIUM",
} as const;

function deletedFilter(includeDeleted: boolean) {
  return includeDeleted ? {} : notDeletedWhere("organization");
}

// ─── Organization ─────────────────────────────────────────────────────────────

export async function listOrganizationsRepo(query: ListQuery) {
  const where: Prisma.OrganizationWhereInput = {
    ...deletedFilter(query.includeDeleted),
    ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
  };
  const orderBy = resolveOrderBy(
    query.sortBy,
    query.sortDir,
    { createdAt: { createdAt: query.sortDir }, name: { name: query.sortDir }, status: { status: query.sortDir } },
    { createdAt: "desc" },
  );
  const [items, total] = await Promise.all([
    prisma.organization.findMany({
      include: { subscription: true, _count: { select: { departments: true, members: true, patients: true } } },
      orderBy: orderBy as Prisma.OrganizationOrderByWithRelationInput,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.organization.count({ where }),
  ]);
  return paginatedResult(items, total, query.page, query.pageSize);
}

export async function getOrganizationRepo(id: string) {
  return prisma.organization.findFirst({
    include: {
      branding: true,
      subscription: true,
      departments: { where: { deletedAt: null }, orderBy: { name: "asc" } },
      _count: { select: { patients: true, members: true } },
    },
    where: withNotDeleted("organization", { id }),
  });
}

export async function createOrganizationRepo(
  input: {
    actorId: string;
    name: string;
    type: OrganizationType;
    address?: string;
    city?: string;
    country?: string;
    email?: string;
    phone?: string;
  },
) {
  const audit = buildCreateUpdateAudit({ userId: input.actorId });
  return prisma.organization.create({
    data: {
      address: input.address,
      city: input.city,
      country: input.country,
      email: input.email,
      name: input.name,
      phone: input.phone,
      type: input.type,
      createdById: audit.createdById,
      updatedById: audit.updatedById,
    },
    include: { subscription: true },
  });
}

export async function updateOrganizationRepo(id: string, data: Prisma.OrganizationUncheckedUpdateInput, actorId: string) {
  const audit = buildUpdateAudit({ userId: actorId });
  return prisma.organization.update({
    data: { ...data, updatedById: audit.updatedById, version: { increment: 1 } },
    where: { id, deletedAt: null },
  });
}

export async function softDeleteOrganizationRepo(id: string, actorId: string) {
  return prisma.organization.update({
    data: { ...softDeleteData(), status: "INACTIVE", updatedById: actorId },
    where: { id },
  });
}

// ─── Department ───────────────────────────────────────────────────────────────

export async function listDepartmentsRepo(organizationId: string, query: ListQuery) {
  const where: Prisma.DepartmentWhereInput = {
    organizationId,
    ...(query.includeDeleted ? {} : notDeletedWhere("department")),
    ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
  };
  const orderBy = resolveOrderBy(
    query.sortBy,
    query.sortDir,
    { category: { category: query.sortDir }, createdAt: { createdAt: query.sortDir }, name: { name: query.sortDir } },
    { name: "asc" },
  );
  const [items, total] = await Promise.all([
    prisma.department.findMany({
      orderBy: orderBy as Prisma.DepartmentOrderByWithRelationInput,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.department.count({ where }),
  ]);
  return paginatedResult(items, total, query.page, query.pageSize);
}

export async function getDepartmentRepo(id: string) {
  return prisma.department.findFirst({ where: withNotDeleted("department", { id }) });
}

export async function createDepartmentRepo(input: {
  actorId: string;
  category?: DepartmentCategory;
  companyId?: string;
  description?: string;
  name: string;
  organizationId: string;
}) {
  const audit = buildCreateUpdateAudit({ userId: input.actorId });
  return prisma.department.create({
    data: {
      category: input.category ?? "CUSTOM",
      companyId: input.companyId,
      description: input.description,
      name: input.name,
      organizationId: input.organizationId,
      createdById: audit.createdById,
      updatedById: audit.updatedById,
    },
  });
}

export async function updateDepartmentRepo(id: string, data: Prisma.DepartmentUncheckedUpdateInput, actorId: string) {
  const audit = buildUpdateAudit({ userId: actorId });
  return prisma.department.update({
    data: { ...data, updatedById: audit.updatedById },
    where: { id, deletedAt: null },
  });
}

export async function softDeleteDepartmentRepo(id: string, actorId: string) {
  return prisma.department.update({
    data: { ...softDeleteData(), updatedById: actorId },
    where: { id },
  });
}

// ─── Employee ─────────────────────────────────────────────────────────────────

export async function listEmployeesRepo(organizationId: string, query: ListQuery) {
  const where: Prisma.EmployeeWhereInput = {
    organizationId,
    ...(query.includeDeleted ? {} : { employmentStatus: { not: "TERMINATED" } }),
    ...(query.q
      ? {
          OR: [
            { fullName: { contains: query.q, mode: "insensitive" } },
            { employeeId: { contains: query.q, mode: "insensitive" } },
            { nationalId: { contains: query.q, mode: "insensitive" } },
            { email: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy = resolveOrderBy(
    query.sortBy,
    query.sortDir,
    {
      createdAt: { createdAt: query.sortDir },
      employeeId: { employeeId: query.sortDir },
      fullName: { fullName: query.sortDir },
      status: { employmentStatus: query.sortDir },
    },
    { fullName: "asc" },
  );
  const [items, total] = await Promise.all([
    prisma.employee.findMany({
      include: { department: { select: { id: true, name: true } } },
      orderBy: orderBy as Prisma.EmployeeOrderByWithRelationInput,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.employee.count({ where }),
  ]);
  return paginatedResult(items, total, query.page, query.pageSize);
}

export async function getEmployeeRepo(id: string) {
  return prisma.employee.findFirst({
    include: { department: true, organization: { select: { id: true, name: true } } },
    where: { id, employmentStatus: { not: "TERMINATED" } },
  });
}

export async function createEmployeeRepo(input: {
  actorId: string;
  dateOfBirth: Date;
  departmentId: string;
  employeeId: string;
  fullName: string;
  gender?: keyof typeof genderMap;
  nationalId: string;
  organizationId: string;
  companyId?: string;
  email?: string;
  jobTitle?: string;
  phone?: string;
  workLocation?: string;
}) {
  return prisma.employee.create({
    data: {
      companyId: input.companyId,
      dateOfBirth: input.dateOfBirth,
      departmentId: input.departmentId,
      email: input.email,
      employeeId: input.employeeId,
      fullName: input.fullName,
      gender: input.gender ? genderMap[input.gender] : "UNKNOWN",
      jobTitle: input.jobTitle,
      nationalId: input.nationalId,
      organizationId: input.organizationId,
      phone: input.phone,
      workLocation: input.workLocation,
    },
    include: { department: { select: { id: true, name: true } } },
  });
}

export async function updateEmployeeRepo(id: string, data: Prisma.EmployeeUncheckedUpdateInput) {
  await prisma.employee.update({ data, where: { id } });
  return getEmployeeRepo(id);
}

export async function softDeleteEmployeeRepo(id: string) {
  return prisma.employee.update({
    data: { employmentStatus: "TERMINATED" },
    where: { id },
  });
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export async function listPatientsRepo(query: ListQuery & { organizationId?: string }) {
  const where: Prisma.PatientWhereInput = {
    ...(query.organizationId ? { organizationId: query.organizationId } : {}),
    ...(query.includeDeleted ? {} : notDeletedWhere("patient")),
    ...(query.q
      ? {
          OR: [
            { firstName: { contains: query.q, mode: "insensitive" } },
            { lastName: { contains: query.q, mode: "insensitive" } },
            { fullName: { contains: query.q, mode: "insensitive" } },
            { medicalRecordNumber: { contains: query.q, mode: "insensitive" } },
            { patientCode: { contains: query.q, mode: "insensitive" } },
            { employeeId: { contains: query.q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const orderBy = resolveOrderBy(
    query.sortBy,
    query.sortDir,
    {
      createdAt: { createdAt: query.sortDir },
      fullName: { fullName: query.sortDir },
      patientCode: { patientCode: query.sortDir },
      updatedAt: { updatedAt: query.sortDir },
    },
    { updatedAt: "desc" },
  );
  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      orderBy: orderBy as Prisma.PatientOrderByWithRelationInput,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.patient.count({ where }),
  ]);
  return paginatedResult(items, total, query.page, query.pageSize);
}

export async function getPatientRepo(id: string) {
  return prisma.patient.findFirst({
    include: { department: { select: { id: true, name: true } }, organization: { select: { id: true, name: true } } },
    where: withNotDeleted("patient", { id }),
  });
}

export async function createPatientRepo(input: {
  actorId: string;
  dateOfBirth: Date;
  firstName: string;
  lastName: string;
  medicalRecordNumber: string;
  organizationId?: string;
  departmentId?: string;
  email?: string;
  employeeId?: string;
  gender?: keyof typeof genderMap;
  middleName?: string;
  phone?: string;
}) {
  const audit = buildCreateUpdateAudit({ userId: input.actorId });
  const fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ");
  return prisma.patient.create({
    data: {
      dateOfBirth: input.dateOfBirth,
      departmentId: input.departmentId,
      email: input.email,
      employeeId: input.employeeId,
      firstName: input.firstName,
      fullName,
      gender: input.gender ? genderMap[input.gender] : "UNKNOWN",
      lastName: input.lastName,
      medicalRecordNumber: input.medicalRecordNumber,
      middleName: input.middleName,
      organizationId: input.organizationId,
      phone: input.phone,
      createdById: audit.createdById,
      updatedById: audit.updatedById,
    },
  });
}

export async function updatePatientRepo(id: string, data: Prisma.PatientUncheckedUpdateInput, actorId: string) {
  const audit = buildUpdateAudit({ userId: actorId });
  return prisma.patient.update({
    data: { ...data, updatedById: audit.updatedById },
    where: { id, deletedAt: null },
  });
}

export async function softDeletePatientRepo(id: string, actorId: string) {
  return prisma.patient.update({
    data: { ...softDeleteData(), updatedById: actorId },
    where: { id },
  });
}

// ─── Doctor (User role DOCTOR) ────────────────────────────────────────────────

export async function listDoctorsRepo(organizationId: string, query: ListQuery) {
  const where: Prisma.UserWhereInput = {
    isActive: true,
    role: "DOCTOR" as Role,
    OR: [
      { organizationId },
      { organizationMemberships: { some: { deletedAt: null, organizationId, status: "ACTIVE" } } },
    ],
    ...(query.q
      ? {
          AND: [
            {
              OR: [
                { name: { contains: query.q, mode: "insensitive" } },
                { email: { contains: query.q, mode: "insensitive" } },
                { specialization: { contains: query.q, mode: "insensitive" } },
              ],
            },
          ],
        }
      : {}),
  };
  const orderBy = resolveOrderBy(
    query.sortBy,
    query.sortDir,
    { createdAt: { createdAt: query.sortDir }, email: { email: query.sortDir }, name: { name: query.sortDir } },
    { name: "asc" },
  );
  const [items, total] = await Promise.all([
    prisma.user.findMany({
      orderBy: orderBy as Prisma.UserOrderByWithRelationInput,
      select: {
        createdAt: true,
        department: true,
        email: true,
        id: true,
        institution: true,
        licenseNumber: true,
        name: true,
        organizationId: true,
        role: true,
        specialization: true,
        updatedAt: true,
      },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.user.count({ where }),
  ]);
  return paginatedResult(items, total, query.page, query.pageSize);
}

export async function getDoctorRepo(id: string) {
  return prisma.user.findFirst({
    select: {
      createdAt: true,
      department: true,
      email: true,
      id: true,
      institution: true,
      licenseNumber: true,
      name: true,
      organizationId: true,
      role: true,
      specialization: true,
      updatedAt: true,
    },
    where: { id, isActive: true, role: "DOCTOR" },
  });
}

export async function updateDoctorRepo(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    data,
    select: {
      createdAt: true,
      department: true,
      email: true,
      id: true,
      institution: true,
      licenseNumber: true,
      name: true,
      organizationId: true,
      role: true,
      specialization: true,
      updatedAt: true,
    },
    where: { id, role: "DOCTOR" },
  });
}

// ─── ECG Case ─────────────────────────────────────────────────────────────────

export async function listEcgCasesRepo(query: ListQuery & { organizationId?: string; patientId?: string }) {
  const where: Prisma.ECGCaseWhereInput = {
    ...(query.includeDeleted ? {} : notDeletedWhere("ecgCase")),
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.organizationId ? { patient: { organizationId: query.organizationId } } : {}),
    ...(query.q
      ? {
          OR: [
            { caseId: { contains: query.q, mode: "insensitive" } },
            { caseNumber: { contains: query.q, mode: "insensitive" } },
            { finalDiagnosis: { contains: query.q, mode: "insensitive" } },
            { patient: { fullName: { contains: query.q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const orderBy = resolveOrderBy(
    query.sortBy,
    query.sortDir,
    {
      caseNumber: { caseNumber: query.sortDir },
      createdAt: { createdAt: query.sortDir },
      status: { status: query.sortDir },
      uploadDate: { uploadDate: query.sortDir },
    },
    { uploadDate: "desc" },
  );
  const [items, total] = await Promise.all([
    prisma.eCGCase.findMany({
      include: {
        assignedDoctor: { select: { email: true, id: true, name: true } },
        patient: { select: { fullName: true, id: true, medicalRecordNumber: true, organizationId: true } },
        uploadedBy: { select: { email: true, id: true, name: true } },
      },
      orderBy: orderBy as Prisma.ECGCaseOrderByWithRelationInput,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.eCGCase.count({ where }),
  ]);
  return paginatedResult(items, total, query.page, query.pageSize);
}

export async function getEcgCaseRepo(id: string) {
  return prisma.eCGCase.findFirst({
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      assignedDoctor: { select: { email: true, id: true, name: true } },
      patient: true,
      uploadedBy: { select: { email: true, id: true, name: true } },
    },
    where: withNotDeleted("ecgCase", { id }),
  });
}

export async function createEcgCaseRepo(input: {
  actorId: string;
  caseId: string;
  ecgType: string;
  patientId: string;
  acquisitionDate?: Date;
  priority?: keyof typeof priorityMap;
}) {
  const audit = buildCreateUpdateAudit({ userId: input.actorId });
  return prisma.eCGCase.create({
    data: {
      acquisitionDate: input.acquisitionDate ?? new Date(),
      caseId: input.caseId,
      createdById: audit.createdById,
      ecgType: input.ecgType,
      patientId: input.patientId,
      priority: input.priority ? priorityMap[input.priority] : "MEDIUM",
      updatedById: audit.updatedById,
      uploadedById: input.actorId,
    },
    include: { patient: { select: { fullName: true, id: true } } },
  });
}

export async function updateEcgCaseRepo(id: string, data: Prisma.ECGCaseUncheckedUpdateInput, actorId: string) {
  const audit = buildUpdateAudit({ userId: actorId });
  return prisma.eCGCase.update({
    data: { ...data, updatedById: audit.updatedById },
    where: { id, deletedAt: null },
  });
}

export async function softDeleteEcgCaseRepo(id: string, actorId: string) {
  return prisma.eCGCase.update({
    data: { ...softDeleteData(), updatedById: actorId },
    where: { id },
  });
}

// ─── Audit ────────────────────────────────────────────────────────────────────

export async function listAuditTrailRepo(organizationId: string, query: ListQuery) {
  const where: Prisma.AuditLogWhereInput = { organizationId };
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      where,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return paginatedResult(items, total, query.page, query.pageSize);
}
