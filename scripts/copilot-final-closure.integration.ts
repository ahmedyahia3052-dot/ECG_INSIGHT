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
const dashboard = read("artifacts/ecg-insight/app/(protected)/dashboard.tsx");
const copilotService = read("artifacts/ecg-insight/services/copilot.ts");
const copilotRoutes = read("server/src/modules/copilot/copilot.routes.ts");
const enterpriseShell = read("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx");

assert(!enterpriseShell.includes("<MedicalAICopilot"), "Floating Copilot widget must not be mounted in the shell.");
assert(!dashboard.includes("MedicalAICopilot"), "Dashboard must not embed the Copilot widget.");
assert(dashboard.includes("Open AI Copilot"), "Dashboard must expose a clean route button for Copilot.");

for (const marker of [
  "New Chat",
  "ConversationList",
  "lastMessagePreview",
  "Start a clinical conversation",
  "MessageCard",
  "composer",
  "streamCopilotMessage",
  "selectedConversation?.title",
  "New Clinical Conversation",
  "Voice",
  "Upload ECG",
  "Upload Files",
  "Upload Image",
  "attachmentPreviews",
  "shareConversation",
  "analysisSummary",
]) {
  assert(workspace.includes(marker), `Simplified Copilot workspace marker missing: ${marker}`);
}

for (const removed of ["Search Conversations", "Pinned Conversations", "Favorites", "Archived Conversations", "Rename", "Pin", "Favorite", "Archive", "Duplicate", "Interpret ECG", "Generate Impression", "Patient Summary", "Differential Diagnosis", "Follow-up Plan", "Generate Report", "autoExportPdf"]) {
  assert(!workspace.includes(removed), `Simplified Copilot workspace still contains removed management UI: ${removed}`);
}

for (const marker of ["retrieveClinicalContext", "Previous ECGs", "Documents:", "DISCLAIMER", "Confidence Score", "citations", "responseTimeMs", "copilotUsageEvent", "/chat/stream", "/attachments", "automaticConversationTitle", "analyzeUploadedAttachment", "detectAttachmentDocumentType", "readBestEffortOcrText", "retrieveConversationMemory", "shouldRetrieveKnowledge"]) {
  assert(copilotRoutes.includes(marker), `Copilot backend missing real chat/context marker: ${marker}`);
}
for (const removed of ["/rename", "/pin", "/favorite", "/archive", "/duplicate"]) {
  assert(!copilotRoutes.includes(removed), `Copilot backend still contains removed management route: ${removed}`);
}

for (const marker of ["streamCopilotMessage", "getCopilotConversation", "listCopilotConversations", "lastMessagePreview"]) {
  assert(copilotService.includes(marker), `Copilot service missing simplified workflow marker: ${marker}`);
}

console.log("AI Clinical Copilot final closure integration checks passed.");
