import type { FhirValidationIssue, Hl7ParseResult, Hl7Segment } from "../types";

const SUPPORTED_HL7_TYPES = new Set(["ORM", "ORU", "ADT", "MDM", "ACK"]);
const REQUIRED_SEGMENTS: Record<string, string[]> = {
  ORM: ["MSH", "PID", "ORC", "OBR"],
  ORU: ["MSH", "PID", "OBR", "OBX"],
  ADT: ["MSH", "PID", "PV1"],
  MDM: ["MSH", "PID", "TXA"],
  ACK: ["MSH", "MSA"],
};

function splitSegments(rawMessage: string): Hl7Segment[] {
  const normalized = rawMessage.replace(/\r\n/g, "\r").replace(/\n/g, "\r").trim();
  return normalized
    .split("\r")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      return { name: parts[0] ?? "", fields: parts.slice(1) };
    });
}

export function parseHl7Message(rawMessage: string): Hl7ParseResult {
  const issues: FhirValidationIssue[] = [];
  const segments = splitSegments(rawMessage);

  if (segments.length === 0) {
    return { valid: false, messageType: null, segments: [], issues: [{ path: "message", message: "Empty HL7 message.", severity: "error" }] };
  }

  const msh = segments.find((segment) => segment.name === "MSH");
  if (!msh) {
    issues.push({ path: "MSH", message: "Missing MSH segment.", severity: "error" });
    return { valid: false, messageType: null, segments, issues };
  }

  const messageType = msh.fields[7]?.split("^")[0] ?? null;
  if (!messageType || !SUPPORTED_HL7_TYPES.has(messageType)) {
    issues.push({ path: "MSH.9", message: `Unsupported HL7 message type: ${messageType ?? "unknown"}.`, severity: "error" });
  }

  if (messageType && REQUIRED_SEGMENTS[messageType]) {
    for (const required of REQUIRED_SEGMENTS[messageType]) {
      if (!segments.some((segment) => segment.name === required)) {
        issues.push({ path: required, message: `Missing required segment ${required} for ${messageType}.`, severity: "error" });
      }
    }
  }

  if (messageType === "ORU" || messageType === "ORM") {
    const obxSegments = segments.filter((segment) => segment.name === "OBX");
    if (messageType === "ORU" && obxSegments.length === 0) {
      issues.push({ path: "OBX", message: "ORU message requires at least one OBX segment.", severity: "error" });
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== "error"),
    messageType,
    segments,
    issues,
  };
}

export function validateHl7Message(rawMessage: string): Hl7ParseResult {
  return parseHl7Message(rawMessage);
}

export function buildAckMessage(originalMessage: string, ackCode: "AA" | "AE" | "AR" = "AA"): string {
  const parsed = parseHl7Message(originalMessage);
  const msh = parsed.segments.find((segment) => segment.name === "MSH");
  const controlId = msh?.fields[8] ?? "1";
  const sendingApp = msh?.fields[1] ?? "ECGINSIGHT";
  const sendingFacility = msh?.fields[2] ?? "ECG";
  const receivingApp = msh?.fields[4] ?? "HIS";
  const receivingFacility = msh?.fields[5] ?? "HOSPITAL";
  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  return [
    `MSH|^~\\&|${receivingApp}|${receivingFacility}|${sendingApp}|${sendingFacility}|${timestamp}||ACK|${controlId}|P|2.5`,
    `MSA|${ackCode}|${controlId}|Interoperability engine acknowledgement`,
  ].join("\r");
}

function hl7Escape(value: string) {
  return value.replace(/\|/g, "\\F\\").replace(/\^/g, "\\S\\").replace(/~/g, "\\R\\");
}

type Hl7CaseContext = {
  caseId: string;
  patientMrn: string;
  patientName: string;
  acquisitionDate: Date;
  heartRate?: number | null;
  prInterval?: number | null;
  qrsDuration?: number | null;
  qtInterval?: number | null;
  qtcInterval?: number | null;
  rhythm?: string | null;
  diagnosis?: string | null;
};

export function buildOruMessage(context: Hl7CaseContext): string {
  const timestamp = context.acquisitionDate.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const controlId = `${context.caseId}-${Date.now()}`;
  const segments = [
    `MSH|^~\\&|ECGINSIGHT|ECG|HIS|HOSPITAL|${timestamp}||ORU^R01|${controlId}|P|2.5`,
    `PID|1||${hl7Escape(context.patientMrn)}||${hl7Escape(context.patientName)}`,
    `OBR|1|${hl7Escape(context.caseId)}||11524-6^EKG study^LN|||${timestamp}`,
  ];

  const observations = [
    { id: "1", code: "8867-4^Heart rate^LN", value: context.heartRate, unit: "bpm" },
    { id: "2", code: "8625-6^PR interval^LN", value: context.prInterval, unit: "ms" },
    { id: "3", code: "8633-0^QRS duration^LN", value: context.qrsDuration, unit: "ms" },
    { id: "4", code: "8634-8^QT interval^LN", value: context.qtInterval, unit: "ms" },
    { id: "5", code: "8636-3^QTc interval^LN", value: context.qtcInterval, unit: "ms" },
  ].filter((observation) => observation.value != null);

  for (const observation of observations) {
    segments.push(`OBX|${observation.id}|NM|${observation.code}||${observation.value}|${observation.unit}|||F`);
  }

  if (context.rhythm) {
    segments.push(`OBX|6|ST|8625-6^Rhythm^LN||${hl7Escape(context.rhythm)}|||F`);
  }
  if (context.diagnosis) {
    segments.push(`OBX|7|ST|11524-6^ECG impression^LN||${hl7Escape(context.diagnosis)}|||F`);
  }

  return segments.join("\r");
}

export function buildOrmMessage(context: Hl7CaseContext): string {
  const timestamp = context.acquisitionDate.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const controlId = `${context.caseId}-orm-${Date.now()}`;
  return [
    `MSH|^~\\&|ECGINSIGHT|ECG|HIS|HOSPITAL|${timestamp}||ORM^O01|${controlId}|P|2.5`,
    `PID|1||${hl7Escape(context.patientMrn)}||${hl7Escape(context.patientName)}`,
    `ORC|NW|${hl7Escape(context.caseId)}`,
    `OBR|1|${hl7Escape(context.caseId)}||11524-6^EKG study^LN|||${timestamp}`,
  ].join("\r");
}

export function segmentsToJson(segments: Hl7Segment[]) {
  return segments.map((segment) => ({ name: segment.name, fields: segment.fields }));
}
