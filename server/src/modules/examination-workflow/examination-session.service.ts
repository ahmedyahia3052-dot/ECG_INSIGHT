import { createHash, randomUUID } from "node:crypto";

import { prisma } from "../../config/prisma";
import { getDigitizationQuality } from "../ecg-processing/ecg-digitization.service";
import {
  EXAMINATION_PIPELINE_VERSION,
  EXAMINATION_SESSION_MARKER,
  EXAMINATION_STEP_ORDER,
  lifecycleForStep,
  nextExaminationStep,
  type DoctorFindingReview,
  type DoctorFindingReviewStatus,
  type ExaminationClinicalInfo,
  type ExaminationLifecycleStatus,
  type ExaminationQualitySnapshot,
  type ExaminationSessionRecord,
  type ExaminationStepId,
  type ExaminationTimelineEntry,
} from "./types";

function nowIso() {
  return new Date().toISOString();
}

function defaultSession(caseId: string, user: { id: string; name: string }): ExaminationSessionRecord {
  const stamp = nowIso();
  return {
    caseId,
    clinicalInfo: {},
    completedSteps: [],
    createdAt: stamp,
    currentStepId: "create-examination",
    doctorFindings: [],
    id: randomUUID(),
    lifecycleStatus: "pending",
    pipelineVersion: EXAMINATION_PIPELINE_VERSION,
    startedById: user.id,
    startedByName: user.name,
    timeline: [
      {
        action: "Examination session created",
        id: randomUUID(),
        performedAt: stamp,
        stepId: "create-examination",
        userId: user.id,
        userName: user.name,
      },
    ],
    updatedAt: stamp,
  };
}

async function readStoredSession(caseId: string): Promise<ExaminationSessionRecord | null> {
  const note = await prisma.caseClinicalNote.findFirst({
    orderBy: { updatedAt: "desc" },
    where: { caseId, plainText: EXAMINATION_SESSION_MARKER },
  });
  const session = (note?.metadata as { session?: ExaminationSessionRecord } | null | undefined)?.session;
  return session ?? null;
}

async function writeStoredSession(caseId: string, authorId: string, session: ExaminationSessionRecord) {
  const existing = await prisma.caseClinicalNote.findFirst({
    where: { caseId, plainText: EXAMINATION_SESSION_MARKER },
  });
  const payload = { session, version: 1 };
  if (existing) {
    await prisma.caseClinicalNote.update({
      data: { authorId, metadata: payload, updatedAt: new Date() },
      where: { id: existing.id },
    });
    return;
  }
  await prisma.caseClinicalNote.create({
    data: {
      authorId,
      caseId,
      metadata: payload,
      plainText: EXAMINATION_SESSION_MARKER,
      richText: EXAMINATION_SESSION_MARKER,
    },
  });
}

function appendTimeline(
  session: ExaminationSessionRecord,
  user: { id: string; name: string },
  action: string,
  stepId?: ExaminationStepId,
): ExaminationTimelineEntry {
  const entry: ExaminationTimelineEntry = {
    action,
    id: randomUUID(),
    performedAt: nowIso(),
    stepId,
    userId: user.id,
    userName: user.name,
  };
  session.timeline = [...session.timeline, entry];
  return entry;
}

function markStepComplete(session: ExaminationSessionRecord, stepId: ExaminationStepId) {
  if (!session.completedSteps.includes(stepId)) {
    session.completedSteps = [...session.completedSteps, stepId];
  }
}

export async function getOrCreateExaminationSession(
  caseId: string,
  user: { id: string; name: string },
): Promise<ExaminationSessionRecord> {
  const existing = await readStoredSession(caseId);
  if (existing) return existing;
  const session = defaultSession(caseId, user);
  await writeStoredSession(caseId, user.id, session);
  return session;
}

export async function getExaminationSession(caseId: string): Promise<ExaminationSessionRecord | null> {
  return readStoredSession(caseId);
}

export async function updateExaminationClinicalInfo(
  caseId: string,
  user: { id: string; name: string },
  clinicalInfo: Partial<ExaminationClinicalInfo>,
): Promise<ExaminationSessionRecord> {
  const session = await getOrCreateExaminationSession(caseId, user);
  session.clinicalInfo = { ...session.clinicalInfo, ...clinicalInfo };
  session.updatedAt = nowIso();
  appendTimeline(session, user, "Clinical information updated", session.currentStepId);
  await writeStoredSession(caseId, user.id, session);
  return session;
}

export async function advanceExaminationStep(
  caseId: string,
  user: { id: string; name: string },
  stepId?: ExaminationStepId,
): Promise<ExaminationSessionRecord> {
  const session = await getOrCreateExaminationSession(caseId, user);
  const target = stepId ?? nextExaminationStep(session.currentStepId) ?? session.currentStepId;
  markStepComplete(session, session.currentStepId);
  session.currentStepId = target;
  session.lifecycleStatus = lifecycleForStep(target);
  session.updatedAt = nowIso();
  appendTimeline(session, user, `Advanced to ${EXAMINATION_STEP_ORDER.find((row) => row.id === target)?.label ?? target}`, target);
  if (target === "archive-examination") {
    session.archivedAt = nowIso();
    session.lifecycleStatus = "archived";
  }
  if (target === "generate-final-report" || target === "archive-examination") {
    session.completedAt = session.completedAt ?? nowIso();
    if (session.lifecycleStatus !== "archived") session.lifecycleStatus = "completed";
  }
  await writeStoredSession(caseId, user.id, session);
  return session;
}

export async function setExaminationLifecycleStatus(
  caseId: string,
  user: { id: string; name: string },
  lifecycleStatus: ExaminationLifecycleStatus,
): Promise<ExaminationSessionRecord> {
  const session = await getOrCreateExaminationSession(caseId, user);
  session.lifecycleStatus = lifecycleStatus;
  session.updatedAt = nowIso();
  appendTimeline(session, user, `Lifecycle status set to ${lifecycleStatus}`, session.currentStepId);
  await writeStoredSession(caseId, user.id, session);
  return session;
}

export async function reviewExaminationFinding(
  caseId: string,
  user: { id: string; name: string },
  input: {
    findingId: string;
    label: string;
    modifiedText?: string;
    reason?: string;
    status: DoctorFindingReviewStatus;
  },
): Promise<ExaminationSessionRecord> {
  const session = await getOrCreateExaminationSession(caseId, user);
  const existing = session.doctorFindings.find((row) => row.findingId === input.findingId);
  const next: DoctorFindingReview = {
    findingId: input.findingId,
    label: input.label,
    modifiedText: input.modifiedText,
    reason: input.reason,
    reviewedAt: nowIso(),
    reviewedById: user.id,
    reviewedByName: user.name,
    status: input.status,
  };
  session.doctorFindings = existing
    ? session.doctorFindings.map((row) => (row.findingId === input.findingId ? next : row))
    : [...session.doctorFindings, next];
  session.updatedAt = nowIso();
  appendTimeline(session, user, `Finding ${input.status}: ${input.label}`, "doctor-validation");
  await writeStoredSession(caseId, user.id, session);
  return session;
}

export async function saveExaminationImpression(
  caseId: string,
  user: { id: string; name: string },
  input: { finalDiagnosis?: string; finalImpression?: string; finalRecommendations?: string[] },
): Promise<ExaminationSessionRecord> {
  const session = await getOrCreateExaminationSession(caseId, user);
  session.finalDiagnosis = input.finalDiagnosis ?? session.finalDiagnosis;
  session.finalImpression = input.finalImpression ?? session.finalImpression;
  session.finalRecommendations = input.finalRecommendations ?? session.finalRecommendations;
  session.updatedAt = nowIso();
  appendTimeline(session, user, "Final impression saved", "final-impression");
  await writeStoredSession(caseId, user.id, session);
  return session;
}

export async function signExaminationSession(
  caseId: string,
  user: { id: string; name: string },
): Promise<ExaminationSessionRecord> {
  const session = await getOrCreateExaminationSession(caseId, user);
  const payload = JSON.stringify({
    caseId,
    finalDiagnosis: session.finalDiagnosis,
    finalImpression: session.finalImpression,
    signedAt: nowIso(),
    signedById: user.id,
  });
  session.signature = {
    hash: createHash("sha256").update(payload).digest("hex"),
    signedAt: nowIso(),
    signedById: user.id,
    signedByName: user.name,
  };
  markStepComplete(session, "electronic-signature");
  session.currentStepId = "generate-final-report";
  session.lifecycleStatus = "review";
  session.updatedAt = nowIso();
  appendTimeline(session, user, "Electronic signature applied", "electronic-signature");
  await writeStoredSession(caseId, user.id, session);
  return session;
}

export function buildExaminationQualitySnapshot(input: {
  digitizationQuality?: Awaited<ReturnType<typeof getDigitizationQuality>> | null;
  leadCount?: number;
  measurementCount?: number;
}): ExaminationQualitySnapshot {
  const quality = input.digitizationQuality?.quality as { score?: number; tier?: string; reasons?: string[] } | undefined;
  const tierScore =
    quality?.tier === "Excellent"
      ? 95
      : quality?.tier === "Good"
        ? 82
        : quality?.tier === "Fair"
          ? 68
          : quality?.tier === "Poor"
            ? 45
            : quality?.score ?? 70;
  const leadCompleteness = Math.min(100, Math.round(((input.leadCount ?? 0) / 12) * 100));
  const signalQuality = Math.round((tierScore * 0.55 + leadCompleteness * 0.45));
  const noiseScore = Math.max(0, 100 - Math.round((quality?.reasons?.length ?? 0) * 8));
  const baselineQuality = Math.round((signalQuality + noiseScore) / 2);
  const ecgQualityScore = Math.round((signalQuality * 0.4 + leadCompleteness * 0.25 + baselineQuality * 0.2 + noiseScore * 0.15));
  const overallTier =
    ecgQualityScore >= 90 ? "excellent" : ecgQualityScore >= 75 ? "good" : ecgQualityScore >= 60 ? "fair" : "poor";
  const autoRecommendations: string[] = [];
  if (leadCompleteness < 100) autoRecommendations.push("Verify all 12 standard leads are present before sign-off.");
  if (noiseScore < 70) autoRecommendations.push("Consider re-acquisition or enhanced preprocessing to reduce noise.");
  if ((input.measurementCount ?? 0) < 3) autoRecommendations.push("Complete core interval measurements in Measurement Studio.");
  if (overallTier === "poor") autoRecommendations.push("Quality below hospital threshold — repeat acquisition recommended.");
  if (!autoRecommendations.length) autoRecommendations.push("Signal quality acceptable for clinical interpretation.");
  return {
    autoRecommendations,
    baselineQuality,
    ecgQualityScore,
    leadCompleteness,
    noiseScore,
    overallTier,
    signalQuality,
  };
}

export async function refreshExaminationQuality(
  caseId: string,
  user: { id: string; name: string },
  input?: { leadCount?: number; measurementCount?: number },
): Promise<ExaminationSessionRecord> {
  const session = await getOrCreateExaminationSession(caseId, user);
  const digitizationQuality = await getDigitizationQuality(caseId).catch(() => null);
  session.quality = buildExaminationQualitySnapshot({
    digitizationQuality,
    leadCount: input?.leadCount ?? digitizationQuality?.leadSegments?.length,
    measurementCount: input?.measurementCount,
  });
  session.updatedAt = nowIso();
  appendTimeline(session, user, "Quality control assessment refreshed", "quality-check");
  await writeStoredSession(caseId, user.id, session);
  return session;
}

export function buildExaminationSummary(session: ExaminationSessionRecord) {
  return {
    archivedAt: session.archivedAt,
    caseId: session.caseId,
    clinicalHistory: session.clinicalInfo,
    completedSteps: session.completedSteps.length,
    doctorFindings: session.doctorFindings,
    finalDiagnosis: session.finalDiagnosis,
    finalImpression: session.finalImpression,
    finalRecommendations: session.finalRecommendations,
    lifecycleStatus: session.lifecycleStatus,
    pipelineVersion: session.pipelineVersion,
    quality: session.quality,
    signature: session.signature,
    timelineCount: session.timeline.length,
  };
}
