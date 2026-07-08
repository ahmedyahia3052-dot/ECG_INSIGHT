import fs from "node:fs";
import { runIntegrationMain } from "./finish-integration";
import {
  INTEGRATION_ENTRYPOINT,
  NPM_TEST_INTEGRATION_COMMAND,
  integrationScripts,
  releaseDocs,
  releaseE2eSpecs,
  releaseLoadScript,
} from "./integration/pipeline.mjs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path: string, markers: string[]) {
  const content = read(path);
  for (const marker of markers) {
    if (!content.includes(marker)) {
      throw new Error(`${path} is missing required Sprint 37 marker: ${marker}`);
    }
  }
}

for (const path of [
  "server/src/modules/release-candidate/release-candidate.service.ts",
  "server/src/modules/release-candidate/release-candidate.routes.ts",
  "artifacts/ecg-insight/services/releaseCandidate.ts",
  "tests/e2e/release-candidate.spec.ts",
  releaseLoadScript,
  "scripts/integration/pipeline.mjs",
  INTEGRATION_ENTRYPOINT,
  ...releaseDocs,
]) {
  if (!fs.existsSync(path)) throw new Error(`Missing Sprint 37 artifact: ${path}`);
}

assertContains("server/src/modules/release-candidate/release-candidate.service.ts", [
  "Workflow A",
  "Workflow B",
  "Workflow C",
  "Workflow D",
  "releaseReadinessScore",
  "performanceBenchmarkSnapshot",
  "bugBashSummary",
  INTEGRATION_ENTRYPOINT,
]);

assertContains("server/src/modules/release-candidate/release-candidate.routes.ts", [
  "/dashboard",
  "/workflows",
  "/performance",
  "/bug-bash",
]);

assertContains("server/src/modules/index.ts", ["releaseCandidateRouter", "/release-candidate"]);

assertContains("artifacts/ecg-insight/services/releaseCandidate.ts", [
  "getReleaseCandidateDashboard",
  "getReleaseWorkflowValidation",
  "ReleaseCandidateDashboard",
  "releaseReadinessScore",
  "bugBash",
]);

assertContains("package.json", [
  "release:load",
  NPM_TEST_INTEGRATION_COMMAND,
]);

assertContains(INTEGRATION_ENTRYPOINT, [
  'from "./integration/pipeline.mjs"',
  "integrationScripts",
]);

assertContains("scripts/integration/pipeline.mjs", [
  "sprint37-release-candidate.integration.ts",
  INTEGRATION_ENTRYPOINT,
]);

for (const script of integrationScripts) {
  if (!fs.existsSync(script)) {
    throw new Error(`Integration registry references missing script: ${script}`);
  }
}

for (const spec of releaseE2eSpecs) {
  if (!fs.existsSync(spec)) {
    throw new Error(`Release E2E spec missing: ${spec}`);
  }
}

assertContains("reports/SPRINT_37_RELEASE_CANDIDATE_REPORT.md", [
  "End-to-End Platform Validation",
  "Automated E2E Test Suite",
  "Load and Stress Testing",
  "Final Release Dashboard",
]);

console.log(`Sprint 37 release candidate integration checks passed (${integrationScripts.length} scripts in canonical pipeline).`);

runIntegrationMain(async () => undefined, "Sprint 37 release candidate integration checks");
