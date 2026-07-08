/**
 * Integration test domain coverage audit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INTEGRATION_DOMAINS, QA_DIRS, REPO_ROOT } from "./config.mjs";

const pipelinePath = path.join(REPO_ROOT, "scripts", "integration", "pipeline.mjs");
const pipelineSource = fs.readFileSync(pipelinePath, "utf8");
const scripts = [...pipelineSource.matchAll(/"(scripts\/[^"]+\.ts)"/g)].map((m) => m[1]);

const domainPatterns = {
  API: /integration|api|auth|patient|case|monetization|enterprise-auth/i,
  "Medical Intelligence Core": /medical-intelligence|copilot-clinical|knowledge/i,
  "ECG Analysis": /ecg-digitization|ecg-analysis|interpretation|diagnosis|wave-detection/i,
  "Measurement Engine": /measurement|caliper|calibration/i,
  Viewer: /viewer|workspace|rendering|visualization|monitor/i,
  "Report Engine": /report|medical-report/i,
  Authentication: /auth|session|security|owner-security/i,
  Database: /patient-case|prisma|dashboard-production/i,
  Caching: /stabilization|recovery|session/i,
  Session: /auth-session|refresh|logout/i,
};

const domains = INTEGRATION_DOMAINS.map((domain) => {
  const pattern = domainPatterns[domain];
  const matched = scripts.filter((s) => pattern.test(s));
  return { domain, scriptCount: matched.length, covered: matched.length > 0, sample: matched.slice(0, 5) };
});

const report = {
  generatedAt: new Date().toISOString(),
  totalIntegrationScripts: scripts.length,
  domains,
  coveredDomains: domains.filter((d) => d.covered).length,
  coveragePct: Number(((domains.filter((d) => d.covered).length / domains.length) * 100).toFixed(1)),
};

fs.mkdirSync(QA_DIRS.artifacts, { recursive: true });
fs.writeFileSync(path.join(QA_DIRS.artifacts, "integration-coverage.json"), JSON.stringify(report, null, 2));
console.log(`Integration domain coverage: ${report.coveredDomains}/${domains.length} (${report.coveragePct}%)`);
process.exit(0);
