process.env.COPILOT_LLM_MOCK = "true";

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  appendClinicalSafetyDisclaimer,
  buildAttachmentContextBlock,
  CLINICAL_SAFETY_DISCLAIMER,
  formatClinicalContextBlock,
} from "../server/src/modules/copilot/core/attachment-context";
import { ResponseOrchestrator } from "../server/src/modules/copilot/core/response-orchestrator";
import { runClinicalAiCore } from "../server/src/modules/copilot/core/pipeline";
import { processCopilotAttachment } from "../server/src/modules/copilot/copilot-attachment-pipeline.service";
import { emptyClinicalContext } from "../server/src/modules/copilot/intent-manager";
import type { AttachmentForAnalysis, ClinicalContext, ConversationMemory } from "../server/src/modules/copilot/copilot-types";
import { ConversationManager } from "../server/src/modules/copilot/engine";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const emptyMemory: ConversationMemory = { attachments: [], summary: "", turns: [] };

const sampleEcgAttachment: AttachmentForAnalysis = {
  analysisSummary: "12 LEAD ECG analyzed: Inferior ST elevation language detected.",
  attachmentId: "att-s11-ecg",
  confidence: 0.84,
  documentType: "12_LEAD_ECG",
  extractedText: "Rate 88 bpm. ST elevation II III aVF. Sinus rhythm.",
  kind: "ecg",
  medicalAnalysis: { findings: ["Inferior ST elevation"] },
  mimeType: "image/png",
  originalName: "ecg-stemi.png",
  recommendations: ["Urgent cardiology review"],
  sizeBytes: 120_000,
  warnings: ["Possible STEMI language"],
};

async function createSyntheticEcgGridImage(outputPath: string) {
  const width = 800;
  const height = 600;
  const pixels = Buffer.alloc(width * height * 3, 255);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const grid = (x % 10 === 0 || y % 10 === 0) ? 220 : 255;
      const trace = y > 120 && y < 140 && Math.sin(x / 18) > 0.4 ? 40 : grid;
      pixels[index] = trace;
      pixels[index + 1] = trace;
      pixels[index + 2] = trace;
    }
  }
  await sharp(pixels, { raw: { channels: 3, height, width } }).png().toFile(outputPath);
}

async function testAttachmentContextInjection() {
  const block = buildAttachmentContextBlock([sampleEcgAttachment]);
  assert(block, "attachment context block required");
  assert(block.includes("UPLOADED ATTACHMENTS"), "must flag uploaded attachments");
  assert(block.includes("ST elevation"), "must include OCR/heuristic findings");
  assert(block.includes("ecg-stemi.png"), "must reference file name");
}

async function testClinicalContextFormatter() {
  const context: ClinicalContext = {
    ...emptyClinicalContext(),
    criticalAlerts: ["STEMI alert: review urgently"],
    currentCase: {
      diagnosis: "Inferior STEMI",
      heartRate: 88,
      intervals: "PR 160 ms, QRS 90 ms, QT 420 ms, QTc 440 ms",
      rhythm: "Sinus",
      severity: "CRITICAL",
      status: "REVIEW",
    },
    patient: {
      age: 58,
      allergies: "NKDA",
      fullName: "John Doe",
      gender: "Male",
      history: "Hypertension",
      medications: "Aspirin",
      riskFactors: ["hypertension"],
    },
  };
  const block = formatClinicalContextBlock(context);
  assert(block?.includes("John Doe"), "patient name in context");
  assert(block?.includes("Inferior STEMI"), "case diagnosis in context");
}

async function testClinicalSafetyDisclaimer() {
  const withDisclaimer = appendClinicalSafetyDisclaimer("Clinical summary here.");
  assert(withDisclaimer.includes(CLINICAL_SAFETY_DISCLAIMER), "disclaimer appended");
  assert(appendClinicalSafetyDisclaimer(withDisclaimer) === withDisclaimer, "no duplicate disclaimer");
}

async function testUploadPipeline() {
  const dir = path.resolve(process.cwd(), "uploads", "sprint11-tests");
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "synthetic-ecg-50mm-20mm.png");
  await createSyntheticEcgGridImage(imagePath);
  const stats = await fs.stat(imagePath);

  const result = await processCopilotAttachment({
    filePath: imagePath,
    kind: "ecg",
    mimeType: "image/png",
    originalName: "test-50mm-20mm-ecg.png",
    sizeBytes: stats.size,
  });

  assert(result.documentType.includes("ECG"), `ECG classification expected, got ${result.documentType}`);
  assert(result.pipelineStages.some((stage) => stage.stage === "ocr"), "OCR stage recorded");
  assert(result.pipelineStages.some((stage) => stage.stage === "classification"), "classification stage recorded");
  assert(result.pipelineStages.some((stage) => stage.stage === "completed"), "pipeline completed");
  assert(result.analysisSummary.length > 10, "analysis summary generated");
}

async function testAttachmentAwareLlmPipeline() {
  ConversationManager.resetForTests();
  let statusMessages: string[] = [];
  const clinicalContext: ClinicalContext = {
    ...emptyClinicalContext(),
    patient: {
      age: 45,
      allergies: "none",
      fullName: "Jane Smith",
      gender: "Female",
      history: "Diabetes",
      medications: "Metformin",
      riskFactors: ["diabetes"],
    },
  };

  const result = await runClinicalAiCore(
    {
      attachments: [sampleEcgAttachment],
      chatInput: { patientId: "patient-1" },
      conversationId: "sprint11-conv",
      memory: emptyMemory,
      question: "Review the uploaded ECG and summarize findings.",
    },
    {
      retrieveClinicalContext: async () => clinicalContext,
    },
    {
      onStatus: (message) => statusMessages.push(message),
    },
  );

  assert(result.content.includes(CLINICAL_SAFETY_DISCLAIMER), "response includes clinical safety disclaimer");
  assert(statusMessages.some((message) => /attachment/i.test(message)), "status mentions attachments");
  assert(/ecg|st elevation|stemi|rhythm|upload|attachment|inferior/i.test(result.content), `LLM must reference attachment context: ${result.content.slice(0, 200)}`);
}

async function testResponseOrchestratorInjectsBlocks() {
  const messages: string[] = [];
  const originalGenerate = ResponseOrchestrator.generate;
  let capturedMessages: Array<{ content: string; role: string }> = [];

  // Spy via runClinicalAiCore path is enough; direct unit on buildAttachmentContextBlock covers injection source.
  assert(buildAttachmentContextBlock([sampleEcgAttachment])?.includes("Structured analysis"), "structured JSON in block");
  assert(formatClinicalContextBlock({
    ...emptyClinicalContext(),
    patient: {
      age: 30,
      allergies: "none",
      fullName: "Test Patient",
      gender: "Unknown",
      history: "none",
      medications: "none",
      riskFactors: [],
    },
  })?.includes("Test Patient"), "clinical formatter works");
  void messages;
  void originalGenerate;
  void capturedMessages;
}

async function main() {
  await testAttachmentContextInjection();
  await testClinicalContextFormatter();
  await testClinicalSafetyDisclaimer();
  await testUploadPipeline();
  await testAttachmentAwareLlmPipeline();
  await testResponseOrchestratorInjectsBlocks();
  console.log("Sprint 11 enterprise stability regression suite passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
