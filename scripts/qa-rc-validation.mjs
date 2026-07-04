import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const runs = Number(process.env["QA_RC_RUNS"] ?? 5);
const runSummaries = [];
const failures = [];

function parseJUnit() {
  try {
    const xml = readFileSync("test-results/playwright-junit.xml", "utf8");
    const tests = Number(xml.match(/tests="(\d+)"/)?.[1] ?? 0);
    const failuresCount = Number(xml.match(/failures="(\d+)"/)?.[1] ?? 0);
    const skipped = Number(xml.match(/skipped="(\d+)"/)?.[1] ?? 0);
    return { failures: failuresCount, skipped, tests };
  } catch {
    return { failures: -1, skipped: 0, tests: -1 };
  }
}

for (let run = 1; run <= runs; run += 1) {
  const startedAt = new Date().toISOString();
  console.log(`\n=== Release Candidate validation run ${run}/${runs} ===\n`);
  console.log("[qa-rc] Playwright owns server lifecycle via ProcessManager (no blind port cleanup).");

  try {
    unlinkSync("test-results/playwright-junit.xml");
  } catch {
    // Fresh junit for each run.
  }

  const result = spawnSync(
    "npx",
    ["playwright", "test", "--grep-invert", "@stress"],
    {
      env: { ...process.env },
      shell: true,
      stdio: "inherit",
    },
  );

  const finishedAt = new Date().toISOString();
  const junit = parseJUnit();
  runSummaries.push({ finishedAt, junit, run, startedAt, status: result.status === 0 ? "passed" : "failed" });

  if (result.status !== 0) {
    failures.push(run);
    console.error(`Run ${run} failed with exit code ${result.status ?? "unknown"}.`);
    break;
  }

  if (run < runs) {
    console.log(`[qa-rc] Run ${run}/${runs} passed. Cooling down 15s before next run...`);
    spawnSync("powershell", ["-Command", "Start-Sleep -Seconds 15"], { shell: true, stdio: "ignore" });
  }
}

const gatePassed = failures.length === 0 && runSummaries.length === runs;

writeFileSync(
  "RC_STABILITY_REPORT.md",
  `# RC Stability Report

Generated: ${new Date().toISOString()}

## Gate status

- Required consecutive runs: ${runs}
- Completed runs: ${runSummaries.length}
- Failures on runs: ${failures.length ? failures.join(", ") : "none"}
- Gate passed: ${gatePassed ? "yes" : "no"}
- Infrastructure report: InfrastructureReport.md
- Process lifecycle report: PROCESS_LIFECYCLE_REPORT.md

## Run summary

${runSummaries.map((entry) => `- Run ${entry.run}: ${entry.status} (${entry.junit.tests} tests, ${entry.junit.failures} failures, ${entry.junit.skipped} skipped)`).join("\n")}
`,
);

if (!gatePassed) {
  console.error(`\nRC validation failed on run ${failures.join(", ") || "incomplete"}.`);
  process.exit(1);
}

console.log(`\nAll ${runs} consecutive Playwright runs passed.`);
