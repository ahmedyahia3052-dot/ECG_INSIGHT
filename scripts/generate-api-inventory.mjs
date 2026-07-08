import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const serverSrc = path.join(root, "server", "src");
const API_VERSION_PREFIX = "/api/v1";

const API_MOUNT_POINTS = [
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

const ROUTE_METHOD_RE = /\b(?:Router|router|[a-zA-Z]+Router)\.(get|post|put|patch|delete)\(\s*["'`]([^"'`]+)["'`]/g;

function toVersionedPath(prefix, routePath) {
  const normalizedPrefix = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const normalizedRoute = routePath.startsWith("/") ? routePath : `/${routePath}`;
  return `${API_VERSION_PREFIX}${normalizedPrefix}${normalizedRoute === "/" ? "" : normalizedRoute}`;
}

function toOperationId(method, fullPath) {
  const slug = fullPath
    .replace(/^\/api\/v1/, "")
    .replace(/[{}]/g, "")
    .split(/[/:-]+/)
    .filter(Boolean)
    .map((part, index) => (index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
  return `${method.toLowerCase()}${slug.charAt(0).toUpperCase()}${slug.slice(1)}`;
}

function walkRouteFiles(dir, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkRouteFiles(full, files);
    else if (entry.name.endsWith(".routes.ts")) files.push(full);
  }
  return files;
}

function detectMountPrefix(filePath) {
  const relative = path.relative(serverSrc, filePath).replace(/\\/g, "/");
  if (relative.includes("enterprise-notification-engine")) {
    return API_MOUNT_POINTS.find((item) => item.module === "events") ?? { module: "events", prefix: "/events", tag: "notifications" };
  }
  if (relative.includes("ecg-diagnostic-pipeline")) {
    return { module: "ecg-diagnostic-pipeline", prefix: "/ecg/diagnostic-pipeline", tag: "ecg" };
  }
  for (const mount of API_MOUNT_POINTS) {
    if (relative.includes(`${mount.module}/`) || relative.startsWith(`${mount.module}/`) || relative.includes(`/${mount.module}.routes.ts`)) {
      return mount;
    }
  }
  const firstSegment = relative.split("/").find(Boolean)?.replace(".routes.ts", "") ?? "unknown";
  const fallback = API_MOUNT_POINTS.find((item) => item.module === firstSegment);
  return fallback ?? { module: firstSegment, prefix: `/${firstSegment}`, tag: "general" };
}

function scanFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  const mount = detectMountPrefix(filePath);
  const entries = [];
  let match;
  ROUTE_METHOD_RE.lastIndex = 0;
  while ((match = ROUTE_METHOD_RE.exec(source)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[2];
    const fullPath = toVersionedPath(mount.prefix, routePath);
    entries.push({
      auth: source.includes("requireAuth") ? "authenticated" : "public",
      method,
      module: mount.module,
      operationId: toOperationId(method, fullPath),
      path: fullPath,
      tag: mount.tag,
      version: "v1",
    });
  }
  return entries;
}

const routeFiles = walkRouteFiles(serverSrc);
const inventory = routeFiles.flatMap(scanFile).sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));

const outDir = path.join(root, "server", "src", "api", "registry");
writeFileSync(path.join(outDir, "endpoint-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`, "utf8");

const mdLines = [
  "# API Endpoint Inventory",
  "",
  `Generated: ${new Date().toISOString()}`,
  "",
  `Total endpoints: **${inventory.length}**`,
  "",
  "| Method | Path | Module | Tag | Auth |",
  "|--------|------|--------|-----|------|",
  ...inventory.map((entry) => `| ${entry.method} | \`${entry.path}\` | ${entry.module} | ${entry.tag} | ${entry.auth} |`),
  "",
];

writeFileSync(path.join(root, "API_INVENTORY.md"), mdLines.join("\n"), "utf8");
console.log(`Generated ${inventory.length} endpoints -> server/src/api/registry/endpoint-inventory.json, API_INVENTORY.md`);
