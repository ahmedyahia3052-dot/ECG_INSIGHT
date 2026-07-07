import type { DigitizationQuality } from "./types";

export type QualityTier = "Excellent" | "Fair" | "Good" | "Poor";

export function qualityTierFromScore(score: number): QualityTier {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Poor";
}

export function enrichQualityWithTier(quality: DigitizationQuality): DigitizationQuality {
  const tier = qualityTierFromScore(quality.score);
  const reasons = [...quality.warnings];
  if (tier === "Excellent") reasons.unshift("Acquisition quality supports clinical-grade digitization.");
  else if (tier === "Good") reasons.unshift("Acquisition quality is acceptable for digitization with review.");
  else if (tier === "Fair") reasons.unshift("Acquisition quality is marginal — verify waveforms against source image.");
  else reasons.unshift("Acquisition quality is poor — re-scan or re-capture recommended.");

  return { ...quality, reasons, tier };
}
