import type { EcgLeadId } from "../types";

const ALL_LEADS: EcgLeadId[] = ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"];

const CODE_LEADS: Record<string, EcgLeadId[]> = {
  AF: ["II", "V1"],
  AFL: ["II", "III", "aVF"],
  ASYSTOLE: ALL_LEADS,
  AVB1: ["II"],
  AVB2I: ["II"],
  AVB2II: ["II"],
  AVB3: ["II"],
  BIFASC: ["I", "aVL", "V1"],
  DRUG_EFFECT: ALL_LEADS,
  EARLY_REPOL: ["V2", "V3", "V4"],
  ELECTROLYTE: ["V2", "V3", "V4"],
  HYPERK: ["V2", "V3", "V4"],
  HYPOCAL: ["V2", "V3"],
  HYPOK: ["V2", "V3", "V4"],
  HYPERTROPHY: ["V5", "V6"],
  LAE: ["II", "V1"],
  LBBB: ["V1", "V6"],
  LONG_QT: ["II", "V5"],
  LVH: ["V5", "V6", "aVL"],
  NSTEMI: ["V4", "V5", "V6"],
  NSR: ["II"],
  PAC: ["II"],
  PACEMAKER: ["II", "V5"],
  PE: ["I", "III", "aVF"],
  PERICARDITIS: ["II", "V4", "V5", "V6"],
  PEA: ["II"],
  PVC: ["II"],
  RAE: ["II", "V1"],
  RBBB: ["V1", "V6"],
  RVH: ["V1", "V5", "V6"],
  SBRAD: ["II"],
  SHORT_QT: ["II"],
  STACH: ["II"],
  STEMI: ["II", "III", "aVF"],
  SVT: ["II"],
  TRIFASC: ["I", "aVL", "V1"],
  VF: ALL_LEADS,
  VT: ["V1", "V6"],
  WPW: ["II", "V2"],
};

const TERRITORY_LEADS: Record<string, EcgLeadId[]> = {
  anterior: ["V1", "V2", "V3", "V4"],
  apical: ["V3", "V4"],
  diffuse: ALL_LEADS,
  inferior: ["II", "III", "aVF"],
  lateral: ["I", "aVL", "V5", "V6"],
  posterior: ["V7" as EcgLeadId, "V1", "V2"].filter((l) => l !== "V7") as EcgLeadId[],
  septal: ["V1", "V2"],
};

const LABEL_LEADS: Array<{ leads: EcgLeadId[]; pattern: RegExp }> = [
  { leads: ["II", "III", "aVF"], pattern: /inferior|ii|iii|avf/i },
  { leads: ["V1", "V2", "V3", "V4"], pattern: /anterior|v1|v2|v3|v4|septal/i },
  { leads: ["I", "aVL", "V5", "V6"], pattern: /lateral|v5|v6|avl/i },
  { leads: ["V1", "V2"], pattern: /posterior|v1|v2/i },
  { leads: ["V3", "V4"], pattern: /apical|v3|v4/i },
  { leads: ["V5", "V6", "aVL"], pattern: /lvh|hypertrophy|v5|v6/i },
  { leads: ["V1"], pattern: /rbbb|v1/i },
  { leads: ["V6"], pattern: /lbbb|v6/i },
];

export function leadsForDiagnosis(code: string, label?: string): EcgLeadId[] {
  const normalized = code.toUpperCase();
  if (CODE_LEADS[normalized]) return CODE_LEADS[normalized]!;

  const text = `${code} ${label ?? ""}`.toLowerCase();
  for (const [territory, leads] of Object.entries(TERRITORY_LEADS)) {
    if (text.includes(territory)) return leads;
  }
  for (const entry of LABEL_LEADS) {
    if (entry.pattern.test(text)) return entry.leads;
  }
  return ["II"];
}

export function classifyAxis(degrees: number | null | undefined) {
  if (degrees == null || Number.isNaN(degrees)) {
    return { classification: "Unknown" as const, explanation: "Axis could not be determined from available measurements." };
  }
  if (degrees < -90 || degrees > 180) {
    return { classification: "Extreme Axis" as const, explanation: `Extreme axis deviation at ${degrees}°.` };
  }
  if (degrees < -30) {
    return { classification: "Left Axis Deviation" as const, explanation: `Left axis deviation at ${degrees}° (normal −30° to +90°).` };
  }
  if (degrees > 90) {
    return { classification: "Right Axis Deviation" as const, explanation: `Right axis deviation at ${degrees}° (normal −30° to +90°).` };
  }
  return { classification: "Normal" as const, explanation: `Normal QRS axis at ${degrees}°.` };
}

export function intervalStatus(name: string, value: number | null): { flag?: string; normalRange: string; status: import("./types").IntervalStatus } {
  if (value == null || Number.isNaN(value)) {
    return { normalRange: "—", status: "unknown" };
  }
  switch (name) {
    case "PR":
      if (value < 120) return { flag: "Short PR", normalRange: "120–200 ms", status: "abnormal" };
      if (value > 200) return { flag: "Prolonged PR", normalRange: "120–200 ms", status: "abnormal" };
      return { normalRange: "120–200 ms", status: "normal" };
    case "QRS":
      if (value >= 120) return { flag: "Wide QRS", normalRange: "80–120 ms", status: "abnormal" };
      if (value < 80) return { flag: "Narrow QRS", normalRange: "80–120 ms", status: "borderline" };
      return { normalRange: "80–120 ms", status: "normal" };
    case "QT":
      if (value > 440) return { flag: "Prolonged QT", normalRange: "< 440 ms", status: "abnormal" };
      return { normalRange: "< 440 ms", status: "normal" };
    case "QTc":
      if (value > 440) return { flag: "Prolonged QTc", normalRange: "< 440 ms", status: "abnormal" };
      if (value > 420) return { flag: "Borderline QTc", normalRange: "< 440 ms", status: "borderline" };
      return { normalRange: "< 440 ms", status: "normal" };
    case "RR":
      if (value < 600) return { flag: "Short RR", normalRange: "600–1000 ms", status: "abnormal" };
      if (value > 1000) return { flag: "Prolonged RR", normalRange: "600–1000 ms", status: "abnormal" };
      return { normalRange: "600–1000 ms", status: "normal" };
    case "PP":
      return { normalRange: "600–1000 ms", status: value >= 600 && value <= 1000 ? "normal" : "borderline" };
    default:
      return { normalRange: "—", status: "unknown" };
  }
}
