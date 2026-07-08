/**
 * Sprint 68 — FHIR / HL7 Interoperability Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/fhir-hl7-interoperability-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "fhir/serializers.ts"),
    markers: [
      "serializeFhirPatient",
      "serializeFhirDiagnosticReport",
      "serializeFhirObservations",
      "buildCaseFhirBundle",
      "DocumentReference",
      "ServiceRequest",
      "Condition",
    ],
  },
  {
    file: resolve(MOD, "fhir/validators.ts"),
    markers: ["validateFhirBundle", "validateReferenceIntegrity", "isValidInteropId"],
  },
  {
    file: resolve(MOD, "hl7/engine.ts"),
    markers: ["parseHl7Message", "validateHl7Message", "buildOruMessage", "buildOrmMessage", "buildAckMessage", "ORU", "ORM", "ADT", "MDM", "ACK"],
  },
  {
    file: resolve(MOD, "services/fhir.service.ts"),
    markers: ["exportCaseToFhir", "importFhirPayload", "fHIRExportJob", "fHIRImportJob"],
  },
  {
    file: resolve(MOD, "controllers/interoperability.routes.ts"),
    markers: [
      "interoperabilityEngineRouter",
      "/fhir/export/:caseId",
      "/fhir/import",
      "/hl7/export/:caseId",
      "/hl7/import",
      "/logs",
      "/systems",
    ],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: [
      "model FHIRExportJob",
      "model FHIRImportJob",
      "model HL7Message",
      "model InteroperabilityLog",
      "model ExternalSystem",
      "model ExternalOrganization",
      "model FHIRAudit",
      "FHIR_INTEROP_EXPORT",
      "HL7_INTEROP_IMPORT",
    ],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260708081000_sprint68_fhir_hl7_interoperability/migration.sql"),
    markers: ["FHIRExportJob", "FHIRImportJob", "HL7Message", "InteroperabilityLog", "ExternalSystem", "ExternalOrganization", "FHIRAudit"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["interoperabilityEngineRouter", '"/interop"'],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 68 FHIR/HL7 Interoperability integration markers: PASS");
