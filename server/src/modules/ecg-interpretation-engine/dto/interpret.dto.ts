import type { EnterpriseEcgInterpretation } from "../types/sections";

export interface InterpretEcgRequestDto {
  caseId?: string;
  measurement?: import("../../ecg-measurement/types").EcgClinicalMeasurementResult;
  persist?: boolean;
}

export interface InterpretEcgResponseDto {
  clinicalDisclaimer: string;
  interpretation: EnterpriseEcgInterpretation;
}

export interface GetCaseInterpretationResponseDto {
  caseId: string;
  interpretation: EnterpriseEcgInterpretation;
}
