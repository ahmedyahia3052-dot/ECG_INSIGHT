import type { EcgClinicalKnowledgeEntry } from "../../clinical-knowledge-engine/types";
import type { EcgClinicalInterpretation } from "../../ecg-interpretation/types";
import type { EcgClinicalMeasurementResult } from "../../ecg-measurement/types";

export const INTERPRETATION_ENGINE_VERSION = "sprint62-ecg-interpretation-engine-v1";

export interface InterpretationEngineDependencies {
  getClinicalKnowledgeById: (diagnosisId: string) => EcgClinicalKnowledgeEntry | null;
  interpretMeasurement: (measurement: EcgClinicalMeasurementResult) => EcgClinicalInterpretation;
  measureCaseFromStoredLeads: (caseId: string) => Promise<EcgClinicalMeasurementResult | null>;
  resolveCaseId: (caseRef: string) => Promise<string>;
}
