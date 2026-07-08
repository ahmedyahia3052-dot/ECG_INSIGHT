import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../../../middleware/auth";
import { validateQuery } from "../../../middleware/validate";
import { assertResourceAccess, canAccessCase } from "../../../utils/resource-access";
import { listExternalSystems, listInteropLogs } from "../services/audit.service";
import { exportCaseToFhir, importFhirPayload, resolveInteropCase } from "../services/fhir.service";
import { exportCaseToHl7, importHl7Payload } from "../services/hl7.service";

export const interoperabilityEngineRouter = Router();

const logsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

const fhirImportSchema = z.object({
  externalSystemId: z.string().trim().optional(),
  payload: z.record(z.string(), z.unknown()),
});

const hl7ImportSchema = z.object({
  externalSystemId: z.string().trim().optional(),
  rawMessage: z.string().trim().min(10),
});

interoperabilityEngineRouter.use(requireAuth);

interoperabilityEngineRouter.get("/fhir/export/:caseId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await resolveInteropCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const result = await exportCaseToFhir({
      actorId: req.auth!.id,
      caseRef: String(req.params.caseId),
      externalSystemId: typeof req.query.externalSystemId === "string" ? req.query.externalSystemId : undefined,
    });
    res.json({ export: result, bundle: result.bundle });
  } catch (error) {
    next(error);
  }
});

interoperabilityEngineRouter.post("/fhir/import", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = fhirImportSchema.parse(req.body);
    const result = await importFhirPayload({
      actorId: req.auth!.id,
      externalSystemId: body.externalSystemId,
      payload: body.payload,
    });
    res.status(201).json({ import: result });
  } catch (error) {
    next(error);
  }
});

interoperabilityEngineRouter.get("/hl7/export/:caseId", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const ecgCase = await resolveInteropCase(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const result = await exportCaseToHl7({
      actorId: req.auth!.id,
      caseRef: String(req.params.caseId),
      externalSystemId: typeof req.query.externalSystemId === "string" ? req.query.externalSystemId : undefined,
      messageType: req.query.messageType === "ORM" ? "ORM" : "ORU",
    });
    res.json({ export: result });
  } catch (error) {
    next(error);
  }
});

interoperabilityEngineRouter.post("/hl7/import", requireRole("DOCTOR"), async (req, res, next) => {
  try {
    const body = hl7ImportSchema.parse(req.body);
    const result = await importHl7Payload({
      actorId: req.auth!.id,
      externalSystemId: body.externalSystemId,
      rawMessage: body.rawMessage,
    });
    res.status(201).json({ import: result });
  } catch (error) {
    next(error);
  }
});

interoperabilityEngineRouter.get("/logs", validateQuery(logsQuerySchema), async (req, res, next) => {
  try {
    const query = logsQuerySchema.parse(req.query);
    res.json(await listInteropLogs(query.limit, query.offset));
  } catch (error) {
    next(error);
  }
});

interoperabilityEngineRouter.get("/systems", async (_req, res, next) => {
  try {
    res.json(await listExternalSystems());
  } catch (error) {
    next(error);
  }
});
