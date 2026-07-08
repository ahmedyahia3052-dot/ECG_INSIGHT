import assert from "node:assert/strict";
import {
  ECG_INGESTION_PIPELINE_VERSION,
  INGESTION_STAGE_ORDER,
  INGESTION_STAGE_PROGRESS,
  nextIngestionStage,
} from "../server/src/modules/ecg-ingestion-pipeline/types";
import {
  computeIngestionRetryDelayMs,
  getDuplicateDetectionWindowMs,
  hasIngestionTimedOut,
  IngestionTimeoutError,
  isRecoverableIngestionError,
  ingestionErrorCode,
  scheduleIngestionRetryAt,
  withIngestionTimeout,
} from "../server/src/modules/ecg-ingestion-pipeline/recovery";
import { createEmptyIngestionMetrics, recordStageDuration } from "../server/src/modules/ecg-ingestion-pipeline/metrics";

async function runTests() {
  assert.equal(ECG_INGESTION_PIPELINE_VERSION, "sprint88-ecg-ingestion-v1");
  assert.equal(INGESTION_STAGE_ORDER.length, 10);
  assert.equal(INGESTION_STAGE_ORDER[0], "UPLOAD");
  assert.equal(INGESTION_STAGE_ORDER.at(-1), "COMPLETE");
  assert.equal(INGESTION_STAGE_PROGRESS.COMPLETE, 100);
  assert.equal(INGESTION_STAGE_PROGRESS.PROCESSING, 45);
  assert.equal(nextIngestionStage("VALIDATE"), "STORAGE");

  assert.ok(computeIngestionRetryDelayMs(1) >= 20_000);
  assert.ok(getDuplicateDetectionWindowMs() > 0);
  assert.ok(scheduleIngestionRetryAt(2).getTime() > Date.now());
  assert.equal(isRecoverableIngestionError(new Error("provider unavailable")), true);
  assert.equal(isRecoverableIngestionError(new Error("ECG file not found")), false);
  assert.equal(ingestionErrorCode(new IngestionTimeoutError(1000)), "PIPELINE_TIMEOUT");
  assert.equal(hasIngestionTimedOut(new Date(Date.now() - 10_000), 5_000), true);

  const metrics = recordStageDuration(createEmptyIngestionMetrics(), "VALIDATE", 42);
  assert.equal(metrics.stageDurationsMs?.VALIDATE, 42);

  let timedOut = false;
  try {
    await withIngestionTimeout(new Promise((resolve) => setTimeout(resolve, 200)), 50);
  } catch (error) {
    timedOut = error instanceof IngestionTimeoutError;
  }
  assert.equal(timedOut, true);

  console.log("Sprint 88 ECG Ingestion Pipeline unit tests: PASS");
}

void runTests();
