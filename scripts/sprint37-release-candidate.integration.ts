import fs from "node:fs";

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
  "artifacts/ecg-insight/app/(tabs)/release-candidate.tsx",
  "tests/e2e/release-candidate.spec.ts",
  "scripts/release-candidate-regression.ts",
  "scripts/release-candidate-load.ts",
  "SPRINT_37_RELEASE_CANDIDATE_REPORT.md",
  "PRODUCTION_DEPLOYMENT_GUIDE.md",
  "LAUNCH_CHECKLIST.md",
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
]);

assertContains("server/src/modules/release-candidate/release-candidate.routes.ts", [
  "/dashboard",
  "/workflows",
  "/performance",
  "/bug-bash",
]);

assertContains("server/src/modules/index.ts", ["releaseCandidateRouter", "/release-candidate"]);

assertContains("artifacts/ecg-insight/app/(tabs)/release-candidate.tsx", [
  "Final Release Dashboard",
  "End-to-End Workflow Validation",
  "Performance and Load",
  "Outstanding Risks",
  "Bug Bash and Regression",
]);

assertContains("package.json", [
  "release:candidate",
  "release:load",
  "sprint37-release-candidate.integration.ts",
]);

assertContains("SPRINT_37_RELEASE_CANDIDATE_REPORT.md", [
  "End-to-End Platform Validation",
  "Automated E2E Test Suite",
  "Load and Stress Testing",
  "Final Release Dashboard",
]);

console.log("Sprint 37 release candidate integration checks passed.");
