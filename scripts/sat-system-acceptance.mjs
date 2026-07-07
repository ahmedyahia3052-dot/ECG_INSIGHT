/**
 * System Acceptance Test (SAT) orchestrator — Sprint 46.1 sequential Playwright.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..");
const startedAt = new Date().toISOString();

const steps = [
  { name: "lint", command: "npm run lint" },
  { name: "typecheck", command: "npm run typecheck" },
  { name: "build", command: "npm run build" },
  { name: "integration", command: "node scripts/run-integration-suite.mjs" },
  { name: "playwright-sequential", command: "node scripts/run-playwright-sequential.mjs --suite=sat" },
];

const results = [];

for (const step of steps) {
  console.log(`\n[sat] ▶ ${step.name}\n`);
  const result = spawnSync(step.command, {
    cwd: repoRoot,
    env: { ...process.env, PLAYWRIGHT_FRESH_SESSION: "1" },
    shell: true,
    stdio: "inherit",
  });
  const passed = result.status === 0;
  results.push({ name: step.name, passed, exitCode: result.status ?? 1 });
  if (!passed) {
    console.error(`\n[sat] ✖ ${step.name} failed (exit ${result.status ?? "unknown"})\n`);
    break;
  }
  console.log(`\n[sat] ✔ ${step.name} passed\n`);
}

const summary = {
  startedAt,
  finishedAt: new Date().toISOString(),
  passed: results.every((item) => item.passed),
  steps: results,
};

const outPath = path.join(repoRoot, "SAT_RUN_SUMMARY.json");
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log("\n[sat] Summary:", JSON.stringify(summary, null, 2));
process.exit(summary.passed ? 0 : 1);
