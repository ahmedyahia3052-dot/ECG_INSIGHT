import assert from "node:assert/strict";
import {
  PROCESSING_STAGE_ORDER,
  STAGE_PROGRESS,
  ECG_PROCESSING_ENGINE_VERSION,
} from "../server/src/modules/ecg-processing-engine/types";
import {
  computeRetryDelayMs,
  isRecoverableProcessingError,
  processingErrorCode,
  scheduleRetryAt,
} from "../server/src/modules/ecg-processing-engine/recovery";
import { isRasterOrPdfEcg } from "../server/src/modules/ecg-processing-engine/stages";

assert.equal(ECG_PROCESSING_ENGINE_VERSION, "sprint82-ecg-processing-v1");
assert.equal(PROCESSING_STAGE_ORDER.length, 13);
assert.equal(PROCESSING_STAGE_ORDER[0], "UPLOAD_INGEST");
assert.equal(PROCESSING_STAGE_ORDER.at(-1), "COMPLETE");
assert.equal(STAGE_PROGRESS.COMPLETE, 100);
assert.equal(STAGE_PROGRESS.MEASURE, 74);

assert.ok(computeRetryDelayMs(1) >= 15_000);
assert.ok(computeRetryDelayMs(4) <= 300_000);
assert.ok(scheduleRetryAt(2).getTime() > Date.now());

assert.equal(isRecoverableProcessingError(new Error("digitization failed")), true);
assert.equal(isRecoverableProcessingError(new Error("ECG file not found")), false);
assert.equal(processingErrorCode(new Error("validation score too low")), "QUALITY_VALIDATION_FAILED");

assert.equal(
  isRasterOrPdfEcg({
    id: "f1",
    caseId: "c1",
    checksum: null,
    createdAt: new Date(),
    deletedAt: null,
    mimeType: "image/png",
    originalName: "ecg.png",
    organizationId: null,
    patientId: null,
    recordUuid: null,
    sizeBytes: 1000,
    storageKey: null,
    storagePath: "/tmp/ecg.png",
    storageProvider: "local",
    storedName: "ecg.png",
    storedPath: null,
    uploadedById: "u1",
    version: 1,
    acquisitionDate: null,
    deviceModel: null,
    duration: null,
    fileName: null,
    fileType: "IMAGE",
    manufacturer: null,
    metadataJson: null,
    numberOfLeads: null,
    samplingRate: null,
  }),
  true,
);

console.log("Sprint 82 ECG Processing Engine unit tests: PASS");
