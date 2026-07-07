/**
 * Sprint 46.1 — Production CI pipeline orchestrator.
 * Infrastructure only — sequential Playwright, deterministic gates.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QA_DIRS } from "./qa/config.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..");
const startedAt = new Date().toISOString();

const steps = [
  { name: "infra-health", command: "npm run infra:health", required: true },
  { name: "lint", command: "npm run lint", required: true },
  { name: "typecheck", command: "npm run typecheck", required: true },
  { name: "build", command: "npm run build", required: true },
  { name: "unit-tests", command: "npm run qa:unit", required: true },
  { name: "integration", command: "npm run qa:integration", required: true },
  { name: "playwright-smoke", command: "node scripts/run-playwright-sequential.mjs --suite=smoke", required: true },
  { name: "playwright-enterprise", command: "node scripts/run-playwright-sequential.mjs --suite=enterprise", required: true },
  { name: "sat", command: "npm run qa:sat", required: false },
  { name: "regression", command: "npm run qa:regression", required: false },
  { name: "artifacts", command: "node scripts/qa/generate-pipeline-artifacts.mjs", required: false },
];

const results = [];

for (const step of steps) {
  console.log(`\n[ci-pipeline] ▶ ${step.name}\n`);
  const result = spawnSync(step.command, {
    cwd: repoRoot,
    env: { ...process.env, PLAYWRIGHT_FRESH_SESSION: "1" },
    shell: true,
    stdio: "inherit",
  });
  const passed = result.status === 0;
  results.push({ name: step.name, passed, exitCode: result.status ?? 1, required: step.required });
  if (!passed && step.required) {
    console.error(`\n[ci-pipeline] ✖ required step failed: ${step.name}\n`);
    break;
  }
  if (passed) console.log(`\n[ci-pipeline] ✔ ${step.name} passed\n`);
}

const summary = {
  finishedAt: new Date().toISOString(),
  passed: results.filter((item) => item.required).every((item) => item.passed),
  startedAt,
  steps: results,
};

fs.mkdirSync(QA_DIRS.artifacts, { recursive: true });
fs.writeFileSync(path.join(QA_DIRS.artifacts, "ci-pipeline-summary.json"), JSON.stringify(summary, null, 2));
console.log("\n[ci-pipeline] Summary:", JSON.stringify(summary, null, 2));
process.exit(summary.passed ? 0 : 1);
