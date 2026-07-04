import type { DigitizationStageError } from "./types";

export class DigitizationError extends Error {
  readonly code: string;
  readonly recoverySuggestion: string;
  readonly stage: DigitizationStageError["stage"];

  constructor(input: DigitizationStageError) {
    super(input.message);
    this.name = "DigitizationError";
    this.code = input.code;
    this.stage = input.stage;
    this.recoverySuggestion = input.recoverySuggestion;
  }

  toJSON(): DigitizationStageError {
    return {
      code: this.code,
      message: this.message,
      recoverySuggestion: this.recoverySuggestion,
      stage: this.stage,
    };
  }
}

export function lowImageQualityError(score: number): DigitizationError {
  return new DigitizationError({
    code: "LOW_IMAGE_QUALITY",
    message: `Image quality score ${score} is below acceptable threshold.`,
    recoverySuggestion: "Re-scan or re-photograph the ECG with better lighting, focus, and full paper visibility before digitization.",
    stage: "normalization",
  });
}

export function validationFailedError(score: number, warnings: string[]): DigitizationError {
  return new DigitizationError({
    code: "VALIDATION_FAILED",
    message: `Signal validation score ${score} failed clinical threshold. ${warnings.slice(0, 2).join(" ")}`,
    recoverySuggestion: "Review the source image for grid alignment, lead completeness, and artifact noise; adjust calibration if needed.",
    stage: "validation",
  });
}
