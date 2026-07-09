import assert from "node:assert/strict";
import {
  DIGITIZATION_STAGE_ORDER,
  ECG_DIGITIZATION_ENGINE_VERSION,
} from "../server/src/modules/ecg-digitization-engine/types";
import {
  computeDigitizationRetryDelayMs,
  digitizationErrorCode,
} from "../server/src/modules/ecg-digitization-engine/recovery";
import { isRasterOrPdfEcg } from "../server/src/modules/ecg-digitization-engine/stages";

assert.equal(ECG_DIGITIZATION_ENGINE_VERSION, "sprint94-ecg-digitization-v1");
assert.equal(DIGITIZATION_STAGE_ORDER.length, 18);
assert.equal(DIGITIZATION_STAGE_ORDER.includes("SHADOW_REMOVE"), true);
assert.equal(DIGITIZATION_STAGE_ORDER.includes("TWELVE_LEAD_DETECT"), true);
assert.ok(computeDigitizationRetryDelayMs(2) >= 15_000);
assert.equal(digitizationErrorCode(new Error("validation score too low")), "QUALITY_VALIDATION_FAILED");
assert.equal(isRasterOrPdfEcg({ mimeType: "application/pdf", originalName: "scan.pdf" }), true);

console.log("Sprint 94 ECG Digitization Engine unit tests: PASS");
