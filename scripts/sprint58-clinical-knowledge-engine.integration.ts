/**
 * Sprint 58 — ECG Clinical Knowledge Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/clinical-knowledge-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  { file: resolve(MOD, "catalog.ts"), markers: ["ECG_CLINICAL_KNOWLEDGE_CATALOG", "SINUS_RHYTHM", "ATRIAL_FIBRILLATION", "STEMI", "BRUGADA", "EARLY_REPOLARIZATION"] },
  { file: resolve(MOD, "clinical-knowledge.service.ts"), markers: ["listClinicalKnowledge", "seedClinicalKnowledgeDatabase", "validateClinicalKnowledgeCatalog", "getDifferentialForDiagnosis"] },
  { file: resolve(MOD, "clinical-knowledge.routes.ts"), markers: ["clinicalKnowledgeEngineRouter", "/diagnoses", "/bootstrap", "/differential"] },
  { file: resolve(ROOT, "prisma/schema.prisma"), markers: ["EcgClinicalKnowledgeDiagnosis", "EcgClinicalKnowledgeCategory", "diagnosisId", "guidelineReferences", "snomedCode"] },
  { file: resolve(ROOT, "prisma/migrations/20260708043000_sprint58_clinical_knowledge_engine/migration.sql"), markers: ["EcgClinicalKnowledgeDiagnosis", "EcgClinicalKnowledgeCategory"] },
  { file: resolve(ROOT, "server/src/modules/index.ts"), markers: ["/clinical-knowledge-engine", "clinicalKnowledgeEngineRouter"] },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 58 ECG Clinical Knowledge Engine integration markers: PASS");
