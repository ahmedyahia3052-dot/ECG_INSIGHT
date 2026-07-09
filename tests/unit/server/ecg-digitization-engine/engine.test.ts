import { describe, expect, it } from "vitest";
import {
  DIGITIZATION_STAGE_ORDER,
  DIGITIZATION_STAGE_PROGRESS,
  ECG_DIGITIZATION_ENGINE_VERSION,
} from "../../../../server/src/modules/ecg-digitization-engine/types";
import {
  computeDigitizationRetryDelayMs,
  digitizationErrorCode,
  isRecoverableDigitizationError,
} from "../../../../server/src/modules/ecg-digitization-engine/recovery";
import { isRasterOrPdfEcg } from "../../../../server/src/modules/ecg-digitization-engine/stages";

describe("ecg digitization engine", () => {
  it("defines sprint 94 engine version and stages", () => {
    expect(ECG_DIGITIZATION_ENGINE_VERSION).toBe("sprint94-ecg-digitization-v1");
    expect(DIGITIZATION_STAGE_ORDER[0]).toBe("UPLOAD_INGEST");
    expect(DIGITIZATION_STAGE_ORDER).toContain("GRID_DETECT");
    expect(DIGITIZATION_STAGE_ORDER).toContain("TWELVE_LEAD_DETECT");
    expect(DIGITIZATION_STAGE_ORDER).toContain("WAVEFORM_EXTRACT");
    expect(DIGITIZATION_STAGE_ORDER.at(-1)).toBe("COMPLETE");
    expect(DIGITIZATION_STAGE_PROGRESS.COMPLETE).toBe(100);
  });

  it("computes retry delays and error codes", () => {
    expect(computeDigitizationRetryDelayMs(1)).toBeGreaterThanOrEqual(15_000);
    expect(isRecoverableDigitizationError(new Error("waveform extraction failed"))).toBe(true);
    expect(isRecoverableDigitizationError(new Error("ECG file not found"))).toBe(false);
    expect(digitizationErrorCode(new Error("grid detection failed"))).toBe("IMAGE_PREPROCESS_FAILED");
    expect(digitizationErrorCode(new Error("twelve lead missing"))).toBe("LEAD_SEGMENTATION_FAILED");
  });

  it("accepts raster and pdf ecg files", () => {
    expect(
      isRasterOrPdfEcg({
        mimeType: "image/png",
        originalName: "ecg.png",
      }),
    ).toBe(true);
  });
});
