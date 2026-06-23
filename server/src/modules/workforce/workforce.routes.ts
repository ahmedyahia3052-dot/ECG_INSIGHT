import type {
  Employee,
  EmploymentStatus,
  Gender,
  MedicalFitnessStatus,
  OrganizationStatus,
  OrganizationType,
  Prisma,
} from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody } from "../../middleware/validate";
import {
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
export const departmentsRouter = Router();
export const contractorsRouter = Router();
export const employeesRouter = Router();

const routers = [organizationsRouter, departmentsRouter, contractorsRouter, employeesRouter];
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

function organizationType(value: string): OrganizationType {
  return value.toUpperCase() as OrganizationType;
}

function organizationStatus(value: string): OrganizationStatus {
  return value.toUpperCase() as OrganizationStatus;
}

function serializeEmployee(employee: Employee) {
  return {
    contractorCompanyId: employee.contractorCompanyId ?? undefined,
    createdAt: employee.createdAt.toISOString(),
    dateOfBirth: employee.dateOfBirth.toISOString().slice(0, 10),
    departmentId: employee.departmentId,
    email: employee.email ?? undefined,
    employeeId: employee.employeeId,
    employmentStatus: employee.employmentStatus.toLowerCase(),
    fullName: employee.fullName,
    gender: employee.gender.toLowerCase(),
    hiringDate: employee.hiringDate?.toISOString().slice(0, 10),
    id: employee.id,
    jobTitle: employee.jobTitle ?? undefined,
    medicalFitnessStatus: employee.medicalFitnessStatus.toLowerCase(),
    nationalId: employee.nationalId,
    organizationId: employee.organizationId,
    phone: employee.phone ?? undefined,
    retirementDate: employee.retirementDate?.toISOString().slice(0, 10),
    updatedAt: employee.updatedAt.toISOString(),
  };
}

async function assertDepartmentBelongsToOrganization(departmentId: string, organizationId: string) {
  const department = await prisma.department.findFirst({ where: { id: departmentId, organizationId } });
  if (!department) throw new AppError(400, "Department does not belong to this organization.", "INVALID_DEPARTMENT");
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
    contractorCompanyId: body.contractorCompanyId,
    dateOfBirth: body.dateOfBirth,
    departmentId: body.departmentId,
    email: body.email,
    employeeId: body.employeeId,
    employmentStatus: employmentStatusMap[body.employmentStatus],
    fullName: body.fullName,
    gender: genderMap[body.gender],
    hiringDate: body.hiringDate,
    jobTitle: body.jobTitle,
    medicalFitnessStatus: fitnessStatusMap[body.medicalFitnessStatus],
    nationalId: body.nationalId,
    organizationId: body.organizationId,
    phone: body.phone,
    retirementDate: body.retirementDate,
  };
}

function employeeUpdateData(body: EmployeeUpdateBody) {
  return {
    contractorCompanyId: body.contractorCompanyId,
    dateOfBirth: body.dateOfBirth,
    departmentId: body.departmentId,
    email: body.email,
    employeeId: body.employeeId,
    employmentStatus: body.employmentStatus ? employmentStatusMap[body.employmentStatus] : undefined,
    fullName: body.fullName,
    gender: body.gender ? genderMap[body.gender] : undefined,
    hiringDate: body.hiringDate,
    jobTitle: body.jobTitle,
    medicalFitnessStatus: body.medicalFitnessStatus ? fitnessStatusMap[body.medicalFitnessStatus] : undefined,
    nationalId: body.nationalId,
    organizationId: body.organizationId,
    phone: body.phone,
    retirementDate: body.retirementDate,
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
    const department = await prisma.department.create({
      data: { name: req.body.name, organizationId: req.body.organizationId },
    });
    res.status(201).json({ department });
  } catch (error) {
    next(error);
  }
});

departmentsRouter.patch("/:departmentId", requireRole("ADMIN"), validateBody(departmentUpdateSchema), async (req, res, next) => {
  try {
    const department = await prisma.department.update({
      data: { name: req.body.name },
      where: { id: String(req.params.departmentId) },
    });
    res.json({ department });
  } catch (error) {
    next(error);
  }
});

contractorsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : undefined;
    const where: Prisma.ContractorCompanyWhereInput = {
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
    const contractor = await prisma.contractorCompany.create({
      data: {
        address: req.body.address,
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
    const contractor = await prisma.contractorCompany.update({
      data: {
        address: req.body.address,
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

employeesRouter.get("/", async (req, res, next) => {
  try {
    const query = employeeListQuerySchema.parse(req.query);
    const where: Prisma.EmployeeWhereInput = {
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
    await assertDepartmentBelongsToOrganization(req.body.departmentId, req.body.organizationId);
    await assertContractorBelongsToOrganization(req.body.contractorCompanyId, req.body.organizationId);
    const employee = await prisma.employee.create({ data: employeeCreateData(req.body) });
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
    res.json({ employee });
  } catch (error) {
    next(error);
  }
});

employeesRouter.patch("/:employeeId", requireRole("DOCTOR"), validateBody(employeeUpdateSchema), async (req, res, next) => {
  try {
    const previous = await prisma.employee.findUnique({ where: { id: String(req.params.employeeId) } });
    if (!previous) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    const organizationId = req.body.organizationId ?? previous.organizationId;
    const departmentId = req.body.departmentId ?? previous.departmentId;
    const contractorCompanyId = req.body.contractorCompanyId ?? previous.contractorCompanyId ?? undefined;
    await assertDepartmentBelongsToOrganization(departmentId, organizationId);
    await assertContractorBelongsToOrganization(contractorCompanyId, organizationId);
    const employee = await prisma.employee.update({
      data: { ...employeeUpdateData(req.body), contractorCompanyId, departmentId, organizationId },
      where: { id: previous.id },
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
    const names = employee.fullName.trim().split(/\s+/);
    const firstName = names[0] ?? employee.fullName;
    const lastName = names.slice(1).join(" ") || "Employee";
    const patient = await prisma.patient.upsert({
      create: {
        contractorCompanyId: employee.contractorCompanyId,
        dateOfBirth: employee.dateOfBirth,
        departmentId: employee.departmentId,
        email: employee.email,
        employeeId: employee.employeeId,
        employeeProfileId: employee.id,
        firstName,
        gender: employee.gender,
        lastName,
        medicalRecordNumber: `EMP-${employee.employeeId}`,
        nationalId: employee.nationalId,
        organizationId: employee.organizationId,
        phone: employee.phone,
      },
      update: {
        contractorCompanyId: employee.contractorCompanyId,
        departmentId: employee.departmentId,
        email: employee.email,
        employeeId: employee.employeeId,
        employeeProfileId: employee.id,
        firstName,
        gender: employee.gender,
        lastName,
        organizationId: employee.organizationId,
        phone: employee.phone,
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
