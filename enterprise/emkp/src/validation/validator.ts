import { EMKP_DISEASES } from "../knowledge/diagnoses";
import { EMKP_CLINICAL_RULES } from "../rules/clinical-rules";
import { EMKP_DIFFERENTIAL_TREES, flattenDifferentialTree } from "../differential/trees";
import { EMKP_LEAD_KNOWLEDGE } from "../knowledge/leads";
import { EMKP_TERMINOLOGY } from "../knowledge/terminology";
import { EMKP_GUIDELINE_REGISTRY, GUIDELINE_DIAGNOSIS_MAP } from "../guidelines/registry";
import type { EmkpKnowledgePlatform } from "../model/knowledge-model";
import { EMKP_CATEGORIES } from "../knowledge/diagnoses";
import { EMKP_VERSION, EMKP_MODULE_ID } from "../model/knowledge-model";

export interface EmkpValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
  stats: Record<string, number>;
}

export function validateEmkpPlatform(): EmkpValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const codes = EMKP_DISEASES.map((d) => d.code);
  const dupCodes = codes.filter((c, i) => codes.indexOf(c) !== i);
  if (dupCodes.length) errors.push(`Duplicate diagnosis codes: ${dupCodes.join(", ")}`);

  const ruleIds = EMKP_CLINICAL_RULES.map((r) => r.ruleId);
  const dupRules = ruleIds.filter((r, i) => ruleIds.indexOf(r) !== i);
  if (dupRules.length) errors.push(`Duplicate rule IDs: ${dupRules.join(", ")}`);

  for (const rule of EMKP_CLINICAL_RULES) {
    if (!EMKP_DISEASES.some((d) => d.code === rule.diagnosisCode)) {
      errors.push(`Rule ${rule.ruleId} references unknown diagnosis ${rule.diagnosisCode}`);
    }
    if (!rule.requiredFindings.length) warnings.push(`Rule ${rule.ruleId} has no required findings`);
    if (!rule.guidelineRefs.length) warnings.push(`Rule ${rule.ruleId} has no guideline references`);
  }

  for (const disease of EMKP_DISEASES) {
    if (!disease.diagnosticCriteria.length) errors.push(`${disease.code} missing diagnostic criteria`);
    if (!disease.guidelineReferences.length) warnings.push(`${disease.code} missing guideline references`);
    if (!disease.differentialDiagnosis.length) warnings.push(`${disease.code} missing differential diagnosis`);
  }

  for (const tree of EMKP_DIFFERENTIAL_TREES) {
    for (const node of flattenDifferentialTree(tree)) {
      if (node.diagnosisCode && !EMKP_DISEASES.some((d) => d.code === node.diagnosisCode)) {
        errors.push(`Differential node ${node.nodeId} references unknown code ${node.diagnosisCode}`);
      }
    }
  }

  for (const [docId, mappedCodes] of Object.entries(GUIDELINE_DIAGNOSIS_MAP)) {
    if (!EMKP_GUIDELINE_REGISTRY.some((g) => g.documentId === docId)) {
      errors.push(`Guideline map references unknown document ${docId}`);
    }
    for (const code of mappedCodes) {
      if (!EMKP_DISEASES.some((d) => d.code === code)) {
        errors.push(`Guideline ${docId} maps to unknown diagnosis ${code}`);
      }
    }
  }

  if (EMKP_LEAD_KNOWLEDGE.length !== 12) {
    errors.push(`Expected 12 lead entries, found ${EMKP_LEAD_KNOWLEDGE.length}`);
  }

  const termDupes = EMKP_TERMINOLOGY.map((t) => t.term.toLowerCase()).filter((t, i, arr) => arr.indexOf(t) !== i);
  if (termDupes.length) warnings.push(`Duplicate terminology terms: ${termDupes.join(", ")}`);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      diseases: EMKP_DISEASES.length,
      rules: EMKP_CLINICAL_RULES.length,
      differentialTrees: EMKP_DIFFERENTIAL_TREES.length,
      leads: EMKP_LEAD_KNOWLEDGE.length,
      terminology: EMKP_TERMINOLOGY.length,
      guidelines: EMKP_GUIDELINE_REGISTRY.length,
      categories: EMKP_CATEGORIES.length,
    },
  };
}

export function buildEmkpPlatform(): EmkpKnowledgePlatform {
  return {
    version: EMKP_VERSION,
    categories: [...EMKP_CATEGORIES],
    diseases: EMKP_DISEASES,
    rules: EMKP_CLINICAL_RULES,
    differentialTrees: EMKP_DIFFERENTIAL_TREES,
    leads: EMKP_LEAD_KNOWLEDGE,
    terminology: EMKP_TERMINOLOGY,
    guidelines: EMKP_GUIDELINE_REGISTRY,
  };
}

export { EMKP_VERSION, EMKP_MODULE_ID };
