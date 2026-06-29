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
const dashboard = read("artifacts/ecg-insight/app/(protected)/dashboard.tsx");
const enterpriseShell = read("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx");
const copilotService = read("artifacts/ecg-insight/services/copilot.ts");
const copilotRoutes = read("server/src/modules/copilot/copilot.routes.ts");
const prismaSchema = read("prisma/schema.prisma");

for (const marker of [
  "CopilotWorkspaceScreen",
  "ConversationGroup",
  "MessageCard",
  "RichMedicalText",
  "CitationList",
  "ContextLine",
  "Clinical Copilot Workspace",
  "New Chat",
  "Search Conversations",
  "Pinned Conversations",
  "Favorites",
  "Recent Conversations",
  "Archived Conversations",
  "Interpret ECG",
  "Generate Impression",
  "Patient Summary",
  "Differential Diagnosis",
  "Occupational Fitness",
  "Follow-up Plan",
  "Generate Report",
  "Voice",
  "Upload ECG",
  "Upload Echo",
  "Upload Labs",
  "Attach Files",
  "toggleVoiceInput",
  "openFilePicker",
  "uploadComposerFile",
  "AttachmentChip",
  "attachmentIds",
  "Voice input is not supported by this browser.",
  "Microphone permission denied.",
  "uploadingFiles",
  "Uploading",
  "shareConversation",
  "exportConversation",
  "Export PDF",
  "Export TXT",
  "Share",
  "downloadBlob",
  "downloadCopilotExport",
  "WORKSPACE_STATE_KEY",
  "localStorage.setItem",
  "localStorage.getItem",
  "Unsupported format.",
  "File too large.",
  "streamCopilotMessage",
  "createCopilotConversation",
  "renameCopilotConversation",
  "pinCopilotConversation",
  "favoriteCopilotConversation",
  "deleteCopilotConversation",
  "getCopilotConversation",
  "listCopilotConversations",
]) {
  assert(workspace.includes(marker), `Copilot workspace route is missing marker: ${marker}`);
}

assert(conversationRoute.includes("useLocalSearchParams") && conversationRoute.includes("conversationId") && conversationRoute.includes("CopilotWorkspaceScreen"), "Dynamic /copilot/:conversationId route must restore workspace state.");
assert(dashboard.includes('label="Open AI Copilot"') && dashboard.includes('router.push("/copilot"'), "Dashboard must expose Copilot only as a clean route entry point.");
assert(enterpriseShell.includes('href: "/copilot"'), "Enterprise navigation must expose /copilot.");
assert(!enterpriseShell.includes("<MedicalAICopilot"), "Enterprise shell must not mount the retired floating Copilot widget.");

for (const marker of ["CopilotAttachment", "CopilotConversation", "CopilotMessage", "@@index([userId])", "@@index([conversationId])", "@@index([messageId])", "@@index([isPinned])", "@@index([isFavorite])", "@@index([archivedAt])", "@@index([deletedAt])"]) {
  assert(prismaSchema.includes(marker), `Prisma copilot persistence model is missing marker: ${marker}`);
}

for (const marker of [
  'copilotRouter.get("/conversations"',
  'copilotRouter.post("/conversations"',
  'copilotRouter.patch("/conversations/:conversationId/rename"',
  'copilotRouter.patch("/conversations/:conversationId/pin"',
  'copilotRouter.patch("/conversations/:conversationId/favorite"',
  'copilotRouter.patch("/conversations/:conversationId/archive"',
  'copilotRouter.delete("/conversations/:conversationId"',
  "registeredCopilotRoutes",
  "PATCH /api/copilot/conversations/:conversationId/rename",
  "PATCH /api/copilot/conversations/:conversationId/pin",
  "PATCH /api/copilot/conversations/:conversationId/favorite",
  "PATCH /api/copilot/conversations/:conversationId/archive",
  'copilotRouter.post("/chat/stream"',
  'copilotRouter.post("/attachments"',
  "conversationForUser",
  "retrieveClinicalContext",
  "prisma.copilotAttachment",
  "prisma.copilotConversation",
  "prisma.copilotMessage",
]) {
  assert(copilotRoutes.includes(marker), `Copilot API is missing real CRUD/chat marker: ${marker}`);
}

for (const marker of ["copilotExportTxtUrl", "copilotExportUrl", "downloadCopilotExport", "createCopilotConversation", "renameConversation", "deleteConversation", "renameCopilotConversation", "pinCopilotConversation", "favoriteCopilotConversation", "archiveCopilotConversation", "deleteCopilotConversation", "streamCopilotMessage", "uploadCopilotAttachment", "credentials: \"include\"", "X-CSRF-Token"]) {
  assert(copilotService.includes(marker), `Copilot frontend service is missing marker: ${marker}`);
}
assert(copilotService.includes("body: JSON.stringify({ isPinned })") && copilotService.includes("method: \"PATCH\""), "Pin client must call the explicit PATCH endpoint with isPinned.");
assert(copilotService.includes("body: JSON.stringify({ isFavorite })") && copilotService.includes("method: \"PATCH\""), "Favorite client must call the explicit PATCH endpoint with isFavorite.");
assert(copilotService.includes("archive`, {\n    accessToken,\n    method: \"PATCH\""), "Archive client must call the explicit PATCH endpoint.");
assert(!copilotService.includes("togglePin") && !copilotService.includes("toggleFavorite") && !copilotService.includes("toggleArchive"), "Copilot action client must not keep deprecated POST toggle helpers.");
assert(!copilotRoutes.includes('copilotRouter.post("/conversations/:conversationId/pin"') && !copilotRoutes.includes('copilotRouter.post("/conversations/:conversationId/favorite"') && !copilotRoutes.includes('copilotRouter.post("/conversations/:conversationId/archive"'), "Copilot backend must not keep deprecated POST action routes.");

assert(!workspace.includes("onPress={() => {}}"), "Copilot workspace must not contain dead buttons.");
assert(!workspace.toLowerCase().includes("mock"), "Copilot workspace must not contain mocked workflows.");

console.log("AI Clinical Copilot workspace foundation integration checks passed.");
