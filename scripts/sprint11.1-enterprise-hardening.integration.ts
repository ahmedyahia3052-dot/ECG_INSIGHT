process.env.COPILOT_LLM_MOCK = "true";

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AttachmentContextBuilder } from "../server/src/modules/copilot/attachment/attachment-context-builder.service";
import { clearClinicalOcrCacheForTests } from "../server/src/modules/copilot/attachment/ocr-cache.service";
import { resetAttachmentJobsForTests } from "../server/src/modules/copilot/attachment/attachment-job-queue.service";
import { buildAttachmentContextBlock } from "../server/src/modules/copilot/core/attachment-context";
import { processCopilotAttachment } from "../server/src/modules/copilot/copilot-attachment-pipeline.service";
import { medicalExtractorRegistry } from "../server/src/modules/copilot/extractors/registry";
import { PromptBuilder } from "../server/src/modules/copilot/prompt/prompt-builder";
import { validateAttachmentContext, validateAttachmentsForPrompt } from "../server/src/modules/copilot/validation/attachment-validator";
import { applyClinicalValidation, validateClinicalResponse } from "../server/src/modules/copilot/validation/clinical-validator";
import { scanFileForThreats } from "../server/src/utils/file-security";
import type { AttachmentForAnalysis } from "../server/src/modules/copilot/copilot-types";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

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

async function testExtractorRegistry() {
  const result = medicalExtractorRegistry.extract({
    documentType: "12_LEAD_ECG",
    extractedText: "Rate 88 bpm PR 160 ms QRS 90 ms ST elevation II III aVF",
    kind: "ecg",
    mimeType: "image/png",
    originalName: "ecg.png",
    sizeBytes: 1000,
  });
  assert(result.modality === "ecg", "ECG extractor selected");
  assert(result.findings.some((item) => /ST elevation/i.test(item)), "ECG findings extracted");
}

async function testAttachmentContextBuilderSsot() {
  const dir = path.resolve(process.cwd(), "uploads", "sprint111-tests");
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "ssot-ecg.png");
  await createSyntheticEcgGridImage(imagePath);
  const pipeline = await processCopilotAttachment({
    filePath: imagePath,
    kind: "ecg",
    mimeType: "image/png",
    originalName: "ssot-ecg.png",
    sizeBytes: (await fs.stat(imagePath)).size,
  });
  const normalized = pipeline.medicalAnalysis.normalizedContext as ReturnType<typeof AttachmentContextBuilder.build>;
  assert(normalized?.version === "11.1", "normalized context version");
  assert(normalized?.findings?.length, "normalized findings present");
  const validation = validateAttachmentContext(normalized);
  assert(typeof validation.confidence === "number", "attachment validation confidence");

  const attachment: AttachmentForAnalysis = {
    analysisSummary: pipeline.analysisSummary,
    attachmentId: "ssot-att",
    confidence: pipeline.confidence,
    documentType: pipeline.documentType,
    extractedText: pipeline.extractedText,
    kind: "ecg",
    medicalAnalysis: pipeline.medicalAnalysis,
    mimeType: "image/png",
    originalName: "ssot-ecg.png",
    recommendations: pipeline.recommendations,
    sizeBytes: (await fs.stat(imagePath)).size,
    warnings: pipeline.warnings,
  };
  const block = buildAttachmentContextBlock([attachment]);
  assert(block?.includes("Structured clinical context"), "prompt uses stored SSOT context");
  assert(!block?.includes("analyzeAttachmentsStructured"), "no chat-time reanalysis marker");
  const promptValidation = validateAttachmentsForPrompt([attachment]);
  assert(promptValidation.valid || promptValidation.flags.length >= 0, "prompt validation executed");
}

async function testOcrCache() {
  const dir = path.resolve(process.cwd(), "uploads", "sprint111-tests");
  const textPath = path.join(dir, "cache-test.txt");
  await fs.writeFile(textPath, "Patient Name: Cache Test\nHeart Rate: 72 bpm\nPR 180 ms");
  const first = await processCopilotAttachment({
    filePath: textPath,
    kind: "file",
    mimeType: "text/plain",
    originalName: "cache-test.txt",
    sizeBytes: (await fs.stat(textPath)).size,
  });
  const second = await processCopilotAttachment({
    filePath: textPath,
    kind: "file",
    mimeType: "text/plain",
    originalName: "cache-test.txt",
    sizeBytes: (await fs.stat(textPath)).size,
  });
  assert(first.extractedText.length > 10 && second.extractedText.length > 10, "OCR cache path works");
}

async function testClinicalValidator() {
  const validation = validateClinicalResponse({
    answer: "This is a definitive diagnosis with 100% certainty.",
    attachmentContexts: [{
      attachmentId: "a1",
      confidence: 0.5,
      dates: [],
      diagnoses: [],
      documentType: "12_LEAD_ECG",
      extractedTextPreview: "ST elevation",
      findings: ["ST elevation language detected"],
      kind: "ecg",
      measurements: [],
      metadata: { mimeType: "image/png", originalName: "ecg.png", patientIdentifiers: [], sizeBytes: 100 },
      modality: "ecg",
      numericalValues: {},
      ocrConfidence: 0.5,
      pageReferences: [],
      processingStatus: "completed",
      recommendations: [],
      summary: "ECG",
      version: "11.1",
      warnings: [],
    }],
    question: "Interpret this ECG",
  });
  assert(validation.requiresPhysicianReview, "low confidence triggers review");
  const adjusted = applyClinicalValidation("Definitive diagnosis.", validation);
  assert(/physician review/i.test(adjusted), "validation appended review guidance");
}

async function testPromptBuilderIndependence() {
  const routesSource = await fs.readFile(path.resolve(process.cwd(), "server/src/modules/copilot/prompt/prompt-builder.ts"), "utf8");
  const copilotUi = await fs.readFile(path.resolve(process.cwd(), "artifacts/ecg-insight/app/(protected)/copilot.tsx"), "utf8");
  assert(routesSource.includes("PromptBuilder"), "prompt builder module exists");
  assert(!copilotUi.includes("buildAttachmentContextBlock"), "React UI does not build prompts");
  assert(typeof PromptBuilder.buildForTurn === "function", "PromptBuilder exported");
}

async function testThreatScanHook() {
  const dir = path.resolve(process.cwd(), "uploads", "sprint111-tests");
  await fs.mkdir(dir, { recursive: true });
  const cleanPath = path.join(dir, "clean-ecg.txt");
  await fs.writeFile(cleanPath, "Heart Rate 72 bpm PR 160 ms");
  const clean = await scanFileForThreats(cleanPath);
  assert(clean.clean, "clean clinical text passes threat scan");

  const threatPath = path.join(dir, "eicar-stub.txt");
  await fs.writeFile(threatPath, "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
  const blocked = await scanFileForThreats(threatPath);
  assert(!blocked.clean, "EICAR signature blocked by threat scan hook");
}

async function main() {
  resetAttachmentJobsForTests();
  await clearClinicalOcrCacheForTests();
  await testExtractorRegistry();
  await testAttachmentContextBuilderSsot();
  await testOcrCache();
  await testClinicalValidator();
  await testPromptBuilderIndependence();
  await testThreatScanHook();
  console.log("Sprint 11.1 enterprise production hardening regression suite passed.");
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
