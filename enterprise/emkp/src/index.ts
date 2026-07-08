export {
  EMKP_VERSION,
  EMKP_MODULE_ID,
  type EmkpKnowledgePlatform,
  type EmkpDiseaseEntry,
  type EmkpClinicalRule,
  type EmkpLeadKnowledge,
  type EmkpTerminologyEntry,
  type EmkpDifferentialNode,
  type EmkpGuidelineReference,
} from "./model/knowledge-model";

export { EMKP_DISEASES, EMKP_CATEGORIES } from "./knowledge/diagnoses";
export { EMKP_CLINICAL_RULES, getRuleById, getRulesForDiagnosis } from "./rules/clinical-rules";
export { EMKP_DIFFERENTIAL_TREES, flattenDifferentialTree } from "./differential/trees";
export { EMKP_LEAD_KNOWLEDGE, getLeadKnowledge } from "./knowledge/leads";
export { EMKP_TERMINOLOGY, searchTerminology } from "./knowledge/terminology";
export { EMKP_GUIDELINE_REGISTRY, GUIDELINE_DIAGNOSIS_MAP, getGuidelinesForDiagnosis } from "./guidelines/registry";
export { validateEmkpPlatform, buildEmkpPlatform, type EmkpValidationResult } from "./validation/validator";
