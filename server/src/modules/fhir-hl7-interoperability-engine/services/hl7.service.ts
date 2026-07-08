import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { AppError } from "../../../middleware/error";
import { buildAckMessage, buildOrmMessage, buildOruMessage, parseHl7Message, segmentsToJson, validateHl7Message } from "../hl7/engine";
import { INTEROPERABILITY_ENGINE_VERSION } from "../types";
import { logInteropAudit, logInteropEvent } from "./audit.service";
import { resolveInteropCase } from "./fhir.service";

export async function exportCaseToHl7(input: { actorId: string; caseRef: string; externalSystemId?: string; messageType?: "ORU" | "ORM" }) {
  const ecgCase = await resolveInteropCase(input.caseRef);
  const analysis = ecgCase.analyses[0];
  const measurement = ecgCase.measurements[0];
  const context = {
    acquisitionDate: ecgCase.acquisitionDate,
    caseId: ecgCase.caseId,
    diagnosis: analysis?.diagnosis ?? ecgCase.finalDiagnosis ?? ecgCase.aiDiagnosis ?? undefined,
    heartRate: measurement?.heartRate ?? ecgCase.heartRate,
    patientMrn: ecgCase.patient.medicalRecordNumber,
    patientName: ecgCase.patient.fullName ?? `${ecgCase.patient.firstName} ${ecgCase.patient.lastName}`,
    prInterval: measurement?.prInterval ?? ecgCase.prInterval,
    qrsDuration: measurement?.qrsDuration ?? ecgCase.qrsDuration,
    qtInterval: measurement?.qtInterval ?? ecgCase.qtInterval,
    qtcInterval: measurement?.qtcInterval ?? ecgCase.qtcInterval,
    rhythm: analysis?.rhythm ?? ecgCase.rhythm ?? undefined,
  };

  const rawMessage = input.messageType === "ORM" ? buildOrmMessage(context) : buildOruMessage(context);
  const validation = validateHl7Message(rawMessage);
  const status = validation.valid ? "COMPLETED" : "VALIDATION_FAILED";
  const ackMessage = buildAckMessage(rawMessage, validation.valid ? "AA" : "AE");

  const message = await prisma.hL7Message.create({
    data: {
      ackMessage,
      caseId: ecgCase.id,
      createdById: input.actorId,
      direction: "EXPORT",
      externalSystemId: input.externalSystemId,
      messageType: input.messageType ?? "ORU",
      parsedSegments: segmentsToJson(validation.segments) as Prisma.InputJsonValue,
      patientId: ecgCase.patientId,
      rawMessage,
      status,
      validationErrors: validation.issues.length ? (validation.issues as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  await logInteropEvent({
    action: validation.valid ? "HL7_INTEROP_EXPORT" : "INTEROPERABILITY_VALIDATION_FAILED",
    actorId: input.actorId,
    caseId: ecgCase.id,
    externalSystemId: input.externalSystemId,
    message: validation.valid ? `HL7 ${input.messageType ?? "ORU"} export completed.` : "HL7 export validation failed.",
    metadata: { engineVersion: INTEROPERABILITY_ENGINE_VERSION, messageId: message.id },
    operation: "HL7_EXPORT",
    patientId: ecgCase.patientId,
    validationFailed: !validation.valid,
  });

  await logInteropAudit({
    action: "HL7_EXPORT",
    actorId: input.actorId,
    caseId: ecgCase.id,
    externalSystemId: input.externalSystemId,
    message: validation.valid ? "HL7 message exported." : "HL7 export blocked by validation.",
    metadata: { messageId: message.id, messageType: input.messageType ?? "ORU" },
    patientId: ecgCase.patientId,
    resourceType: "HL7Message",
    success: validation.valid,
  });

  if (!validation.valid) {
    throw new AppError(422, "HL7 export validation failed.", "HL7_VALIDATION_FAILED");
  }

  return { ackMessage, hl7Message: rawMessage, messageId: message.id, status, validation };
}

export async function importHl7Payload(input: { actorId: string; rawMessage: string; externalSystemId?: string }) {
  const validation = validateHl7Message(input.rawMessage);
  const parsed = parseHl7Message(input.rawMessage);
  const messageType = (parsed.messageType ?? "ORU") as "ORM" | "ORU" | "ADT" | "MDM" | "ACK";
  const status = validation.valid ? "COMPLETED" : "VALIDATION_FAILED";
  const ackMessage = buildAckMessage(input.rawMessage, validation.valid ? "AA" : "AE");

  let patientId: string | undefined;
  const pid = parsed.segments.find((segment) => segment.name === "PID");
  const mrn = pid?.fields[2];
  if (mrn) {
    const patient = await prisma.patient.findUnique({ where: { medicalRecordNumber: mrn } });
    patientId = patient?.id;
  }

  const message = await prisma.hL7Message.create({
    data: {
      ackMessage,
      createdById: input.actorId,
      direction: "IMPORT",
      externalSystemId: input.externalSystemId,
      messageType,
      parsedSegments: segmentsToJson(parsed.segments) as Prisma.InputJsonValue,
      patientId,
      rawMessage: input.rawMessage,
      status,
      validationErrors: validation.issues.length ? (validation.issues as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  await logInteropEvent({
    action: validation.valid ? "HL7_INTEROP_IMPORT" : "INTEROPERABILITY_VALIDATION_FAILED",
    actorId: input.actorId,
    externalSystemId: input.externalSystemId,
    message: validation.valid ? `HL7 ${messageType} import completed.` : "HL7 import validation failed.",
    metadata: { engineVersion: INTEROPERABILITY_ENGINE_VERSION, messageId: message.id },
    operation: "HL7_IMPORT",
    patientId,
    validationFailed: !validation.valid,
  });

  await logInteropAudit({
    action: "HL7_IMPORT",
    actorId: input.actorId,
    externalSystemId: input.externalSystemId,
    message: validation.valid ? "HL7 message imported." : "HL7 import blocked by validation.",
    metadata: { messageId: message.id, messageType },
    patientId,
    resourceType: "HL7Message",
    success: validation.valid,
  });

  if (!validation.valid) {
    throw new AppError(422, "HL7 import validation failed.", "HL7_VALIDATION_FAILED");
  }

  return { ackMessage, imported: { messageId: message.id, messageType, patientId: patientId ?? null }, messageId: message.id, status, validation };
}
