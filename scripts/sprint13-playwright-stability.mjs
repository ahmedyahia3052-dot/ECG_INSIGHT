import { spawnSync } from "node:child_process";

const runs = 5;
const failures = [];

for (let run = 1; run <= runs; run += 1) {
  console.log(`[sprint13-stability] Playwright run ${run}/${runs}…`);
  const result = spawnSync(
    "npx",
    ["playwright", "test", "tests/e2e/sprint13-ecg-monitor.spec.ts", "--project=chromium-desktop"],
    { encoding: "utf8", shell: true, stdio: "pipe" },
  );
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status !== 0) {
    failures.push({ run, status: result.status ?? "unknown" });
    break;
  }
  if (run < runs) {
    console.log(`[sprint13-stability] Run ${run}/${runs} passed. Cooling down 15s…`);
    spawnSync("powershell", ["-Command", "Start-Sleep -Seconds 15"], { shell: true, stdio: "ignore" });
  }
}

if (failures.length > 0) {
  console.error(`[sprint13-stability] FAILED after ${failures.length} failing run(s).`, failures);
  process.exit(1);
}

console.log(`[sprint13-stability] ${runs}/${runs} consecutive Sprint 13 Playwright runs passed.`);
