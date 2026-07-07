import fs from "node:fs";
import path from "node:path";
import {
  assessRiskForDiagnosis,
  buildDifferentialForFinding,
  getDiagnosisByCode,
  getMicHealth,
  getRecommendationsForDiagnosis,
  listArrhythmias,
  listDiagnoses,
  listIschemiaEntities,
  listMeasurementReferences,
  lookupGuidelines,
} from "../server/src/modules/medical-intelligence-core/mic-core";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const repoRoot = process.cwd();
const micDir = path.join(repoRoot, "server", "src", "modules", "medical-intelligence-core");
const serverIndex = fs.readFileSync(path.join(repoRoot, "server", "src", "modules", "index.ts"), "utf8");
const pipeline = fs.readFileSync(path.join(repoRoot, "scripts", "integration", "pipeline.mjs"), "utf8");

const requiredModules = [
  "types.ts",
  "mic-core.ts",
  "mic.routes.ts",
  "mic.schemas.ts",
  "data/diagnoses.ts",
  "data/arrhythmias.ts",
  "data/ischemia.ts",
  "data/measurements.ts",
  "data/guidelines.ts",
  "engines/recommendation-engine.ts",
  "engines/differential-engine.ts",
  "engines/risk-stratification.ts",
  "engines/guideline-registry.ts",
  "persist/seed.ts",
];

for (const file of requiredModules) {
  assert(fs.existsSync(path.join(micDir, file)), `Missing MIC module: ${file}`);
}

assert(serverIndex.includes('modulesRouter.use("/mic"'), "MIC API must be registered at /mic");
assert(pipeline.includes("sprint40-medical-intelligence-core.integration.ts"), "Pipeline must register Sprint 40 integration");

const health = getMicHealth();
assert(health.engineId === "ecg-medical-intelligence-core", "MIC engine id mismatch");
assert(health.counts.diagnoses >= 24, "MIC diagnosis catalog too small");
assert(health.counts.arrhythmias === 12, "MIC arrhythmia library must include 12 entities");
assert(health.counts.ischemiaEntities === 9, "MIC ischemia library must include 9 entities");
assert(health.counts.measurementReferences === 8, "MIC measurement references must include 8 parameters");
assert(health.counts.guidelines >= 6, "MIC guideline registry too small");
assert(health.counts.riskRules >= 6, "MIC risk rules too small");

const af = getDiagnosisByCode("AF");
assert(af?.name === "Atrial Fibrillation", "AF diagnosis lookup failed");
assert(af?.icd10Code && af?.snomedCode, "AF must include coding placeholders");
assert(af?.definition.length > 20, "AF definition must be structured");
assert(af?.diagnosticCriteria.length >= 2, "AF diagnostic criteria required");

const stemi = getDiagnosisByCode("STEMI_ANT");
assert(stemi?.emergencyLevel === "critical", "Anterior STEMI must be critical");

const recommendations = getRecommendationsForDiagnosis("NSTEMI");
assert(recommendations.some((entry) => entry.type === "troponin"), "NSTEMI must map to troponin");

const differential = buildDifferentialForFinding("ST_ELEVATION");
assert(differential.length >= 3, "ST elevation differential must rank multiple diagnoses");
assert(differential[0].confidence >= differential[1].confidence, "Differential must be confidence-ranked");

const risk = assessRiskForDiagnosis("VT");
assert(risk?.level === "critical", "VT risk must be critical");

const prRef = listMeasurementReferences().find((entry) => entry.parameter === "PR");
assert(prRef?.normalMin === 120 && prRef?.normalMax === 200, "PR reference range invalid");

assert(listArrhythmias().some((entry) => entry.name === "Atrial Fibrillation"), "Arrhythmia library missing AF");
assert(listIschemiaEntities().some((entry) => entry.pattern === "posterior"), "Ischemia library missing posterior");
assert(lookupGuidelines({ organization: "ESC" }).length >= 2, "ESC guidelines required");
assert(listDiagnoses({ category: "ischemia" }).length >= 8, "Ischemia diagnosis category under-populated");

const reports = ["MIC_ARCHITECTURE.md", "KNOWLEDGE_BASE_REPORT.md", "DATABASE_SCHEMA.md", "API_REPORT.md", "CHANGELOG.md"];
for (const report of reports) {
  assert(fs.existsSync(path.join(repoRoot, report)), `Missing Sprint 40 report: ${report}`);
}

console.log("Sprint 40 Medical Intelligence Core integration passed.");
