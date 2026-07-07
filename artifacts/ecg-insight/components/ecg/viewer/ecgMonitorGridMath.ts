import type { EcgGridGain, EcgPaperSpeed } from "./types";

/** Standard ECG paper: 1 small box = 1 mm at default calibration */
export const MM_PER_SMALL_BOX = 1;
export const SMALL_BOXES_PER_LARGE = 5;

/** Horizontal: mm/s → small boxes per second */
export function smallBoxesPerSecond(paperSpeed: EcgPaperSpeed): number {
  return paperSpeed * SMALL_BOXES_PER_LARGE;
}

/** Vertical: mm/mV → small boxes per mV */
export function smallBoxesPerMv(gain: EcgGridGain): number {
  return gain;
}

/**
 * Compute pixel size of one small ECG grid box for clinical scaling.
 * Targets ~920px width showing ~10s at 25 mm/s (250 mm horizontal span).
 */
export function pixelsPerSmallBox(
  canvasWidth: number,
  paperSpeed: EcgPaperSpeed,
  secondsVisible = 10,
): number {
  const totalSmallBoxes = paperSpeed * secondsVisible;
  return Math.max(6, canvasWidth / totalSmallBoxes);
}

export function playbackRateForPaperSpeed(paperSpeed: EcgPaperSpeed): number {
  return paperSpeed / 25;
}
