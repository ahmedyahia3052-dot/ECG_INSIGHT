import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/prisma";
import { requireAuth, requireRole } from "../../middleware/auth";
import { AppError } from "../../middleware/error";
import { serializePatient } from "../../utils/clinical";

export const pacsRouter = Router();
export const fhirRouter = Router();
export const telecardiologyRouter = Router();

const pacsConnectionSchema = z.object({
  aeTitle: z.string().trim().min(1).default("ECGINSIGHT"),
  host: z.string().trim().min(1).default("localhost"),
  modality: z.enum(["ECG", "WAVEFORM", "SR", "OT"]).default("ECG"),
  organizationId: z.string().trim().optional(),
  port: z.number().int().positive().default(104),
});

const ecgFileBodySchema = z.object({
  ecgFileId: z.string().trim().optional(),
  patientId: z.string().trim().optional(),
});

pacsRouter.use(requireAuth);
fhirRouter.use(requireAuth);
telecardiologyRouter.use(requireAuth);

async function ensurePacsConnection(body: z.infer<typeof pacsConnectionSchema>, userId: string) {
  const existing = await prisma.pACSConnection.findFirst({
    where: { aeTitle: body.aeTitle, host: body.host, port: body.port },
  });
  if (existing) return existing;
  return prisma.pACSConnection.create({
    data: {
      aeTitle: body.aeTitle,
      createdById: userId,
      host: body.host,
      modality: body.modality,
      organizationId: body.organizationId,
      port: body.port,
    },
  });
}

pacsRouter.post("/query", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const connection = await ensurePacsConnection(pacsConnectionSchema.parse(req.body), req.auth!.id);
    const studies = await prisma.eCGFile.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      where: { organizationId: connection.organizationId ?? undefined },
    });
    await prisma.auditLog.create({
      data: {
        action: "PACS_OPERATION",
        actorId: req.auth!.id,
        message: `PACS query executed against ${connection.aeTitle}.`,
        metadata: { connectionId: connection.id, resultCount: studies.length },
      },
    });
    res.json({ connection, studies: studies.map((study) => ({ id: study.id, fileName: study.fileName ?? study.originalName, fileType: study.fileType })) });
  } catch (error) {
    next(error);
  }
});

pacsRouter.post("/retrieve", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = ecgFileBodySchema.parse(req.body);
    const studies = await prisma.eCGFile.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      where: { id: body.ecgFileId, patientId: body.patientId },
    });
    await prisma.auditLog.create({
      data: {
        action: "PACS_OPERATION",
        actorId: req.auth!.id,
        message: "PACS retrieve simulated for ECG studies.",
        metadata: { count: studies.length, ecgFileId: body.ecgFileId, patientId: body.patientId },
      },
    });
    res.json({ retrieved: studies });
  } catch (error) {
    next(error);
  }
});

pacsRouter.post("/store", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z.object({ ecgFileId: z.string().trim().min(1) }).parse(req.body);
    const file = await prisma.eCGFile.findUnique({ where: { id: body.ecgFileId } });
    if (!file) throw new AppError(404, "ECG file not found.", "ECG_FILE_NOT_FOUND");
    await prisma.auditLog.create({
      data: {
        action: "PACS_OPERATION",
        actorId: req.auth!.id,
        caseId: file.caseId,
        message: `ECG study ${file.originalName} stored to PACS queue.`,
        metadata: { ecgFileId: file.id, fileType: file.fileType },
        patientId: file.patientId,
      },
    });
    res.json({ stored: true, studyId: file.id });
  } catch (error) {
    next(error);
  }
});

fhirRouter.post("/export", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z.object({ patientId: z.string().trim().min(1) }).parse(req.body);
    const patient = await prisma.patient.findUnique({
      include: { cases: { include: { measurements: true } }, reports: true },
      where: { id: body.patientId },
    });
    if (!patient) throw new AppError(404, "Patient not found.", "PATIENT_NOT_FOUND");
    const bundle = {
      entry: [
        { resource: { resourceType: "Patient", ...serializePatient(patient) } },
        ...patient.cases.map((ecgCase) => ({ resource: { id: ecgCase.id, resourceType: "DiagnosticReport", status: ecgCase.status } })),
        ...patient.cases.flatMap((ecgCase) =>
          ecgCase.measurements.map((measurement) => ({
            resource: { code: "ECG measurements", id: measurement.id, resourceType: "Observation", valueInteger: measurement.heartRate },
          })),
        ),
      ],
      resourceType: "Bundle",
      type: "collection",
    };
    await prisma.hospitalIntegrationLog.create({
      data: {
        createdById: req.auth!.id,
        direction: "EXPORT",
        organizationId: patient.organizationId,
        payloadJson: bundle as Prisma.InputJsonObject,
        protocol: "FHIR",
        resourceType: "Bundle",
        status: "COMPLETED",
      },
    });
    res.json({ bundle });
  } catch (error) {
    next(error);
  }
});

fhirRouter.post("/import", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const payload = req.body as Prisma.InputJsonObject;
    const log = await prisma.hospitalIntegrationLog.create({
      data: {
        createdById: req.auth!.id,
        direction: "IMPORT",
        payloadJson: payload,
        protocol: "FHIR",
        resourceType: typeof payload["resourceType"] === "string" ? payload["resourceType"] : "Bundle",
        status: "RECEIVED",
      },
    });
    await prisma.auditLog.create({
      data: {
        action: "FHIR_OPERATION",
        actorId: req.auth!.id,
        message: "FHIR payload imported into integration log.",
        metadata: { integrationLogId: log.id },
      },
    });
    res.status(202).json({ importLogId: log.id, status: log.status });
  } catch (error) {
    next(error);
  }
});

telecardiologyRouter.post("/review", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = z
      .object({
        assignedDoctorId: z.string().trim().optional(),
        caseId: z.string().trim().min(1),
        consultationNotes: z.string().trim().optional(),
        ecgFileId: z.string().trim().optional(),
        secondOpinion: z.string().trim().optional(),
        signOff: z.boolean().default(false),
      })
      .parse(req.body);
    const ecgCase = await prisma.eCGCase.findUnique({ where: { id: body.caseId } });
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    const review = await prisma.telecardiologyReview.create({
      data: {
        assignedDoctorId: body.assignedDoctorId,
        caseId: ecgCase.id,
        consultationNotes: body.consultationNotes,
        ecgFileId: body.ecgFileId,
        patientId: ecgCase.patientId,
        remoteSignoff: body.signOff,
        requestedById: req.auth!.id,
        secondOpinion: body.secondOpinion,
        signedAt: body.signOff ? new Date() : undefined,
        signedById: body.signOff ? req.auth!.id : undefined,
        status: body.signOff ? "SIGNED_OFF" : "REQUESTED",
      },
    });
    await prisma.auditLog.create({
      data: {
        action: body.signOff ? "TELECARDIOLOGY_REVIEW_SIGNED" : "TELECARDIOLOGY_REVIEW_REQUESTED",
        actorId: req.auth!.id,
        caseId: ecgCase.id,
        message: body.signOff ? "Remote cardiologist sign-off completed." : "Telecardiology review requested.",
        metadata: { reviewId: review.id },
        patientId: ecgCase.patientId,
      },
    });
    await prisma.timelineEvent.create({
      data: {
        caseId: ecgCase.id,
        metadata: { reviewId: review.id },
        patientId: ecgCase.patientId,
        title: body.signOff ? "Remote ECG review signed" : "Remote ECG review requested",
        type: body.signOff ? "TELECARDIOLOGY_REVIEW_SIGNED" : "TELECARDIOLOGY_REVIEW_REQUESTED",
      },
    });
    res.status(201).json({ review });
  } catch (error) {
    next(error);
  }
});
