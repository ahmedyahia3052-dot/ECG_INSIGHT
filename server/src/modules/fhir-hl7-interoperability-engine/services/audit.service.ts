import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";

export async function logInteropEvent(input: {
  action: AuditAction;
  actorId: string;
  operation: string;
  message: string;
  caseId?: string;
  patientId?: string;
  externalSystemId?: string;
  validationFailed?: boolean;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.interoperabilityLog.create({
    data: {
      actorId: input.actorId,
      caseId: input.caseId,
      externalSystemId: input.externalSystemId,
      level: input.validationFailed ? "ERROR" : "AUDIT",
      message: input.message,
      metadata: input.metadata,
      operation: input.operation,
      patientId: input.patientId,
      validationFailed: input.validationFailed ?? false,
    },
  }).catch(() => undefined);

  await prisma.auditLog.create({
    data: {
      action: input.action,
      actor: { connect: { id: input.actorId } },
      case: input.caseId ? { connect: { id: input.caseId } } : undefined,
      patient: input.patientId ? { connect: { id: input.patientId } } : undefined,
      message: input.message,
      metadata: input.metadata,
      entityType: "InteroperabilityEngine",
    },
  }).catch(() => undefined);
}

export async function logInteropAudit(input: {
  action: string;
  actorId: string;
  message: string;
  success: boolean;
  caseId?: string;
  patientId?: string;
  externalSystemId?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.fHIRAudit.create({
    data: {
      action: input.action,
      actorId: input.actorId,
      caseId: input.caseId,
      externalSystemId: input.externalSystemId,
      message: input.message,
      metadata: input.metadata,
      patientId: input.patientId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
      success: input.success,
    },
  }).catch(() => undefined);
}

export async function listInteropLogs(limit = 50, offset = 0) {
  const [total, logs] = await Promise.all([
    prisma.interoperabilityLog.count(),
    prisma.interoperabilityLog.findMany({
      include: {
        actor: { select: { email: true, id: true, name: true } },
        externalSystem: { select: { id: true, name: true, protocol: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
  ]);

  return {
    limit,
    logs: logs.map((log) => ({
      actor: log.actor,
      caseId: log.caseId,
      createdAt: log.createdAt.toISOString(),
      externalSystem: log.externalSystem,
      id: log.id,
      level: log.level,
      message: log.message,
      metadata: log.metadata,
      operation: log.operation,
      patientId: log.patientId,
      validationFailed: log.validationFailed,
    })),
    offset,
    total,
  };
}

export async function listExternalSystems() {
  const systems = await prisma.externalSystem.findMany({
    include: { externalOrganization: true },
    orderBy: { createdAt: "asc" },
  });

  if (systems.length > 0) {
    return { systems };
  }

  const organization = await prisma.externalOrganization.create({
    data: {
      externalId: "ecg-insight-default-his",
      fhirEndpoint: "/api/interop/fhir",
      hl7Endpoint: "/api/interop/hl7",
      identifierSystem: "urn:ecg-insight:external-org",
      name: "Default Hospital Information System",
    },
  });

  const system = await prisma.externalSystem.create({
    data: {
      aeTitle: "ECGINSIGHT",
      baseUrl: "/api/interop",
      externalOrganizationId: organization.id,
      name: "ECG Insight Interoperability Gateway",
      protocol: "HYBRID",
      supportedHl7Types: ["ORM", "ORU", "ADT", "MDM", "ACK"],
      supportedResources: [
        "Patient",
        "Practitioner",
        "Organization",
        "Observation",
        "DiagnosticReport",
        "DocumentReference",
        "Encounter",
        "Device",
        "ServiceRequest",
        "Condition",
      ],
    },
    include: { externalOrganization: true },
  });

  return { systems: [system] };
}
