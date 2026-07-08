import type { Prisma } from "@prisma/client";
import type { FhirBundle, FhirResource, SupportedFhirResourceType } from "../types";

type CaseExportContext = Prisma.ECGCaseGetPayload<{
  include: {
    patient: { include: { organization: true } };
    uploadedBy: true;
    assignedDoctor: true;
    reviewedBy: true;
    measurements: true;
    analyses: true;
    reports: true;
    files: true;
  };
}>;

function genderToFhir(gender: string) {
  const map: Record<string, string> = {
    child: "unknown",
    child_female: "female",
    child_male: "male",
    female: "female",
    male: "male",
    other: "other",
    unknown: "unknown",
  };
  return map[gender] ?? "unknown";
}

function ref(resourceType: string, id: string) {
  return { reference: `${resourceType}/${id}` };
}

export function serializeFhirPatient(patient: CaseExportContext["patient"]): FhirResource {
  return {
    resourceType: "Patient",
    id: patient.id,
    identifier: [{ system: "urn:ecg-insight:mrn", value: patient.medicalRecordNumber }],
    name: [{ family: patient.lastName, given: [patient.firstName, patient.middleName].filter(Boolean), text: patient.fullName ?? `${patient.firstName} ${patient.lastName}` }],
    gender: genderToFhir(patient.gender.toLowerCase()),
    birthDate: patient.dateOfBirth.toISOString().slice(0, 10),
    telecom: [patient.phone, patient.email].filter(Boolean).map((value, index) => ({ system: index === 0 ? "phone" : "email", value })),
  };
}

export function serializeFhirPractitioner(user: { id: string; name: string; email: string }): FhirResource {
  return {
    resourceType: "Practitioner",
    id: user.id,
    identifier: [{ system: "urn:ecg-insight:practitioner", value: user.id }],
    name: [{ text: user.name }],
    telecom: [{ system: "email", value: user.email }],
  };
}

export function serializeFhirOrganization(org: { id: string; name: string } | null | undefined, fallbackName?: string | null): FhirResource {
  const id = org?.id ?? "ecg-insight-default-org";
  return {
    resourceType: "Organization",
    id,
    identifier: [{ system: "urn:ecg-insight:organization", value: id }],
    name: org?.name ?? fallbackName ?? "ECG Insight Enterprise",
    type: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/organization-type", code: "prov", display: "Healthcare Provider" }] }],
  };
}

export function serializeFhirEncounter(ecgCase: CaseExportContext, patientRef: string): FhirResource {
  return {
    resourceType: "Encounter",
    id: `${ecgCase.id}-encounter`,
    status: "finished",
    class: { system: "http://terminology.hl7.org/CodeSystem/v3-ActCode", code: "AMB", display: "ambulatory" },
    subject: { reference: patientRef },
    period: { start: ecgCase.acquisitionDate.toISOString(), end: ecgCase.updatedAt.toISOString() },
    identifier: [{ system: "urn:ecg-insight:case", value: ecgCase.caseId }],
  };
}

export function serializeFhirDevice(ecgCase: CaseExportContext): FhirResource {
  return {
    resourceType: "Device",
    id: `${ecgCase.id}-device`,
    deviceName: [{ name: "ECG Insight Acquisition Device", type: "user-friendly-name" }],
    type: { coding: [{ system: "http://snomed.info/sct", code: "16310003", display: "Electrocardiographic monitor and recorder" }] },
    status: "active",
  };
}

export function serializeFhirServiceRequest(ecgCase: CaseExportContext, patientRef: string): FhirResource {
  return {
    resourceType: "ServiceRequest",
    id: `${ecgCase.id}-service-request`,
    status: "completed",
    intent: "order",
    subject: { reference: patientRef },
    code: { coding: [{ system: "http://loinc.org", code: "11524-6", display: "EKG study" }] },
    authoredOn: ecgCase.uploadDate.toISOString(),
  };
}

export function serializeFhirCondition(ecgCase: CaseExportContext, patientRef: string, analysis?: CaseExportContext["analyses"][number]): FhirResource {
  const diagnosis = analysis?.diagnosis ?? ecgCase.finalDiagnosis ?? ecgCase.doctorDiagnosis ?? ecgCase.aiDiagnosis ?? "ECG under review";
  return {
    resourceType: "Condition",
    id: `${ecgCase.id}-condition`,
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    subject: { reference: patientRef },
    code: { text: diagnosis },
    recordedDate: ecgCase.acquisitionDate.toISOString(),
  };
}

export function serializeFhirObservations(ecgCase: CaseExportContext, patientRef: string): FhirResource[] {
  const measurement = ecgCase.measurements[0];
  const metrics = [
    { code: "8867-4", display: "Heart rate", value: measurement?.heartRate ?? ecgCase.heartRate, unit: "/min" },
    { code: "8625-6", display: "PR interval", value: measurement?.prInterval ?? ecgCase.prInterval, unit: "ms" },
    { code: "8633-0", display: "QRS duration", value: measurement?.qrsDuration ?? ecgCase.qrsDuration, unit: "ms" },
    { code: "8634-8", display: "QT interval", value: measurement?.qtInterval ?? ecgCase.qtInterval, unit: "ms" },
    { code: "8636-3", display: "QTc interval", value: measurement?.qtcInterval ?? ecgCase.qtcInterval, unit: "ms" },
  ].filter((metric) => metric.value != null);

  return metrics.map((metric, index) => ({
    resourceType: "Observation",
    id: `${ecgCase.id}-obs-${index}`,
    status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
    code: { coding: [{ system: "http://loinc.org", code: metric.code, display: metric.display }] },
    subject: { reference: patientRef },
    effectiveDateTime: ecgCase.acquisitionDate.toISOString(),
    valueQuantity: { value: metric.value, unit: metric.unit, system: "http://unitsofmeasure.org", code: metric.unit },
  }));
}

export function serializeFhirDiagnosticReport(ecgCase: CaseExportContext, patientRef: string, analysis?: CaseExportContext["analyses"][number]): FhirResource {
  const report = ecgCase.reports[0];
  return {
    resourceType: "DiagnosticReport",
    id: ecgCase.id,
    status: ecgCase.finalizedAt ? "final" : "preliminary",
    code: { coding: [{ system: "http://loinc.org", code: "11524-6", display: "EKG study" }] },
    subject: { reference: patientRef },
    effectiveDateTime: ecgCase.acquisitionDate.toISOString(),
    issued: (report?.reportingDate ?? ecgCase.updatedAt).toISOString(),
    conclusion: analysis?.interpretation ?? ecgCase.clinicalComments ?? ecgCase.clinicalNotes ?? analysis?.diagnosis ?? ecgCase.finalDiagnosis ?? ecgCase.aiDiagnosis ?? undefined,
    result: serializeFhirObservations(ecgCase, patientRef).map((_, index) => ref("Observation", `${ecgCase.id}-obs-${index}`)),
    identifier: [{ system: "urn:ecg-insight:case", value: ecgCase.caseId }],
  };
}

export function serializeFhirDocumentReference(ecgCase: CaseExportContext, patientRef: string): FhirResource | null {
  const file = ecgCase.files[0];
  if (!file) return null;
  return {
    resourceType: "DocumentReference",
    id: `${ecgCase.id}-document`,
    status: "current",
    type: { coding: [{ system: "http://loinc.org", code: "11524-6", display: "EKG study" }] },
    subject: { reference: patientRef },
    date: ecgCase.acquisitionDate.toISOString(),
    content: [{
      attachment: {
        contentType: file.mimeType,
        title: file.originalName ?? file.fileName ?? "ECG document",
        url: file.storagePath ?? undefined,
      },
    }],
  };
}

export function buildCaseFhirBundle(ecgCase: CaseExportContext): FhirBundle {
  const patientRef = `Patient/${ecgCase.patientId}`;
  const practitioner = ecgCase.reviewedBy ?? ecgCase.assignedDoctor ?? ecgCase.uploadedBy;
  const organization = ecgCase.patient.organization;
  const analysis = ecgCase.analyses[0];
  const resources: FhirResource[] = [
    serializeFhirPatient(ecgCase.patient),
    serializeFhirOrganization(organization, ecgCase.patient.organizationId ? undefined : "ECG Insight Enterprise"),
    serializeFhirPractitioner(practitioner),
    serializeFhirEncounter(ecgCase, patientRef),
    serializeFhirDevice(ecgCase),
    serializeFhirServiceRequest(ecgCase, patientRef),
    serializeFhirCondition(ecgCase, patientRef, analysis),
    serializeFhirDiagnosticReport(ecgCase, patientRef, analysis),
    ...serializeFhirObservations(ecgCase, patientRef),
  ];

  const documentReference = serializeFhirDocumentReference(ecgCase, patientRef);
  if (documentReference) resources.push(documentReference);

  return {
    resourceType: "Bundle",
    type: "document",
    timestamp: new Date().toISOString(),
    identifier: { system: "urn:ecg-insight:interop-export", value: ecgCase.caseId },
    entry: resources.map((resource) => ({
      fullUrl: `${resource.resourceType}/${String(resource.id)}`,
      resource,
    })),
  };
}

export function buildObservationBundle(ecgCase: CaseExportContext): FhirBundle {
  const patientRef = `Patient/${ecgCase.patientId}`;
  const observations = serializeFhirObservations(ecgCase, patientRef);
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry: observations.map((resource) => ({ fullUrl: `Observation/${String(resource.id)}`, resource })),
  };
}

export function buildDiagnosticReportBundle(ecgCase: CaseExportContext): FhirBundle {
  const patientRef = `Patient/${ecgCase.patientId}`;
  const report = serializeFhirDiagnosticReport(ecgCase, patientRef, ecgCase.analyses[0]);
  return {
    resourceType: "Bundle",
    type: "document",
    timestamp: new Date().toISOString(),
    entry: [{ fullUrl: `DiagnosticReport/${ecgCase.id}`, resource: report }],
  };
}

export function listBundleResourceTypes(bundle: FhirBundle): SupportedFhirResourceType[] {
  return [...new Set(bundle.entry.map((entry) => entry.resource.resourceType as SupportedFhirResourceType))];
}
