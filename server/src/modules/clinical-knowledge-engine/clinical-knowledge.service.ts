import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  ECG_CLINICAL_KNOWLEDGE_BY_ID,
  ECG_CLINICAL_KNOWLEDGE_CATALOG,
  REQUIRED_SPRINT58_DIAGNOSIS_IDS,
} from "./catalog";
import type { EcgClinicalKnowledgeEntry, KnowledgeCatalogStats, KnowledgeSearchFilters } from "./types";

function matchesQuery(entry: EcgClinicalKnowledgeEntry, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return [
    entry.diagnosisId,
    entry.clinicalName,
    entry.description,
    entry.category,
    entry.icd10Code,
    entry.snomedCode,
    ...entry.ecgCriteria,
    ...entry.differentialDiagnoses,
    ...entry.diagnosticFeatures,
  ]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(normalized));
}

export function listClinicalKnowledge(filters: KnowledgeSearchFilters = {}) {
  return ECG_CLINICAL_KNOWLEDGE_CATALOG.filter((entry) => {
    if (filters.category && entry.category !== filters.category) return false;
    if (filters.severity && entry.severity !== filters.severity) return false;
    if (filters.emergencyLevel && entry.emergencyLevel !== filters.emergencyLevel) return false;
    if (filters.q && !matchesQuery(entry, filters.q)) return false;
    return true;
  });
}

export function getClinicalKnowledgeById(diagnosisId: string) {
  return ECG_CLINICAL_KNOWLEDGE_BY_ID.get(diagnosisId.toUpperCase()) ?? null;
}

export function getDifferentialForDiagnosis(diagnosisId: string) {
  const entry = getClinicalKnowledgeById(diagnosisId);
  if (!entry) return [];
  return entry.differentialDiagnoses.map((label) => {
    const match = ECG_CLINICAL_KNOWLEDGE_CATALOG.find(
      (candidate) => candidate.clinicalName.toLowerCase() === label.toLowerCase() || candidate.diagnosisId === label,
    );
    return {
      clinicalName: label,
      diagnosisId: match?.diagnosisId,
      emergencyLevel: match?.emergencyLevel,
      severity: match?.severity,
    };
  });
}

export function getClinicalKnowledgeStats(): KnowledgeCatalogStats {
  const byCategory: Record<string, number> = {};
  const byEmergencyLevel: Record<string, number> = {};
  for (const entry of ECG_CLINICAL_KNOWLEDGE_CATALOG) {
    byCategory[entry.category] = (byCategory[entry.category] ?? 0) + 1;
    byEmergencyLevel[entry.emergencyLevel] = (byEmergencyLevel[entry.emergencyLevel] ?? 0) + 1;
  }
  return {
    byCategory,
    byEmergencyLevel,
    total: ECG_CLINICAL_KNOWLEDGE_CATALOG.length,
  };
}

export function validateClinicalKnowledgeCatalog() {
  const missing = REQUIRED_SPRINT58_DIAGNOSIS_IDS.filter((id) => !ECG_CLINICAL_KNOWLEDGE_BY_ID.has(id));
  if (missing.length) {
    throw new Error(`Clinical knowledge catalog missing required diagnoses: ${missing.join(", ")}`);
  }
  return {
    requiredCount: REQUIRED_SPRINT58_DIAGNOSIS_IDS.length,
    totalCount: ECG_CLINICAL_KNOWLEDGE_CATALOG.length,
    validated: true,
  };
}

export function serializeClinicalKnowledgeEntry(entry: EcgClinicalKnowledgeEntry) {
  return {
    clinicalName: entry.clinicalName,
    category: entry.category,
    clinicalNotes: entry.clinicalNotes,
    contraindications: entry.contraindications,
    description: entry.description,
    diagnosisId: entry.diagnosisId,
    diagnosticFeatures: entry.diagnosticFeatures,
    differentialDiagnoses: entry.differentialDiagnoses,
    ecgCriteria: entry.ecgCriteria,
    emergencyLevel: entry.emergencyLevel,
    guidelineReferences: entry.guidelineReferences,
    icd10Code: entry.icd10Code,
    recommendedManagement: entry.recommendedManagement,
    recommendedNextTests: entry.recommendedNextTests,
    references: entry.references,
    severity: entry.severity,
    snomedCode: entry.snomedCode,
    supportingLeads: entry.supportingLeads,
  };
}

export async function seedClinicalKnowledgeDatabase() {
  validateClinicalKnowledgeCatalog();
  let upserted = 0;
  for (const entry of ECG_CLINICAL_KNOWLEDGE_CATALOG) {
    await prisma.ecgClinicalKnowledgeDiagnosis.upsert({
      create: {
        category: entry.category,
        clinicalName: entry.clinicalName,
        clinicalNotes: entry.clinicalNotes,
        contraindications: entry.contraindications,
        description: entry.description,
        diagnosisId: entry.diagnosisId,
        diagnosticFeatures: entry.diagnosticFeatures,
        differentialDiagnoses: entry.differentialDiagnoses,
        ecgCriteria: entry.ecgCriteria,
        emergencyLevel: entry.emergencyLevel,
        guidelineReferences: entry.guidelineReferences as Prisma.InputJsonValue,
        icd10Code: entry.icd10Code,
        recommendedManagement: entry.recommendedManagement,
        recommendedNextTests: entry.recommendedNextTests,
        references: entry.references as Prisma.InputJsonValue,
        severity: entry.severity,
        snomedCode: entry.snomedCode,
        supportingLeads: entry.supportingLeads,
      },
      update: {
        category: entry.category,
        clinicalName: entry.clinicalName,
        clinicalNotes: entry.clinicalNotes,
        contraindications: entry.contraindications,
        description: entry.description,
        diagnosticFeatures: entry.diagnosticFeatures,
        differentialDiagnoses: entry.differentialDiagnoses,
        ecgCriteria: entry.ecgCriteria,
        emergencyLevel: entry.emergencyLevel,
        guidelineReferences: entry.guidelineReferences as Prisma.InputJsonValue,
        icd10Code: entry.icd10Code,
        recommendedManagement: entry.recommendedManagement,
        recommendedNextTests: entry.recommendedNextTests,
        references: entry.references as Prisma.InputJsonValue,
        severity: entry.severity,
        snomedCode: entry.snomedCode,
        supportingLeads: entry.supportingLeads,
        version: { increment: 1 },
      },
      where: { diagnosisId: entry.diagnosisId },
    });
    upserted += 1;
  }
  return { seeded: upserted, stats: getClinicalKnowledgeStats() };
}

export async function getPersistedClinicalKnowledgeCount() {
  return prisma.ecgClinicalKnowledgeDiagnosis.count({ where: { deletedAt: null } });
}
