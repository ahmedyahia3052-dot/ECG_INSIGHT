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
  "Drag & drop",
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

for (const marker of ["CopilotConversation", "CopilotMessage", "@@index([userId])", "@@index([conversationId])", "@@index([isPinned])", "@@index([isFavorite])", "@@index([archivedAt])"]) {
  assert(prismaSchema.includes(marker), `Prisma copilot persistence model is missing marker: ${marker}`);
}

for (const marker of [
  'copilotRouter.get("/conversations"',
  'copilotRouter.post("/conversations"',
  'copilotRouter.patch("/conversations/:conversationId"',
  'copilotRouter.delete("/conversations/:conversationId"',
  'copilotRouter.post("/chat/stream"',
  "conversationForUser",
  "retrieveClinicalContext",
  "prisma.copilotConversation",
  "prisma.copilotMessage",
]) {
  assert(copilotRoutes.includes(marker), `Copilot API is missing real CRUD/chat marker: ${marker}`);
}

for (const marker of ["createCopilotConversation", "renameCopilotConversation", "pinCopilotConversation", "favoriteCopilotConversation", "deleteCopilotConversation", "streamCopilotMessage", "credentials: \"include\"", "X-CSRF-Token"]) {
  assert(copilotService.includes(marker), `Copilot frontend service is missing marker: ${marker}`);
}

assert(!workspace.includes("onPress={() => {}}"), "Copilot workspace must not contain dead buttons.");
assert(!workspace.toLowerCase().includes("mock"), "Copilot workspace must not contain mocked workflows.");

console.log("AI Clinical Copilot workspace foundation integration checks passed.");
