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

for (const chip of [
  "Interpret ECG",
  "Generate Impression",
  "Patient Summary",
  "Differential Diagnosis",
  "Occupational Fitness",
  "Follow-up Plan",
  "Generate Report",
]) {
  assert(workspace.includes(chip), `Top action bar chip is missing: ${chip}`);
}

for (const marker of [
  "Current Patient",
  "Demographics",
  "Active ECG",
  "ECG Metadata",
  "Uploaded Files",
  "Labs",
  "Echo Reports",
  "Clinical History",
  "Search Conversations",
  "Pinned Conversations",
  "Favorites",
  "Recent Conversations",
  "Archived Conversations",
  "accessibilityRole=\"button\"",
  "scrollToEnd",
  "messageList",
  "chatPanel",
  "composer",
  "contextPanel",
  "sidebar",
  "mobileSidebarOpen",
  "Shift+Enter",
]) {
  assert(workspace.includes(marker), `Enterprise workspace marker missing: ${marker}`);
}

assert(!workspace.includes("quickGrid"), "Legacy quick action grid must be removed.");
assert(!workspace.includes("conversationStrip"), "Legacy conversation strip must be removed.");
assert(!workspace.includes("sidebarScroll"), "Nested sidebar scrolling must be removed.");

for (const marker of ["streamCopilotMessage", "getCopilotConversation", "listCopilotConversations", "updateCopilotConversation", "deleteCopilotConversation"]) {
  assert(copilotService.includes(marker), `Copilot service missing real workflow marker: ${marker}`);
}

for (const marker of ["retrieveClinicalContext", "Previous ECGs", "Documents:", "DISCLAIMER", "Confidence Score", "citations", "responseTimeMs", "copilotUsageEvent", "/chat/stream"]) {
  assert(copilotRoutes.includes(marker), `Copilot backend missing real context/safety/observability marker: ${marker}`);
}

console.log("AI Clinical Copilot final closure integration checks passed.");
