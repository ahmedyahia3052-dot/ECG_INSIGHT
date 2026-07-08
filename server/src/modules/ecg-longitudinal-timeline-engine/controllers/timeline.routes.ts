import { Router } from "express";
import { requireAuth } from "../../../middleware/auth";
import { AppError } from "../../../middleware/error";
import { validateQuery } from "../../../middleware/validate";
import { assertResourceAccess, canAccessCase, canAccessPatient } from "../../../utils/resource-access";
import { compareEcgCases } from "../services/comparison-history.service";
import { getAdjacentCase, getCaseChronologicalHistory, getPatientTimeline, resolveCaseWithSignals } from "../services/timeline.service";
import { timelineQuerySchema } from "../validators/timeline.schemas";

export const ecgLongitudinalPatientsRouter = Router();
export const ecgLongitudinalCasesRouter = Router();

ecgLongitudinalPatientsRouter.use(requireAuth);
ecgLongitudinalCasesRouter.use(requireAuth);

ecgLongitudinalPatientsRouter.get("/:patientId/timeline", validateQuery(timelineQuerySchema), async (req, res, next) => {
  try {
    const patientId = String(req.params.patientId);
    assertResourceAccess(await canAccessPatient(patientId, req.auth!));
    const query = timelineQuerySchema.parse(req.query);
    const result = await getPatientTimeline({
      actorId: req.auth!.id,
      limit: query.limit,
      offset: query.offset,
      patientId,
      sync: query.sync,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

ecgLongitudinalCasesRouter.get("/:caseId/history", async (req, res, next) => {
  try {
    const ecgCase = await resolveCaseWithSignals(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const result = await getCaseChronologicalHistory({
      actorId: req.auth!.id,
      caseRef: String(req.params.caseId),
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

ecgLongitudinalCasesRouter.get("/:caseId/previous", async (req, res, next) => {
  try {
    const ecgCase = await resolveCaseWithSignals(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const result = await getAdjacentCase({
      actorId: req.auth!.id,
      caseRef: String(req.params.caseId),
      direction: "previous",
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

ecgLongitudinalCasesRouter.get("/:caseId/next", async (req, res, next) => {
  try {
    const ecgCase = await resolveCaseWithSignals(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(ecgCase.id, req.auth!));
    const result = await getAdjacentCase({
      actorId: req.auth!.id,
      caseRef: String(req.params.caseId),
      direction: "next",
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

ecgLongitudinalCasesRouter.get("/:caseId/compare/:previousCaseId", async (req, res, next) => {
  try {
    const current = await resolveCaseWithSignals(String(req.params.caseId));
    assertResourceAccess(await canAccessCase(current.id, req.auth!));
    const previous = await resolveCaseWithSignals(String(req.params.previousCaseId));
    if (current.patientId !== previous.patientId) {
      throw new AppError(400, "Cases belong to different patients.", "PATIENT_MISMATCH");
    }
    const result = await compareEcgCases({
      actorId: req.auth!.id,
      currentCaseRef: String(req.params.caseId),
      previousCaseRef: String(req.params.previousCaseId),
    });
    res.json({ comparison: result });
  } catch (error) {
    next(error);
  }
});
