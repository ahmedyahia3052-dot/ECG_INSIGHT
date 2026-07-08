import type { EcgClinicalMeasurementResult } from "../../modules/ecg-measurement/types";
import {
  buildEnterpriseInterpretation,
  createDefaultInterpretationEngineDependencies,
} from "../../modules/ecg-interpretation-engine/services/interpretation-engine.service";
import { INTERPRETATION_ENGINE_VERSION } from "../../modules/ecg-interpretation-engine/types";
import type { EnterpriseEcgInterpretation } from "../../modules/ecg-interpretation-engine/types/sections";
import type { AiInferenceResult } from "../types";
import { buildVersionTag } from "../version";

export interface EcgInterpretationModelInput {
  measurement: EcgClinicalMeasurementResult;
  caseId?: string;
}

export interface EcgInterpretationModel {
  readonly version: string;
  interpret(input: EcgInterpretationModelInput): EnterpriseEcgInterpretation;
}

export class EnterpriseEcgInterpretationModel implements EcgInterpretationModel {
  readonly version = INTERPRETATION_ENGINE_VERSION;

  interpret(input: EcgInterpretationModelInput): EnterpriseEcgInterpretation {
    const deps = createDefaultInterpretationEngineDependencies();
    return buildEnterpriseInterpretation(input.measurement, deps, { caseId: input.caseId });
  }
}

export const ecgInterpretationModel: EcgInterpretationModel = new EnterpriseEcgInterpretationModel();

export function runEcgInterpretation(input: EcgInterpretationModelInput): EnterpriseEcgInterpretation {
  return ecgInterpretationModel.interpret(input);
}

export function toEcgInterpretationResult(
  input: EcgInterpretationModelInput,
  latencyMs: number,
): AiInferenceResult<EnterpriseEcgInterpretation> {
  const output = runEcgInterpretation(input);
  return {
    cached: false,
    kind: "ecg_interpretation",
    latencyMs,
    output,
    validation: { errors: [], valid: true },
    version: buildVersionTag({
      engineVersion: INTERPRETATION_ENGINE_VERSION,
      providerName: "interpretation_engine",
    }),
  };
}
