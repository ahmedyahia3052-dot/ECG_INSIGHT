import {
  MIN_ACCEPTABLE_VALIDATION_SCORE,
  STANDARD_LEADS,
  type DigitalSignalObject,
  type GridCalibration,
  type LeadSegment,
  type SignalValidationMetrics,
} from "../types";

function estimateHeartRate(signal: DigitalSignalObject): number {
  const samples = signal.points.map((point) => point.voltageMv);
  if (samples.length < 120) return 0;
  let peaks = 0;
  for (let index = 2; index < samples.length - 2; index += 1) {
    const value = samples[index];
    if (value > 0.45 && value > samples[index - 1] && value >= samples[index + 1]) peaks += 1;
  }
  const duration = signal.durationSeconds || samples.length / signal.samplingRate;
  return duration > 0 ? Math.round(peaks / duration * 60) : 0;
}

export function validateDigitizedSignals(input: {
  calibration: GridCalibration;
  leadSegments: LeadSegment[];
  signalObjects: DigitalSignalObject[];
}): SignalValidationMetrics {
  const warnings: string[] = [];
  const detectedLeads = input.leadSegments.filter((segment) => segment.confidence >= 0.5);
  const leadDetectionPercent = Number(((detectedLeads.length / STANDARD_LEADS.length) * 100).toFixed(1));

  let brokenSignals = 0;
  let missingSamples = 0;
  let impossibleVoltage = false;
  let signalSaturation = false;
  let baselineDrift = 0;
  let noiseRatio = 0;
  let subPixelError = 0;
  let continuityTotal = 0;

  for (const signal of input.signalObjects) {
    const samples = signal.points.map((point) => point.voltageMv);
    if (samples.length === 0 || samples.every((sample) => sample === 0)) {
      brokenSignals += 1;
      warnings.push(`Lead ${signal.lead} has no usable waveform samples.`);
      continue;
    }
    const nonZero = samples.filter((sample) => Math.abs(sample) > 0.02).length;
    continuityTotal += nonZero / samples.length;
    if (nonZero / samples.length < 0.18) {
      brokenSignals += 1;
      warnings.push(`Lead ${signal.lead} signal continuity is below threshold.`);
    }
    const maxAbs = Math.max(...samples.map((sample) => Math.abs(sample)));
    if (maxAbs > 8) {
      impossibleVoltage = true;
      warnings.push(`Lead ${signal.lead} contains impossible voltage amplitude.`);
    }
    if (maxAbs > 0.98 && samples.filter((sample) => Math.abs(sample) > 0.95).length > samples.length * 0.08) {
      signalSaturation = true;
      warnings.push(`Lead ${signal.lead} appears saturated.`);
    }
    const firstQuarter = samples.slice(0, Math.floor(samples.length / 4));
    const lastQuarter = samples.slice(Math.floor(samples.length * 0.75));
    const drift = Math.abs(
      (firstQuarter.reduce((sum, sample) => sum + sample, 0) / Math.max(firstQuarter.length, 1))
      - (lastQuarter.reduce((sum, sample) => sum + sample, 0) / Math.max(lastQuarter.length, 1)),
    );
    baselineDrift = Math.max(baselineDrift, drift);
    let diffSum = 0;
    for (let index = 1; index < samples.length; index += 1) diffSum += Math.abs(samples[index] - samples[index - 1]);
    noiseRatio = Math.max(noiseRatio, diffSum / Math.max(samples.length, 1));
    subPixelError = Math.max(subPixelError, signal.confidence > 0 ? 1 - signal.confidence : 0.5);
    missingSamples += samples.filter((sample) => !Number.isFinite(sample)).length;
  }

  const leadII = input.signalObjects.find((signal) => signal.lead === "II");
  const heartRate = leadII ? estimateHeartRate(leadII) : 0;
  const impossibleHeartRate = heartRate > 0 && (heartRate < 20 || heartRate > 260);
  if (impossibleHeartRate) warnings.push(`Estimated heart rate ${heartRate} bpm is outside physiological range.`);

  const gridMisalignment = !input.calibration.gridDetected || (input.calibration.confidence ?? 0) < 0.5;
  if (gridMisalignment) warnings.push("Grid misalignment or low grid confidence detected.");

  const leadMixUp = detectedLeads.length >= 8 && brokenSignals >= 4;
  if (leadMixUp) warnings.push("Possible lead mix-up detected across multiple leads.");

  const signalContinuityPercent = Number(((continuityTotal / Math.max(input.signalObjects.length, 1)) * 100).toFixed(1));
  const gridAccuracy = Number((input.calibration.confidence * 100).toFixed(1));
  const calibrationAccuracy = Number(
    Math.min(
      100,
      ((input.calibration.speedConfidence ?? input.calibration.confidence) * 50)
      + ((input.calibration.gainConfidence ?? input.calibration.confidence) * 50),
    ).toFixed(1),
  );
  const digitizationAccuracy = Number(
    Math.min(
      100,
      leadDetectionPercent * 0.35 + signalContinuityPercent * 0.4 + gridAccuracy * 0.25,
    ).toFixed(1),
  );
  const pixelError = Number((subPixelError * 2.5).toFixed(3));

  let score = Math.round(
    digitizationAccuracy * 0.45
    + signalContinuityPercent * 0.25
    + gridAccuracy * 0.15
    + calibrationAccuracy * 0.15
    - brokenSignals * 4
    - (impossibleVoltage ? 8 : 0)
    - (impossibleHeartRate ? 8 : 0)
    - (gridMisalignment ? 6 : 0),
  );
  score = Math.max(0, Math.min(100, score));
  if (score < MIN_ACCEPTABLE_VALIDATION_SCORE) {
    warnings.push(`Validation score ${score} is below acceptable clinical threshold.`);
  }

  return {
    baselineDrift: Number(baselineDrift.toFixed(4)),
    brokenSignals,
    calibrationAccuracy,
    digitizationAccuracy,
    gridAccuracy,
    gridMisalignment,
    impossibleHeartRate,
    impossibleVoltage,
    leadDetectionPercent,
    leadMixUp,
    missingSamples,
    noiseRatio: Number(noiseRatio.toFixed(4)),
    pixelError,
    score,
    signalContinuityPercent,
    signalSaturation,
    subPixelError: Number(subPixelError.toFixed(4)),
    warnings: [...new Set(warnings)],
  };
}
