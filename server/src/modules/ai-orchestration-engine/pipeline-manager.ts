import { prisma } from "../../config/prisma";
import { executeAiInference } from "../../ai-foundation/foundation.service";
import type { AiInferenceResult } from "../../ai-foundation/types";
import type { ECGAnalysisOutput } from "../../ai/domain";
import type { LlmCompletionDTO } from "../../llm/types";
import type { EnterpriseEcgInterpretation } from "../ecg-interpretation-engine/types";
import type { MedicalIntelligenceReport } from "../medical-intelligence/types";
import { resolveOrchestrationProvider } from "./providers/registry";
import { prismaMeasurementToClinical } from "./measurement-adapter";
import {
  buildOrchestrationResult,
  ensureQueuedAnalysis,
  persistOrchestrationResult,
} from "./persist";
import {
  appendOrchestrationProcessingLog,
  updateOrchestrationJobStage,
} from "./repository";
import {
  OrchestrationTimeoutError,
  withOrchestrationTimeout,
} from "./recovery";
import {
  AI_ORCHESTRATION_ENGINE_VERSION,
  ORCHESTRATION_STAGE_ORDER,
  ORCHESTRATION_STAGE_PROGRESS,
  type AiOrchestrationStageName,
  type OrchestrationPipelineContext,
  type OrchestrationProcessingLogEntry,
  type OrchestrationStageLogEntry,
  type AiOrchestrationJobResult,
} from "./types";

async function readJobLogs(jobId: string) {
  const job = await prisma.aiOrchestrationJob.findUnique({
    select: { processingLogs: true, stageLog: true },
    where: { id: jobId },
  });
  return {
    processingLogs: Array.isArray(job?.processingLogs)
      ? (job!.processingLogs as OrchestrationProcessingLogEntry[])
      : [],
    stageLog: Array.isArray(job?.stageLog)
      ? (job!.stageLog as OrchestrationStageLogEntry[])
      : [],
  };
}

async function appendStageLog(
  jobId: string,
  entry: OrchestrationStageLogEntry,
  patch: { progress?: number; stage: AiOrchestrationStageName },
) {
  const { stageLog, processingLogs } = await readJobLogs(jobId);
  stageLog.push(entry);
  await updateOrchestrationJobStage(jobId, {
    progress: patch.progress ?? ORCHESTRATION_STAGE_PROGRESS[patch.stage],
    processingLogs,
    stage: patch.stage,
    stageLog,
  });
}

async function logProcessing(
  jobId: string,
  message: string,
  level: OrchestrationProcessingLogEntry["level"] = "info",
  stage?: AiOrchestrationStageName,
) {
  await appendOrchestrationProcessingLog(jobId, {
    level,
    message,
    stage,
    timestamp: new Date().toISOString(),
  });
}

async function runTrackedStage<T>(
  ctx: OrchestrationPipelineContext,
  stage: AiOrchestrationStageName,
  runner: () => Promise<T> | T,
  options?: { skip?: boolean },
): Promise<T | undefined> {
  if (options?.skip) {
    await appendStageLog(
      ctx.jobId,
      { stage, status: "skipped", timestamp: new Date().toISOString() },
      { stage },
    );
    await logProcessing(ctx.jobId, `Stage ${stage} skipped.`, "debug", stage);
    return undefined;
  }

  const started = Date.now();
  await updateOrchestrationJobStage(ctx.jobId, {
    progress: ORCHESTRATION_STAGE_PROGRESS[stage],
    stage,
  });
  await logProcessing(ctx.jobId, `Stage ${stage} started.`, "info", stage);

  try {
    const result = await runner();
    await appendStageLog(
      ctx.jobId,
      {
        durationMs: Date.now() - started,
        stage,
        status: "completed",
        timestamp: new Date().toISOString(),
      },
      { stage },
    );
    await logProcessing(ctx.jobId, `Stage ${stage} completed.`, "info", stage);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Stage failed";
    const status = error instanceof OrchestrationTimeoutError ? "timed_out" : "failed";
    await appendStageLog(
      ctx.jobId,
      {
        durationMs: Date.now() - started,
        message,
        stage,
        status,
        timestamp: new Date().toISOString(),
      },
      { stage },
    );
    await logProcessing(ctx.jobId, `Stage ${stage} failed: ${message}`, "error", stage);
    throw error;
  }
}

async function executeOrchestrationPipelineInner(
  ctx: OrchestrationPipelineContext,
): Promise<AiOrchestrationJobResult> {
  const pipelineStarted = Date.now();
  const skipEcg = ctx.pipelineKind === "LLM_ONLY";
  const skipLlm = ctx.pipelineKind === "ECG_ONLY";

  await runTrackedStage(ctx, "VALIDATE", async () => {
    const ecgCase = await prisma.eCGCase.findUnique({ where: { id: ctx.caseId } });
    if (!ecgCase) throw new Error("ECG case not found for orchestration job.");
    return ecgCase;
  });

  const analysisRecord = await runTrackedStage(ctx, "LOAD_CONTEXT", async () => {
    const queued = await ensureQueuedAnalysis({
      actorId: ctx.actorId,
      analysisId: ctx.analysisId,
      caseId: ctx.caseId,
    });
    ctx.analysisId = queued.id;
    await updateOrchestrationJobStage(ctx.jobId, {
      analysisId: queued.id,
      stage: "LOAD_CONTEXT",
    });
    return queued;
  });
  if (!analysisRecord) throw new Error("Failed to load orchestration analysis context.");

  const measurement = await prisma.eCGMeasurement.findFirst({
    orderBy: { createdAt: "desc" },
    where: { caseId: ctx.caseId },
  });

  const ecgCase = await prisma.eCGCase.findUnique({ where: { id: ctx.caseId } });
  if (!ecgCase) throw new Error("ECG case not found.");

  const provider = await resolveOrchestrationProvider(ctx.providerPreference);

  const ecgAnalysis = await runTrackedStage(
    ctx,
    "ECG_ANALYSIS",
    async () =>
      executeAiInference<ECGAnalysisOutput>({
        actor: {
          actorId: ctx.actorId,
          caseId: ctx.caseId,
          patientId: ctx.patientId,
        },
        ecgInput: { case: ecgCase, measurement },
        kind: "ecg_analysis",
        skipCache: true,
      }),
    { skip: skipEcg },
  );

  const clinicalMeasurement = measurement ? prismaMeasurementToClinical(measurement) : undefined;

  const clinicalReasoning = await runTrackedStage(
    ctx,
    "CLINICAL_REASONING",
    async () =>
      executeAiInference<MedicalIntelligenceReport>({
        actor: {
          actorId: ctx.actorId,
          caseId: ctx.caseId,
          patientId: ctx.patientId,
        },
        kind: "clinical_reasoning",
        measurement: clinicalMeasurement!,
        skipCache: true,
      }),
    { skip: skipEcg || !clinicalMeasurement },
  );

  const ecgInterpretation = await runTrackedStage(
    ctx,
    "ECG_INTERPRETATION",
    async () =>
      executeAiInference<EnterpriseEcgInterpretation>({
        actor: {
          actorId: ctx.actorId,
          caseId: ctx.caseId,
          patientId: ctx.patientId,
        },
        kind: "ecg_interpretation",
        measurement: clinicalMeasurement!,
        skipCache: true,
      }),
    { skip: skipEcg || !clinicalMeasurement },
  );

  const llmEnrichment = await runTrackedStage(
    ctx,
    "LLM_ENRICHMENT",
    async (): Promise<AiInferenceResult<LlmCompletionDTO>> => {
      const diagnosis = ecgAnalysis?.output?.primaryDiagnosis ?? analysisRecord.diagnosis;
      const completion = await provider.generateChat({
        messages: [
          {
            content: `Provide a concise clinical enrichment summary for ECG case ${ecgCase.caseId} with diagnosis ${diagnosis}.`,
            role: "user",
          },
        ],
        temperature: 0.2,
      });
      return {
        cached: false,
        kind: "llm_chat",
        latencyMs: 0,
        output: completion,
        validation: { errors: [], valid: true },
        version: {
          foundationVersion: AI_ORCHESTRATION_ENGINE_VERSION,
          modelVersion: provider.model,
          providerName: provider.name,
        },
      };
    },
    { skip: skipLlm || provider.kind === "rule_based" },
  );

  await runTrackedStage(ctx, "PERSIST", async () => {
    await persistOrchestrationResult({
      actorId: ctx.actorId,
      analysisId: analysisRecord.id,
      caseId: ctx.caseId,
      durationMs: Date.now() - pipelineStarted,
      ecgAnalysis,
      providerUsed: provider.name,
    });
  });

  const result = buildOrchestrationResult({
    analysisId: analysisRecord.id,
    clinicalReasoning,
    durationMs: Date.now() - pipelineStarted,
    ecgAnalysis,
    ecgInterpretation,
    llmEnrichment,
    providerUsed: provider.name,
  });

  ctx.result = result;
  await appendStageLog(
    ctx.jobId,
    { stage: "COMPLETE", status: "completed", timestamp: new Date().toISOString() },
    { progress: ORCHESTRATION_STAGE_PROGRESS.COMPLETE, stage: "COMPLETE" },
  );
  await logProcessing(ctx.jobId, "Orchestration pipeline completed.", "info", "COMPLETE");

  return result;
}

export async function executeOrchestrationPipeline(
  ctx: OrchestrationPipelineContext,
): Promise<AiOrchestrationJobResult> {
  return withOrchestrationTimeout(executeOrchestrationPipelineInner(ctx), ctx.timeoutMs);
}

export function nextOrchestrationStageAfter(current: AiOrchestrationStageName): AiOrchestrationStageName | null {
  const index = ORCHESTRATION_STAGE_ORDER.indexOf(current);
  if (index < 0 || index >= ORCHESTRATION_STAGE_ORDER.length - 1) return null;
  return ORCHESTRATION_STAGE_ORDER[index + 1] ?? null;
}
