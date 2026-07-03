import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const copilot = read("artifacts/ecg-insight/app/(protected)/copilot.tsx");
const enterpriseShell = read("artifacts/ecg-insight/components/enterprise/EnterpriseUI.tsx");
const messageList = read("artifacts/ecg-insight/components/copilot/CopilotMessageList.tsx");
const composer = read("artifacts/ecg-insight/components/copilot/CopilotComposer.tsx");
const workspace = read("artifacts/ecg-insight/components/copilot/CopilotResizableWorkspace.tsx");
const copilotService = read("artifacts/ecg-insight/services/copilot.ts");
const uploadPipeline = read("artifacts/ecg-insight/services/uploadPipeline.ts");
const voiceEngine = read("artifacts/ecg-insight/services/voiceEngine.ts");
const ocr = read("server/src/modules/ocr/clinical-ocr.service.ts");

for (const marker of [
  "CopilotMessageList",
  "CopilotComposer",
  "CopilotResizableWorkspace",
  "CopilotClinicalPanel",
  "CopilotErrorBoundary",
  "runUploadPipeline",
  "DEFAULT_UPLOAD_ANALYSIS_PROMPT",
  "showNewMessagesButton",
  "FlashList",
  "pipelineJobs",
  "waveformLevels",
]) {
  assert(copilot.includes(marker) || messageList.includes(marker) || composer.includes(marker), `Sprint 12 marker missing: ${marker}`);
}

assert(messageList.includes("@shopify/flash-list"), "FlashList dependency must be used for virtualization");
assert(composer.includes("COMPOSER_MIN_HEIGHT") && composer.includes("COMPOSER_MAX_HEIGHT"), "Composer height limits required");
assert(Number(composer.match(/COMPOSER_MAX_HEIGHT = (\d+)/)?.[1]) === 120, "Composer max height must be 120px");
assert(workspace.includes("react-resizable-panels"), "Resizable workspace panels required on web");
assert(enterpriseShell.includes("fullBleedPage") && enterpriseShell.includes('pathname.startsWith("/copilot")'), "Copilot must use full-bleed enterprise shell");
assert(copilotService.includes("getCopilotAttachmentProcessing"), "Upload processing poll API client required");
assert(uploadPipeline.includes("runUploadPipeline"), "Upload pipeline 2.0 service required");
assert(voiceEngine.includes("onAudioLevel") && voiceEngine.includes("capturedAudioBytes"), "Voice waveform and capture detection required");
assert(voiceEngine.includes("markStreaming"), "Voice streaming state required");
assert(ocr.includes("threshold"), "Enhanced OCR preprocessing required");

console.log("Sprint 12 enterprise workspace and production UX regression suite passed.");
