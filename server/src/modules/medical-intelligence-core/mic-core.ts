import { MIC_ARRHYTHMIA_LIBRARY } from "./data/arrhythmias";
import { MIC_DIAGNOSIS_BY_CODE, MIC_DIAGNOSIS_CATALOG } from "./data/diagnoses";
import { MIC_ISCHEMIA_LIBRARY } from "./data/ischemia";
import { MIC_MEASUREMENT_REFERENCES } from "./data/measurements";
import { buildDifferentialForDiagnosisCode, buildDifferentialForFinding } from "./engines/differential-engine";
import { getGuidelineById, getGuidelinesForDiagnosisCategory, listGuidelines } from "./engines/guideline-registry";
import { getRecommendationsForDiagnosis, listAllRecommendationMappings } from "./engines/recommendation-engine";
import { assessRiskForDiagnosis, listRiskRules } from "./engines/risk-stratification";
import type {
  MicArrhythmiaEntity,
  MicDiagnosisCategory,
  MicDiagnosisEntry,
  MicGuidelineEntry,
  MicGuidelineOrganization,
  MicIschemiaEntity,
  MicMeasurementReference,
} from "./types";
import { MIC_ENGINE_ID, MIC_ENGINE_VERSION } from "./types";

export function getMicHealth() {
  return {
    engineId: MIC_ENGINE_ID,
    version: MIC_ENGINE_VERSION,
    counts: {
      diagnoses: MIC_DIAGNOSIS_CATALOG.length,
      arrhythmias: MIC_ARRHYTHMIA_LIBRARY.length,
      ischemiaEntities: MIC_ISCHEMIA_LIBRARY.length,
      measurementReferences: MIC_MEASUREMENT_REFERENCES.length,
      recommendationMappings: listAllRecommendationMappings().length,
      riskRules: listRiskRules().length,
      guidelines: listGuidelines().length,
    },
  };
}

export function listDiagnoses(filters?: { category?: MicDiagnosisCategory; tag?: string }): MicDiagnosisEntry[] {
  let results = MIC_DIAGNOSIS_CATALOG;
  if (filters?.category) results = results.filter((entry) => entry.category === filters.category);
  if (filters?.tag) results = results.filter((entry) => entry.libraryTags.includes(filters.tag!));
  return results;
}

export function getDiagnosisByCode(code: string): MicDiagnosisEntry | undefined {
  return MIC_DIAGNOSIS_BY_CODE.get(code.toUpperCase());
}

export function listArrhythmias(): MicArrhythmiaEntity[] {
  return MIC_ARRHYTHMIA_LIBRARY;
}

export function listIschemiaEntities(): MicIschemiaEntity[] {
  return MIC_ISCHEMIA_LIBRARY;
}

export function listMeasurementReferences(): MicMeasurementReference[] {
  return MIC_MEASUREMENT_REFERENCES;
}

export function getMeasurementReference(parameter: string): MicMeasurementReference | undefined {
  return MIC_MEASUREMENT_REFERENCES.find(
    (entry) => entry.parameter.toLowerCase() === parameter.toLowerCase(),
  );
}

export {
  getRecommendationsForDiagnosis,
  buildDifferentialForFinding,
  buildDifferentialForDiagnosisCode,
  assessRiskForDiagnosis,
  listRiskRules,
  listGuidelines,
  getGuidelineById,
  getGuidelinesForDiagnosisCategory,
};

export type GuidelineFilters = { organization?: MicGuidelineOrganization; category?: MicDiagnosisCategory };

export function lookupGuidelines(filters?: GuidelineFilters): MicGuidelineEntry[] {
  return listGuidelines(filters);
}
