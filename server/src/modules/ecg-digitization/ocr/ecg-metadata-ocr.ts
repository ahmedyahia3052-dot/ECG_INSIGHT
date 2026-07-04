import type { EcgMetadataOcr } from "../types";

const FIELD_PATTERNS: Array<{ field: keyof EcgMetadataOcr; pattern: RegExp }> = [
  { field: "speed", pattern: /\b(25|50)\s*mm\s*\/?\s*s(ec)?\b/i },
  { field: "gain", pattern: /\b(5|10|20)\s*mm\s*\/?\s*m?v\b/i },
  { field: "patientName", pattern: /\bpatient[:\s]+([A-Za-z ,.'-]{2,60})/i },
  { field: "age", pattern: /\bage[:\s]+(\d{1,3})\b/i },
  { field: "gender", pattern: /\b(sex|gender)[:\s]+(M|F|Male|Female)\b/i },
  { field: "hospital", pattern: /\bhospital[:\s]+([A-Za-z0-9 ,.'-]{2,80})/i },
  { field: "ecgMachine", pattern: /\b(machine|device|model)[:\s]+([A-Za-z0-9 ,.'/-]{2,60})/i },
  { field: "date", pattern: /\b(\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/ },
  { field: "time", pattern: /\b(\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?)\b/i },
  { field: "filterSettings", pattern: /\bfilter[:\s]+([A-Za-z0-9 ,./-]{2,40})/i },
  { field: "technician", pattern: /\b(tech|technician)[:\s]+([A-Za-z ,.'-]{2,40})/i },
  { field: "doctor", pattern: /\b(doctor|physician|md)[:\s]+([A-Za-z ,.'-]{2,40})/i },
  { field: "serialNumber", pattern: /\b(serial|sn)[:\s#]+([A-Za-z0-9-]{3,40})/i },
  { field: "machineNotes", pattern: /\bnotes?[:\s]+([^\n]{3,120})/i },
];

function pickMatch(text: string, pattern: RegExp) {
  const match = text.match(pattern);
  if (!match) return undefined;
  return (match[2] ?? match[1] ?? match[0]).trim();
}

export function extractEcgMetadataOcr(input: {
  metadata?: Record<string, unknown>;
  originalName: string;
  ocrText?: string;
}): EcgMetadataOcr {
  const metadata = input.metadata ?? {};
  const corpus = [
    input.originalName,
    input.ocrText ?? "",
    JSON.stringify(metadata),
  ].join("\n");

  const result: EcgMetadataOcr = {};
  for (const { field, pattern } of FIELD_PATTERNS) {
    const value = pickMatch(corpus, pattern);
    if (value) result[field] = value;
  }

  if (typeof metadata["patientName"] === "string") result.patientName = metadata["patientName"];
  if (typeof metadata["hospital"] === "string") result.hospital = metadata["hospital"];
  if (typeof metadata["paperSpeedMmPerSec"] === "number") result.speed = `${metadata["paperSpeedMmPerSec"]} mm/s`;
  if (typeof metadata["gainMmPerMv"] === "number") result.gain = `${metadata["gainMmPerMv"]} mm/mV`;

  return result;
}
