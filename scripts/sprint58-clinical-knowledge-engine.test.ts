/**
 * Sprint 58 — ECG Clinical Knowledge Engine unit tests.
 */
import {
  ECG_CLINICAL_KNOWLEDGE_CATALOG,
  REQUIRED_SPRINT58_DIAGNOSIS_IDS,
} from "../server/src/modules/clinical-knowledge-engine/catalog";
import {
  getClinicalKnowledgeById,
  getClinicalKnowledgeStats,
  getDifferentialForDiagnosis,
  listClinicalKnowledge,
  validateClinicalKnowledgeCatalog,
} from "../server/src/modules/clinical-knowledge-engine/clinical-knowledge.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const validation = validateClinicalKnowledgeCatalog();
assert(validation.validated, "Catalog validation should pass");
assert(validation.requiredCount === 26, `Expected 26 required diagnoses, got ${validation.requiredCount}`);
assert(ECG_CLINICAL_KNOWLEDGE_CATALOG.length >= 26, "Catalog should contain at least 26 entries");

for (const diagnosisId of REQUIRED_SPRINT58_DIAGNOSIS_IDS) {
  const entry = getClinicalKnowledgeById(diagnosisId);
  assert(entry, `Missing diagnosis: ${diagnosisId}`);
  assert(entry.ecgCriteria.length > 0, `${diagnosisId} should have ECG criteria`);
  assert(entry.diagnosticFeatures.length > 0, `${diagnosisId} should have diagnostic features`);
  assert(entry.guidelineReferences.length > 0, `${diagnosisId} should have guideline references`);
  assert(entry.differentialDiagnoses.length > 0, `${diagnosisId} should have differential diagnoses`);
}

const stemi = getClinicalKnowledgeById("STEMI");
assert(stemi?.severity === "CRITICAL", "STEMI severity should be CRITICAL");
assert(stemi?.emergencyLevel === "CRITICAL", "STEMI emergency level should be CRITICAL");
assert(stemi?.icd10Code, "STEMI should have ICD-10 code");
assert(stemi?.snomedCode, "STEMI should have SNOMED code");

const af = getClinicalKnowledgeById("ATRIAL_FIBRILLATION");
assert(af?.guidelineReferences.some((ref) => ref.organization === "ESC"), "AF should reference ESC guidelines");

const filtered = listClinicalKnowledge({ category: "ELECTROLYTE" });
assert(filtered.length >= 2, "Should list electrolyte diagnoses");
assert(filtered.every((entry) => entry.category === "ELECTROLYTE"), "Electrolyte filter should be exact");

const differential = getDifferentialForDiagnosis("WPW");
assert(differential.length > 0, "WPW differential should not be empty");

const stats = getClinicalKnowledgeStats();
assert(stats.total === ECG_CLINICAL_KNOWLEDGE_CATALOG.length, "Stats total should match catalog length");
assert((stats.byCategory.ISCHEMIA ?? 0) >= 2, "Should include ischemia diagnoses");

console.log("Sprint 58 ECG Clinical Knowledge Engine unit tests: PASS");
