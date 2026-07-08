import type { FhirValidationIssue, FhirValidationResult, SupportedFhirResourceType } from "../types";
import { SUPPORTED_FHIR_RESOURCE_TYPES } from "../types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUID_REGEX = /^c[a-z0-9]{20,}$/i;

export function isValidInteropId(value: string): boolean {
  return UUID_REGEX.test(value) || CUID_REGEX.test(value);
}

const REQUIRED_FIELDS: Partial<Record<SupportedFhirResourceType, string[]>> = {
  Patient: ["identifier"],
  Practitioner: ["name"],
  Organization: ["name"],
  Observation: ["status", "code"],
  DiagnosticReport: ["status", "code"],
  DocumentReference: ["status", "content"],
  Encounter: ["status", "class"],
  Device: ["deviceName"],
  ServiceRequest: ["status", "intent", "subject"],
  Condition: ["subject"],
};

export function validateFhirResource(resource: Record<string, unknown>): FhirValidationResult {
  const issues: FhirValidationIssue[] = [];
  const resourceType = resource.resourceType;

  if (typeof resourceType !== "string") {
    return { valid: false, issues: [{ path: "resourceType", message: "Missing resourceType.", severity: "error" }] };
  }

  if (!SUPPORTED_FHIR_RESOURCE_TYPES.includes(resourceType as SupportedFhirResourceType)) {
    issues.push({ path: "resourceType", message: `Unsupported resource type: ${resourceType}.`, severity: "error" });
  }

  const id = resource.id;
  if (id !== undefined && typeof id === "string" && !isValidInteropId(id)) {
    issues.push({ path: "id", message: "Resource id is not a valid UUID or internal identifier.", severity: "warning" });
  }

  const required = REQUIRED_FIELDS[resourceType as SupportedFhirResourceType] ?? [];
  for (const field of required) {
    if (resource[field] === undefined || resource[field] === null) {
      issues.push({ path: field, message: `Missing required field for ${resourceType}.`, severity: "error" });
    }
  }

  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}

export function validateFhirBundle(bundle: Record<string, unknown>): FhirValidationResult {
  const issues: FhirValidationIssue[] = [];

  if (bundle.resourceType !== "Bundle") {
    issues.push({ path: "resourceType", message: "Expected Bundle resource.", severity: "error" });
    return { valid: false, issues };
  }

  if (!Array.isArray(bundle.entry)) {
    issues.push({ path: "entry", message: "Bundle must include entry array.", severity: "error" });
    return { valid: false, issues };
  }

  for (let index = 0; index < bundle.entry.length; index += 1) {
    const entry = bundle.entry[index] as { resource?: Record<string, unknown> };
    if (!entry?.resource) {
      issues.push({ path: `entry[${index}].resource`, message: "Bundle entry missing resource.", severity: "error" });
      continue;
    }
    const result = validateFhirResource(entry.resource);
    for (const issue of result.issues) {
      issues.push({ ...issue, path: `entry[${index}].resource.${issue.path}` });
    }
  }

  const referenceIssues = validateReferenceIntegrity(bundle);
  issues.push(...referenceIssues);

  return { valid: issues.every((issue) => issue.severity !== "error"), issues };
}

export function validateReferenceIntegrity(bundle: Record<string, unknown>): FhirValidationIssue[] {
  const issues: FhirValidationIssue[] = [];
  const entries = Array.isArray(bundle.entry) ? bundle.entry : [];
  const knownRefs = new Set<string>();

  for (const entry of entries) {
    const resource = (entry as { fullUrl?: string; resource?: Record<string, unknown> }).resource;
    const fullUrl = (entry as { fullUrl?: string }).fullUrl;
    if (resource?.resourceType && resource.id) {
      knownRefs.add(`${resource.resourceType}/${resource.id}`);
    }
    if (fullUrl) knownRefs.add(fullUrl.replace(/^urn:uuid:/, ""));
  }

  function walk(value: unknown, path: string) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`));
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.reference === "string") {
      const ref = record.reference.split("/").slice(-2).join("/");
      if (!knownRefs.has(ref) && !knownRefs.has(record.reference)) {
        issues.push({
          path,
          message: `Unresolved reference ${record.reference}.`,
          severity: "warning",
        });
      }
    }
    for (const [key, nested] of Object.entries(record)) {
      walk(nested, path ? `${path}.${key}` : key);
    }
  }

  for (let index = 0; index < entries.length; index += 1) {
    walk((entries[index] as { resource?: unknown }).resource, `entry[${index}].resource`);
  }

  return issues;
}
