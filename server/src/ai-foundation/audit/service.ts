import type { AuditAction } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { AiActorContext, AiAuditAction } from "../types";

export interface AiAuditEventInput {
  action: AiAuditAction;
  actor?: AiActorContext;
  message: string;
  metadata?: Record<string, unknown>;
}

const AUDIT_ACTION_MAP: Partial<Record<AiAuditAction, AuditAction>> = {
  AI_INFERENCE_CACHED: "AI_ANALYSIS_COMPLETED",
  AI_INFERENCE_COMPLETED: "AI_ANALYSIS_COMPLETED",
  AI_INFERENCE_FAILED: "AI_ANALYSIS_FAILED",
  AI_INFERENCE_QUEUED: "AI_ANALYSIS_QUEUED",
  AI_INFERENCE_RATE_LIMITED: "SECURITY_EVENT_CREATED",
  AI_INFERENCE_STARTED: "AI_ANALYSIS_QUEUED",
  AI_VALIDATION_FAILED: "AI_ANALYSIS_FAILED",
};

export async function recordAiAuditEvent(input: AiAuditEventInput): Promise<string | undefined> {
  if (!input.actor?.actorId) return undefined;

  const prismaAction = AUDIT_ACTION_MAP[input.action];
  if (!prismaAction) return undefined;

  try {
    const entry = await prisma.auditLog.create({
      data: {
        action: prismaAction,
        actorId: input.actor.actorId,
        caseId: input.actor.caseId,
        message: input.message,
        metadata: {
          ...input.metadata,
          aiAuditAction: input.action,
          foundation: "ai-foundation",
        },
        patientId: input.actor.patientId,
      },
    });

    return entry.id;
  } catch {
    return undefined;
  }
}

export async function recordInferenceAudit(
  action: AiAuditAction,
  actor: AiActorContext | undefined,
  details: {
    kind: string;
    latencyMs?: number;
    cached?: boolean;
    providerName?: string;
    modelVersion?: string;
    promptHash?: string;
    error?: string;
  },
): Promise<string | undefined> {
  const message = action === "AI_INFERENCE_FAILED"
    ? `AI inference failed (${details.kind}): ${details.error ?? "unknown error"}`
    : `AI inference ${action.replace("AI_INFERENCE_", "").toLowerCase()} (${details.kind})`;

  return recordAiAuditEvent({
    action,
    actor,
    message,
    metadata: {
      cached: details.cached ?? false,
      kind: details.kind,
      latencyMs: details.latencyMs,
      modelVersion: details.modelVersion,
      promptHash: details.promptHash,
      providerName: details.providerName,
    },
  });
}
