import { Router } from "express";
import { requireAuth, requireRole } from "../../../middleware/auth";
import { validateBody } from "../../../middleware/validate";
import { interpretationController } from "./interpretation.controller";
import { interpretRequestSchema } from "../validators/interpret.schemas";

export const ecgInterpretationEngineRouter = Router();

ecgInterpretationEngineRouter.use(requireAuth);

ecgInterpretationEngineRouter.post(
  "/interpret",
  requireRole("DOCTOR"),
  validateBody(interpretRequestSchema),
  interpretationController.interpret,
);

ecgInterpretationEngineRouter.get(
  "/interpret/:caseId",
  interpretationController.getCaseInterpretation,
);
