/**
 * Sprint 46.1 — Sequential Playwright execution.
 * Each suite runs in an isolated Playwright process with fresh browser contexts.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..");

const excludeStress = '--grep-invert "@stress"';
const excludeSprint38 = process.env.QA_INCLUDE_SPRINT38 === "1" ? "" : ' --grep-invert "@sprint38"';
const desktop = "--project=chromium-desktop";

export const PLAYWRIGHT_SEQUENTIAL_SUITES = {
  smoke: {
    command: `npx playwright test --grep @smoke ${excludeStress}${excludeSprint38} ${desktop}`,
    required: true,
  },
  enterprise: {
    command: `npx playwright test --grep @enterprise ${excludeStress}${excludeSprint38} ${desktop}`,
    required: true,
  },
  clinical: {
    command: `npx playwright test tests/e2e/clinical-workflows.spec.ts tests/e2e/ecg-workspace-restoration.spec.ts ${desktop}`,
    required: true,
  },
  restoration: {
    command: `npx playwright test tests/e2e/ecg-workspace-restoration.spec.ts tests/e2e/sprint30-clinical-workflow.spec.ts ${desktop}`,
    required: false,
  },
  auth: {
    command: `npx playwright test tests/e2e/auth-logout-regression.spec.ts tests/e2e/login-screen-stability.spec.ts tests/e2e/production-smoke.spec.ts ${desktop}`,
    required: true,
  },
  sat: {
    command: `npx playwright test tests/e2e/clinical-workflows.spec.ts tests/e2e/ecg-workspace-restoration.spec.ts tests/e2e/sprint36-clinical-validation.spec.ts tests/e2e/sprint37-live-monitor.spec.ts tests/e2e/auth-logout-regression.spec.ts tests/e2e/login-screen-stability.spec.ts tests/e2e/production-smoke.spec.ts ${excludeStress}${excludeSprint38} ${desktop}`,
    required: true,
  },
  sprint36_38: {
    command: `npx playwright test tests/e2e/sprint36-clinical-validation.spec.ts tests/e2e/sprint37-live-monitor.spec.ts tests/e2e/sprint38-ai-cardiologist.spec.ts ${desktop}`,
    required: false,
  },
  mobile: {
    command: "npx playwright test tests/e2e/mobile-responsive.spec.ts --grep @smoke --project=mobile-iphone --project=tablet-ipad",
    required: false,
  },
  accessibility: {
    command: `npx playwright test tests/e2e/accessibility.spec.ts --grep @accessibility ${desktop}`,
    required: false,
  },
  visual: {
    command: `npx playwright test tests/e2e/visual-regression-enterprise.spec.ts --grep @visual-regression ${desktop}`,
    required: false,
  },
  renderEngine2: {
    command: `npx playwright test tests/e2e/render-engine-2-hospital-visualization.spec.ts --grep @render-engine-2 ${desktop}`,
    required: false,
  },
  full: {
    command: `npx playwright test ${excludeStress} ${desktop}`,
    required: false,
  },
};

function sleep(ms) {
  if (ms <= 0) return;
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    // Cooldown between isolated Playwright processes.
  }
}

const args = process.argv.slice(2);
const suiteArg = args.find((arg) => arg.startsWith("--suite="))?.split("=")[1];
const allFlag = args.includes("--all");

const selected =
  suiteArg && PLAYWRIGHT_SEQUENTIAL_SUITES[suiteArg]
    ? [[suiteArg, PLAYWRIGHT_SEQUENTIAL_SUITES[suiteArg]]]
    : allFlag
      ? Object.entries(PLAYWRIGHT_SEQUENTIAL_SUITES)
      : [
          ["smoke", PLAYWRIGHT_SEQUENTIAL_SUITES.smoke],
          ["clinical", PLAYWRIGHT_SEQUENTIAL_SUITES.clinical],
          ["enterprise", PLAYWRIGHT_SEQUENTIAL_SUITES.enterprise],
          ["auth", PLAYWRIGHT_SEQUENTIAL_SUITES.auth],
        ];

const startedAt = new Date().toISOString();
const results = [];
const cooldownMs = Number(process.env.PLAYWRIGHT_SUITE_COOLDOWN_MS ?? 2_000);

for (const [name, suite] of selected) {
  if (results.length > 0) sleep(cooldownMs);
  console.log(`\n[playwright-sequential] ▶ ${name}\n`);
  const result = spawnSync(suite.command, {
    cwd: repoRoot,
    env: {
      ...process.env,
      PLAYWRIGHT_FRESH_SESSION: "1",
      PLAYWRIGHT_SUITE_NAME: name,
    },
    shell: true,
    stdio: "inherit",
  });
  const passed = result.status === 0;
  results.push({ name, passed, exitCode: result.status ?? 1, required: suite.required });
  if (!passed && suite.required) {
    console.error(`\n[playwright-sequential] ✖ required suite failed: ${name}\n`);
    break;
  }
  if (passed) console.log(`\n[playwright-sequential] ✔ ${name} passed\n`);
}

const summary = {
  finishedAt: new Date().toISOString(),
  passed: results.filter((item) => item.required).every((item) => item.passed),
  startedAt,
  steps: results,
};

const outDir = path.join(repoRoot, "test-results", "qa-artifacts");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "playwright-sequential-summary.json"), JSON.stringify(summary, null, 2));
console.log("\n[playwright-sequential] Summary:", JSON.stringify(summary, null, 2));
process.exit(summary.passed ? 0 : 1);
