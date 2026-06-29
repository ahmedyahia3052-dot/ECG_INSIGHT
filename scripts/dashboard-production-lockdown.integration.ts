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
const copilotService = read("artifacts/ecg-insight/services/copilot.ts");
const dashboardStore = read("artifacts/ecg-insight/context/DashboardStore.ts");
const notificationPage = read("artifacts/ecg-insight/app/(protected)/notifications.tsx");
const supportPage = read("artifacts/ecg-insight/app/(protected)/support.tsx");
const searchService = read("artifacts/ecg-insight/services/search.ts");
const searchRoutes = read("server/src/modules/search/search.routes.ts");
const packageJson = read("package.json");
const enterpriseSeed = read("scripts/enterprise-dashboard-release-seed.ts");
const analyticsPage = read("artifacts/ecg-insight/app/(protected)/analytics.tsx");
const patientProfilePage = read("artifacts/ecg-insight/app/(protected)/patients/[id].tsx");
const copilotRoutes = read("server/src/modules/copilot/copilot.routes.ts");
const notificationCenterService = read("server/src/notifications/notification-center.service.ts");
const casesRoutes = read("server/src/cases/cases.routes.ts");
const aiService = read("server/src/ai/ai.service.ts");
const ecgClinicalService = read("server/src/modules/ecg-files/ecg-clinical.service.ts");
const ocrRoutes = read("server/src/modules/ocr/ocr.routes.ts");
const supportRoutes = read("server/src/modules/support/support.routes.ts");

assert(enterpriseShell.includes("ProtectedRoute") && enterpriseShell.includes("EnterpriseShell"), "Protected shell must own the dashboard architecture.");
assert((enterpriseShell.match(/<MedicalAICopilot/g) ?? []).length === 1, "Exactly one assistant owner may render in the dashboard shell.");
assert((enterpriseShell.match(/accessibilityLabel=\"Notifications\"/g) ?? []).length === 1, "Exactly one notification bell may render in the dashboard shell.");
for (const marker of ["CLINICAL", "WORKSPACE", "DEVELOPER", "/support", "refetchInterval: 15_000", "notificationSearch", "Open Notification History", "PremiumNotificationCard", "RefreshControl", "PanResponder", "hapticReadyInteraction", "notificationDrawerMobile"]) {
  assert(enterpriseShell.includes(marker), `Enterprise shell is missing production dashboard marker: ${marker}`);
}
for (const forbidden of ["\"ai\"] as const", "/(tabs)", "@/components/bolt", "@/components/dashboard"]) {
  assert(!enterpriseShell.includes(forbidden), `Enterprise shell must not contain legacy/conflicting marker: ${forbidden}`);
}

for (const marker of ["AI Clinical Copilot", "quickPrompts", "PanResponder", "setAssistantSize", "streamCopilotMessage", "listCopilotConversations", "getCopilotConversation", "medical-copilot:ask", "updateCopilotConversation", "copilotExportUrl", "copilotExportTxtUrl", "Regenerate", "Duplicate", "Delete", "Archive", "attachClinicalFiles", "MarkdownText", "expandedCitationId"]) {
  assert(assistant.includes(marker), `Lightweight assistant is missing production marker: ${marker}`);
}
for (const marker of ["conversationSidebar", "sidebarGroupTitle", "chatWorkspace", "messageScroller", "messageListContent", "stickyComposer", "quickChips", "messageScrollRef", "scrollToEnd", "Share", "Voice note", "overflow: \"hidden\"", "position: \"sticky\""]) {
  assert(assistant.includes(marker), `Final enterprise copilot UI is missing anti-clipping/layout marker: ${marker}`);
}
assert(!assistant.includes("onPress={() => {}}"), "Assistant must not contain dead button handlers.");
for (const marker of ["streamCopilotMessage", "/copilot/chat/stream", "parseSseEvent", "duplicateCopilotConversation", "archiveCopilotConversation", "copilotExportTxtUrl"]) {
  assert(copilotService.includes(marker), `Copilot frontend service is missing streaming/management marker: ${marker}`);
}

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

for (const forbidden of ["Normal: 8", "Abnormal: 3", "Math.random", "onPress={() => {}}", "coming soon", "placeholder widget", "fake widget"]) {
  assert(!enterpriseShell.toLowerCase().includes(forbidden.toLowerCase()), `Enterprise shell contains forbidden dead/fake marker: ${forbidden}`);
  assert(!analyticsPage.toLowerCase().includes(forbidden.toLowerCase()), `Analytics page contains forbidden dead/fake marker: ${forbidden}`);
  assert(!patientProfilePage.toLowerCase().includes(forbidden.toLowerCase()), `Patient profile contains forbidden dead/fake marker: ${forbidden}`);
}
assert(analyticsPage.includes("No analytics yet") && analyticsPage.includes("diagnosisDistribution ?? {}"), "Analytics charts must use real empty states instead of fake fallback values.");
assert(patientProfilePage.includes("onOpen={(item)") && patientProfilePage.includes("metadata.caseId") && patientProfilePage.includes("metadata.reportId"), "Patient timeline actions must resolve to real routes or tabs.");

for (const marker of ["retrieveClinicalContext", "Patient Profile", "Previous ECG", "Cardiovascular Document", "retrieveKnowledge", "ECG Knowledge Base", "DISCLAIMER", "citations", "favorite", "updateConversationSchema", "/chat/stream", "writeSse", "streamAssistantContent", "duplicate", "archive", "export.txt", "auditCopilotError", "copilotUsageEvent"]) {
  assert(copilotRoutes.includes(marker), `Copilot backend is missing context/RAG/persistence marker: ${marker}`);
}
for (const marker of ["createUnifiedNotification", "unreadNotificationCount", "processScheduledNotifications", "emitRealtime", "REPORT_GENERATION", "read: false"]) {
  assert(notificationCenterService.includes(marker), `Notification center backend is missing persistence/realtime marker: ${marker}`);
}
for (const marker of ["ECG uploaded", "New ECG Case Assigned", "Critical ECG case", "ECG Review Completed"]) {
  assert(casesRoutes.includes(marker), `Case workflow must generate notification marker: ${marker}`);
}
for (const marker of ["AI analysis completed", "Immediate clinical review required", "createNotification"]) {
  assert(aiService.includes(marker), `AI workflow must generate notification marker: ${marker}`);
}
for (const marker of ["createNotification", "ClinicalAlert"]) {
  assert(ecgClinicalService.includes(marker), `ECG clinical file workflow must generate alert/notification marker: ${marker}`);
}
for (const marker of ["OCR failure", "notifyOcrFailure", "createNotification"]) {
  assert(ocrRoutes.includes(marker), `OCR workflow must generate failure notification marker: ${marker}`);
}
assert(supportRoutes.includes("SupportTicket") && supportRoutes.includes("createNotification"), "Support tickets must persist and notify operators.");
assert(packageJson.includes("db:seed:enterprise-dashboard"), "Enterprise dashboard release seed command must be registered.");
for (const marker of ["ORG_COUNT = 10", "DOCTOR_COUNT = 100", "PATIENT_COUNT = 1_000", "CASE_COUNT = 10_000", "REPORT_COUNT = 1_000", "NOTIFICATION_COUNT = 5_000", "CONVERSATION_COUNT = 1_000", "MESSAGE_COUNT = 10_000", "release-copilot-conversation", "release-copilot-message", "skipDuplicates", "RuleBasedRAG"]) {
  assert(enterpriseSeed.includes(marker), `Enterprise dashboard release seed is missing marker: ${marker}`);
}

console.log("Dashboard production lockdown integration checks passed.");
