import { getClinicalKnowledgeById } from "../../clinical-knowledge-engine";
import { interpretFromMeasurement } from "../../ecg-interpretation";
import { measureCaseFromStoredLeads } from "../../ecg-measurement";
import type { EcgClinicalMeasurementResult } from "../../ecg-measurement/types";
import { getDigitalEcg } from "../../ecg-processing/ecg-digitization.service";
import { prisma } from "../../../config/prisma";
import { AppError } from "../../../middleware/error";
import {
  interpretAxisSection,
  interpretClinicalImpressionSection,
  interpretConductionSection,
  interpretHypertrophySection,
  interpretIntervalsSection,
  interpretQWaveSection,
  interpretRateSection,
  interpretRhythmSection,
  interpretStSegmentSection,
  interpretTWaveSection,
} from "../interpreters";
import { mapKnowledgeDiagnosisId } from "./knowledge-bridge";
import type { InterpretationEngineDependencies } from "../types/dependencies";
import { INTERPRETATION_ENGINE_VERSION } from "../types/dependencies";
import type { EnterpriseEcgInterpretation } from "../types/sections";

async function resolveCaseId(caseRef: string) {
  const ecgCase = await prisma.eCGCase.findFirst({
    select: { id: true },
    where: { OR: [{ id: caseRef }, { caseId: caseRef }, { caseNumber: caseRef }] },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return ecgCase.id;
}

export function createDefaultInterpretationEngineDependencies(): InterpretationEngineDependencies {
  return {
    getClinicalKnowledgeById,
    interpretMeasurement: interpretFromMeasurement,
    measureCaseFromStoredLeads,
    resolveCaseId,
  };
}

function lookupKnowledge(deps: InterpretationEngineDependencies, code: string) {
  return deps.getClinicalKnowledgeById(mapKnowledgeDiagnosisId(code)) ?? deps.getClinicalKnowledgeById(code);
}

export function buildEnterpriseInterpretation(
  measurement: EcgClinicalMeasurementResult,
  deps: InterpretationEngineDependencies,
  options?: { caseId?: string; startedAt?: number },
): EnterpriseEcgInterpretation {
  const startedAt = options?.startedAt ?? performance.now();
  const legacy = deps.interpretMeasurement(measurement);
  const lookup = (code: string) => lookupKnowledge(deps, code);

  return {
    axis: interpretAxisSection(measurement, legacy.findings, lookup),
    caseId: options?.caseId,
    clinicalImpression: interpretClinicalImpressionSection(legacy),
    conduction: interpretConductionSection(measurement, legacy.findings, lookup),
    engineVersion: INTERPRETATION_ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    hypertrophy: interpretHypertrophySection(legacy.findings, lookup),
    intervals: interpretIntervalsSection(measurement),
    performanceMs: Math.round(performance.now() - startedAt),
    qWave: interpretQWaveSection(measurement, legacy.findings, lookup),
    rate: interpretRateSection(measurement),
    rhythm: interpretRhythmSection(measurement, legacy.findings, lookup),
    stSegment: interpretStSegmentSection(measurement, legacy.findings, lookup),
    tWave: interpretTWaveSection(measurement, legacy.findings, lookup),
  };
}

export async function interpretMeasurementInput(
  measurement: EcgClinicalMeasurementResult,
  deps: InterpretationEngineDependencies = createDefaultInterpretationEngineDependencies(),
  caseId?: string,
) {
  return buildEnterpriseInterpretation(measurement, deps, { caseId, startedAt: performance.now() });
}

export async function interpretCaseById(
  caseRef: string,
  deps: InterpretationEngineDependencies = createDefaultInterpretationEngineDependencies(),
) {
  const caseId = await deps.resolveCaseId(caseRef);
  const measurement = await deps.measureCaseFromStoredLeads(caseId);
  if (!measurement) {
    const digital = await getDigitalEcg(caseId);
    if (!digital.measurementEngine) {
      throw new AppError(404, "No digitized measurement available for interpretation.", "MEASUREMENT_NOT_FOUND");
    }
    return buildEnterpriseInterpretation(digital.measurementEngine, deps, { caseId, startedAt: performance.now() });
  }
  return buildEnterpriseInterpretation(measurement, deps, { caseId, startedAt: performance.now() });
}

export async function getStoredCaseInterpretation(caseRef: string) {
  const caseId = await resolveCaseId(caseRef);
  const digital = await getDigitalEcg(caseId);
  const deps = createDefaultInterpretationEngineDependencies();
  const measurement = digital.measurementEngine ?? await deps.measureCaseFromStoredLeads(caseId);
  if (!measurement) {
    throw new AppError(404, "No measurement bundle available for interpretation.", "MEASUREMENT_NOT_FOUND");
  }
  return buildEnterpriseInterpretation(measurement, deps, { caseId, startedAt: performance.now() });
}
