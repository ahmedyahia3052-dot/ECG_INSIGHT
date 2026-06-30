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
const conversationModel = prismaSchema.split("model CopilotConversation {")[1]?.split("model CopilotMessage {")[0] ?? "";

for (const marker of [
  "CopilotWorkspaceScreen",
  "ConversationList",
  "lastMessagePreview",
  "New Chat",
  "startNewChat",
  "streamCopilotMessage",
  "getCopilotConversation",
  "listCopilotConversations",
  "MessageCard",
  "AttachmentChip",
  "Voice",
  "Upload ECG",
  "Upload Files",
  "Upload Image",
  "attachmentPreviews",
  "autoExportPdf",
  "shareConversation",
  "analysisSummary",
  "documentType",
  "medicalAnalysis",
]) {
  assert(workspace.includes(marker), `Simplified Copilot workspace missing marker: ${marker}`);
}

for (const removed of ["Rename", "Pin", "Favorite", "Archive", "Duplicate", "renameModalOpen", "ConversationAction", "groupedConversations"]) {
  assert(!workspace.includes(removed), `Simplified workspace still contains removed management marker: ${removed}`);
}

assert(conversationRoute.includes("useLocalSearchParams") && conversationRoute.includes("conversationId") && conversationRoute.includes("CopilotWorkspaceScreen"), "Dynamic /copilot/:conversationId route must restore chat history.");
assert(dashboard.includes('label="Open AI Copilot"') && dashboard.includes('router.push("/copilot"'), "Dashboard must expose Copilot only as a clean route entry point.");
assert(enterpriseShell.includes('href: "/copilot"'), "Enterprise navigation must expose /copilot.");
assert(!enterpriseShell.includes("<MedicalAICopilot"), "Enterprise shell must not mount the retired floating Copilot widget.");

for (const marker of ["CopilotConversation", "CopilotMessage", "CopilotAttachment", "@@index([userId])", "@@index([conversationId])", "@@index([updatedAt])"]) {
  assert(prismaSchema.includes(marker), `Prisma copilot chat model missing marker: ${marker}`);
}
for (const removed of ["favorite", "isPinned", "isFavorite", "archivedAt", "deletedAt", "lastOpenedAt"]) {
  assert(!conversationModel.includes(removed), `CopilotConversation still contains removed management field: ${removed}`);
}

for (const marker of [
  "automaticConversationTitle",
  'copilotRouter.get("/conversations"',
  'copilotRouter.post("/conversations"',
  'copilotRouter.get("/conversations/:conversationId"',
  'copilotRouter.post("/chat/stream"',
  "lastMessagePreview",
  "registeredCopilotRoutes",
]) {
  assert(copilotRoutes.includes(marker), `Copilot backend missing simplified chat marker: ${marker}`);
}
for (const removed of ["/rename", "/pin", "/favorite", "/archive", "/duplicate", "mutableConversationForUser"]) {
  assert(!copilotRoutes.includes(removed), `Copilot backend still contains removed management route/code: ${removed}`);
}

for (const marker of ["listCopilotConversations", "getCopilotConversation", "streamCopilotMessage", "uploadCopilotAttachment", "downloadCopilotExport"]) {
  assert(copilotService.includes(marker), `Copilot service missing simplified chat marker: ${marker}`);
}
for (const removed of ["renameCopilotConversation", "pinCopilotConversation", "favoriteCopilotConversation", "archiveCopilotConversation", "duplicateCopilotConversation", "deleteCopilotConversation", "updateCopilotConversation"]) {
  assert(!copilotService.includes(removed), `Copilot service still contains removed management helper: ${removed}`);
}

console.log("AI Clinical Copilot workspace foundation integration checks passed.");
