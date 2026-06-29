import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function listTsxFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  return fs.readdirSync(absoluteDir, { withFileTypes: true }).flatMap((entry) => {
    const next = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return listTsxFiles(next);
    return entry.name.endsWith(".tsx") || entry.name.endsWith(".ts") ? [next] : [];
  });
}

for (const legacyDir of [
  "artifacts/ecg-insight/app/(tabs)",
  "artifacts/ecg-insight/app/admin",
  "artifacts/ecg-insight/app/case",
  "artifacts/ecg-insight/components/bolt",
  "artifacts/ecg-insight/components/dashboard",
]) {
  assert(listTsxFiles(legacyDir).length === 0, `${legacyDir} must not contain legacy dashboard source files.`);
}

const enterpriseShell = read("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx");
const assistant = read("artifacts/ecg-insight/components/copilot/MedicalAICopilot.tsx");
const dashboardStore = read("artifacts/ecg-insight/context/DashboardStore.ts");
const notificationPage = read("artifacts/ecg-insight/app/(protected)/notifications.tsx");
const supportPage = read("artifacts/ecg-insight/app/(protected)/support.tsx");
const searchService = read("artifacts/ecg-insight/services/search.ts");
const searchRoutes = read("server/src/modules/search/search.routes.ts");

assert(enterpriseShell.includes("ProtectedRoute") && enterpriseShell.includes("EnterpriseShell"), "Protected shell must own the dashboard architecture.");
assert((enterpriseShell.match(/<MedicalAICopilot/g) ?? []).length === 1, "Exactly one assistant owner may render in the dashboard shell.");
assert((enterpriseShell.match(/accessibilityLabel=\"Notifications\"/g) ?? []).length === 1, "Exactly one notification bell may render in the dashboard shell.");
for (const marker of ["CLINICAL", "WORKSPACE", "DEVELOPER", "/support", "refetchInterval: 15_000", "notificationSearch", "Open Notification History"]) {
  assert(enterpriseShell.includes(marker), `Enterprise shell is missing production dashboard marker: ${marker}`);
}
for (const forbidden of ["AI Clinical Copilot", "\"ai\"] as const", "/(tabs)", "@/components/bolt", "@/components/dashboard"]) {
  assert(!enterpriseShell.includes(forbidden), `Enterprise shell must not contain legacy/conflicting marker: ${forbidden}`);
}

for (const marker of ["AI Assistant", "quickPrompts", "PanResponder", "setAssistantSize", "sendCopilotMessage", "listCopilotConversations", "getCopilotConversation", "medical-copilot:ask"]) {
  assert(assistant.includes(marker), `Lightweight assistant is missing production marker: ${marker}`);
}
assert(!assistant.includes("AI Clinical Copilot"), "Large AI Clinical Copilot UX must be removed.");

for (const marker of ["notificationSearch", "assistantSize", "hydrateDashboardState", "ecg-insight:dashboard-layout", "persistLayout"]) {
  assert(dashboardStore.includes(marker), `Dashboard store is missing centralized state marker: ${marker}`);
}

for (const marker of ["Alerts", "Notification History", "Critical", "System", "License", "refetchInterval: 15_000"]) {
  assert(notificationPage.includes(marker), `Notification history page is missing restored UX marker: ${marker}`);
}
assert(supportPage.includes("createSupportTicket"), "Protected support route must persist real support tickets.");

assert(searchService.includes("\"employee\""), "Global search service must expose employee results.");
for (const marker of ["employeeId", "positionTitle", "type: \"employee\"", "Employee record"]) {
  assert(searchRoutes.includes(marker), `Backend search must include employee marker: ${marker}`);
}

console.log("Dashboard production lockdown integration checks passed.");
