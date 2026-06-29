import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const assistant = read("artifacts/ecg-insight/components/copilot/MedicalAICopilot.tsx");
const copilotService = read("artifacts/ecg-insight/services/copilot.ts");
const copilotRoutes = read("server/src/modules/copilot/copilot.routes.ts");
const enterpriseShell = read("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx");

assert((enterpriseShell.match(/<MedicalAICopilot/g) ?? []).length === 1, "Only one copilot implementation may be mounted.");
assert(assistant.includes("AI Clinical Copilot"), "Frozen header title is missing.");

for (const chip of [
  "Interpret ECG",
  "Generate Impression",
  "Patient Summary",
  "Differential Diagnosis",
  "Occupational Fitness",
  "Follow-up Plan",
  "Generate Report",
  "Explain Findings",
]) {
  assert(assistant.includes(chip), `Quick action chip is missing: ${chip}`);
}

for (const marker of [
  "Patient:",
  "Current ECG:",
  "Current Context:",
  "Case Status:",
  "Context Panel",
  "Patient Name:",
  "Age:",
  "Gender:",
  "Company:",
  "Case ID:",
  "Current ECG ID:",
  "Recent Chats",
  "Pinned Chats",
  "Favorites",
  "Templates",
  "accessibilityLabel=\"Attach files\"",
  "accessibilityLabel=\"Attach ECG\"",
  "accessibilityLabel=\"Voice input\"",
  "accessibilityLabel=\"Send\"",
  "scrollToEnd",
  "messageScroller",
  "stickyComposer",
  "chatWorkspace",
  "compactAssistant",
]) {
  assert(assistant.includes(marker), `Final copilot closure marker missing: ${marker}`);
}

assert((assistant.match(/<ScrollView\s/g) ?? []).length === 1, "Copilot must keep one vertical scrollbar for the conversation only.");
assert(!assistant.includes("onPress={() => {}}"), "Copilot must not contain dead button handlers.");
assert(!assistant.includes("quickGrid"), "Legacy quick action grid must be removed.");
assert(!assistant.includes("conversationStrip"), "Legacy conversation strip must be removed.");
assert(!assistant.includes("sidebarScroll"), "Nested sidebar scrolling must be removed.");

for (const marker of ["streamCopilotMessage", "getCopilotConversation", "listCopilotConversations", "updateCopilotConversation", "deleteCopilotMessage"]) {
  assert(copilotService.includes(marker), `Copilot service missing real workflow marker: ${marker}`);
}

for (const marker of ["retrieveClinicalContext", "Previous ECGs", "Documents:", "DISCLAIMER", "Confidence Score", "citations", "responseTimeMs", "copilotUsageEvent", "/chat/stream"]) {
  assert(copilotRoutes.includes(marker), `Copilot backend missing real context/safety/observability marker: ${marker}`);
}

console.log("AI Clinical Copilot final closure integration checks passed.");
