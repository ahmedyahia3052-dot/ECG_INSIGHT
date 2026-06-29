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
const enterpriseShell = read("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx");
const copilotService = read("artifacts/ecg-insight/services/copilot.ts");
const copilotRoutes = read("server/src/modules/copilot/copilot.routes.ts");
const prismaSchema = read("prisma/schema.prisma");

for (const marker of [
  "CopilotWorkspaceScreen",
  "ConversationGroup",
  "MessageCard",
  "ContextLine",
  "Conversations",
  "Context Panel",
  "AI Clinical Copilot",
  "Create Conversation",
  "Rename Conversation",
  "Delete Conversation",
  "Interpret ECG",
  "Generate Impression",
  "Patient Summary",
  "Differential Diagnosis",
  "Occupational Fitness",
  "Follow-up Plan",
  "TextInput",
  "streamCopilotMessage",
  "createCopilotConversation",
  "updateCopilotConversation",
  "deleteCopilotConversation",
  "getCopilotConversation",
  "listCopilotConversations",
]) {
  assert(workspace.includes(marker), `Copilot workspace route is missing marker: ${marker}`);
}

assert(enterpriseShell.includes('href: "/copilot"'), "Enterprise navigation must expose /copilot.");
assert(enterpriseShell.includes('"/copilot"') && enterpriseShell.includes("AI Clinical Copilot"), "Enterprise shell must define copilot page metadata.");
assert(enterpriseShell.includes('pathname === "/copilot" ? null : <MedicalAICopilot />'), "Floating assistant must be hidden on the full workspace route.");

for (const marker of ["CopilotConversation", "CopilotMessage", "@relation", "@@index([userId])", "@@index([conversationId])"]) {
  assert(prismaSchema.includes(marker), `Prisma copilot persistence model is missing marker: ${marker}`);
}

for (const marker of [
  'copilotRouter.get("/conversations"',
  'copilotRouter.post("/conversations"',
  'copilotRouter.patch("/conversations/:conversationId"',
  'copilotRouter.delete("/conversations/:conversationId"',
  'copilotRouter.post("/chat/stream"',
  "conversationForUser",
  "prisma.copilotConversation",
  "prisma.copilotMessage",
]) {
  assert(copilotRoutes.includes(marker), `Copilot API is missing real CRUD/chat marker: ${marker}`);
}

for (const marker of ["createCopilotConversation", "updateCopilotConversation", "deleteCopilotConversation", "streamCopilotMessage"]) {
  assert(copilotService.includes(marker), `Copilot frontend service is missing marker: ${marker}`);
}

assert(!workspace.includes("onPress={() => {}}"), "Copilot workspace must not contain dead buttons.");
assert(!workspace.toLowerCase().includes("mock"), "Copilot workspace must not contain mocked workflows.");

console.log("AI Clinical Copilot workspace foundation integration checks passed.");
