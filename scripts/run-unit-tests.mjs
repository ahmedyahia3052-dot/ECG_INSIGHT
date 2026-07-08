/**
 * Runs all Node unit tests under scripts/ (*.test.ts files).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..");

function collectUnitTests(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectUnitTests(full));
    else if (entry.name.endsWith(".test.ts")) files.push(full);
  }
  return files.sort();
}

const tests = collectUnitTests(path.join(repoRoot, "scripts"));
const results = [];

console.log(`[unit-tests] Running ${tests.length} unit test files...\n`);

for (const file of tests) {
  const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
  process.stdout.write(`[unit-tests] ${rel} ... `);
  const result = spawnSync("npx", ["tsx", rel], {
    cwd: repoRoot,
    env: process.env,
    shell: true,
    stdio: "pipe",
    encoding: "utf8",
  });
  const passed = result.status === 0;
  results.push({ file: rel, passed, exitCode: result.status ?? 1, output: (result.stdout ?? "") + (result.stderr ?? "") });
  console.log(passed ? "PASS" : "FAIL");
  if (!passed) {
    console.error(result.stdout);
    console.error(result.stderr);
  }
}

const summary = {
  total: results.length,
  passed: results.filter((r) => r.passed).length,
  failed: results.filter((r) => !r.passed).length,
  finishedAt: new Date().toISOString(),
  results: results.map(({ file, passed, exitCode }) => ({ file, passed, exitCode })),
};

const outDir = path.join(repoRoot, "test-results", "qa-artifacts");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "unit-test-summary.json"), JSON.stringify(summary, null, 2));

console.log(`\n[unit-tests] ${summary.passed}/${summary.total} passed`);
process.exit(summary.failed === 0 ? 0 : 1);
