import type { Request } from "express";
import { Router } from "express";
import { z } from "zod";
import type { Gender, ECGPriority, ECGCaseStatus } from "@prisma/client";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody, validateQuery } from "../../middleware/validate";
import { isPlatformAdmin, requireTenantAccess, resolveUserOrganizationId } from "../organization-platform/tenant.middleware";
import { recordDomainAudit } from "./domain-audit";
import { apiSuccess } from "./list-query";
import { orgDomainListSchema } from "./schemas";
import {
  createDepartmentRepo,
  createEcgCaseRepo,
  createEmployeeRepo,
  createOrganizationRepo,
  createPatientRepo,
  getDepartmentRepo,
  getDoctorRepo,
  getEcgCaseRepo,
  getEmployeeRepo,
  getOrganizationRepo,
  getPatientRepo,
  listAuditTrailRepo,
  listDepartmentsRepo,
  listDoctorsRepo,
  listEcgCasesRepo,
  listEmployeesRepo,
  listOrganizationsRepo,
  listPatientsRepo,
  softDeleteDepartmentRepo,
  softDeleteEcgCaseRepo,
  softDeleteEmployeeRepo,
  softDeleteOrganizationRepo,
  softDeletePatientRepo,
  updateDepartmentRepo,
  updateDoctorRepo,
  updateEcgCaseRepo,
  updateEmployeeRepo,
  updateOrganizationRepo,
  updatePatientRepo,
} from "./repository";
import {
  departmentBodySchema,
  departmentUpdateSchema,
  doctorUpdateSchema,
  ecgCaseBodySchema,
  ecgCaseUpdateSchema,
  employeeBodySchema,
  employeeUpdateSchema,
  organizationBodySchema,
  organizationUpdateSchema,
  patientBodySchema,
  patientUpdateSchema,
} from "./schemas";

export const organizationDomainRouter = Router();
organizationDomainRouter.use(requireAuth);

function paramId(req: Request, key: string) {
  const value = req.params[key];
  if (typeof value !== "string" || !value) throw new AppError(400, `Invalid ${key}.`, "INVALID_ID");
  return value;
}

async function resolveScopedOrganizationId(req: Request, organizationId?: string) {
  if (req.auth && isPlatformAdmin(req.auth.role)) return organizationId;
  const userOrg = await resolveUserOrganizationId(req.auth!.id);
  if (organizationId && userOrg && organizationId !== userOrg) {
    throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
  }
  return organizationId ?? userOrg ?? undefined;
}

function parseListQuery(req: Request) {
  return orgDomainListSchema.parse(req.query);
}

const genderToEnum = (value: string): Gender => value.toUpperCase() as Gender;
const priorityToEnum = (value: string): ECGPriority => value.toUpperCase() as ECGPriority;

const caseListQuerySchema = orgDomainListSchema.extend({ patientId: z.string().optional() });

function parseCaseListQuery(req: Request) {
  return caseListQuerySchema.parse(req.query);
}

function nextCaseId() {
  return `ECG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
}

// ─── Organizations ────────────────────────────────────────────────────────────

organizationDomainRouter.get("/organizations", validateQuery(orgDomainListSchema), async (req, res, next) => {
  try {
    const query = parseListQuery(req);
    if (!isPlatformAdmin(req.auth!.role)) {
      const orgId = await resolveUserOrganizationId(req.auth!.id);
      if (!orgId) throw new AppError(403, "No organization membership.", "ORG_MEMBERSHIP_REQUIRED");
      const org = await getOrganizationRepo(orgId);
      res.json(apiSuccess({ items: org ? [org] : [], page: 1, pageSize: 1, total: org ? 1 : 0, totalPages: 1 }));
      return;
    }
    const result = await listOrganizationsRepo(query);
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.post(
  "/organizations",
  requireRole("SUPER_ADMIN", "OWNER", "ADMIN"),
  validateBody(organizationBodySchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof organizationBodySchema>;
      const organization = await createOrganizationRepo({ ...body, actorId: req.auth!.id });
      await recordDomainAudit("ORGANIZATION_CREATED", { actorId: req.auth!.id, organizationId: organization.id }, `Organization ${organization.name} created`);
      res.status(201).json(apiSuccess({ organization }));
    } catch (error) {
      next(error);
    }
  },
);

organizationDomainRouter.get("/organizations/:organizationId", requireTenantAccess(), async (req, res, next) => {
  try {
    const organization = await getOrganizationRepo(paramId(req, "organizationId"));
    if (!organization) throw new AppError(404, "Organization not found.", "ORG_NOT_FOUND");
    res.json(apiSuccess({ organization }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.patch(
  "/organizations/:organizationId",
  requireTenantAccess(),
  validateBody(organizationUpdateSchema),
  async (req, res, next) => {
    try {
      const organizationId = paramId(req, "organizationId");
      const organization = await updateOrganizationRepo(organizationId, req.body, req.auth!.id);
      await recordDomainAudit("ORGANIZATION_UPDATED", { actorId: req.auth!.id, organizationId }, `Organization ${organization.name} updated`);
      res.json(apiSuccess({ organization }));
    } catch (error) {
      next(error);
    }
  },
);

organizationDomainRouter.delete("/organizations/:organizationId", requireTenantAccess(), requireRole("SUPER_ADMIN", "OWNER", "ADMIN"), async (req, res, next) => {
  try {
    const organizationId = paramId(req, "organizationId");
    const organization = await softDeleteOrganizationRepo(organizationId, req.auth!.id);
    await recordDomainAudit("ORGANIZATION_DELETED", { actorId: req.auth!.id, organizationId }, `Organization ${organization.name} soft-deleted`);
    res.json(apiSuccess({ organization }));
  } catch (error) {
    next(error);
  }
});

// ─── Departments ──────────────────────────────────────────────────────────────

organizationDomainRouter.get("/organizations/:organizationId/departments", requireTenantAccess(), validateQuery(orgDomainListSchema), async (req, res, next) => {
  try {
    const result = await listDepartmentsRepo(paramId(req, "organizationId"), parseListQuery(req));
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.post(
  "/organizations/:organizationId/departments",
  requireTenantAccess(),
  validateBody(departmentBodySchema),
  async (req, res, next) => {
    try {
      const organizationId = paramId(req, "organizationId");
      const body = req.body as z.infer<typeof departmentBodySchema>;
      const department = await createDepartmentRepo({ ...body, actorId: req.auth!.id, organizationId });
      await recordDomainAudit("SETTINGS_CHANGED", { actorId: req.auth!.id, organizationId }, `Department ${department.name} created`, { entityId: department.id, entityType: "Department" });
      res.status(201).json(apiSuccess({ department }));
    } catch (error) {
      next(error);
    }
  },
);

organizationDomainRouter.get("/departments/:departmentId", async (req, res, next) => {
  try {
    const department = await getDepartmentRepo(paramId(req, "departmentId"));
    if (!department) throw new AppError(404, "Department not found.", "DEPT_NOT_FOUND");
    if (!isPlatformAdmin(req.auth!.role)) {
      const orgId = await resolveUserOrganizationId(req.auth!.id);
      if (orgId !== department.organizationId) throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
    }
    res.json(apiSuccess({ department }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.patch("/departments/:departmentId", validateBody(departmentUpdateSchema), async (req, res, next) => {
  try {
    const departmentId = paramId(req, "departmentId");
    const existing = await getDepartmentRepo(departmentId);
    if (!existing) throw new AppError(404, "Department not found.", "DEPT_NOT_FOUND");
    if (!isPlatformAdmin(req.auth!.role)) {
      const orgId = await resolveUserOrganizationId(req.auth!.id);
      if (orgId !== existing.organizationId) throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
    }
    const department = await updateDepartmentRepo(departmentId, req.body, req.auth!.id);
    await recordDomainAudit("SETTINGS_CHANGED", { actorId: req.auth!.id, organizationId: existing.organizationId }, `Department ${department.name} updated`, { entityId: department.id, entityType: "Department" });
    res.json(apiSuccess({ department }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.delete("/departments/:departmentId", async (req, res, next) => {
  try {
    const departmentId = paramId(req, "departmentId");
    const existing = await getDepartmentRepo(departmentId);
    if (!existing) throw new AppError(404, "Department not found.", "DEPT_NOT_FOUND");
    if (!isPlatformAdmin(req.auth!.role)) {
      const orgId = await resolveUserOrganizationId(req.auth!.id);
      if (orgId !== existing.organizationId) throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
    }
    const department = await softDeleteDepartmentRepo(departmentId, req.auth!.id);
    await recordDomainAudit("SETTINGS_CHANGED", { actorId: req.auth!.id, organizationId: existing.organizationId }, `Department ${department.name} soft-deleted`, { entityId: department.id, entityType: "Department" });
    res.json(apiSuccess({ department }));
  } catch (error) {
    next(error);
  }
});

// ─── Employees ────────────────────────────────────────────────────────────────

organizationDomainRouter.get("/organizations/:organizationId/employees", requireTenantAccess(), validateQuery(orgDomainListSchema), async (req, res, next) => {
  try {
    const result = await listEmployeesRepo(paramId(req, "organizationId"), parseListQuery(req));
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.post(
  "/organizations/:organizationId/employees",
  requireTenantAccess(),
  validateBody(employeeBodySchema),
  async (req, res, next) => {
    try {
      const organizationId = paramId(req, "organizationId");
      const body = req.body as z.infer<typeof employeeBodySchema>;
      const employee = await createEmployeeRepo({
        ...body,
        actorId: req.auth!.id,
        dateOfBirth: new Date(body.dateOfBirth),
        organizationId,
      });
      await recordDomainAudit("SETTINGS_CHANGED", { actorId: req.auth!.id, organizationId }, `Employee ${employee.fullName} created`, { entityId: employee.id, entityType: "Employee" });
      res.status(201).json(apiSuccess({ employee }));
    } catch (error) {
      next(error);
    }
  },
);

organizationDomainRouter.get("/employees/:employeeId", async (req, res, next) => {
  try {
    const employee = await getEmployeeRepo(paramId(req, "employeeId"));
    if (!employee) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    if (!isPlatformAdmin(req.auth!.role)) {
      const orgId = await resolveUserOrganizationId(req.auth!.id);
      if (orgId !== employee.organizationId) throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
    }
    res.json(apiSuccess({ employee }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.patch("/employees/:employeeId", validateBody(employeeUpdateSchema), async (req, res, next) => {
  try {
    const employeeId = paramId(req, "employeeId");
    const existing = await getEmployeeRepo(employeeId);
    if (!existing) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    if (!isPlatformAdmin(req.auth!.role)) {
      const orgId = await resolveUserOrganizationId(req.auth!.id);
      if (orgId !== existing.organizationId) throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
    }
    const body = req.body as z.infer<typeof employeeUpdateSchema>;
    const employee = await updateEmployeeRepo(employeeId, {
      companyId: body.companyId,
      contractorCompanyId: body.contractorCompanyId,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      departmentId: body.departmentId,
      email: body.email,
      fullName: body.fullName,
      gender: body.gender ? genderToEnum(body.gender) : undefined,
      jobTitle: body.jobTitle,
      phone: body.phone,
      workLocation: body.workLocation,
    });
    if (!employee) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    await recordDomainAudit("SETTINGS_CHANGED", { actorId: req.auth!.id, organizationId: existing.organizationId }, `Employee ${employee.fullName} updated`, { entityId: employee.id, entityType: "Employee" });
    res.json(apiSuccess({ employee }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.delete("/employees/:employeeId", async (req, res, next) => {
  try {
    const employeeId = paramId(req, "employeeId");
    const existing = await getEmployeeRepo(employeeId);
    if (!existing) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    if (!isPlatformAdmin(req.auth!.role)) {
      const orgId = await resolveUserOrganizationId(req.auth!.id);
      if (orgId !== existing.organizationId) throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
    }
    const employee = await softDeleteEmployeeRepo(employeeId);
    await recordDomainAudit("SETTINGS_CHANGED", { actorId: req.auth!.id, organizationId: existing.organizationId }, `Employee ${employee.fullName} terminated`, { entityId: employee.id, entityType: "Employee" });
    res.json(apiSuccess({ employee }));
  } catch (error) {
    next(error);
  }
});

// ─── Patients ─────────────────────────────────────────────────────────────────

organizationDomainRouter.get("/patients", validateQuery(orgDomainListSchema), async (req, res, next) => {
  try {
    const query = parseListQuery(req);
    const organizationId = await resolveScopedOrganizationId(req, query.organizationId);
    const result = await listPatientsRepo({ ...query, organizationId });
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.post("/patients", validateBody(patientBodySchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof patientBodySchema>;
    const organizationId = await resolveScopedOrganizationId(req, body.organizationId);
    const patient = await createPatientRepo({
      ...body,
      actorId: req.auth!.id,
      dateOfBirth: new Date(body.dateOfBirth),
      organizationId,
    });
    await recordDomainAudit("PATIENT_CREATED", { actorId: req.auth!.id, organizationId: patient.organizationId ?? undefined, patientId: patient.id }, `Patient ${patient.fullName ?? patient.firstName} created`, { entityId: patient.id, entityType: "Patient" });
    res.status(201).json(apiSuccess({ patient }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.get("/patients/:patientId", async (req, res, next) => {
  try {
    const patient = await getPatientRepo(paramId(req, "patientId"));
    if (!patient) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    if (!isPlatformAdmin(req.auth!.role) && patient.organizationId) {
      const orgId = await resolveUserOrganizationId(req.auth!.id);
      if (orgId && orgId !== patient.organizationId) throw new AppError(403, "Cross-tenant access denied.", "TENANT_FORBIDDEN");
    }
    res.json(apiSuccess({ patient }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.patch("/patients/:patientId", validateBody(patientUpdateSchema), async (req, res, next) => {
  try {
    const patientId = paramId(req, "patientId");
    const existing = await getPatientRepo(patientId);
    if (!existing) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    const body = req.body as z.infer<typeof patientUpdateSchema>;
    const patient = await updatePatientRepo(patientId, {
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      departmentId: body.departmentId,
      email: body.email,
      employeeId: body.employeeId,
      firstName: body.firstName,
      gender: body.gender ? genderToEnum(body.gender) : undefined,
      lastName: body.lastName,
      medicalRecordNumber: body.medicalRecordNumber,
      middleName: body.middleName,
      organizationId: body.organizationId,
      phone: body.phone,
    }, req.auth!.id);
    await recordDomainAudit("PATIENT_UPDATED", { actorId: req.auth!.id, organizationId: patient.organizationId ?? undefined, patientId }, `Patient ${patient.fullName ?? patient.firstName} updated`, { entityId: patientId, entityType: "Patient" });
    res.json(apiSuccess({ patient }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.delete("/patients/:patientId", async (req, res, next) => {
  try {
    const patientId = paramId(req, "patientId");
    const existing = await getPatientRepo(patientId);
    if (!existing) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    const patient = await softDeletePatientRepo(patientId, req.auth!.id);
    await recordDomainAudit("PATIENT_ARCHIVED", { actorId: req.auth!.id, organizationId: patient.organizationId ?? undefined, patientId }, `Patient ${patient.fullName ?? patient.firstName} soft-deleted`, { entityId: patientId, entityType: "Patient" });
    res.json(apiSuccess({ patient }));
  } catch (error) {
    next(error);
  }
});

// ─── Doctors ──────────────────────────────────────────────────────────────────

organizationDomainRouter.get("/organizations/:organizationId/doctors", requireTenantAccess(), validateQuery(orgDomainListSchema), async (req, res, next) => {
  try {
    const result = await listDoctorsRepo(paramId(req, "organizationId"), parseListQuery(req));
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.get("/doctors/:doctorId", async (req, res, next) => {
  try {
    const doctor = await getDoctorRepo(paramId(req, "doctorId"));
    if (!doctor) throw new AppError(404, "Doctor not found.", "DOCTOR_NOT_FOUND");
    res.json(apiSuccess({ doctor }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.patch("/doctors/:doctorId", validateBody(doctorUpdateSchema), async (req, res, next) => {
  try {
    const doctorId = paramId(req, "doctorId");
    const doctor = await updateDoctorRepo(doctorId, req.body);
    await recordDomainAudit("SETTINGS_CHANGED", { actorId: req.auth!.id, organizationId: doctor.organizationId ?? undefined }, `Doctor ${doctor.name} updated`, { entityId: doctorId, entityType: "Doctor" });
    res.json(apiSuccess({ doctor }));
  } catch (error) {
    next(error);
  }
});

// ─── ECG Cases ────────────────────────────────────────────────────────────────

organizationDomainRouter.get("/cases", validateQuery(caseListQuerySchema), async (req, res, next) => {
  try {
    const query = parseCaseListQuery(req);
    const organizationId = await resolveScopedOrganizationId(req, query.organizationId);
    const result = await listEcgCasesRepo({ ...query, organizationId });
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.post("/cases", validateBody(ecgCaseBodySchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof ecgCaseBodySchema>;
    const ecgCase = await createEcgCaseRepo({
      acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : undefined,
      actorId: req.auth!.id,
      caseId: nextCaseId(),
      ecgType: body.ecgType,
      patientId: body.patientId,
      priority: body.priority,
    });
    await recordDomainAudit("CASE_CREATED", { actorId: req.auth!.id, caseId: ecgCase.id, patientId: ecgCase.patientId }, `ECG case ${ecgCase.caseId} created`, { entityId: ecgCase.id, entityType: "ECGCase" });
    res.status(201).json(apiSuccess({ case: ecgCase }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.get("/cases/:caseId", async (req, res, next) => {
  try {
    const ecgCase = await getEcgCaseRepo(paramId(req, "caseId"));
    if (!ecgCase) throw new AppError(404, "Case not found.", "CASE_NOT_FOUND");
    res.json(apiSuccess({ case: ecgCase }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.patch("/cases/:caseId", validateBody(ecgCaseUpdateSchema), async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const body = req.body as z.infer<typeof ecgCaseUpdateSchema>;
    const ecgCase = await updateEcgCaseRepo(caseId, {
      assignedDoctorId: body.assignedDoctorId,
      clinicalComments: body.clinicalComments,
      doctorDiagnosis: body.doctorDiagnosis,
      finalDiagnosis: body.finalDiagnosis,
      priority: body.priority ? priorityToEnum(body.priority) : undefined,
      status: body.status ? (body.status.toUpperCase() as ECGCaseStatus) : undefined,
    }, req.auth!.id);
    await recordDomainAudit("CASE_UPDATED", { actorId: req.auth!.id, caseId, patientId: ecgCase.patientId }, `ECG case ${ecgCase.caseId} updated`, { entityId: caseId, entityType: "ECGCase" });
    res.json(apiSuccess({ case: ecgCase }));
  } catch (error) {
    next(error);
  }
});

organizationDomainRouter.delete("/cases/:caseId", async (req, res, next) => {
  try {
    const caseId = paramId(req, "caseId");
    const existing = await getEcgCaseRepo(caseId);
    if (!existing) throw new AppError(404, "Case not found.", "CASE_NOT_FOUND");
    const ecgCase = await softDeleteEcgCaseRepo(caseId, req.auth!.id);
    await recordDomainAudit("CASE_DELETED", { actorId: req.auth!.id, caseId, patientId: ecgCase.patientId }, `ECG case ${ecgCase.caseId} soft-deleted`, { entityId: caseId, entityType: "ECGCase" });
    res.json(apiSuccess({ case: ecgCase }));
  } catch (error) {
    next(error);
  }
});

// ─── Audit Trail ──────────────────────────────────────────────────────────────

organizationDomainRouter.get("/organizations/:organizationId/audit", requireTenantAccess(), validateQuery(orgDomainListSchema), async (req, res, next) => {
  try {
    const result = await listAuditTrailRepo(paramId(req, "organizationId"), parseListQuery(req));
    res.json(apiSuccess(result));
  } catch (error) {
    next(error);
  }
});
