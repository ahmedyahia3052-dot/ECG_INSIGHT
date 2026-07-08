import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../../middleware/error";
import { assertResourceAccess, canAccessCase } from "../../../utils/resource-access";
import { persistCaseInterpretation } from "../../ecg-interpretation";
import type { z } from "zod";
import type { InterpretEcgResponseDto, GetCaseInterpretationResponseDto } from "../dto/interpret.dto";
import {
  createDefaultInterpretationEngineDependencies,
  getStoredCaseInterpretation,
  interpretCaseById,
  interpretMeasurementInput,
} from "../services/interpretation-engine.service";
import { interpretRequestSchema } from "../validators/interpret.schemas";

const CLINICAL_DISCLAIMER =
  "Automated ECG interpretation supports physician review and does not replace clinical diagnosis.";

type InterpretBody = z.infer<typeof interpretRequestSchema>;

export class InterpretationController {
  constructor(private readonly deps = createDefaultInterpretationEngineDependencies()) {}

  interpret = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = req.body as InterpretBody;
      let interpretation;
      if (body.measurement) {
        interpretation = await interpretMeasurementInput(body.measurement, this.deps, body.caseId);
      } else if (body.caseId) {
        const caseId = await this.deps.resolveCaseId(body.caseId);
        assertResourceAccess(await canAccessCase(caseId, req.auth!));
        interpretation = await interpretCaseById(body.caseId, this.deps);
        if (body.persist) {
          const measurement = await this.deps.measureCaseFromStoredLeads(caseId);
          if (measurement) {
            const legacy = this.deps.interpretMeasurement(measurement);
            await persistCaseInterpretation(caseId, req.auth!.id, legacy, measurement);
          }
        }
      } else {
        throw new AppError(400, "Either caseId or measurement must be provided.", "INVALID_INTERPRET_REQUEST");
      }

      const payload: InterpretEcgResponseDto = {
        clinicalDisclaimer: CLINICAL_DISCLAIMER,
        interpretation,
      };
      res.status(202).json(payload);
    } catch (error) {
      next(error);
    }
  };

  getCaseInterpretation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const caseRef = String(req.params.caseId);
      const caseId = await this.deps.resolveCaseId(caseRef);
      assertResourceAccess(await canAccessCase(caseId, req.auth!));
      const interpretation = await getStoredCaseInterpretation(caseRef);
      const payload: GetCaseInterpretationResponseDto = {
        caseId,
        interpretation,
      };
      res.json(payload);
    } catch (error) {
      next(error);
    }
  };
}

export const interpretationController = new InterpretationController();
