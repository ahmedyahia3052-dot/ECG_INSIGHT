import type { DigitalSignalObject, DigitizedLead } from "../types";

export function exportDigitizedSignalsJson(payload: {
  calibration: unknown;
  leads: DigitizedLead[];
  validation?: unknown;
}) {
  return JSON.stringify(payload, null, 2);
}

export function exportDigitizedSignalsCsv(payload: { leads: DigitizedLead[] }) {
  const rows = ["lead,sample_index,time_ms,voltage_mv"];
  for (const lead of payload.leads) {
    lead.samples.forEach((sample, index) => {
      const timeMs = ((index / lead.samplingRate) * 1000).toFixed(3);
      rows.push(`${lead.lead},${index},${timeMs},${sample}`);
    });
  }
  return rows.join("\n");
}

export function exportDigitizedSignalsBinary(signalObjects: DigitalSignalObject[]) {
  const header = Buffer.alloc(8);
  header.writeUInt32LE(signalObjects.length, 0);
  header.writeUInt32LE(signalObjects[0]?.samplingRate ?? 500, 4);
  const chunks = [header];
  for (const signal of signalObjects) {
    const leadHeader = Buffer.alloc(4 + 32);
    leadHeader.writeUInt32LE(signal.points.length, 0);
    leadHeader.write(signal.lead.padEnd(32, "\0"), 4, 32, "ascii");
    const body = Buffer.alloc(signal.points.length * 12);
    signal.points.forEach((point, index) => {
      const offset = index * 12;
      body.writeUInt32LE(point.sampleIndex, offset);
      body.writeFloatLE(point.timeMs, offset + 4);
      body.writeFloatLE(point.voltageMv, offset + 8);
    });
    chunks.push(leadHeader, body);
  }
  return Buffer.concat(chunks);
}
