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
const copilotWorkspace = read("artifacts/ecg-insight/app/(protected)/copilot.tsx");
const dashboard = read("artifacts/ecg-insight/app/(protected)/dashboard.tsx");
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
const copilotIntentManager = read("server/src/modules/copilot/intent-manager.ts");
const copilotConversationalEngine = read("server/src/modules/copilot/conversational-engine.ts");
const copilotSystemPrompt = read("server/src/modules/copilot/conversation-system-prompt.ts");
const notificationCenterService = read("server/src/notifications/notification-center.service.ts");
const casesRoutes = read("server/src/cases/cases.routes.ts");
const aiService = read("server/src/ai/ai.service.ts");
const ecgClinicalService = read("server/src/modules/ecg-files/ecg-clinical.service.ts");
const ocrRoutes = read("server/src/modules/ocr/ocr.routes.ts");
const supportRoutes = read("server/src/modules/support/support.routes.ts");

assert(enterpriseShell.includes("ProtectedRoute") && enterpriseShell.includes("EnterpriseShell"), "Protected shell must own the dashboard architecture.");
assert(!enterpriseShell.includes("<MedicalAICopilot"), "Dashboard shell must not mount the retired embedded Copilot widget.");
assert(!dashboard.includes("MedicalAICopilot") && dashboard.includes("Open AI Copilot") && dashboard.includes('router.push("/copilot"'), "Dashboard must only expose Copilot as a clean /copilot entry point.");
assert((enterpriseShell.match(/accessibilityLabel=\"Notifications\"/g) ?? []).length === 1, "Exactly one notification bell may render in the dashboard shell.");
for (const marker of ["CLINICAL", "WORKSPACE", "DEVELOPER", "/support", "refetchInterval: 15_000", "notificationSearch", "Open Notification History", "PremiumNotificationCard", "RefreshControl", "PanResponder", "hapticReadyInteraction", "notificationDrawerMobile"]) {
  assert(enterpriseShell.includes(marker), `Enterprise shell is missing production dashboard marker: ${marker}`);
}
for (const forbidden of ["\"ai\"] as const", "/(tabs)", "@/components/bolt", "@/components/dashboard"]) {
  assert(!enterpriseShell.includes(forbidden), `Enterprise shell must not contain legacy/conflicting marker: ${forbidden}`);
}

for (const marker of ["Clinical Copilot Workspace", "streamCopilotMessage", "listCopilotConversations", "getCopilotConversation", "ConversationList", "lastMessagePreview", "startNewChat", "Regenerate", "Continue", "RichMedicalText", "sanitizeAssistantContent", "voiceMode"]) {
  assert(copilotWorkspace.includes(marker), `Full-page Copilot workspace is missing production marker: ${marker}`);
}
for (const removedAutoContext of ["ContextLine", "listPatients", "Patient Profile", "Knowledge Tags", "Medical History"]) {
  assert(!copilotWorkspace.includes(removedAutoContext), `Copilot workspace must not auto-display clinical context marker: ${removedAutoContext}`);
}
for (const marker of ["sidebar", "groupTitle", "chatPanel", "messages", "messageList", "composer", "scrollToEnd", "Voice", "Upload ECG", "Upload Files", "Upload Image", "overflow: \"hidden\"", "mobileSidebarOpen"]) {
  assert(copilotWorkspace.includes(marker), `Final enterprise copilot UI is missing anti-clipping/layout marker: ${marker}`);
}
for (const removed of ["Interpret ECG", "Generate Impression", "Patient Summary", "Differential Diagnosis", "Follow-up Plan", "Generate Report", "autoExportPdf"]) {
  assert(!copilotWorkspace.includes(removed), `Conversational Copilot must not expose workflow generator marker: ${removed}`);
}
assert(!copilotWorkspace.includes("onPress={() => {}}"), "Copilot workspace must not contain dead button handlers.");
for (const marker of ["streamCopilotMessage", "/copilot/chat/stream", "parseSseEvent", "lastMessagePreview", "copilotExportTxtUrl"]) {
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

for (const marker of ["retrieveClinicalContext", "shouldRetrieveClinicalContext", "shouldRetrieveKnowledge", "retrieveConversationMemory", "runCommunicationLayerV1", "CommunicationResponseComposer", "KnowledgeRouter", "runAiBrainV3", "ResponseComposer", "DecisionEngine", "ClinicalPlanner", "MemoryManager", "classifyWithPipeline", "runIntentPipeline", "classifyMedicalIntent", "composeConversationalResponse", "./intent-manager", "./intent-pipeline", "./intent-classifier", "./tool-router", "./brain", "./communication", "LEGAL_DISCLAIMER", "automaticConversationTitle", "lastMessagePreview", "analyzeUploadedAttachment", "detectAttachmentDocumentType", "readBestEffortOcrText", "/chat/stream", "writeSse", "streamAssistantContent", "export.txt", "auditCopilotError", "copilotUsageEvent"]) {
  assert(copilotRoutes.includes(marker), `Copilot backend is missing context/RAG/persistence marker: ${marker}`);
}
for (const marker of ["classifyMedicalIntent", "shouldRetrieveClinicalContext", "shouldRetrieveKnowledge", "greetingResponse", "isFastPathIntent", "conversationTopic"]) {
  assert(copilotIntentManager.includes(marker), `Copilot intent manager is missing marker: ${marker}`);
}
for (const marker of ["composeConversationalResponse", "buildInternalClinicalBrief", "conversationTopic"]) {
  assert(copilotConversationalEngine.includes(marker), `Copilot conversational engine is missing marker: ${marker}`);
}
for (const marker of ["CONVERSATION_SYSTEM_PROMPT", "Senior Clinical Cardiology Assistant", "Never reveal"]) {
  assert(copilotSystemPrompt.includes(marker), `Copilot conversation system prompt is missing marker: ${marker}`);
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
