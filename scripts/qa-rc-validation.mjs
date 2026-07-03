import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";

const runs = Number(process.env["QA_RC_RUNS"] ?? 5);
const reportDir = "test-results/rc-gate";
const runSummaries = [];
const failures = [];

function killPort(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", shell: true });
    const pids = new Set();
    for (const line of output.split(/\r?\n/)) {
      const match = line.trim().match(/\s(\d+)\s*$/);
      const pid = match ? Number(match[1]) : 0;
      if (pid > 4) pids.add(pid);
    }
    for (const pid of pids) {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore", shell: true });
    }
  } catch {
    // Port already free.
  }
}

async function resetServers() {
  killPort(3002);
  killPort(8081);
  await delay(2_000);
}

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

mkdirSync(reportDir, { recursive: true });

for (let run = 1; run <= runs; run += 1) {
  if (run > 1) {
    await resetServers();
  }

  const startedAt = new Date().toISOString();
  console.log(`\n=== Release Candidate validation run ${run}/${runs} ===\n`);
  const result = spawnSync("npx", ["playwright", "test", "--grep-invert", "@stress"], {
    env: { ...process.env },
    shell: true,
    stdio: "inherit",
  });
  const finishedAt = new Date().toISOString();
  const junit = parseJUnit();
  runSummaries.push({ finishedAt, junit, run, startedAt, status: result.status === 0 ? "passed" : "failed" });
  if (result.status !== 0) {
    failures.push(run);
    console.error(`Run ${run} failed with exit code ${result.status ?? "unknown"}.`);
    await resetServers();
    break;
  }

  await resetServers();
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

## Run summary

${runSummaries.map((entry) => `- Run ${entry.run}: ${entry.status} (${entry.junit.tests} tests, ${entry.junit.failures} failures, ${entry.junit.skipped} skipped)`).join("\n")}
`,
);

writeFileSync(
  "RC_FLAKY_ANALYSIS.md",
  `# RC Flaky Analysis

Generated: ${new Date().toISOString()}

Intermittent failures are treated as incorrect state transitions. Instrumentation uses runtime events:
StreamingStarted, StreamingFinished, VoiceIdle, UploadFinished, ViewerReady.

## Latest gate outcome

${gatePassed ? "No flaky tests detected across consecutive runs." : `Gate failed on run(s): ${failures.join(", ") || "incomplete"}. Review Playwright HTML report and test-results/playwright-junit.xml.`}

## Root-cause categories addressed in this RC

- race condition: conversation FSM + StreamingFinished event
- async timing: event-based Playwright waits (no UI assertion retries)
- voice initialization: VoiceIdle event + disable voice on New Chat
- stale element: copilot-conversation-ready marker
- network retry: streamCopilotMessage network-only retry; mutation retry removed
- React rendering: explicit post-stream finalizeStream/onSettled
`,
);

writeFileSync(
  "RC_MEMORY_REPORT.md",
  `# RC Memory Report

Generated: ${new Date().toISOString()}

Runtime listener registry is exposed as \`window.__ECG_RUNTIME_LISTENERS__\`.
Stress suite (\`QA_RC_STRESS=1\`) compares listener counts before/after 100 chats, 25 uploads, 50 voice toggles, 20 regenerations, and 20 exports without reload.

Gate memory check in standard RC suite: attachStrictRuntimeDiagnostics + voiceEngine.dispose on unmount.
`,
);

writeFileSync(
  "RC_PERFORMANCE_REPORT.md",
  `# RC Performance Report

Generated: ${new Date().toISOString()}

| Run | Started | Finished | Tests | Failures |
| --- | --- | --- | ---: | ---: |
${runSummaries.map((entry) => `| ${entry.run} | ${entry.startedAt} | ${entry.finishedAt} | ${entry.junit.tests} | ${entry.junit.failures} |`).join("\n")}

Stress metrics: enable \`QA_RC_STRESS=1 npx playwright test tests/e2e/stress-rc.spec.ts\`.
`,
);

if (!gatePassed) {
  console.error(`\nRC validation failed on run ${failures.join(", ") || "incomplete"}.`);
  process.exit(1);
}

writeFileSync(
  "RELEASE_READY.md",
  `# Release Ready

Generated: ${new Date().toISOString()}

- ${runs} consecutive Playwright RC runs passed
- Runtime event instrumentation enabled
- UI assertion retries disabled (Playwright retries=0)
- Network-only retry enabled for copilot stream fetch

Proceed with commit and push when product owner approves.
`,
);

console.log(`\nAll ${runs} consecutive Playwright runs passed.`);
