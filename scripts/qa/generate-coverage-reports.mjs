/**
 * Capture Vitest coverage summary and emit SAT coverage deliverables.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "../..");
const coverageDir = path.join(repoRoot, "test-results", "coverage");
const artifactsDir = path.join(repoRoot, "test-results", "qa-artifacts");

function readJson(file) {
  try {
    const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const summary = readJson(path.join(coverageDir, "coverage-summary.json"));
const before = readJson(path.join(artifactsDir, "coverage-before.json"));
const after = summary?.total ?? null;

if (after) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, "coverage-after.json"), JSON.stringify(after, null, 2));
}

const pct = (v) => (v == null ? "—" : `${v.toFixed(1)}%`);

const moduleRows = [];
if (summary && typeof summary === "object") {
  for (const [file, metrics] of Object.entries(summary)) {
    if (file === "total") continue;
    moduleRows.push({ file: file.replace(/\\/g, "/").replace(`${repoRoot.replace(/\\/g, "/")}/`, ""), ...metrics });
  }
  moduleRows.sort((a, b) => a.pctStatements - b.pctStatements);
}

const uncovered = moduleRows.filter((m) => m.pctStatements < 50).slice(0, 40);

function delta(key) {
  if (!before || !after) return "n/a";
  const d = after[key].pct - before[key].pct;
  return `${d >= 0 ? "+" : ""}${d.toFixed(1)}%`;
}

const report = `# Coverage Report

**Generated:** ${new Date().toISOString()}

## Summary

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Statements | ${pct(before?.statements?.pct)} | ${pct(after?.statements?.pct)} | ${delta("statements")} |
| Branches | ${pct(before?.branches?.pct)} | ${pct(after?.branches?.pct)} | ${delta("branches")} |
| Functions | ${pct(before?.functions?.pct)} | ${pct(after?.functions?.pct)} | ${delta("functions")} |
| Lines | ${pct(before?.lines?.pct)} | ${pct(after?.lines?.pct)} | ${delta("lines")} |

## Target

- **Next milestone:** >70% production coverage (viewer + monitor + measurement modules)
- **Long-term:** 95%+ with Vitest instrumentation on hooks and services

## HTML Report

\`test-results/coverage/index.html\`

## Module Coverage (lowest first)

| File | Lines | Branches | Functions | Statements |
|------|-------|----------|-----------|------------|
${moduleRows
  .slice(0, 30)
  .map((m) => `| \`${m.file}\` | ${pct(m.lines?.pct)} | ${pct(m.branches?.pct)} | ${pct(m.functions?.pct)} | ${pct(m.statements?.pct)} |`)
  .join("\n")}
`;

const diff = `# Coverage Diff

**Generated:** ${new Date().toISOString()}

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Lines | ${pct(before?.lines?.pct)} | ${pct(after?.lines?.pct)} | ${delta("lines")} |
| Statements | ${pct(before?.statements?.pct)} | ${pct(after?.statements?.pct)} | ${delta("statements")} |
| Branches | ${pct(before?.branches?.pct)} | ${pct(after?.branches?.pct)} | ${delta("branches")} |
| Functions | ${pct(before?.functions?.pct)} | ${pct(after?.functions?.pct)} | ${delta("functions")} |

## New Vitest Suites

See \`NEW_TESTS.md\` for file list.

## Notes

Baseline captured before new tests when \`coverage-before.json\` exists in \`test-results/qa-artifacts/\`.
`;

const untested = `# Untested Files (Partial List)

**Generated:** ${new Date().toISOString()}

Files with **<50% statement coverage** (priority for next SAT increment):

${uncovered.length ? uncovered.map((m) => `- \`${m.file}\` — ${pct(m.statements?.pct)} statements`).join("\n") : "- Run \`npm run qa:coverage\` to populate"}

## High-Priority Remaining (by module)

1. \`useEcgEnterpriseViewerState.ts\` — viewer state orchestration
2. \`useEcgMeasurementWorkspace.ts\` — caliper interaction
3. \`ecgMonitorCanvas.ts\` — live monitor wave rendering
4. \`webglRenderer.ts\` / \`canvas2dRenderer.ts\` — rendering backends
5. \`buildCardiologistModel.ts\` — partial coverage via new tests
6. React component \`.tsx\` files — require component test harness
`;

fs.writeFileSync(path.join(repoRoot, "COVERAGE_REPORT.md"), report);
fs.writeFileSync(path.join(repoRoot, "COVERAGE_DIFF.md"), diff);
fs.writeFileSync(path.join(repoRoot, "UNTESTED_FILES.md"), untested);

console.log("[coverage-reports] Wrote COVERAGE_REPORT.md, COVERAGE_DIFF.md, UNTESTED_FILES.md");
