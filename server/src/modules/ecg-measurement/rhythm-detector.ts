import type { RhythmClassification } from "./types";

function coefficientOfVariation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export function classifyRhythm(heartRate: number, rrIntervalsMs: number[]): RhythmClassification {
  const irregular = coefficientOfVariation(rrIntervalsMs) > 0.12;
  if (irregular) return "irregular";
  if (heartRate > 100) return "sinus_tachycardia";
  if (heartRate < 60) return "sinus_bradycardia";
  return "sinus_rhythm";
}

export function rhythmRegularityScore(rrIntervalsMs: number[]) {
  if (rrIntervalsMs.length < 2) return 0.5;
  return Number(Math.max(0, 1 - coefficientOfVariation(rrIntervalsMs)).toFixed(3));
}
