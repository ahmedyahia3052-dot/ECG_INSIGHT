import type { BeatFiducials } from "./fiducial-detector";
import { samplesToMs } from "./fiducial-detector";
import type { EcgMeasurementIntervals } from "./types";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function calculateIntervals(
  fiducials: BeatFiducials,
  samplingRate: number,
  rrIntervalMs: number,
): EcgMeasurementIntervals {
  const prIntervalMs = clamp(samplesToMs(fiducials.rPeak, samplingRate) - samplesToMs(fiducials.pOnset, samplingRate), 80, 320);
  const qrsDurationMs = clamp(samplesToMs(fiducials.qrsOffset, samplingRate) - samplesToMs(fiducials.qrsOnset, samplingRate), 60, 200);
  const qtIntervalMs = clamp(samplesToMs(fiducials.tOffset, samplingRate) - samplesToMs(fiducials.qrsOnset, samplingRate), 240, 600);
  const pWaveDurationMs = clamp(samplesToMs(fiducials.pPeak, samplingRate) - samplesToMs(fiducials.pOnset, samplingRate) + 40, 60, 140);
  const rrSeconds = rrIntervalMs / 1000;
  const qtcBazettMs = Math.round(qtIntervalMs / Math.sqrt(Math.max(rrSeconds, 0.2)));
  const qtcFridericiaMs = Math.round(qtIntervalMs / Math.cbrt(Math.max(rrSeconds, 0.2)));
  return {
    pWaveDurationMs,
    prIntervalMs,
    qrsDurationMs,
    qtIntervalMs,
    qtcBazettMs,
    qtcFridericiaMs,
    rrIntervalMs,
  };
}

export function averageRrIntervalMs(rPeaks: number[], samplingRate: number) {
  if (rPeaks.length < 2) return 800;
  const rrSamples = rPeaks.slice(1).map((peak, index) => peak - rPeaks[index]);
  const avgSamples = rrSamples.reduce((sum, value) => sum + value, 0) / rrSamples.length;
  return Math.round((avgSamples / samplingRate) * 1000);
}

export function heartRateFromRr(rrIntervalMs: number) {
  return Math.round(60000 / Math.max(rrIntervalMs, 200));
}
