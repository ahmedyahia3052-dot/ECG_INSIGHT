import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { validateBody } from "../../middleware/validate";
import {
  assessmentCreateSchema,
  listQuerySchema,
  occupationalRiskSchema,
  restrictionSchema,
  returnToWorkSchema,
} from "./occupational.schemas";
import {
  calculateRiskScore,
  createPatientTimelineEvent,
  decisionMap,
  type DecisionInput,
  getAssessmentInputs,
  patientIdForEmployee,
  recommendFitness,
  restrictionMap,
  type RestrictionInput,
  serializeAssessment,
  serializeRiskProfile,
} from "./occupational.service";

export const fitnessAssessmentsRouter = Router();
export const occupationalRiskRouter = Router();
export const workRestrictionsRouter = Router();

for (const router of [fitnessAssessmentsRouter, occupationalRiskRouter, workRestrictionsRouter]) {
  router.use(requireAuth);
}

fitnessAssessmentsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where: Prisma.FitnessAssessmentWhereInput = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.organizationId ? { employee: { organizationId: query.organizationId } } : {}),
    };
    const [total, assessments] = await Promise.all([
      prisma.fitnessAssessment.count({ where }),
      prisma.fitnessAssessment.findMany({
        include: { restrictions: true },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        where,
      }),
    ]);
    res.json({
      assessments: assessments.map(serializeAssessment),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    });
  } catch (error) {
    next(error);
  }
});

fitnessAssessmentsRouter.post("/", requireRole("DOCTOR"), validateBody(assessmentCreateSchema), async (req, res, next) => {
  try {
    const inputs = await getAssessmentInputs(req.body.employeeId);
    const recommendation = recommendFitness(inputs);
    const patientId = patientIdForEmployee(inputs);
    const assessment = await prisma.fitnessAssessment.create({
      data: {
        assessedById: req.auth!.id,
        employeeId: inputs.id,
        finalDecision: recommendation.decision,
        inputSummary: recommendation.inputSummary,
        occupationalReportSection: {
          ...recommendation.occupationalReportSection,
          physicianJustification:
            req.body.physicianJustification ?? recommendation.occupationalReportSection.physicianJustification,
        },
        patientId,
        physicianJustification:
          req.body.physicianJustification ?? recommendation.occupationalReportSection.physicianJustification,
        recommendation: recommendation.decision,
        reviewDate: req.body.reviewDate ?? (recommendation.decision === "FIT_FOR_WORK" ? undefined : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
        restrictions: {
          create: recommendation.restrictions.map((type) => ({
            description: {
              NO_CONFINED_SPACE: "No confined space work.",
              NO_DRIVING: "No driving.",
              NO_EMERGENCY_RESPONSE: "No emergency response duties.",
              NO_HEAVY_EQUIPMENT: "No heavy equipment operation.",
              NO_NIGHT_SHIFTS: "No night shifts.",
              NO_OFFSHORE_DUTY: "No offshore duty.",
              NO_WORK_AT_HEIGHT: "No work at height.",
              SEDENTARY_WORK_ONLY: "Sedentary work only.",
            }[type],
            employeeId: inputs.id,
            patientId,
            type,
          })),
        },
      },
      include: { restrictions: true },
    });
    await prisma.employee.update({
      data: {
        medicalFitnessStatus:
          assessment.finalDecision === "FIT_FOR_WORK"
            ? "FIT"
            : assessment.finalDecision === "SPECIALIST_REVIEW_REQUIRED"
              ? "REFER_TO_CARDIOLOGIST"
              : assessment.finalDecision,
      },
      where: { id: inputs.id },
    });
    await createPatientTimelineEvent({
      metadata: { assessmentId: assessment.id, decision: assessment.finalDecision },
      patientId,
      title: `Fitness assessment completed: ${assessment.finalDecision}`,
      type: "FITNESS_ASSESSMENT_COMPLETED",
    });
    res.status(201).json({ assessment: serializeAssessment(assessment) });
  } catch (error) {
    next(error);
  }
});

fitnessAssessmentsRouter.get("/:assessmentId", async (req, res, next) => {
  try {
    const assessment = await prisma.fitnessAssessment.findUnique({
      include: { restrictions: true, returnToWorkDecisions: true },
      where: { id: String(req.params.assessmentId) },
    });
    if (!assessment) throw new AppError(404, "Fitness assessment not found.", "ASSESSMENT_NOT_FOUND");
    res.json({ assessment: serializeAssessment(assessment) });
  } catch (error) {
    next(error);
  }
});

fitnessAssessmentsRouter.post("/:assessmentId/return-to-work", requireRole("DOCTOR"), validateBody(returnToWorkSchema), async (req, res, next) => {
  try {
    const assessment = await prisma.fitnessAssessment.findUnique({ where: { id: String(req.params.assessmentId) } });
    if (!assessment) throw new AppError(404, "Fitness assessment not found.", "ASSESSMENT_NOT_FOUND");
    if (assessment.employeeId !== req.body.employeeId) {
      throw new AppError(400, "Employee does not match this assessment.", "EMPLOYEE_MISMATCH");
    }
    const decision = await prisma.returnToWorkDecision.create({
      data: {
        assessmentId: assessment.id,
        decidedById: req.auth!.id,
        decision: decisionMap[req.body.decision as DecisionInput],
        employeeId: assessment.employeeId,
        patientId: assessment.patientId,
        physicianJustification: req.body.physicianJustification,
        reviewDate: req.body.reviewDate,
      },
    });
    await createPatientTimelineEvent({
      metadata: { decision: decision.decision, returnToWorkDecisionId: decision.id },
      patientId: decision.patientId,
      title: `Return-to-work decision: ${decision.decision}`,
      type: "RETURN_TO_WORK_DECISION_ADDED",
    });
    res.status(201).json({ decision });
  } catch (error) {
    next(error);
  }
});

workRestrictionsRouter.get("/", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const where: Prisma.WorkRestrictionWhereInput = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.organizationId ? { employee: { organizationId: query.organizationId } } : {}),
    };
    const restrictions = await prisma.workRestriction.findMany({ orderBy: { createdAt: "desc" }, where });
    res.json({ restrictions });
  } catch (error) {
    next(error);
  }
});

workRestrictionsRouter.post("/", requireRole("DOCTOR"), validateBody(restrictionSchema), async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({ include: { patient: true }, where: { id: req.body.employeeId } });
    if (!employee) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    const restriction = await prisma.workRestriction.create({
      data: {
        active: req.body.active,
        assessmentId: req.body.assessmentId,
        description: req.body.description,
        employeeId: employee.id,
        endsAt: req.body.endsAt,
        patientId: employee.patient?.id,
        startsAt: req.body.startsAt,
        type: restrictionMap[req.body.type as RestrictionInput],
      },
    });
    await createPatientTimelineEvent({
      metadata: { restrictionId: restriction.id, type: restriction.type },
      patientId: restriction.patientId,
      title: `Work restriction added: ${restriction.type}`,
      type: "WORK_RESTRICTION_ADDED",
    });
    res.status(201).json({ restriction });
  } catch (error) {
    next(error);
  }
});

occupationalRiskRouter.get("/analytics", requireRole("ADMIN"), async (req, res, next) => {
  try {
    const organizationId = typeof req.query.organizationId === "string" ? req.query.organizationId : undefined;
    const employeeWhere: Prisma.EmployeeWhereInput = organizationId ? { organizationId } : {};
    const [fitEmployees, restrictedEmployees, unfitEmployees, highRiskEmployees] = await Promise.all([
      prisma.employee.count({ where: { ...employeeWhere, medicalFitnessStatus: "FIT" } }),
      prisma.employee.count({ where: { ...employeeWhere, medicalFitnessStatus: "FIT_WITH_RESTRICTIONS" } }),
      prisma.employee.count({
        where: {
          ...employeeWhere,
          medicalFitnessStatus: { in: ["TEMPORARILY_UNFIT", "PERMANENTLY_UNFIT", "REFER_TO_CARDIOLOGIST"] },
        },
      }),
      prisma.employee.count({
        where: {
          ...employeeWhere,
          OR: [{ occupationalRiskProfile: { highRisk: true } }, { criticalJob: true }, { patient: { cases: { some: { priority: "CRITICAL" } } } }],
        },
      }),
    ]);
    res.json({ analytics: { fitEmployees, highRiskEmployees, restrictedEmployees, unfitEmployees } });
  } catch (error) {
    next(error);
  }
});

occupationalRiskRouter.get("/:employeeId", async (req, res, next) => {
  try {
    const profile = await prisma.occupationalRiskProfile.findUnique({
      where: { employeeId: String(req.params.employeeId) },
    });
    res.json({ profile: profile ? serializeRiskProfile(profile) : null });
  } catch (error) {
    next(error);
  }
});

occupationalRiskRouter.put("/:employeeId", requireRole("DOCTOR"), validateBody(occupationalRiskSchema), async (req, res, next) => {
  try {
    const employee = await prisma.employee.findUnique({ where: { id: String(req.params.employeeId) } });
    if (!employee) throw new AppError(404, "Employee not found.", "EMPLOYEE_NOT_FOUND");
    const riskScore = calculateRiskScore(req.body);
    const profile = await prisma.occupationalRiskProfile.upsert({
      create: {
        ...req.body,
        employeeId: employee.id,
        highRisk: riskScore >= 5 || req.body.previousMI || req.body.previousStroke,
        riskScore,
      },
      update: {
        ...req.body,
        highRisk: riskScore >= 5 || req.body.previousMI || req.body.previousStroke,
        riskScore,
      },
      where: { employeeId: employee.id },
    });
    res.json({ profile: serializeRiskProfile(profile) });
  } catch (error) {
    next(error);
  }
});
