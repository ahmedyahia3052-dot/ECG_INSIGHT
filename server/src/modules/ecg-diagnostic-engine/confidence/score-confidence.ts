import type {
  ClinicalDiagnosis,
  ConfidenceSummary,
  DiagnosticCertainty,
  EnterpriseMeasurementBundle,
  MorphologyClass,
  RhythmResult,
  WaveDetectionResult,
} from "../types";

function certaintyRank(certainty: DiagnosticCertainty): number {
  return { definite: 4, probable: 3, possible: 2, uncertain: 1 }[certainty];
}

function maxCertainty(a: DiagnosticCertainty, b: DiagnosticCertainty): DiagnosticCertainty {
  return certaintyRank(a) >= certaintyRank(b) ? a : b;
}

export function scoreConfidence(
  measurements: EnterpriseMeasurementBundle,
  waveDetection: WaveDetectionResult,
  rhythm: RhythmResult,
  morphology: MorphologyClass[],
  clinicalFindings: ClinicalDiagnosis[],
): ConfidenceSummary {
  const beat = waveDetection.beats[0];
  const measurementConfidence = beat
    ? Number(((beat.peakConfidence + beat.waveConfidence) / 2).toFixed(3))
    : 0.45;
  const rhythmConfidence = rhythm.confidence;
  const morphologyConfidence = morphology.length
    ? Number(Math.min(0.95, 0.55 + morphology.length * 0.04).toFixed(3))
    : 0.5;
  const rulesConfidence = clinicalFindings.length
    ? Number((clinicalFindings.reduce((sum, item) => sum + item.confidence, 0) / clinicalFindings.length).toFixed(3))
    : 0.55;

  const noisePenalty = beat ? beat.noiseScore * 0.15 : 0.1;
  const motionPenalty = beat?.motionArtifactRejected ? 0.12 : 0;
  const overall = Number(Math.min(
    0.98,
    Math.max(
      0.35,
      measurementConfidence * 0.35
        + rhythmConfidence * 0.25
        + morphologyConfidence * 0.15
        + rulesConfidence * 0.25
        - noisePenalty
        - motionPenalty,
    ),
  ).toFixed(3));

  const diagnosticCertainty = clinicalFindings.reduce<DiagnosticCertainty>(
    (current, item) => maxCertainty(current, item.certainty),
    "uncertain",
  );

  const reasons: string[] = [];
  if (measurementConfidence >= 0.7) reasons.push("High fiducial detection confidence on primary lead.");
  if (rhythmConfidence >= 0.75) reasons.push("Rhythm classification supported by stable RR intervals.");
  if (beat?.motionArtifactRejected) reasons.push("Motion artifact detected; confidence reduced.");
  if (beat && beat.noiseScore > 0.35) reasons.push("Elevated noise score on filtered signal.");
  if (clinicalFindings.some((item) => item.code === "STEMI" || item.code === "VT")) {
    reasons.push("Critical finding detected — physician verification required.");
  }
  if (!reasons.length) reasons.push("Automated analysis completed with standard confidence weighting.");

  return {
    diagnosticCertainty,
    measurementConfidence,
    morphologyConfidence,
    overall,
    reasons,
    rhythmConfidence,
    rulesConfidence,
  };
}
