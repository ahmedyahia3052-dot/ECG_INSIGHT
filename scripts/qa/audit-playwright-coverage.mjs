import fs from "node:fs";
import path from "node:path";
import { QA_DIRS, REPO_ROOT, WORKFLOW_MATRIX } from "./config.mjs";

const e2eDir = path.join(REPO_ROOT, "tests", "e2e");
const specFiles = fs.readdirSync(e2eDir).filter((f) => f.endsWith(".spec.ts"));

const matrix = WORKFLOW_MATRIX.map((workflow) => {
  const coveredSpecs = workflow.specs.filter((s) => specFiles.includes(s));
  return {
    ...workflow,
    covered: coveredSpecs.length > 0,
    coveredSpecs,
    missingSpecs: workflow.specs.filter((s) => !specFiles.includes(s)),
  };
});

const report = {
  generatedAt: new Date().toISOString(),
  totalSpecs: specFiles.length,
  totalWorkflows: matrix.length,
  coveredWorkflows: matrix.filter((w) => w.covered).length,
  uncoveredWorkflows: matrix.filter((w) => !w.covered).map((w) => w.id),
  coveragePct: Number(((matrix.filter((w) => w.covered).length / matrix.length) * 100).toFixed(1)),
  matrix,
  specInventory: specFiles.sort(),
};

fs.mkdirSync(QA_DIRS.artifacts, { recursive: true });
fs.writeFileSync(path.join(QA_DIRS.artifacts, "playwright-coverage-matrix.json"), JSON.stringify(report, null, 2));

console.log(`Playwright workflow coverage: ${report.coveredWorkflows}/${report.totalWorkflows} (${report.coveragePct}%)`);
if (report.uncoveredWorkflows.length) {
  console.log("Uncovered:", report.uncoveredWorkflows.join(", "));
}
process.exit(report.uncoveredWorkflows.length ? 1 : 0);
