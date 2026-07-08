import type { FhirExportBundle, EnterpriseReportDocument } from "./types";

export function buildFhirBundle(document: EnterpriseReportDocument): FhirExportBundle {
  const patientRef = `Patient/${document.patient.patientId ?? document.reportUuid}`;
  const reportRef = `DiagnosticReport/${document.reportId}`;
  const timestamp = new Date().toISOString();

  const observations = [
    { code: "8867-4", display: "Heart rate", value: document.ecg.heartRate },
    { code: "8625-6", display: "PR interval", value: document.ecg.pr },
    { code: "8633-0", display: "QRS duration", value: document.ecg.qrs },
    { code: "8634-8", display: "QT interval", value: document.ecg.qt },
    { code: "8636-3", display: "QTc interval", value: document.ecg.qtc },
  ].filter((item) => item.value);

  return {
    resourceType: "Bundle",
    type: "document",
    timestamp,
    identifier: {
      system: "urn:ecg-insight:report",
      value: document.reportNumber,
    },
    entry: [
      {
        fullUrl: patientRef,
        resource: {
          resourceType: "Patient",
          id: document.patient.patientId ?? document.reportUuid,
          name: [{ text: document.patient.patientName }],
          gender: document.patient.gender?.toLowerCase(),
          identifier: document.patient.medicalRecordNumber
            ? [{ system: "urn:ecg-insight:mrn", value: document.patient.medicalRecordNumber }]
            : undefined,
        },
      },
      {
        fullUrl: reportRef,
        resource: {
          resourceType: "DiagnosticReport",
          id: document.reportId,
          status: document.readOnly ? "final" : "preliminary",
          code: {
            coding: [{ system: "http://loinc.org", code: "11524-6", display: "EKG study" }],
            text: document.reportType,
          },
          subject: { reference: patientRef },
          effectiveDateTime: document.header.reportDate,
          issued: timestamp,
          conclusion: document.doctor.finalDiagnosis ?? document.ai.diagnosis,
          presentedForm: [
            {
              contentType: "application/json",
              data: Buffer.from(JSON.stringify(document)).toString("base64"),
              title: document.reportNumber,
            },
          ],
          identifier: [
            { system: "urn:ecg-insight:report-number", value: document.reportNumber },
            { system: "urn:ecg-insight:report-uuid", value: document.reportUuid },
          ],
          extension: [
            {
              url: "urn:ecg-insight:verification-hash",
              valueString: document.verificationHash,
            },
          ],
        },
      },
      ...observations.map((observation, index) => ({
        fullUrl: `Observation/${document.reportId}-${index}`,
        resource: {
          resourceType: "Observation",
          id: `${document.reportId}-${index}`,
          status: "final",
          code: {
            coding: [{ system: "http://loinc.org", code: observation.code, display: observation.display }],
          },
          subject: { reference: patientRef },
          effectiveDateTime: document.header.reportDate,
          valueString: observation.value,
        },
      })),
    ],
  };
}
