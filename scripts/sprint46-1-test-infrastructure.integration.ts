/**
 * Sprint 46.1 — Enterprise test infrastructure integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const E2E = resolve(ROOT, "tests/e2e");

function assertFileContains(file, markers) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) {
      throw new Error(`Missing marker "${marker}" in ${file}`);
    }
  }
}

const files = [
  { file: resolve(E2E, "test.ts"), markers: ["destroyBrowserSession", "isolatedRequest", "createNetworkMonitor"] },
  { file: resolve(E2E, "utils/session-cleanup.ts"), markers: ["indexedDB", "resetBrowserStorage", "destroyBrowserSession"] },
  { file: resolve(E2E, "utils/auth-infrastructure.ts"), markers: ["freshApiLogin", "validateToken", "destroyApiContext", "freshAuthenticatedPage"] },
  { file: resolve(E2E, "utils/network-stability.ts"), markers: ["createNetworkMonitor", "waitForApiRecovery"] },
  { file: resolve(ROOT, "scripts/run-playwright-sequential.mjs"), markers: ["PLAYWRIGHT_SEQUENTIAL_SUITES", "PLAYWRIGHT_FRESH_SESSION"] },
  { file: resolve(ROOT, "scripts/run-enterprise-ci-pipeline.mjs"), markers: ["infra-health", "playwright-smoke", "playwright-enterprise"] },
  { file: resolve(ROOT, "scripts/qa/generate-pipeline-artifacts.mjs"), markers: ["pipeline-artifacts.json", "playwright-sequential-summary"] },
  { file: resolve(ROOT, "playwright.config.ts"), markers: ["workers: 1", "fullyParallel: false"] },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 46.1 Enterprise Test Infrastructure integration markers: PASS");
