import type { BundleBranchPattern } from "../types";

/** Bundle branch block pattern detection from QRS morphology heuristics. */
export function detectBundleBranchPatterns(input: {
  leadIMinMv: number;
  qrsDurationMs: number;
  v1MaxMv: number;
  v1MinMv: number;
  v6MaxMv: number;
}): BundleBranchPattern[] {
  if (input.qrsDurationMs < 120) return ["none"];
  const patterns: BundleBranchPattern[] = [];
  const rsRPrime = input.v1MaxMv > 0.4 && input.v1MinMv < -0.15;
  const wideS = Math.abs(input.leadIMinMv) > 0.25;
  const broadR = input.v6MaxMv > 0.5 && input.v1MaxMv > 0.4;
  if (rsRPrime && wideS) patterns.push("rbbb_pattern");
  else if (broadR && !rsRPrime) patterns.push("lbbb_pattern");
  else patterns.push("intraventricular_conduction_delay");
  return patterns;
}
