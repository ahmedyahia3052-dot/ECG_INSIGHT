import assert from "node:assert/strict";
import {
  AI_ORCHESTRATION_ENGINE_VERSION,
  ORCHESTRATION_STAGE_ORDER,
  ORCHESTRATION_STAGE_PROGRESS,
} from "../server/src/modules/ai-orchestration-engine/types";
import {
  computeOrchestrationRetryDelayMs,
  isRecoverableOrchestrationError,
  orchestrationErrorCode,
  OrchestrationTimeoutError,
  scheduleOrchestrationRetryAt,
  withOrchestrationTimeout,
} from "../server/src/modules/ai-orchestration-engine/recovery";
import { prismaMeasurementToClinical } from "../server/src/modules/ai-orchestration-engine/measurement-adapter";
import { registerFutureAiProvider, listFutureAiProviders } from "../server/src/modules/ai-orchestration-engine/providers/registry";

async function runTests() {
  assert.equal(AI_ORCHESTRATION_ENGINE_VERSION, "sprint86-ai-orchestration-v1");
  assert.equal(ORCHESTRATION_STAGE_ORDER.length, 8);
  assert.equal(ORCHESTRATION_STAGE_ORDER[0], "VALIDATE");
  assert.equal(ORCHESTRATION_STAGE_ORDER.at(-1), "COMPLETE");
  assert.equal(ORCHESTRATION_STAGE_PROGRESS.COMPLETE, 100);
  assert.equal(ORCHESTRATION_STAGE_PROGRESS.LLM_ENRICHMENT, 75);

  assert.ok(computeOrchestrationRetryDelayMs(1) >= 20_000);
  assert.ok(computeOrchestrationRetryDelayMs(5) <= 600_000);
  assert.ok(scheduleOrchestrationRetryAt(2).getTime() > Date.now());

  assert.equal(isRecoverableOrchestrationError(new Error("provider unavailable")), true);
  assert.equal(isRecoverableOrchestrationError(new Error("ECG case not found")), false);
  assert.equal(orchestrationErrorCode(new OrchestrationTimeoutError(1000)), "PIPELINE_TIMEOUT");

  const clinical = prismaMeasurementToClinical({
    caseId: "c1",
    createdAt: new Date(),
    electricalAxis: 30,
    heartRate: 72,
    id: "m1",
    pDuration: 90,
    prInterval: 160,
    qrsDuration: 90,
    qtInterval: 380,
    qtcInterval: 410,
    rhythmRegularity: 0.9,
    rrInterval: 830,
    signalQuality: "EXCELLENT",
    stDeviation: 0,
    detailsJson: null,
  });
  assert.equal(clinical.heartRate, 72);
  assert.equal(clinical.rhythm, "sinus_rhythm");

  registerFutureAiProvider({ capabilities: ["vision"], kind: "anthropic", name: "anthropic" });
  assert.ok(listFutureAiProviders().some((entry) => entry.kind === "anthropic"));

  let timedOut = false;
  try {
    await withOrchestrationTimeout(new Promise((resolve) => setTimeout(resolve, 200)), 50);
  } catch (error) {
    timedOut = error instanceof OrchestrationTimeoutError;
  }
  assert.equal(timedOut, true);

  console.log("Sprint 86 AI Orchestration Engine unit tests: PASS");
}

void runTests();
