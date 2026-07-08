export const INTEROPERABILITY_ENGINE_VERSION = "sprint68-fhir-hl7-interoperability-v1";

export const SUPPORTED_FHIR_RESOURCE_TYPES = [
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
] as const;

export type SupportedFhirResourceType = (typeof SUPPORTED_FHIR_RESOURCE_TYPES)[number];

export type FhirResource = Record<string, unknown> & { resourceType: string };

export type FhirBundle = {
  resourceType: "Bundle";
  type: "collection" | "document" | "searchset" | "transaction";
  timestamp: string;
  identifier?: { system: string; value: string };
  entry: Array<{ fullUrl?: string; resource: FhirResource }>;
};

export type FhirValidationIssue = {
  path: string;
  message: string;
  severity: "error" | "warning";
};

export type FhirValidationResult = {
  valid: boolean;
  issues: FhirValidationIssue[];
};

export type Hl7Segment = {
  name: string;
  fields: string[];
};

export type Hl7ParseResult = {
  valid: boolean;
  messageType: string | null;
  segments: Hl7Segment[];
  issues: FhirValidationIssue[];
};

export type InteropExportResult = {
  jobId: string;
  status: string;
  bundle?: FhirBundle;
  hl7Message?: string;
  validation: FhirValidationResult;
};

export type InteropImportResult = {
  jobId: string;
  status: string;
  imported: Array<{ resourceType: string; resourceId: string; action: string }>;
  validation: FhirValidationResult;
};
