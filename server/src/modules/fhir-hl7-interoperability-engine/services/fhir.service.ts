import type { Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { AppError } from "../../../middleware/error";
import { buildCaseFhirBundle, buildDiagnosticReportBundle, buildObservationBundle, listBundleResourceTypes } from "../fhir/serializers";
import { validateFhirBundle } from "../fhir/validators";
import type { FhirBundle, InteropExportResult } from "../types";
import { INTEROPERABILITY_ENGINE_VERSION } from "../types";
import { logInteropAudit, logInteropEvent } from "./audit.service";

const caseInclude = {
  analyses: { orderBy: { createdAt: "desc" as const }, take: 1 },
  assignedDoctor: true,
  files: true,
  measurements: { orderBy: { createdAt: "desc" as const }, take: 1 },
  patient: { include: { organization: true } },
  reports: { orderBy: { createdAt: "desc" as const }, take: 1 },
  reviewedBy: true,
  uploadedBy: true,
} satisfies Prisma.ECGCaseInclude;

export async function resolveInteropCase(caseRef: string) {
  const ecgCase = await prisma.eCGCase.findFirst({
    include: caseInclude,
    where: { OR: [{ id: caseRef }, { caseId: caseRef }, { caseNumber: caseRef }] },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  return ecgCase;
}

export async function exportCaseToFhir(input: {
  actorId: string;
  caseRef: string;
  bundleKind?: "full" | "diagnostic-report" | "observation";
  externalSystemId?: string;
}): Promise<InteropExportResult> {
  const ecgCase = await resolveInteropCase(input.caseRef);
  const bundle: FhirBundle =
    input.bundleKind === "observation"
      ? buildObservationBundle(ecgCase)
      : input.bundleKind === "diagnostic-report"
        ? buildDiagnosticReportBundle(ecgCase)
        : buildCaseFhirBundle(ecgCase);

  const validation = validateFhirBundle(bundle as unknown as Record<string, unknown>);
  const status = validation.valid ? "COMPLETED" : "VALIDATION_FAILED";

  const job = await prisma.fHIRExportJob.create({
    data: {
      bundleType: bundle.type,
      caseId: ecgCase.id,
      completedAt: validation.valid ? new Date() : undefined,
      externalSystemId: input.externalSystemId,
      organizationId: ecgCase.patient.organizationId,
      patientId: ecgCase.patientId,
      payloadJson: bundle as unknown as Prisma.InputJsonValue,
      requestedById: input.actorId,
      resourceTypes: listBundleResourceTypes(bundle),
      status,
      validationErrors: validation.issues.length ? (validation.issues as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  await logInteropEvent({
    action: validation.valid ? "FHIR_INTEROP_EXPORT" : "INTEROPERABILITY_VALIDATION_FAILED",
    actorId: input.actorId,
    caseId: ecgCase.id,
    externalSystemId: input.externalSystemId,
    message: validation.valid ? `FHIR export completed for case ${ecgCase.caseId}.` : "FHIR export validation failed.",
    metadata: { engineVersion: INTEROPERABILITY_ENGINE_VERSION, jobId: job.id, issueCount: validation.issues.length },
    operation: "FHIR_EXPORT",
    patientId: ecgCase.patientId,
    validationFailed: !validation.valid,
  });

  await logInteropAudit({
    action: "EXPORT",
    actorId: input.actorId,
    caseId: ecgCase.id,
    externalSystemId: input.externalSystemId,
    message: validation.valid ? "FHIR bundle exported." : "FHIR export blocked by validation.",
    metadata: { jobId: job.id },
    patientId: ecgCase.patientId,
    resourceType: "Bundle",
    success: validation.valid,
  });

  if (!validation.valid) {
    throw new AppError(422, "FHIR export validation failed.", "FHIR_VALIDATION_FAILED");
  }

  return { bundle, jobId: job.id, status, validation };
}

export async function importFhirPayload(input: {
  actorId: string;
  payload: Record<string, unknown>;
  externalSystemId?: string;
}) {
  const validation = validateFhirBundle(input.payload);
  const status = validation.valid ? "COMPLETED" : "VALIDATION_FAILED";
  const entries = Array.isArray(input.payload.entry) ? input.payload.entry : [];
  const imported: Array<{ resourceType: string; resourceId: string; action: string }> = [];
  let patientId: string | undefined;

  for (const entry of entries) {
    const resource = (entry as { resource?: Record<string, unknown> }).resource;
    if (!resource?.resourceType) continue;
    const resourceType = String(resource.resourceType);
    const resourceId = String(resource.id ?? "unknown");
    imported.push({ action: "accepted", resourceId, resourceType });

    if (resourceType === "Patient") {
      const identifiers = Array.isArray(resource.identifier) ? resource.identifier : [];
      const mrnEntry = identifiers.find((item) => {
        const record = item as { system?: string; value?: string };
        return record.system?.includes("mrn") && record.value;
      }) as { value?: string } | undefined;
      if (mrnEntry?.value) {
        const patient = await prisma.patient.findUnique({ where: { medicalRecordNumber: mrnEntry.value } });
        patientId = patient?.id;
      }
    }
  }

  const job = await prisma.fHIRImportJob.create({
    data: {
      completedAt: validation.valid ? new Date() : undefined,
      externalSystemId: input.externalSystemId,
      importedResources: imported as unknown as Prisma.InputJsonValue,
      patientId,
      requestedById: input.actorId,
      sourcePayload: input.payload as Prisma.InputJsonValue,
      status,
      validationErrors: validation.issues.length ? (validation.issues as unknown as Prisma.InputJsonValue) : undefined,
    },
  });

  await logInteropEvent({
    action: validation.valid ? "FHIR_INTEROP_IMPORT" : "INTEROPERABILITY_VALIDATION_FAILED",
    actorId: input.actorId,
    externalSystemId: input.externalSystemId,
    message: validation.valid ? "FHIR payload imported." : "FHIR import validation failed.",
    metadata: { engineVersion: INTEROPERABILITY_ENGINE_VERSION, importedCount: imported.length, jobId: job.id },
    operation: "FHIR_IMPORT",
    patientId,
    validationFailed: !validation.valid,
  });

  await logInteropAudit({
    action: "IMPORT",
    actorId: input.actorId,
    externalSystemId: input.externalSystemId,
    message: validation.valid ? "FHIR bundle imported." : "FHIR import blocked by validation.",
    metadata: { jobId: job.id, importedCount: imported.length },
    patientId,
    resourceType: "Bundle",
    success: validation.valid,
  });

  if (!validation.valid) {
    throw new AppError(422, "FHIR import validation failed.", "FHIR_VALIDATION_FAILED");
  }

  return { imported, jobId: job.id, status, validation };
}
