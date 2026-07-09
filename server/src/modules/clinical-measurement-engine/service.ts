import type { ClinicalMeasurementRecord, Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { AppError } from "../../middleware/error";
import { assertResourceAccess, canAccessCase } from "../../utils/resource-access";
import { loadEcgViewerWorkspace, persistEcgViewerWorkspace } from "../../cases/ecg-viewer-workspace.service";
import { measureCaseFromStoredLeads } from "../ecg-measurement";
import type { EcgClinicalMeasurementResult } from "../ecg-measurement/types";
import { runMeasurementEngine } from "../ecg-measurement-engine/service";
import type { EcgMeasurementBundleDto } from "../ecg-measurement-engine/types";
import { validateMeasurementBundle } from "../ecg-measurement-engine/validation/validate-measurements";
import type { DigitizedLead, GridCalibration } from "../ecg-digitization/types";
import {
  CLINICAL_MEASUREMENT_ENGINE_VERSION,
  type ClinicalMeasurementAutoResult,
  type ClinicalMeasurementManualResult,
  type ClinicalMeasurementSnapshot,
} from "./types";
import type { ManualMeasurementBody } from "./schemas";

type AuthContext = { id: string; role: string };

async function assertCaseAccess(caseId: string, auth: AuthContext) {
  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  assertResourceAccess(await canAccessCase(caseId, auth as never));
  return ecgCase;
}

async function loadCaseLeads(caseId: string): Promise<{ calibration: GridCalibration; leads: DigitizedLead[] } | null> {
  const file = await prisma.eCGFile.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId } });
  if (!file) return null;
  const leads = await prisma.eCGLeadSignal.findMany({ orderBy: { leadName: "asc" }, where: { ecgFileId: file.id } });
  if (!leads.length) return null;
  const calibration: GridCalibration = {
    confidence: 0.5,
    gainMmPerMv: (leads[0]?.gain ?? 10) as 5 | 10 | 20,
    gridDetected: true,
    paperSpeedMmPerSec: (leads[0]?.paperSpeed ?? 25) as 25 | 50,
  };
  return {
    calibration,
    leads: leads.map((lead) => ({
      durationSeconds: lead.duration,
      lead: lead.leadName,
      samples: lead.signalData,
      samplingRate: lead.samplingRate,
    })),
  };
}

function estimateTWaveDurationMs(clinical: EcgClinicalMeasurementResult, bundle?: EcgMeasurementBundleDto) {
  const qt = bundle?.intervals.qtIntervalMs ?? clinical.intervals.qtIntervalMs;
  const qrs = bundle?.intervals.qrsDurationMs ?? clinical.intervals.qrsDurationMs;
  if (!qt || !qrs) return null;
  const estimate = Math.round((qt - qrs) * 0.35);
  return estimate > 0 ? estimate : null;
}

function serializeRecord(
  record: ClinicalMeasurementRecord,
  validation?: ClinicalMeasurementSnapshot["validation"],
): ClinicalMeasurementSnapshot {
  return {
    autoDetailsJson:
      record.autoDetailsJson && typeof record.autoDetailsJson === "object"
        ? (record.autoDetailsJson as Record<string, unknown>)
        : null,
    calipersJson:
      record.calipersJson && typeof record.calipersJson === "object"
        ? (record.calipersJson as Record<string, unknown>)
        : null,
    caseId: record.caseId,
    createdAt: record.createdAt.toISOString(),
    createdById: record.createdById,
    electricalAxisDeg: record.electricalAxisDeg,
    engineVersion: CLINICAL_MEASUREMENT_ENGINE_VERSION,
    heartRate: record.heartRate,
    id: record.id,
    pAxisDeg: record.pAxisDeg,
    pDurationMs: record.pDurationMs,
    prIntervalMs: record.prIntervalMs,
    qrsAxisDeg: record.qrsAxisDeg,
    qrsDurationMs: record.qrsDurationMs,
    qtIntervalMs: record.qtIntervalMs,
    qtcIntervalMs: record.qtcIntervalMs,
    rrIntervalMs: record.rrIntervalMs,
    source: record.source,
    stLevelMm: record.stLevelMm,
    tAxisDeg: record.tAxisDeg,
    tWaveDurationMs: record.tWaveDurationMs,
    validation,
  };
}

function buildAutoPayload(
  clinical: EcgClinicalMeasurementResult,
  bundle?: EcgMeasurementBundleDto,
  engineMeta?: Record<string, unknown>,
) {
  return {
    autoDetailsJson: {
      clinical,
      engineMeta,
      ...(bundle ? { bundle } : {}),
    } as unknown as Prisma.InputJsonObject,
    electricalAxisDeg: clinical.axis.electricalAxisDeg,
    heartRate: clinical.heartRate,
    pAxisDeg: bundle?.axis.pAxisDeg ?? null,
    pDurationMs: clinical.intervals.pWaveDurationMs,
    prIntervalMs: clinical.intervals.prIntervalMs,
    qrsAxisDeg: bundle?.axis.qrsAxisDeg ?? clinical.axis.meanQrsAxisDeg,
    qrsDurationMs: clinical.intervals.qrsDurationMs,
    qtIntervalMs: clinical.intervals.qtIntervalMs,
    qtcIntervalMs: clinical.intervals.qtcBazettMs,
    rrIntervalMs: clinical.intervals.rrIntervalMs,
    stLevelMm: clinical.stDeviation,
    tAxisDeg: bundle?.axis.tAxisDeg ?? null,
    tWaveDurationMs: estimateTWaveDurationMs(clinical, bundle),
  };
}

export async function getClinicalMeasurementSnapshot(caseId: string, auth: AuthContext) {
  await assertCaseAccess(caseId, auth);
  const [record, clinical, workspace] = await Promise.all([
    prisma.clinicalMeasurementRecord.findFirst({
      orderBy: { createdAt: "desc" },
      where: { caseId },
    }),
    measureCaseFromStoredLeads(caseId).catch(() => null),
    loadEcgViewerWorkspace(caseId).catch(() => null),
  ]);

  return {
    caseId,
    clinicalPreview: clinical,
    engineVersion: CLINICAL_MEASUREMENT_ENGINE_VERSION,
    latestRecord: record ? serializeRecord(record) : null,
    workspace,
  };
}

export async function runAutoClinicalMeasurement(caseId: string, auth: AuthContext): Promise<ClinicalMeasurementAutoResult> {
  await assertCaseAccess(caseId, auth);
  const loaded = await loadCaseLeads(caseId);
  if (!loaded) {
    throw new AppError(422, "No digitized leads available for auto measurement.", "MEASUREMENT_NO_LEADS");
  }

  const clinical = await measureCaseFromStoredLeads(caseId);
  if (!clinical) {
    throw new AppError(422, "Unable to compute clinical measurements from stored leads.", "MEASUREMENT_FAILED");
  }

  const engine = runMeasurementEngine(loaded);
  const payload = buildAutoPayload(clinical, engine.bundle, {
    confidence: engine.confidence,
    engineVersion: engine.engineVersion,
    performanceMs: engine.performanceMs,
    validation: engine.validation,
  });

  const record = await prisma.clinicalMeasurementRecord.create({
    data: {
      caseId,
      createdById: auth.id,
      source: "AUTO",
      ...payload,
    },
  });

  await prisma.eCGCase.update({
    data: {
      heartRate: clinical.heartRate,
      prInterval: clinical.intervals.prIntervalMs,
      qrsDuration: clinical.intervals.qrsDurationMs,
      qtInterval: clinical.intervals.qtIntervalMs,
      qtcInterval: clinical.intervals.qtcBazettMs,
    },
    where: { id: caseId },
  });

  return {
    record: serializeRecord(record, engine.validation),
    saved: true,
  };
}

export async function saveManualClinicalMeasurement(
  caseId: string,
  auth: AuthContext,
  body: ManualMeasurementBody,
): Promise<ClinicalMeasurementManualResult> {
  await assertCaseAccess(caseId, auth);

  let workspacePersisted = false;
  if (body.workspace) {
    await persistEcgViewerWorkspace(caseId, auth.id, body.workspace as Prisma.InputJsonValue);
    workspacePersisted = true;
  }

  const existing = await prisma.clinicalMeasurementRecord.findFirst({
    orderBy: { createdAt: "desc" },
    where: { caseId },
  });

  const merged = {
    calipersJson: (body.calipersJson ?? existing?.calipersJson ?? undefined) as Prisma.InputJsonValue | undefined,
    electricalAxisDeg: body.electricalAxisDeg ?? existing?.electricalAxisDeg ?? undefined,
    heartRate: body.heartRate ?? existing?.heartRate ?? undefined,
    pAxisDeg: body.pAxisDeg ?? existing?.pAxisDeg ?? undefined,
    pDurationMs: body.pDurationMs ?? existing?.pDurationMs ?? undefined,
    prIntervalMs: body.prIntervalMs ?? existing?.prIntervalMs ?? undefined,
    qrsAxisDeg: body.qrsAxisDeg ?? existing?.qrsAxisDeg ?? undefined,
    qrsDurationMs: body.qrsDurationMs ?? existing?.qrsDurationMs ?? undefined,
    qtIntervalMs: body.qtIntervalMs ?? existing?.qtIntervalMs ?? undefined,
    qtcIntervalMs: body.qtcIntervalMs ?? existing?.qtcIntervalMs ?? undefined,
    rrIntervalMs: body.rrIntervalMs ?? existing?.rrIntervalMs ?? undefined,
    stLevelMm: body.stLevelMm ?? existing?.stLevelMm ?? undefined,
    tAxisDeg: body.tAxisDeg ?? existing?.tAxisDeg ?? undefined,
    tWaveDurationMs: body.tWaveDurationMs ?? existing?.tWaveDurationMs ?? undefined,
  };

  const validation = validateManualFields(merged);

  const record = await prisma.clinicalMeasurementRecord.create({
    data: {
      caseId,
      createdById: auth.id,
      source: existing?.source === "AUTO" ? "HYBRID" : "MANUAL",
      autoDetailsJson: existing?.autoDetailsJson ?? undefined,
      ...merged,
    },
  });

  if (merged.heartRate || merged.prIntervalMs || merged.qrsDurationMs || merged.qtIntervalMs || merged.qtcIntervalMs) {
    await prisma.eCGCase.update({
      data: {
        heartRate: merged.heartRate,
        prInterval: merged.prIntervalMs,
        qrsDuration: merged.qrsDurationMs,
        qtInterval: merged.qtIntervalMs,
        qtcInterval: merged.qtcIntervalMs,
      },
      where: { id: caseId },
    });
  }

  return {
    record: serializeRecord(record, validation),
    saved: true,
    workspacePersisted,
  };
}

function validateManualFields(fields: {
  electricalAxisDeg?: number | null;
  heartRate?: number | null;
  pDurationMs?: number | null;
  prIntervalMs?: number | null;
  qrsDurationMs?: number | null;
  qtIntervalMs?: number | null;
  qtcIntervalMs?: number | null;
  rrIntervalMs?: number | null;
  stLevelMm?: number | null;
}) {
  const bundle = {
    amplitudes: {
      pWaveAmplitudeMv: 0,
      qrsAmplitudeMv: 0,
      rWaveAmplitudeMv: 0,
      sWaveAmplitudeMv: 0,
      tWaveAmplitudeMv: 0,
      voltageMv: 0,
    },
    axis: {
      electricalAxisDeg: fields.electricalAxisDeg ?? 0,
      meanElectricalAxisDeg: fields.electricalAxisDeg ?? 0,
      pAxisDeg: 0,
      qrsAxisDeg: 0,
      tAxisDeg: 0,
    },
    bundleBranch: { patterns: ["none" as const], qrsDurationMs: fields.qrsDurationMs ?? 0 },
    heartRate: {
      heartRateBpm: fields.heartRate ?? 0,
      rrIntervalMs: fields.rrIntervalMs ?? 0,
    },
    intervals: {
      pDurationMs: fields.pDurationMs ?? 0,
      prIntervalMs: fields.prIntervalMs ?? 0,
      qrsDurationMs: fields.qrsDurationMs ?? 0,
      qtDispersionMs: 0,
      qtIntervalMs: fields.qtIntervalMs ?? 0,
      qtcBazettMs: fields.qtcIntervalMs ?? 0,
      qtcFridericiaMs: fields.qtcIntervalMs ?? 0,
    },
    progression: { rProgression: "normal" as const, transitionZone: "V3-V4" },
    stSegment: {
      jPointMm: fields.stLevelMm ?? 0,
      stDepressionMm: 0,
      stDeviationMm: fields.stLevelMm ?? 0,
      stElevationMm: 0,
    },
    voltageCriteria: { lowVoltageLimbLeads: false, lvhVoltageCriteria: false, rvhVoltageCriteria: false },
  };

  const hasValues = Object.values(fields).some((value) => value !== undefined && value !== null);
  if (!hasValues) {
    return { abnormalCount: 0, issues: [], valid: true };
  }
  return validateMeasurementBundle(bundle);
}

export function getClinicalMeasurementEngineStatus() {
  return {
    fields: [
      "heartRate",
      "rrIntervalMs",
      "prIntervalMs",
      "qrsDurationMs",
      "qtIntervalMs",
      "qtcIntervalMs",
      "pDurationMs",
      "stLevelMm",
      "tWaveDurationMs",
      "pAxisDeg",
      "qrsAxisDeg",
      "tAxisDeg",
      "electricalAxisDeg",
    ],
    ok: true,
    service: "clinical-measurement-engine",
    version: CLINICAL_MEASUREMENT_ENGINE_VERSION,
  };
}
