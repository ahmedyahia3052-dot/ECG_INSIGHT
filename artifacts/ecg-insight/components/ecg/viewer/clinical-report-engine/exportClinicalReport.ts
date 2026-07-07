import { Platform } from "react-native";

import type { EnterpriseClinicalReportModel } from "./types";

export function exportClinicalReportFhir(model: EnterpriseClinicalReportModel) {
  return {
    entry: model.aiFindings.map((finding) => ({
      resource: {
        code: { text: finding.title },
        note: [{ text: finding.explanation }],
        resourceType: "Observation",
        status: "final",
        valueString: `${finding.severity} · ${finding.confidence}%`,
      },
    })),
    exportedAt: new Date().toISOString(),
    patient: { name: model.header.patientName, identifier: model.header.mrn },
    resourceType: "Bundle",
    type: "collection",
  };
}

export function exportClinicalReportJson(model: EnterpriseClinicalReportModel) {
  return {
    exportedAt: new Date().toISOString(),
    model,
    schemaVersion: 1,
  };
}

export function printClinicalReport() {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  window.print();
}

export function downloadClinicalReportJson(model: EnterpriseClinicalReportModel, filename = "clinical-report.json") {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const payload = JSON.stringify(exportClinicalReportJson(model), null, 2);
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  link.click();
}

export function downloadClinicalReportFhir(model: EnterpriseClinicalReportModel, filename = "clinical-report-fhir.json") {
  if (Platform.OS !== "web" || typeof document === "undefined") return;
  const payload = JSON.stringify(exportClinicalReportFhir(model), null, 2);
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  link.click();
}
