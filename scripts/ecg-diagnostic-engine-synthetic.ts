import type { DigitizedLead, GridCalibration } from "../server/src/modules/ecg-digitization/types";

export function generateSyntheticBeatSamples(options: {
  durationSeconds?: number;
  samplingRate?: number;
  bpm?: number;
  prMs?: number;
  qrsMs?: number;
  qtMs?: number;
  noise?: number;
} = {}): number[] {
  const durationSeconds = options.durationSeconds ?? 6;
  const samplingRate = options.samplingRate ?? 500;
  const bpm = options.bpm ?? 75;
  const noise = options.noise ?? 0;
  const beatSamples = Math.max(Math.floor((60 / bpm) * samplingRate), samplingRate);
  const total = durationSeconds * samplingRate;
  const samples: number[] = [];

  for (let index = 0; index < total; index += 1) {
    const phase = (index % beatSamples) / beatSamples;
    let value = 0;
    if (phase < 0.12) value = 0.1 * Math.sin((phase / 0.12) * Math.PI);
    else if (phase < 0.18) value = -0.04;
    else if (phase < 0.24) value = 1.05;
    else if (phase < 0.3) value = -0.35;
    else if (phase < 0.55) value = 0.28 * Math.sin(((phase - 0.3) / 0.25) * Math.PI);
    if (noise > 0) value += (Math.random() - 0.5) * noise;
    samples.push(Number(value.toFixed(5)));
  }

  void options.prMs;
  void options.qrsMs;
  void options.qtMs;
  return samples;
}

export function buildSyntheticTwelveLeadEcg(options?: Parameters<typeof generateSyntheticBeatSamples>[0]): {
  calibration: GridCalibration;
  leads: DigitizedLead[];
} {
  const samplingRate = options?.samplingRate ?? 500;
  const durationSeconds = options?.durationSeconds ?? 6;
  const leadNames = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];
  const calibration: GridCalibration = {
    confidence: 0.92,
    gainMmPerMv: 10,
    gridDetected: true,
    paperSpeedMmPerSec: 25,
  };
  const leads = leadNames.map((lead, index) => ({
    durationSeconds,
    lead,
    samples: generateSyntheticBeatSamples({ ...options, samplingRate }).map((value) => value * (0.85 + index * 0.01)),
    samplingRate,
  }));
  return { calibration, leads };
}
