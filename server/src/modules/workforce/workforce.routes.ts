import type {
  Company,
  Employee,
  EmploymentStatus,
  Gender,
  MedicalFitnessStatus,
  OrganizationStatus,
  OrganizationType,
  Prisma,
  WorkCategory,
} from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody } from "../../middleware/validate";
import { assertResourceAccess, canAccessEmployee } from "../../utils/resource-access";
import {
  companyBodySchema,
  companyUpdateSchema,
  contractorBodySchema,
  contractorUpdateSchema,
  departmentBodySchema,
  departmentUpdateSchema,
  employeeBodySchema,
  employeeListQuerySchema,
  type EmployeeBody,
  type EmployeeUpdateBody,
  employeeUpdateSchema,
  listQuerySchema,
  organizationBodySchema,
  organizationUpdateSchema,
} from "./workforce.schemas";

export const organizationsRouter = Router();
export const companiesRouter = Router();
export const departmentsRouter = Router();
export const contractorsRouter = Router();
export const employeesRouter = Router();

const routers = [organizationsRouter, companiesRouter, departmentsRouter, contractorsRouter, employeesRouter];
for (const router of routers) router.use(requireAuth);

const genderMap: Record<"female" | "male" | "other" | "unknown", Gender> = {
  female: "FEMALE",
  male: "MALE",
  other: "OTHER",
  unknown: "UNKNOWN",
};

const employmentStatusMap: Record<string, EmploymentStatus> = {
  active: "ACTIVE",
  inactive: "INACTIVE",
  on_leave: "ON_LEAVE",
  retired: "RETIRED",
  terminated: "TERMINATED",
};

const fitnessStatusMap: Record<string, MedicalFitnessStatus> = {
  fit: "FIT",
  fit_with_restrictions: "FIT_WITH_RESTRICTIONS",
  permanently_unfit: "PERMANENTLY_UNFIT",
  refer_to_cardiologist: "REFER_TO_CARDIOLOGIST",
  temporarily_unfit: "TEMPORARILY_UNFIT",
  unknown: "UNKNOWN",
};

const workCategoryMap: Record<string, WorkCategory> = {
  administrative: "ADMINISTRATIVE",
  emergency_response: "EMERGENCY_RESPONSE",
  heavy: "HEAVY",
  light: "LIGHT",
  moderate: "MODERATE",
  offshore: "OFFSHORE",
  safety_critical: "SAFETY_CRITICAL",
};

function organizationType(value: string): OrganizationType {
  return value.toUpperCase() as OrganizationType;
}

function organizationStatus(value: string): OrganizationStatus {
  return value.toUpperCase() as OrganizationStatus;
}

function serializeEmployee(employee: Employee) {
  return {
    companyId: employee.companyId ?? undefined,
    contractorCompanyId: employee.contractorCompanyId ?? undefined,
    confinedSpace: employee.confinedSpace,
    createdAt: employee.createdAt.toISOString(),
    criticalJob: employee.criticalJob,
    dateOfBirth: employee.dateOfBirth.toISOString().slice(0, 10),
    departmentId: employee.departmentId,
    drivingDuty: employee.drivingDuty,
    email: employee.email ?? undefined,
    employeeId: employee.employeeId,
    employmentStatus: employee.employmentStatus.toLowerCase(),
    emergencyResponder: employee.emergencyResponder,
    firefighter: employee.firefighter,
    fullName: employee.fullName,
    gender: employee.gender.toLowerCase(),
    heavyEquipmentOperator: employee.heavyEquipmentOperator,
    hiringDate: employee.hiringDate?.toISOString().slice(0, 10),
    id: employee.id,
    jobTitle: employee.jobTitle ?? undefined,
    medicalRestrictions: employee.medicalRestrictions,
    medicalFitnessStatus: employee.medicalFitnessStatus.toLowerCase(),
    nationalId: employee.nationalId,
    offshoreWorker: employee.offshoreWorker,
    organizationId: employee.organizationId,
    phone: employee.phone ?? undefined,
    riskCategory: employee.riskCategory ?? undefined,
    retirementDate: employee.retirementDate?.toISOString().slice(0, 10),
    shiftWorker: employee.shiftWorker,
    updatedAt: employee.updatedAt.toISOString(),
    workAtHeight: employee.workAtHeight,
    workCategory: employee.workCategory.toLowerCase(),
    workLocation: employee.workLocation ?? undefined,
  };
}

function serializeCompany(company: Company) {
  return {
    address: company.address ?? undefined,
    createdAt: company.createdAt.toISOString(),
    email: company.email ?? undefined,
    id: company.id,
    name: company.name,
    organizationId: company.organizationId,
    phone: company.phone ?? undefined,
    registrationNumber: company.registrationNumber ?? undefined,
    status: company.status.toLowerCase(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

async function assertDepartmentBelongsToOrganization(departmentId: string, organizationId: string) {
  const department = await prisma.department.findFirst({ where: { id: departmentId, organizationId } });
  if (!department) throw new AppError(400, "Department does not belong to this organization.", "INVALID_DEPARTMENT");
}

async function assertCompanyBelongsToOrganization(companyId: string | undefined, organizationId: string) {
  if (!companyId) return;
  const company = await prisma.company.findFirst({ where: { id: companyId, organizationId } });
  if (!company) throw new AppError(400, "Company does not belong to this organization.", "INVALID_COMPANY");
}

async function assertContractorBelongsToOrganization(contractorCompanyId: string | undefined, organizationId: string) {
  if (!contractorCompanyId) return;
  const contractor = await prisma.contractorCompany.findFirst({
    where: { id: contractorCompanyId, organizationId },
  });
  if (!contractor) {
    throw new AppError(400, "Contractor company does not belong to this organization.", "INVALID_CONTRACTOR");
  }
}

function employeeCreateData(body: EmployeeBody) {
  return {
    companyId: body.companyId,
    confinedSpace: body.confinedSpace,
    contractorCompanyId: body.contractorCompanyId,
    criticalJob: body.criticalJob,
    dateOfBirth: body.dateOfBirth,
    departmentId: body.departmentId,
    drivingDuty: body.drivingDuty,
    email: body.email,
    employeeId: body.employeeId,
    employmentStatus: employmentStatusMap[body.employmentStatus],
    emergencyResponder: body.emergencyResponder,
    firefighter: body.firefighter,
    fullName: body.fullName,
    gender: genderMap[body.gender],
    heavyEquipmentOperator: body.heavyEquipmentOperator,
    hiringDate: body.hiringDate,
    jobTitle: body.jobTitle,
    medicalRestrictions: body.medicalRestrictions,
    medicalFitnessStatus: fitnessStatusMap[body.medicalFitnessStatus],
    nationalId: body.nationalId,
    offshoreWorker: body.offshoreWorker,
    organizationId: body.organizationId,
    phone: body.phone,
    riskCategory: body.riskCategory,
    retirementDate: body.retirementDate,
    shiftWorker: body.shiftWorker,
    workAtHeight: body.workAtHeight,
    workCategory: workCategoryMap[body.workCategory],
    workLocation: body.workLocation,
  };
}

function employeeUpdateData(body: EmployeeUpdateBody) {
  return {
    companyId: body.companyId,
    confinedSpace: body.confinedSpace,
    contractorCompanyId: body.contractorCompanyId,
    criticalJob: body.criticalJob,
    dateOfBirth: body.dateOfBirth,
    departmentId: body.departmentId,
    drivingDuty: body.drivingDuty,
    email: body.email,
    employeeId: body.employeeId,
    employmentStatus: body.employmentStatus ? employmentStatusMap[body.employmentStatus] : undefined,
    emergencyResponder: body.emergencyResponder,
    firefighter: body.firefighter,
    fullName: body.fullName,
    gender: body.gender ? genderMap[body.gender] : undefined,
    heavyEquipmentOperator: body.heavyEquipmentOperator,
    hiringDate: body.hiringDate,
    jobTitle: body.jobTitle,
    medicalRestrictions: body.medicalRestrictions,
    medicalFitnessStatus: body.medicalFitnessStatus ? fitnessStatusMap[body.medicalFitnessStatus] : undefined,
    nationalId: body.nationalId,
    offshoreWorker: body.offshoreWorker,
    organizationId: body.organizationId,
    phone: body.phone,
    riskCategory: body.riskCategory,
    retirementDate: body.retirementDate,
    shiftWorker: body.shiftWorker,
    workAtHeight: body.workAtHeight,
    workCategory: body.workCategory ? workCategoryMap[body.workCategory] : undefined,
    workLocation: body.workLocation,
  };
}

organizationsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where: Prisma.OrganizationWhereInput = query.q
      ? { name: { contains: query.q, mode: "insensitive" } }
      : {};
    const [total, organizations] = await Promise.all([
      prisma.organization.count({ where }),
      prisma.organization.findMany({
        include: { contractorCompanies: true, departments: true },
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({ organizations, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});

organizationsRouter.post("/", requireRole("ADMIN"), validateBody(organizationBodySchema), async (req, res, next) => {
  try {
    const organization = await prisma.organization.create({
      data: {
        address: req.body.address,
        email: req.body.email,
        logo: req.body.logo,
        name: req.body.name,
        phone: req.body.phone,
        status: organizationStatus(req.body.status),
        type: organizationType(req.body.type),
      },
    });
    res.status(201).json({ organization });
  } catch (error) {
    next(error);
  }
});

organizationsRouter.patch("/:organizationId", requireRole("ADMIN"), validateBody(organizationUpdateSchema), async (req, res, next) => {
  try {
    const organization = await prisma.organization.update({
      data: {
        address: req.body.address,
        email: req.body.email,
        logo: req.body.logo,
        name: req.body.name,
        phone: req.body.phone,
        status: req.body.status ? organizationStatus(req.body.status) : undefined,
        type: req.body.type ? organizationType(req.body.type) : undefined,
      },
      where: { id: String(req.params.organizationId) },
    });
    res.json({ organization });
  } catch (error) {
    next(error);
  }
});

organizationsRouter.delete("/:organizationId", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const organization = await prisma.organization.update({
      data: { status: "INACTIVE" },
      where: { id: String(req.params.organizationId) },
    });
    await prisma.auditLog.create({
      data: {
        action: "ORGANIZATION_DELETED",
        actorId: req.auth!.id,
        entityId: organization.id,
        entityType: "Organization",
        message: `Organization deactivated: ${organization.name}.`,
        organizationId: organization.id,
      },
    });
    res.json({ organization });
  } catch (error) {
    next(error);
  }
});

companiesRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const where: Prisma.CompanyWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(status ? { status: organizationStatus(status) } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { registrationNumber: { contains: query.q, mode: "insensitive" } },
              { email: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, companies] = await Promise.all([
      prisma.company.count({ where }),
      prisma.company.findMany({
        include: { contractors: true, departments: true },
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({ companies: companies.map(serializeCompany), page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});

companiesRouter.post("/", requireRole("ADMIN"), validateBody(companyBodySchema), async (req, res, next) => {
  try {
    const organization = await prisma.organization.findUnique({ where: { id: req.body.organizationId } });
    if (!organization) throw new AppError(404, "Organization not found.", "ORGANIZATION_NOT_FOUND");
    const company = await prisma.company.create({
      data: {
        address: req.body.address,
        email: req.body.email,
        name: req.body.name,
        organizationId: req.body.organizationId,
        phone: req.body.phone,
        registrationNumber: req.body.registrationNumber,
        status: organizationStatus(req.body.status),
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "COMPANY_CREATED",
        actorId: req.auth!.id,
        entityId: company.id,
        entityType: "Company",
        message: `Company created: ${company.name}.`,
        organizationId: company.organizationId,
      },
    });
    res.status(201).json({ company: serializeCompany(company) });
  } catch (error) {
    next(error);
  }
});

companiesRouter.get("/:companyId", async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      include: {
        contractors: true,
        departments: true,
        employees: { take: 50, orderBy: { updatedAt: "desc" } },
        organization: true,
      },
      where: { id: String(req.params.companyId) },
    });
    if (!company) throw new AppError(404, "Company not found.", "COMPANY_NOT_FOUND");
    res.json({ company: { ...serializeCompany(company), contractors: company.contractors, departments: company.departments, employees: company.employees.map(serializeEmployee), organization: company.organization } });
  } catch (error) {
    next(error);
  }
});

companiesRouter.patch("/:companyId", requireRole("ADMIN"), validateBody(companyUpdateSchema), async (req, res, next) => {
  try {
    const company = await prisma.company.update({
      data: {
        address: req.body.address,
        email: req.body.email,
        name: req.body.name,
        phone: req.body.phone,
        registrationNumber: req.body.registrationNumber,
        status: req.body.status ? organizationStatus(req.body.status) : undefined,
      },
      where: { id: String(req.params.companyId) },
    });
    await prisma.auditLog.create({
      data: {
        action: "COMPANY_UPDATED",
        actorId: req.auth!.id,
        entityId: company.id,
        entityType: "Company",
        message: `Company updated: ${company.name}.`,
        organizationId: company.organizationId,
      },
    });
    res.json({ company: serializeCompany(company) });
  } catch (error) {
    next(error);
  }
});

companiesRouter.delete("/:companyId", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const company = await prisma.company.update({
      data: { status: "INACTIVE" },
      where: { id: String(req.params.companyId) },
    });
    await prisma.auditLog.create({
      data: {
        action: "COMPANY_DELETED",
        actorId: req.auth!.id,
        entityId: company.id,
        entityType: "Company",
        message: `Company deactivated: ${company.name}.`,
        organizationId: company.organizationId,
      },
    });
    res.json({ company: serializeCompany(company) });
  } catch (error) {
    next(error);
  }
});

organizationsRouter.get("/:organizationId/analytics", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const organizationId = String(req.params.organizationId);
    const [employeesCount, contractorsCount, medicallyUnfitEmployees, highRiskCardiacEmployees] = await Promise.all([
      prisma.employee.count({ where: { organizationId } }),
      prisma.contractorCompany.count({ where: { organizationId } }),
      prisma.employee.count({
        where: {
          organizationId,
          medicalFitnessStatus: { in: ["TEMPORARILY_UNFIT", "PERMANENTLY_UNFIT", "REFER_TO_CARDIOLOGIST"] },
        },
      }),
      prisma.employee.count({
        where: {
          organizationId,
          patient: {
            OR: [
              { cardiacHistory: { coronaryArteryDisease: true } },
              { cardiacHistory: { heartFailure: true } },
              { cardiacHistory: { myocardialInfarctionHistory: true } },
              { cardiacHistory: { previousStroke: true } },
              { cases: { some: { priority: "CRITICAL" } } },
            ],
          },
        },
      }),
    ]);
    res.json({
      analytics: {
        contractorsCount,
        employeesCount,
        highRiskCardiacEmployees,
        medicallyUnfitEmployees,
      },
    });
  } catch (error) {
    next(error);
  }
});

departmentsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : undefined;
    const where: Prisma.DepartmentWhereInput = {
      ...(typeof req.query.companyId === "string" ? { companyId: req.query.companyId } : {}),
      ...(organizationId ? { organizationId } : {}),
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
    };
    const [total, departments] = await Promise.all([
      prisma.department.count({ where }),
      prisma.department.findMany({
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({ departments, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});

departmentsRouter.post("/", requireRole("ADMIN"), validateBody(departmentBodySchema), async (req, res, next) => {
  try {
    await assertCompanyBelongsToOrganization(req.body.companyId, req.body.organizationId);
    const department = await prisma.department.create({
      data: { companyId: req.body.companyId, name: req.body.name, organizationId: req.body.organizationId },
    });
    res.status(201).json({ department });
  } catch (error) {
    next(error);
  }
});

departmentsRouter.patch("/:departmentId", requireRole("ADMIN"), validateBody(departmentUpdateSchema), async (req, res, next) => {
  try {
    const department = await prisma.department.update({
      data: { companyId: req.body.companyId, name: req.body.name },
      where: { id: String(req.params.departmentId) },
    });
    res.json({ department });
  } catch (error) {
    next(error);
  }
});

departmentsRouter.delete("/:departmentId", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const department = await prisma.department.delete({ where: { id: String(req.params.departmentId) } });
    await prisma.auditLog.create({
      data: {
        action: "DEPARTMENT_DELETED",
        actorId: req.auth!.id,
        entityId: department.id,
        entityType: "Department",
        message: `Department deleted: ${department.name}.`,
        organizationId: department.organizationId,
      },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

contractorsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : undefined;
    const where: Prisma.ContractorCompanyWhereInput = {
      ...(typeof req.query.companyId === "string" ? { companyId: req.query.companyId } : {}),
      ...(organizationId ? { organizationId } : {}),
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
    };
    const [total, contractors] = await Promise.all([
      prisma.contractorCompany.count({ where }),
      prisma.contractorCompany.findMany({
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({ contractors, page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) });
  } catch (error) {
    next(error);
  }
});

contractorsRouter.post("/", requireRole("ADMIN"), validateBody(contractorBodySchema), async (req, res, next) => {
  try {
    await assertCompanyBelongsToOrganization(req.body.companyId, req.body.organizationId);
    const contractor = await prisma.contractorCompany.create({
      data: {
        address: req.body.address,
        companyId: req.body.companyId,
        email: req.body.email,
        name: req.body.name,
        organizationId: req.body.organizationId,
        phone: req.body.phone,
        status: organizationStatus(req.body.status),
      },
    });
    res.status(201).json({ contractor });
  } catch (error) {
    next(error);
  }
});

contractorsRouter.patch("/:contractorId", requireRole("ADMIN"), validateBody(contractorUpdateSchema), async (req, res, next) => {
  try {
    const previous = await prisma.contractorCompany.findUnique({ where: { id: String(req.params.contractorId) } });
    if (!previous) throw new AppError(404, "Contractor company not found.", "CONTRACTOR_NOT_FOUND");
    await assertCompanyBelongsToOrganization(req.body.companyId, previous.organizationId);
    const contractor = await prisma.contractorCompany.update({
      data: {
        address: req.body.address,
        companyId: req.body.companyId,
        email: req.body.email,
        name: req.body.name,
        phone: req.body.phone,
        status: req.body.status ? organizationStatus(req.body.status) : undefined,
      },
      where: { id: String(req.params.contractorId) },
    });
    res.json({ contractor });
  } catch (error) {
    next(error);
  }
});

contractorsRouter.delete("/:contractorId", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const contractor = await prisma.contractorCompany.update({
      data: { status: "INACTIVE" },
      where: { id: String(req.params.contractorId) },
    });
    await prisma.auditLog.create({
      data: {
        action: "CONTRACTOR_DELETED",
        actorId: req.auth!.id,
        entityId: contractor.id,
        entityType: "ContractorCompany",
        message: `Contractor company deactivated: ${contractor.name}.`,
        organizationId: contractor.organizationId,
      },
    });
    res.json({ contractor });
  } catch (error) {
    next(error);
  }
});

employeesRouter.get("/", async (req, res, next) => {
  try {
    const query = employeeListQuerySchema.parse(req.query);
    const where: Prisma.EmployeeWhereInput = {
      ...(query.companyId ? { companyId: query.companyId } : {}),
      ...(query.contractorCompanyId ? { contractorCompanyId: query.contractorCompanyId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.employmentStatus ? { employmentStatus: employmentStatusMap[query.employmentStatus] } : {}),
      ...(query.medicalFitnessStatus ? { medicalFitnessStatus: fitnessStatusMap[query.medicalFitnessStatus] } : {}),
      ...(query.organizationId ? { organizationId: query.organizationId } : {}),
      ...(query.q
        ? {
            OR: [
              { employeeId: { contains: query.q, mode: "insensitive" } },
              { fullName: { contains: query.q, mode: "insensitive" } },
              { nationalId: { contains: query.q, mode: "insensitive" } },
              { email: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    if (req.auth!.role !== "SUPER_ADMIN" && req.auth!.role !== "ADMIN") {
      const created = await prisma.auditLog.findMany({
        select: { entityId: true },
        where: { action: "EMPLOYEE_CREATED", actorId: req.auth!.id, entityType: "Employee" },
      });
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
        {
          OR: [
            { id: { in: created.map((audit) => audit.entityId).filter((id): id is string => Boolean(id)) } },
            {
              patient: {
                OR: [
                  { auditLogs: { some: { action: "PATIENT_CREATED", actorId: req.auth!.id } } },
                  { cases: { some: { OR: [{ assignedDoctorId: req.auth!.id }, { uploadedById: req.auth!.id }] } } },
                  { reports: { some: { authorId: req.auth!.id } } },
                  { tasks: { some: { OR: [{ createdById: req.auth!.id }, { assignments: { some: { userId: req.auth!.id } } }] } } },
                ],
              },
            },
          ],
        },
      ];
    }
    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        orderBy: { updatedAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({
      employees: employees.map(serializeEmployee),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    next(error);
  }
});

employeesRouter.post("/", requireRole("DOCTOR"), validateBody(employeeBodySchema), async (req, res, next) => {
  try {
    await assertCompanyBelongsToOrganization(req.body.companyId, req.body.organizationId);
    await assertDepartmentBelongsToOrganization(req.body.departmentId, req.body.organizationId);
    await assertContractorBelongsToOrganization(req.body.contractorCompanyId, req.body.organizationId);
    const employee = await prisma.employee.create({ data: employeeCreateData(req.body) });
    await prisma.auditLog.create({
      data: {
        action: "EMPLOYEE_CREATED",
        actorId: req.auth!.id,
        entityId: employee.id,
        entityType: "Employee",
        message: `Employee ${employee.fullName} created.`,
      },
    });
    res.status(201).json({ employee: serializeEmployee(employee) });
  } catch (error) {
    next(error);
  }
});

employeesRouter.get("/:employeeId", async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      include: { contractorCompany: true, department: true, organization: true, patient: true },
      where: { id: String(req.params.employeeId) },
    });
    if (!employee) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    assertResourceAccess(await canAccessEmployee(employee.id, req.auth!));
    res.json({ employee });
  } catch (error) {
    next(error);
  }
});

employeesRouter.patch("/:employeeId", requireRole("DOCTOR"), validateBody(employeeUpdateSchema), async (req, res, next) => {
  try {
    const previous = await prisma.employee.findUnique({ where: { id: String(req.params.employeeId) } });
    if (!previous) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    assertResourceAccess(await canAccessEmployee(previous.id, req.auth!));
    const organizationId = req.body.organizationId ?? previous.organizationId;
    const companyId = req.body.companyId ?? previous.companyId ?? undefined;
    const departmentId = req.body.departmentId ?? previous.departmentId;
    const contractorCompanyId = req.body.contractorCompanyId ?? previous.contractorCompanyId ?? undefined;
    await assertCompanyBelongsToOrganization(companyId, organizationId);
    await assertDepartmentBelongsToOrganization(departmentId, organizationId);
    await assertContractorBelongsToOrganization(contractorCompanyId, organizationId);
    const employee = await prisma.employee.update({
      data: { ...employeeUpdateData(req.body), companyId, contractorCompanyId, departmentId, organizationId },
      where: { id: previous.id },
    });
    res.json({ employee: serializeEmployee(employee) });
  } catch (error) {
    next(error);
  }
});

employeesRouter.delete("/:employeeId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const previous = await prisma.employee.findUnique({ where: { id: String(req.params.employeeId) } });
    if (!previous) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    assertResourceAccess(await canAccessEmployee(previous.id, req.auth!));
    const employee = await prisma.employee.update({
      data: { employmentStatus: "TERMINATED", medicalFitnessStatus: "UNKNOWN" },
      where: { id: previous.id },
    });
    await prisma.auditLog.create({
      data: {
        action: "EMPLOYEE_DELETED",
        actorId: req.auth!.id,
        entityId: employee.id,
        entityType: "Employee",
        message: `Employee terminated: ${employee.fullName}.`,
        organizationId: employee.organizationId,
      },
    });
    res.json({ employee: serializeEmployee(employee) });
  } catch (error) {
    next(error);
  }
});

employeesRouter.post("/:employeeId/link-patient", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: String(req.params.employeeId) } });
    if (!employee) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    assertResourceAccess(await canAccessEmployee(employee.id, req.auth!));
    const names = employee.fullName.trim().split(/\s+/);
    const firstName = names[0] ?? employee.fullName;
    const lastName = names.slice(1).join(" ") || "Employee";
    const patient = await prisma.patient.upsert({
      create: {
        companyId: employee.companyId,
        contractorCompanyId: employee.contractorCompanyId,
        dateOfBirth: employee.dateOfBirth,
        departmentId: employee.departmentId,
        email: employee.email,
        employeeId: employee.employeeId,
        employeeProfileId: employee.id,
        firstName,
        gender: employee.gender,
        lastName,
        medicalRestrictions: employee.medicalRestrictions,
        medicalRecordNumber: `EMP-${employee.employeeId}`,
        nationalId: employee.nationalId,
        organizationId: employee.organizationId,
        phone: employee.phone,
        riskCategory: employee.riskCategory,
        workLocation: employee.workLocation,
      },
      update: {
        companyId: employee.companyId,
        contractorCompanyId: employee.contractorCompanyId,
        departmentId: employee.departmentId,
        email: employee.email,
        employeeId: employee.employeeId,
        employeeProfileId: employee.id,
        firstName,
        fitnessStatus: employee.medicalFitnessStatus,
        gender: employee.gender,
        lastName,
        medicalRestrictions: employee.medicalRestrictions,
        organizationId: employee.organizationId,
        phone: employee.phone,
        riskCategory: employee.riskCategory,
        workLocation: employee.workLocation,
      },
      where: { nationalId: employee.nationalId },
    });
    res.json({ patientId: patient.id });
  } catch (error) {
    next(error);
  }
});

employeesRouter.get("/:employeeId/folders", async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({
      include: {
        contractorCompany: true,
        organization: true,
        patient: {
          include: {
            cardiacImaging: true,
            cardiacProcedures: true,
            cases: { include: { reports: true } },
            documents: true,
            reports: true,
          },
        },
      },
      where: { id: String(req.params.employeeId) },
    });
    if (!employee) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    assertResourceAccess(await canAccessEmployee(employee.id, req.auth!));
    const patient = employee.patient;
    const folder = {
      contractor: employee.contractorCompany?.name ?? "Direct Employees",
      employee: {
        ecgs: patient?.cases ?? [],
        cathLab: patient?.cardiacProcedures.filter((procedure) => procedure.procedureType === "CARDIAC_CATHETERIZATION") ?? [],
        documents: patient?.documents ?? [],
        echo: patient?.cardiacImaging.filter((study) => study.imagingType === "ECHOCARDIOGRAPHY") ?? [],
        reports: patient?.reports ?? [],
        stressTest: patient?.cardiacImaging.filter((study) => study.imagingType === "STRESS_ECG") ?? [],
        surgeries:
          patient?.cardiacProcedures.filter((procedure) =>
            ["CABG", "OPEN_HEART_SURGERY", "VALVE_REPLACEMENT"].includes(procedure.procedureType),
          ) ?? [],
      },
      employeeName: employee.fullName,
      organization: employee.organization.name,
    };
    res.json({ folder });
  } catch (error) {
    next(error);
  }
});
