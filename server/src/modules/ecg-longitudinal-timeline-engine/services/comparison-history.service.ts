import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { AppError } from "../../../middleware/error";
import type { ComparisonResultDto, TextDeltaDto, TrendSnapshotDto } from "../types";
import { logLongitudinalAudit } from "./audit.service";
import { buildFollowUpSummary, generateFollowUpFromComparison } from "./follow-up.service";
import { clinicalSignificanceFromTrends, detectTrendSnapshots } from "./trend-analysis.service";
import { resolveCaseWithSignals, type CaseSignals } from "./timeline.service";

function textDelta(previous: string | null | undefined, current: string | null | undefined, label: string): TextDeltaDto {
  const prev = previous?.trim() || null;
  const curr = current?.trim() || null;
  const changed = prev !== curr;
  let summary = `No change in ${label}.`;
  if (!prev && curr) summary = `New ${label}: ${curr}`;
  else if (prev && !curr) summary = `${label} no longer documented.`;
  else if (changed) summary = `${label} changed from "${prev}" to "${curr}".`;
  return { previous: prev, current: curr, changed, summary };
}

function metricPayload(current: CaseSignals, previous: CaseSignals) {
  const currentMeasurement = current.measurements[0];
  const previousMeasurement = previous.measurements[0];
  const currentAnalysis = current.analyses[0];
  const previousAnalysis = previous.analyses[0];

  const currentValues = {
    heartRate: currentMeasurement?.heartRate ?? current.heartRate ?? null,
    prInterval: currentMeasurement?.prInterval ?? current.prInterval ?? null,
    qrsDuration: currentMeasurement?.qrsDuration ?? current.qrsDuration ?? null,
    qtInterval: currentMeasurement?.qtInterval ?? current.qtInterval ?? null,
    qtcInterval: currentMeasurement?.qtcInterval ?? current.qtcInterval ?? null,
    axis: currentMeasurement?.electricalAxis ?? null,
    stDeviation: currentMeasurement?.stDeviation ?? null,
    rhythm: currentAnalysis?.rhythm ?? current.rhythm ?? null,
    diagnosis: currentAnalysis?.diagnosis ?? current.finalDiagnosis ?? current.doctorDiagnosis ?? current.aiDiagnosis ?? null,
    interpretation: currentAnalysis?.interpretation ?? current.clinicalComments ?? null,
  };

  const previousValues = {
    heartRate: previousMeasurement?.heartRate ?? previous.heartRate ?? null,
    prInterval: previousMeasurement?.prInterval ?? previous.prInterval ?? null,
    qrsDuration: previousMeasurement?.qrsDuration ?? previous.qrsDuration ?? null,
    qtInterval: previousMeasurement?.qtInterval ?? previous.qtInterval ?? null,
    qtcInterval: previousMeasurement?.qtcInterval ?? previous.qtcInterval ?? null,
    axis: previousMeasurement?.electricalAxis ?? null,
    stDeviation: previousMeasurement?.stDeviation ?? null,
    rhythm: previousAnalysis?.rhythm ?? previous.rhythm ?? null,
    diagnosis: previousAnalysis?.diagnosis ?? previous.finalDiagnosis ?? previous.doctorDiagnosis ?? previous.aiDiagnosis ?? null,
    interpretation: previousAnalysis?.interpretation ?? previous.clinicalComments ?? null,
  };

  const details: Record<string, { previous: number | null; current: number | null; delta: number | null }> = {};
  for (const key of ["heartRate", "prInterval", "qrsDuration", "qtInterval", "qtcInterval", "axis"] as const) {
    const prev = previousValues[key];
    const curr = currentValues[key];
    details[key] = {
      previous: prev,
      current: curr,
      delta: prev != null && curr != null ? curr - prev : null,
    };
  }

  return { currentValues, previousValues, details };
}

export async function compareEcgCases(input: {
  currentCaseRef: string;
  previousCaseRef: string;
  actorId: string;
  organizationId?: string | null;
}): Promise<ComparisonResultDto> {
  const current = await resolveCaseWithSignals(input.currentCaseRef);
  const previous = await resolveCaseWithSignals(input.previousCaseRef);

  if (current.patientId !== previous.patientId) {
    throw new AppError(400, "Cases belong to different patients and cannot be compared.", "PATIENT_MISMATCH");
  }

  const { currentValues, previousValues, details } = metricPayload(current, previous);
  const trends = detectTrendSnapshots(currentValues, previousValues);
  const clinicalSignificance = clinicalSignificanceFromTrends(trends);
  const followUpSummary = buildFollowUpSummary(trends, previous.acquisitionDate.toISOString());

  const currentAnalysis = current.analyses[0];
  const previousAnalysis = previous.analyses[0];
  const diagnosisDelta = textDelta(
    previousAnalysis?.diagnosis ?? previous.finalDiagnosis ?? previous.aiDiagnosis,
    currentAnalysis?.diagnosis ?? current.finalDiagnosis ?? current.aiDiagnosis,
    "diagnosis",
  );
  const interpretationDelta = textDelta(
    previousAnalysis?.interpretation ?? previous.clinicalComments,
    currentAnalysis?.interpretation ?? current.clinicalComments,
    "interpretation",
  );

  const prevConfidence = previous.confidenceScore ?? previousAnalysis?.confidenceScore ?? null;
  const currConfidence = current.confidenceScore ?? currentAnalysis?.confidenceScore ?? null;
  const confidenceDelta = {
    previous: prevConfidence,
    current: currConfidence,
    delta: prevConfidence != null && currConfidence != null ? currConfidence - prevConfidence : null,
    summary:
      prevConfidence != null && currConfidence != null
        ? `AI confidence ${prevConfidence.toFixed(2)} → ${currConfidence.toFixed(2)}`
        : "AI confidence not available for one or both studies.",
  };

  const timeline = await prisma.eCGTimeline.findUnique({ where: { caseId: current.id } });

  const comparison = await prisma.eCGComparisonHistory.create({
    data: {
      patientId: current.patientId,
      currentCaseId: current.id,
      previousCaseId: previous.id,
      timelineId: timeline?.id,
      evaluatedById: input.actorId,
      measurementDelta: details as Prisma.InputJsonValue,
      diagnosisDelta: diagnosisDelta as Prisma.InputJsonValue,
      interpretationDelta: interpretationDelta as Prisma.InputJsonValue,
      confidenceDelta: confidenceDelta as Prisma.InputJsonValue,
      clinicalSignificance,
      trendSummary: trends as unknown as Prisma.InputJsonValue,
      followUpSummary,
    },
  });

  if (trends.length > 0) {
    await prisma.eCGTrendSnapshot.createMany({
      data: trends.map((trend: TrendSnapshotDto) => ({
        patientId: current.patientId,
        caseId: current.id,
        timelineId: timeline?.id,
        comparisonId: comparison.id,
        trendType: trend.trendType,
        direction: trend.direction,
        metric: trend.metric,
        currentValue: trend.currentValue,
        previousValue: trend.previousValue,
        delta: trend.delta,
        threshold: trend.threshold,
        statement: trend.statement,
        significance: trend.significance,
      })),
    });
  }

  await generateFollowUpFromComparison({
    patientId: current.patientId,
    caseId: current.id,
    timelineId: timeline?.id,
    createdById: input.actorId,
    trends,
    previousAcquisitionDate: previous.acquisitionDate,
  });

  await logLongitudinalAudit({
    action: "ECG_COMPARISON_PERFORMED",
    actorId: input.actorId,
    caseId: current.id,
    patientId: current.patientId,
    organizationId: input.organizationId,
    message: `ECG comparison performed: ${previous.caseId} → ${current.caseId}`,
    metadata: { comparisonId: comparison.id, previousCaseId: previous.id, trendCount: trends.length },
  });

  await logLongitudinalAudit({
    action: "ECG_TREND_ANALYSIS_GENERATED",
    actorId: input.actorId,
    caseId: current.id,
    patientId: current.patientId,
    organizationId: input.organizationId,
    message: "Trend analysis generated from serial ECG comparison.",
    metadata: { comparisonId: comparison.id, trends: trends.map((t) => t.trendType) },
  });

  return {
    patientId: current.patientId,
    currentCaseId: current.id,
    previousCaseId: previous.id,
    measurementDelta: {
      heartRate: details.heartRate?.delta ?? null,
      prInterval: details.prInterval?.delta ?? null,
      qrsDuration: details.qrsDuration?.delta ?? null,
      qtInterval: details.qtInterval?.delta ?? null,
      qtcInterval: details.qtcInterval?.delta ?? null,
      axis: details.axis?.delta ?? null,
      details,
    },
    diagnosisDelta,
    interpretationDelta,
    confidenceDelta,
    clinicalSignificance,
    trendSummary: trends,
    followUpSummary,
    comparisonId: comparison.id,
    createdAt: comparison.createdAt.toISOString(),
  };
}
