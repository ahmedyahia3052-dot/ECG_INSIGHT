/**
 * RC-1 Production Readiness orchestrator — validation only, no new features.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..");
const startedAt = new Date().toISOString();

const steps = [
  { name: "lint", command: "npm run lint", required: true },
  { name: "typecheck", command: "npm run typecheck", required: true },
  { name: "build", command: "npm run build", required: true },
  { name: "qa-unit", command: "npm run qa:unit", required: true },
  { name: "qa-integration", command: "npm run qa:integration", required: true },
  { name: "qa-sat", command: "npm run qa:sat", required: true },
  { name: "playwright-full", command: "npx playwright test --grep-invert @stress", required: true },
  { name: "qa-regression", command: "npm run qa:regression", required: false },
  { name: "qa-performance", command: "npm run qa:performance", required: false },
  { name: "qa-visual", command: "npx playwright test tests/e2e/visual-regression-enterprise.spec.ts --grep @visual-regression", required: false },
  { name: "accessibility", command: "npx playwright test tests/e2e/accessibility.spec.ts --grep @accessibility", required: false },
];

const results = [];

for (const step of steps) {
  console.log(`\n[rc1] ▶ ${step.name}\n`);
  const result = spawnSync(step.command, {
    cwd: repoRoot,
    env: { ...process.env, QA_INCLUDE_SPRINT38: "1" },
    shell: true,
    stdio: "inherit",
  });
  const passed = result.status === 0;
  results.push({ name: step.name, passed, exitCode: result.status ?? 1, required: step.required });
  if (!passed && step.required) {
    console.error(`\n[rc1] ✖ required step failed: ${step.name}\n`);
    break;
  }
  if (passed) console.log(`\n[rc1] ✔ ${step.name} passed\n`);
}

const summary = {
  tag: "RC-1",
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: results.filter((r) => r.required).every((r) => r.passed),
  steps: results,
};

fs.writeFileSync(path.join(repoRoot, "RC1_RUN_SUMMARY.json"), JSON.stringify(summary, null, 2));
console.log("\n[rc1] Summary:", JSON.stringify(summary, null, 2));
process.exit(summary.passed ? 0 : 1);
