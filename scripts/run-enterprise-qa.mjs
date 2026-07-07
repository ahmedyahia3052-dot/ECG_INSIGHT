/**
 * Master enterprise QA orchestrator — Sprint 46.1 sequential Playwright isolation.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QA_DIRS } from "./qa/config.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..");

const steps = [
  { name: "lint", command: "npm run lint", required: true },
  { name: "typecheck", command: "npm run typecheck", required: true },
  { name: "build", command: "npm run build", required: true },
  { name: "unit-tests", command: "node scripts/run-unit-tests.mjs", required: true },
  { name: "integration", command: "node scripts/run-integration-suite.mjs", required: true },
  { name: "playwright-coverage-audit", command: "node scripts/qa/audit-playwright-coverage.mjs", required: true },
  { name: "integration-coverage-audit", command: "node scripts/qa/audit-integration-coverage.mjs", required: false },
  { name: "playwright-sequential", command: "node scripts/run-playwright-sequential.mjs", required: true },
  { name: "playwright-accessibility", command: "node scripts/run-playwright-sequential.mjs --suite=accessibility", required: false },
  { name: "playwright-visual", command: "node scripts/run-playwright-sequential.mjs --suite=visual", required: false, env: { QA_UPDATE_SNAPSHOTS: "1" } },
  { name: "performance-benchmark", command: "node scripts/qa/performance-benchmark.mjs", required: false },
  { name: "accessibility-audit", command: "node scripts/qa/accessibility-audit.mjs", required: false },
  { name: "generate-dashboard", command: "node scripts/qa/generate-dashboard.mjs", required: false },
];

fs.mkdirSync(QA_DIRS.artifacts, { recursive: true });

const startedAt = new Date().toISOString();
const results = [];

for (const step of steps) {
  console.log(`\n[enterprise-qa] ▶ ${step.name}\n`);
  const updateSnapshots = step.name === "playwright-visual" && process.env.QA_UPDATE_SNAPSHOTS === "1";
  let command = step.command;
  if (step.name === "playwright-visual" && updateSnapshots) {
    command = "npx playwright test tests/e2e/visual-regression-enterprise.spec.ts --grep @visual-regression --update-snapshots --project=chromium-desktop";
  }

  const result = spawnSync(command, {
    cwd: repoRoot,
    env: { ...process.env, PLAYWRIGHT_FRESH_SESSION: "1", ...step.env },
    shell: true,
    stdio: "inherit",
  });
  const passed = result.status === 0;
  results.push({ name: step.name, passed, exitCode: result.status ?? 1, required: step.required });
  if (!passed && step.required) {
    console.error(`\n[enterprise-qa] ✖ required step failed: ${step.name}\n`);
    break;
  }
}

const summary = {
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: results.filter((r) => r.required).every((r) => r.passed),
  steps: results,
};

fs.writeFileSync(path.join(QA_DIRS.artifacts, "regression-summary.json"), JSON.stringify(summary, null, 2));
spawnSync("node scripts/qa/generate-dashboard.mjs", { cwd: repoRoot, shell: true, stdio: "inherit" });

console.log("\n[enterprise-qa] Summary:", JSON.stringify(summary, null, 2));
process.exit(summary.passed ? 0 : 1);
