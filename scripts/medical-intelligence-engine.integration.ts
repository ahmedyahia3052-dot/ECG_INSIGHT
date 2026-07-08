import { runIntegrationMain } from "./finish-integration";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { runDigitizationPipeline } from "../server/src/modules/ecg-digitization/digitizer";
import { measureFromLeads } from "../server/src/modules/ecg-measurement";
import {
  runMedicalIntelligenceFromMeasurements,
  KNOWLEDGE_BASE,
  listRuleDefinitions,
  getKnowledgeBaseStats,
} from "../server/src/modules/medical-intelligence";

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

async function main() {
  const dir = path.resolve(process.cwd(), "uploads", "medical-intelligence-tests");
  await fs.mkdir(dir, { recursive: true });
  const imagePath = path.join(dir, "synthetic-ecg-medical-intelligence.png");
  await createSyntheticEcgGridImage(imagePath);

  const file = {
    id: "medical-intelligence-test-file",
    metadataJson: {},
    mimeType: "image/png",
    originalName: "test-ecg-medical-intelligence.png",
    sizeBytes: (await fs.stat(imagePath)).size,
    storagePath: imagePath,
  };

  const pipeline = await runDigitizationPipeline(file);
  const measurement = measureFromLeads({ calibration: pipeline.calibration, leads: pipeline.leads });
  const report = runMedicalIntelligenceFromMeasurements(measurement);

  assert(report.findings.length > 0, "Medical intelligence must produce findings");
  assert(report.primaryDiagnosis.label.length > 0, "Primary diagnosis required");
  assert(report.overallConfidence.level, "Overall confidence level required");
  assert(report.recommendations.length > 0, "Clinical recommendations required");
  assert(report.explainabilitySummary.length > 0, "Explainability summary required");

  const stats = getKnowledgeBaseStats();
  assert(stats.totalEntries >= 35, "Knowledge base must have 35+ entries");
  assert(KNOWLEDGE_BASE.every((e) => e.pitfalls.length > 0), "All entries must have pitfalls");
  assert(KNOWLEDGE_BASE.every((e) => e.clinicalNotes.length > 0), "All entries must have clinical notes");

  const rules = listRuleDefinitions();
  assert(rules.length >= 30, "Rule engine must define 30+ rules");

  for (const finding of report.findings) {
    assert(finding.explainability.rationale.length > 0, "Explainability rationale required");
    assert(["high", "medium", "low", "unknown"].includes(finding.confidence.level), "Confidence level enum required");
    assert(finding.differentialDiagnosis.length <= 5, "Max 5 differential diagnoses per finding");
  }

  assert(Object.keys(report.measurements).length >= 10, "Structured measurements required");
  assert(report.version === "1.0.0", "Report version must be 1.0.0");

  console.log("medical-intelligence-engine.integration.ts: all tests passed");
}

runIntegrationMain(main, "medical-intelligence-engine.integration.ts: all tests passed");
