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
const migration = read("prisma/migrations/20260629181000_copilot_conversation_stabilization/migration.sql");
const floating = read("artifacts/ecg-insight/components/copilot/MedicalAICopilot.tsx");

for (const marker of [
  "routeConversationId",
  "loadConversationById",
  "restoreConversationFromRoute",
  "safeRouteFallback",
  "router.push(`/copilot/${payload.conversation.id}`",
  "router.replace(\"/copilot\"",
  "selectedQuery.isError",
  "Pin",
  "Unpin",
  "Favorite",
  "Unfavorite",
  "Archive",
  "Restore",
  "Duplicate",
  "groupedConversations.pinned",
  "groupedConversations.favorites",
  "groupedConversations.archived",
]) {
  assert(workspace.includes(marker), `Workspace stabilization marker missing: ${marker}`);
}

assert(conversationRoute.includes("useLocalSearchParams") && conversationRoute.includes("conversationId") && conversationRoute.includes("CopilotWorkspaceScreen"), "Dynamic /copilot/:conversationId route must restore workspace state.");

for (const marker of ["isPinned", "isFavorite", "archivedAt", "lastOpenedAt", "@@index([isPinned])", "@@index([isFavorite])", "@@index([archivedAt])", "@@index([lastOpenedAt])"]) {
  assert(schema.includes(marker), `Prisma schema missing copilot persistence marker: ${marker}`);
  assert(migration.includes(marker.replace("@@index([", "").replace("])", "")) || migration.includes(`"${marker}"`), `Migration missing copilot persistence marker: ${marker}`);
}

for (const marker of [
  "isPinned: z.boolean()",
  "isFavorite: z.boolean()",
  "archivedAt: z.coerce.date().nullable()",
  "lastOpenedAt",
  "messages: { some:",
  "prisma.patient.findMany",
  "prisma.eCGCase.findMany",
  "copilotRouter.post(\"/conversations/:conversationId/restore\"",
  "duplicate",
  "archivedAt: new Date()",
  "archivedAt: null",
]) {
  assert(routes.includes(marker), `Copilot API stabilization marker missing: ${marker}`);
}

for (const marker of ["isPinned", "isFavorite", "archivedAt", "lastOpenedAt", "restoreCopilotConversation"]) {
  assert(service.includes(marker), `Copilot service stabilization marker missing: ${marker}`);
}

for (const marker of ["conversation.isPinned", "conversation.isFavorite", "conversation.archivedAt"]) {
  assert(floating.includes(marker), `Floating copilot must respect new persistence marker: ${marker}`);
}

assert(!workspace.includes("onPress={() => {}}"), "Workspace must not contain dead actions.");
assert(!routes.includes("[Archived]"), "Archive system must not rely on title prefixes.");

console.log("AI Clinical Copilot stabilization integration checks passed.");
