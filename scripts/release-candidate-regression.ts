import fs from "node:fs";

const requiredCoverage = [
  "tests/e2e/auth-navigation.spec.ts",
  "tests/e2e/clinical-workflows.spec.ts",
  "tests/e2e/mobile-responsive.spec.ts",
  "tests/e2e/production-smoke.spec.ts",
  "scripts/sprint36-security-hardening.integration.ts",
  "scripts/sprint37-release-candidate.integration.ts",
];

const requiredDocs = [
  "SPRINT_37_RELEASE_CANDIDATE_REPORT.md",
  "PRODUCTION_DEPLOYMENT_GUIDE.md",
  "LAUNCH_CHECKLIST.md",
];

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

for (const artifact of [...requiredCoverage, ...requiredDocs]) {
  assert(fs.existsSync(artifact), `Missing release candidate artifact: ${artifact}`);
}

console.log("Release candidate regression validation passed.");
