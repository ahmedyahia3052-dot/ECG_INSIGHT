import {
  DEFAULT_SAMPLING_RATE,
  STANDARD_LEADS,
  type DigitizedLead,
  type DigitalSignalObject,
  type GridCalibration,
  type LeadSegment,
  type WaveformExtractionMetrics,
} from "../types";

export function buildDigitalSignalObjects(input: {
  calibration: GridCalibration;
  durationSeconds: number;
  ecgFileId?: string;
  leadSegments: LeadSegment[];
  leads: Array<{ lead: string; metrics?: WaveformExtractionMetrics; samples: number[] }>;
  patientId?: string;
}): DigitalSignalObject[] {
  return STANDARD_LEADS.map((leadName) => {
    const lead = input.leads.find((item) => item.lead === leadName);
    const segment = input.leadSegments.find((item) => item.lead === leadName);
    const samples = lead?.samples ?? [];
    const samplingRate = DEFAULT_SAMPLING_RATE;
    const points = samples.map((sample, sampleIndex) => ({
      sampleIndex,
      timeMs: Number(((sampleIndex / samplingRate) * 1000).toFixed(3)),
      voltageMv: Number(sample.toFixed(5)),
    }));

    return {
      calibration: {
        gainMmPerMv: input.calibration.gainMmPerMv,
        paperSpeedMmPerSec: input.calibration.paperSpeedMmPerSec,
      },
      confidence: Number((lead?.metrics?.waveConfidence ?? segment?.confidence ?? 0.45).toFixed(3)),
      durationSeconds: input.durationSeconds,
      lead: leadName,
      metadata: {
        ecgFileId: input.ecgFileId,
        leadSegment: segment,
        patientId: input.patientId,
      },
      points,
      samplingRate,
    };
  });
}

export function digitalSignalObjectsToLeads(signalObjects: DigitalSignalObject[]): DigitizedLead[] {
  return signalObjects.map((signal) => ({
    durationSeconds: signal.durationSeconds,
    lead: signal.lead,
    samples: signal.points.map((point) => point.voltageMv),
    samplingRate: signal.samplingRate,
  }));
}
