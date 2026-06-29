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

for (const marker of [
  "routeConversationId",
  "navigateConversation",
  "router.push(`/copilot/${conversationId}`",
  "router.replace(\"/copilot\"",
  "selectedQuery.isError",
  "Rename",
  "Rename Conversation",
  "renameModalOpen",
  "renameCopilotConversation",
  "openRenameDialog",
  "Pin",
  "Unpin",
  "pinCopilotConversation",
  "Favorite",
  "Unfavorite",
  "favoriteCopilotConversation",
  "Archive",
  "Restore",
  "Delete",
  "Duplicate",
  "groupedConversations.pinned",
  "groupedConversations.favorites",
  "groupedConversations.archived",
  "mobileSidebarOpen",
  "contextOpen",
  "Regenerate",
  "Continue",
  "Copy answer",
  "applyConversationPatch",
  "setQueriesData",
  "📌",
  "★",
]) {
  assert(workspace.includes(marker), `Workspace stabilization marker missing: ${marker}`);
}

assert(conversationRoute.includes("useLocalSearchParams") && conversationRoute.includes("conversationId") && conversationRoute.includes("CopilotWorkspaceScreen"), "Dynamic /copilot/:conversationId route must restore workspace state.");

for (const marker of ["isPinned", "isFavorite", "archivedAt", "lastOpenedAt", "@@index([isPinned])", "@@index([isFavorite])", "@@index([archivedAt])", "@@index([lastOpenedAt])"]) {
  assert(schema.includes(marker), `Prisma schema missing copilot persistence marker: ${marker}`);
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
  "copilotRouter.patch(\"/conversations/:conversationId/rename\"",
  "copilotRouter.patch(\"/conversations/:conversationId/pin\"",
  "copilotRouter.patch(\"/conversations/:conversationId/favorite\"",
  "renameConversationSchema",
  "pinConversationSchema",
  "favoriteConversationSchema",
  "duplicate",
  "archivedAt: new Date()",
  "archivedAt: null",
  "writeSse(res, \"token\"",
]) {
  assert(routes.includes(marker), `Copilot API stabilization marker missing: ${marker}`);
}

for (const marker of ["isPinned", "isFavorite", "archivedAt", "lastOpenedAt", "restoreCopilotConversation", "renameCopilotConversation", "pinCopilotConversation", "favoriteCopilotConversation", "streamCopilotMessage"]) {
  assert(service.includes(marker), `Copilot service stabilization marker missing: ${marker}`);
}

assert(!workspace.includes("onPress={() => {}}"), "Workspace must not contain dead actions.");
assert(!workspace.includes("title.replace(\" copy\""), "Rename action must not fake-copy titles.");
assert(!routes.includes("[Archived]"), "Archive system must not rely on title prefixes.");

console.log("AI Clinical Copilot stabilization integration checks passed.");
