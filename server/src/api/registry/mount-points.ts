import type { EndpointInventoryEntry } from "../standards/types";

/** Canonical mount prefixes from server/src/modules/index.ts (Sprint 72 inventory). */
export const API_MOUNT_POINTS: Array<{ module: string; prefix: string; tag: string }> = [
  { module: "health", prefix: "/health", tag: "health" },
  { module: "auth", prefix: "/auth", tag: "auth" },
  { module: "audit", prefix: "/audit", tag: "audit" },
  { module: "assistant", prefix: "/assistant", tag: "clinical-intelligence" },
  { module: "ai", prefix: "/ai", tag: "ai" },
  { module: "alerts", prefix: "/alerts", tag: "collaboration" },
  { module: "clinical-alerts", prefix: "/clinical-alerts", tag: "clinical-intelligence" },
  { module: "clinical-alerts-risk-engine", prefix: "/clinical-alerts-risk-engine", tag: "clinical-intelligence" },
  { module: "clinical-decision-support", prefix: "/clinical-decision-support", tag: "clinical-decision-support" },
  { module: "events", prefix: "/events", tag: "notifications" },
  { module: "clinical-knowledge-engine", prefix: "/clinical-knowledge-engine", tag: "knowledge" },
  { module: "ai-report-generator", prefix: "/ai-report-generator", tag: "reports" },
  { module: "cdss", prefix: "/cdss", tag: "clinical-intelligence" },
  { module: "longitudinal-ecg", prefix: "/longitudinal-ecg", tag: "clinical-intelligence" },
  { module: "companies", prefix: "/companies", tag: "workforce" },
  { module: "analytics", prefix: "/analytics", tag: "clinical-intelligence" },
  { module: "backup", prefix: "/backup", tag: "operations" },
  { module: "cases", prefix: "/cases", tag: "cases" },
  { module: "case-collaboration", prefix: "/case-collaboration", tag: "collaboration" },
  { module: "tasks", prefix: "/tasks", tag: "collaboration" },
  { module: "messages", prefix: "/messages", tag: "collaboration" },
  { module: "teams", prefix: "/teams", tag: "collaboration" },
  { module: "sync", prefix: "/sync", tag: "collaboration" },
  { module: "compliance", prefix: "/compliance", tag: "compliance" },
  { module: "copilot", prefix: "/copilot", tag: "copilot" },
  { module: "documents", prefix: "/documents", tag: "documents" },
  { module: "departments", prefix: "/departments", tag: "workforce" },
  { module: "ecg", prefix: "/ecg", tag: "ecg" },
  { module: "ecg-processing-engine", prefix: "/ecg-processing-engine", tag: "ecg" },
  { module: "ai-orchestration-engine", prefix: "/ai-orchestration-engine", tag: "ai" },
  { module: "medical-report-engine", prefix: "/medical-report-engine", tag: "reports" },
  { module: "ecg-diagnostic-pipeline", prefix: "/ecg/diagnostic-pipeline", tag: "ecg" },
  { module: "ecg-benchmark", prefix: "/ecg/benchmark", tag: "ecg" },
  { module: "employees", prefix: "/employees", tag: "workforce" },
  { module: "emr", prefix: "/emr", tag: "hospital-integration" },
  { module: "interop", prefix: "/interop", tag: "interop" },
  { module: "enterprise-report-engine", prefix: "/enterprise-report-engine", tag: "enterprise" },
  { module: "enterprise-rules-engine", prefix: "/enterprise-rules-engine", tag: "enterprise" },
  { module: "enterprise", prefix: "/enterprise", tag: "enterprise" },
  { module: "fitness-assessments", prefix: "/fitness-assessments", tag: "occupational" },
  { module: "knowledge", prefix: "/knowledge", tag: "knowledge" },
  { module: "medical-intelligence", prefix: "/medical-intelligence", tag: "medical-intelligence" },
  { module: "mic", prefix: "/mic", tag: "medical-intelligence" },
  { module: "notifications", prefix: "/notifications", tag: "notifications" },
  { module: "ocr", prefix: "/ocr", tag: "documents" },
  { module: "occupational-risk", prefix: "/occupational-risk", tag: "occupational" },
  { module: "organization-platform", prefix: "/organization-platform", tag: "enterprise" },
  { module: "organizations", prefix: "/organizations", tag: "workforce" },
  { module: "patients", prefix: "/patients", tag: "patients" },
  { module: "preferences", prefix: "/preferences", tag: "users" },
  { module: "pacs", prefix: "/pacs", tag: "hospital-integration" },
  { module: "fhir", prefix: "/fhir", tag: "hospital-integration" },
  { module: "reports", prefix: "/reports", tag: "reports" },
  { module: "release-candidate", prefix: "/release-candidate", tag: "operations" },
  { module: "risk", prefix: "/risk", tag: "clinical-intelligence" },
  { module: "search", prefix: "/search", tag: "search" },
  { module: "security", prefix: "/security", tag: "security" },
  { module: "users", prefix: "/users", tag: "users" },
  { module: "subscriptions", prefix: "/subscriptions", tag: "billing" },
  { module: "super-admin", prefix: "/super-admin", tag: "admin" },
  { module: "support", prefix: "/support", tag: "support" },
  { module: "contractors", prefix: "/contractors", tag: "workforce" },
  { module: "uploads", prefix: "/uploads", tag: "uploads" },
  { module: "telecardiology", prefix: "/telecardiology", tag: "hospital-integration" },
  { module: "trends", prefix: "/trends", tag: "clinical-intelligence" },
  { module: "work-restrictions", prefix: "/work-restrictions", tag: "occupational" },
];

export const API_VERSION_PREFIX = "/api/v1";
export const API_LEGACY_PREFIX = "/api";

export function toVersionedPath(prefix: string, routePath: string) {
  const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const normalizedRoute = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${API_VERSION_PREFIX}${normalizedPrefix}${normalizedRoute === "/" ? "" : normalizedRoute}`;
}

export function toOperationId(method: string, fullPath: string) {
  const slug = fullPath
    .replace(/^\/api\/v1/, "")
    .replace(/[{}]/g, "")
    .split(/[/:-]+/)
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
  return `${method.toLowerCase()}${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
}

export function summarizeInventory(entries: EndpointInventoryEntry[]) {
  const byTag = new Map<string, number>();
  const byMethod = new Map<string, number>();
  for (const entry of entries) {
    byTag.set(entry.tag, (byTag.get(entry.tag) ?? 0) + 1);
    byMethod.set(entry.method, (byMethod.get(entry.method) ?? 0) + 1);
  }
  return {
    byMethod: Object.fromEntries(byMethod),
    byTag: Object.fromEntries(byTag),
    total: entries.length,
  };
}
