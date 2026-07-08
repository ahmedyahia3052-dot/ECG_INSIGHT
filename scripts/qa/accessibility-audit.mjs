/**
 * Accessibility audit runner — aggregates axe results from Playwright accessibility specs.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { QA_DIRS, REPO_ROOT } from "./config.mjs";

const result = spawnSync(
  "npx",
  ["playwright", "test", "tests/e2e/accessibility.spec.ts", "--grep", "@accessibility", "--project=chromium-desktop"],
  { cwd: REPO_ROOT, shell: true, encoding: "utf8", stdio: "pipe" },
);

const report = {
  generatedAt: new Date().toISOString(),
  exitCode: result.status ?? 1,
  passed: result.status === 0,
  stdout: result.stdout?.slice(-4000) ?? "",
  stderr: result.stderr?.slice(-4000) ?? "",
  checks: [
    "Keyboard navigation via Playwright actions",
    "Axe critical violation scan on core screens",
    "Focus via button roles on auth and dashboard",
    "ARIA via React Native Web accessibilityRole mappings",
    "Contrast rule disabled in CI axe config (manual review tracked)",
  ],
};

fs.mkdirSync(QA_DIRS.artifacts, { recursive: true });
fs.writeFileSync(path.join(QA_DIRS.artifacts, "accessibility-summary.json"), JSON.stringify(report, null, 2));
console.log(`[accessibility] ${report.passed ? "PASS" : "FAIL"}`);
process.exit(report.passed ? 0 : 1);
