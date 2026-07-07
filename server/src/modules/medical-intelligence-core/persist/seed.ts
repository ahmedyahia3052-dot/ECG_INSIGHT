import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { MIC_ARRHYTHMIA_LIBRARY } from "../data/arrhythmias";
import { MIC_DIAGNOSIS_CATALOG } from "../data/diagnoses";
import { MIC_GUIDELINE_REGISTRY } from "../data/guidelines";
import { MIC_ISCHEMIA_LIBRARY } from "../data/ischemia";
import { MIC_MEASUREMENT_REFERENCES } from "../data/measurements";
import { listAllRecommendationMappings } from "../engines/recommendation-engine";
import { MIC_RISK_RULES } from "../engines/risk-stratification";

export interface MicSeedStats {
  arrhythmias: number;
  diagnoses: number;
  guidelines: number;
  ischemiaEntities: number;
  measurementReferences: number;
  recommendationMappings: number;
  riskRules: number;
}

/** Module 10 — Persist MIC catalog to normalized database tables */
export async function seedMicCoreDatabase(): Promise<MicSeedStats> {
  for (const entry of MIC_DIAGNOSIS_CATALOG) {
    await prisma.micDiagnosisEntry.upsert({
      where: { code: entry.code },
      create: {
        code: entry.code,
        name: entry.name,
        category: entry.category,
        definition: entry.definition,
        diagnosticCriteria: entry.diagnosticCriteria,
        typicalFindings: entry.typicalFindings,
        clinicalSignificance: entry.clinicalSignificance,
        differentialDiagnosis: entry.differentialDiagnosis,
        possibleCauses: entry.possibleCauses,
        associatedSymptoms: entry.associatedSymptoms,
        severity: entry.severity,
        emergencyLevel: entry.emergencyLevel,
        recommendedNextSteps: entry.recommendedNextSteps,
        references: entry.references as unknown as Prisma.InputJsonValue,
        icd10Code: entry.icd10Code ?? null,
        snomedCode: entry.snomedCode ?? null,
        libraryTags: entry.libraryTags,
      },
      update: {
        name: entry.name,
        category: entry.category,
        definition: entry.definition,
        diagnosticCriteria: entry.diagnosticCriteria,
        typicalFindings: entry.typicalFindings,
        clinicalSignificance: entry.clinicalSignificance,
        differentialDiagnosis: entry.differentialDiagnosis,
        possibleCauses: entry.possibleCauses,
        associatedSymptoms: entry.associatedSymptoms,
        severity: entry.severity,
        emergencyLevel: entry.emergencyLevel,
        recommendedNextSteps: entry.recommendedNextSteps,
        references: entry.references as unknown as Prisma.InputJsonValue,
        icd10Code: entry.icd10Code ?? null,
        snomedCode: entry.snomedCode ?? null,
        libraryTags: entry.libraryTags,
      },
    });
  }

  for (const entry of MIC_ARRHYTHMIA_LIBRARY) {
    await prisma.micArrhythmiaEntity.upsert({
      where: { code: entry.code },
      create: {
        code: entry.code,
        name: entry.name,
        diagnosisCode: entry.diagnosisCode,
        description: entry.description,
        keyFeatures: entry.keyFeatures,
        emergencyLevel: entry.emergencyLevel,
        treatmentNotes: entry.treatmentNotes,
      },
      update: {
        name: entry.name,
        diagnosisCode: entry.diagnosisCode,
        description: entry.description,
        keyFeatures: entry.keyFeatures,
        emergencyLevel: entry.emergencyLevel,
        treatmentNotes: entry.treatmentNotes,
      },
    });
  }

  for (const entry of MIC_ISCHEMIA_LIBRARY) {
    await prisma.micIschemiaEntity.upsert({
      where: { code: entry.code },
      create: {
        code: entry.code,
        name: entry.name,
        pattern: entry.pattern,
        territory: entry.territory ?? null,
        diagnosisCode: entry.diagnosisCode,
        description: entry.description,
        affectedLeads: entry.affectedLeads,
        stCriteria: entry.stCriteria,
        emergencyLevel: entry.emergencyLevel,
      },
      update: {
        name: entry.name,
        pattern: entry.pattern,
        territory: entry.territory ?? null,
        diagnosisCode: entry.diagnosisCode,
        description: entry.description,
        affectedLeads: entry.affectedLeads,
        stCriteria: entry.stCriteria,
        emergencyLevel: entry.emergencyLevel,
      },
    });
  }

  for (const entry of MIC_MEASUREMENT_REFERENCES) {
    await prisma.micMeasurementReference.upsert({
      where: { parameter: entry.parameter },
      create: {
        parameter: entry.parameter,
        unit: entry.unit,
        normalMin: entry.normalMin ?? null,
        normalMax: entry.normalMax ?? null,
        borderlineLow: entry.borderlineLow ?? null,
        borderlineHigh: entry.borderlineHigh ?? null,
        notes: entry.notes,
        hypertrophyCriteria: entry.hypertrophyCriteria ?? [],
        references: entry.references as unknown as Prisma.InputJsonValue,
      },
      update: {
        unit: entry.unit,
        normalMin: entry.normalMin ?? null,
        normalMax: entry.normalMax ?? null,
        borderlineLow: entry.borderlineLow ?? null,
        borderlineHigh: entry.borderlineHigh ?? null,
        notes: entry.notes,
        hypertrophyCriteria: entry.hypertrophyCriteria ?? [],
        references: entry.references as unknown as Prisma.InputJsonValue,
      },
    });
  }

  for (const entry of MIC_GUIDELINE_REGISTRY) {
    await prisma.micGuidelineEntry.upsert({
      where: { id: entry.id },
      create: {
        id: entry.id,
        organization: entry.organization,
        title: entry.title,
        version: entry.version ?? null,
        year: entry.year ?? null,
        url: entry.url ?? null,
        applicableCategories: entry.applicableCategories,
      },
      update: {
        organization: entry.organization,
        title: entry.title,
        version: entry.version ?? null,
        year: entry.year ?? null,
        url: entry.url ?? null,
        applicableCategories: entry.applicableCategories,
      },
    });
  }

  await prisma.micRecommendationMapping.deleteMany({});
  const recommendations = listAllRecommendationMappings();
  if (recommendations.length) {
    await prisma.micRecommendationMapping.createMany({
      data: recommendations.map((entry) => ({
        diagnosisCode: entry.diagnosisCode,
        type: entry.type,
        action: entry.action,
        priority: entry.priority,
        rationale: entry.rationale,
      })),
    });
  }

  for (const rule of MIC_RISK_RULES) {
    await prisma.micRiskRule.upsert({
      where: { ruleId: rule.ruleId },
      create: {
        ruleId: rule.ruleId,
        level: rule.level,
        rationale: rule.rationale,
        criteriaJson: rule.criteria as unknown as Prisma.InputJsonValue,
        enabled: rule.enabled,
      },
      update: {
        level: rule.level,
        rationale: rule.rationale,
        criteriaJson: rule.criteria as unknown as Prisma.InputJsonValue,
        enabled: rule.enabled,
      },
    });
  }

  return getMicSeedStats();
}

export async function getMicSeedStats(): Promise<MicSeedStats> {
  const [diagnoses, arrhythmias, ischemiaEntities, measurementReferences, recommendationMappings, riskRules, guidelines] =
    await Promise.all([
      prisma.micDiagnosisEntry.count(),
      prisma.micArrhythmiaEntity.count(),
      prisma.micIschemiaEntity.count(),
      prisma.micMeasurementReference.count(),
      prisma.micRecommendationMapping.count(),
      prisma.micRiskRule.count(),
      prisma.micGuidelineEntry.count(),
    ]);

  return {
    diagnoses,
    arrhythmias,
    ischemiaEntities,
    measurementReferences,
    recommendationMappings,
    riskRules,
    guidelines,
  };
}
