/**
 * Generates enterprise QA dashboard JSON + HTML from latest artifact runs.
 */
import fs from "node:fs";
import path from "node:path";
import { QA_DIRS, REPO_ROOT, THRESHOLDS, WORKFLOW_MATRIX } from "./config.mjs";

function readJson(file, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function appendHistory(name, payload) {
  fs.mkdirSync(QA_DIRS.history, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  fs.writeFileSync(path.join(QA_DIRS.history, `${name}-${stamp}.json`), JSON.stringify(payload, null, 2));
}

const artifacts = QA_DIRS.artifacts;
const unit = readJson(path.join(artifacts, "unit-test-summary.json"), { total: 0, passed: 0, failed: 0 });
const playwright = readJson(path.join(artifacts, "playwright-coverage-matrix.json"), { coveragePct: 0, coveredWorkflows: 0, totalWorkflows: WORKFLOW_MATRIX.length });
const integration = readJson(path.join(artifacts, "integration-coverage.json"), { coveragePct: 0 });
const accessibility = readJson(path.join(artifacts, "accessibility-summary.json"), { passed: false });
const performance = readJson(path.join(QA_DIRS.performance, "benchmark.json"), { passed: false });
const regression = readJson(path.join(artifacts, "regression-summary.json"), { passed: false });

const dashboard = {
  generatedAt: new Date().toISOString(),
  targets: THRESHOLDS,
  coverage: {
    unitTests: unit,
    integrationDomainsPct: integration.coveragePct ?? 0,
    playwrightWorkflowsPct: playwright.coveragePct ?? 0,
    unitCoverageEstimatePct: unit.total ? Number(((unit.passed / unit.total) * 100).toFixed(1)) : 0,
  },
  gates: {
    accessibility: accessibility.passed ?? false,
    performance: performance.passed ?? false,
    regression: regression.passed ?? false,
  },
  workflows: playwright.matrix ?? WORKFLOW_MATRIX,
  trend: {
    note: "Historical JSON snapshots stored in test-results/qa-history/",
  },
};

appendHistory("dashboard", dashboard);
fs.mkdirSync(QA_DIRS.dashboard, { recursive: true });
fs.writeFileSync(path.join(QA_DIRS.dashboard, "dashboard.json"), JSON.stringify(dashboard, null, 2));

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><title>ECG Insight QA Dashboard</title>
<style>
body{font-family:Inter,Segoe UI,sans-serif;background:#0b1220;color:#e8eef8;margin:0;padding:24px}
.card{background:#121c2e;border:1px solid #24324a;border-radius:12px;padding:16px;margin:12px 0}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
h1{margin:0 0 8px;font-size:24px} .muted{color:#93a4bd;font-size:13px}
.ok{color:#3dd68c}.bad{color:#ff6b6b}
table{width:100%;border-collapse:collapse;font-size:13px} td,th{border-bottom:1px solid #24324a;padding:8px;text-align:left}
</style></head><body>
<h1>ECG Insight Enterprise QA Dashboard</h1>
<p class="muted">Generated ${dashboard.generatedAt}</p>
<div class="grid">
  <div class="card"><strong>Unit Tests</strong><div>${unit.passed}/${unit.total} files</div></div>
  <div class="card"><strong>Playwright Workflows</strong><div>${playwright.coveredWorkflows ?? 0}/${playwright.totalWorkflows ?? WORKFLOW_MATRIX.length} (${playwright.coveragePct ?? 0}%)</div></div>
  <div class="card"><strong>Integration Domains</strong><div>${integration.coveragePct ?? 0}%</div></div>
  <div class="card"><strong>Accessibility</strong><div class="${accessibility.passed ? "ok" : "bad"}">${accessibility.passed ? "PASS" : "FAIL"}</div></div>
  <div class="card"><strong>Performance</strong><div class="${performance.passed ? "ok" : "bad"}">${performance.passed ? "PASS" : "FAIL"}</div></div>
</div>
<div class="card"><strong>Critical Workflow Matrix</strong>
<table><thead><tr><th>Workflow</th><th>Covered</th><th>Specs</th></tr></thead><tbody>
${(playwright.matrix ?? WORKFLOW_MATRIX).map((w) => `<tr><td>${w.label ?? w.id}</td><td>${w.covered !== false ? "✓" : "—"}</td><td>${(w.specs ?? []).join(", ")}</td></tr>`).join("")}
</tbody></table></div>
</body></html>`;

fs.writeFileSync(path.join(QA_DIRS.dashboard, "index.html"), html);
console.log(`QA dashboard written to ${path.relative(REPO_ROOT, QA_DIRS.dashboard)}/index.html`);
