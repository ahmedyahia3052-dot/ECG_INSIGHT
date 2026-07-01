import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const workspace = read("artifacts/ecg-insight/app/(protected)/copilot.tsx");
const conversationRoute = read("artifacts/ecg-insight/app/(protected)/copilot/[conversationId].tsx");
const service = read("artifacts/ecg-insight/services/copilot.ts");
const routes = read("server/src/modules/copilot/copilot.routes.ts");
const schema = read("prisma/schema.prisma");
const conversationModel = schema.split("model CopilotConversation {")[1]?.split("model CopilotMessage {")[0] ?? "";

for (const marker of [
  "routeConversationId",
  "navigateConversation",
  "router.push(`/copilot/${conversationId}`",
  "router.replace(\"/copilot\"",
  "selectedQuery.isError",
  "New Clinical Conversation",
  "ConversationList",
  "lastMessagePreview",
  "startNewChat",
  "messages.map",
  "scrollToEnd",
  "WORKSPACE_STATE_KEY",
  "Voice",
  "Upload ECG",
  "Upload Files",
  "Upload Image",
  "attachmentPreviews",
  "sanitizeAssistantContent",
]) {
  assert(workspace.includes(marker), `Workspace simplified-chat marker missing: ${marker}`);
}

for (const removed of ["Rename", "Pin", "Favorite", "Archive", "Duplicate", "renameCopilotConversation", "pinCopilotConversation", "favoriteCopilotConversation", "archiveCopilotConversation", "duplicateCopilotConversation", "ConversationAction", "Interpret ECG", "Generate Impression", "Patient Summary", "Differential Diagnosis", "Follow-up Plan", "Generate Report", "autoExportPdf"]) {
  assert(!workspace.includes(removed), `Workspace still contains removed management marker: ${removed}`);
}

assert(conversationRoute.includes("useLocalSearchParams") && conversationRoute.includes("conversationId") && conversationRoute.includes("CopilotWorkspaceScreen"), "Dynamic /copilot/:conversationId route must restore workspace state.");

for (const marker of ["id", "title", "createdAt", "updatedAt", "messages", "@@index([updatedAt])"]) {
  assert(conversationModel.includes(marker), `CopilotConversation simplified model missing marker: ${marker}`);
}
for (const removed of ["favorite", "isPinned", "isFavorite", "archivedAt", "deletedAt", "lastOpenedAt"]) {
  assert(!conversationModel.includes(removed), `CopilotConversation still contains removed management field: ${removed}`);
}

for (const marker of [
  "automaticConversationTitle",
  "New Clinical Conversation",
  "lastMessagePreview",
  "prisma.copilotConversation.findMany",
  "orderBy: { updatedAt: \"desc\" }",
  "copilotRouter.post(\"/chat/stream\"",
  "copilotRouter.get(\"/conversations/:conversationId\"",
  "analyzeUploadedAttachment",
  "detectAttachmentDocumentType",
  "readBestEffortOcrText",
  "medicalAnalysis",
  "retrieveConversationMemory",
  "runClinicalCopilotEngine",
]) {
  assert(routes.includes(marker), `Copilot backend simplified-chat marker missing: ${marker}`);
}
for (const removed of ["renameConversationSchema", "pinConversationSchema", "favoriteConversationSchema", "mutableConversationForUser", "/rename", "/pin", "/favorite", "/archive", "/duplicate"]) {
  assert(!routes.includes(removed), `Copilot backend still contains removed management code: ${removed}`);
}

for (const marker of ["listCopilotConversations", "getCopilotConversation", "streamCopilotMessage", "CopilotConversation", "lastMessagePreview"]) {
  assert(service.includes(marker), `Copilot service simplified-chat marker missing: ${marker}`);
}
for (const removed of ["renameConversation", "pinCopilotConversation", "favoriteCopilotConversation", "archiveCopilotConversation", "duplicateCopilotConversation", "deleteCopilotConversation", "updateCopilotConversation"]) {
  assert(!service.includes(removed), `Copilot service still contains removed management helper: ${removed}`);
}

console.log("AI Clinical Copilot stabilization integration checks passed.");
