import { spawnSync } from "node:child_process";
import { StartupHealthManager } from "./infrastructure/startup-health-manager.mjs";

const steps = [
  { command: "npm run lint", label: "lint" },
  { command: "npm run typecheck", label: "typecheck" },
  { command: "npm run build", label: "build" },
  { command: "npm run test", label: "integration-tests" },
  { command: "npx playwright test --grep-invert @stress", env: { PLAYWRIGHT_REUSE_SERVER: "1" }, label: "playwright-e2e" },
  { command: "npm run qa:rc", label: "qa-rc" },
];

function runStep(step) {
  console.log(`\n=== RC pipeline: ${step.label} ===\n`);
  const result = spawnSync(step.command, {
    cwd: process.cwd(),
    env: { ...process.env, ...(step.env ?? {}) },
    shell: true,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error(`${step.label} failed with exit code ${result.status ?? "unknown"}`);
  }
}

async function main() {
  const manager = new StartupHealthManager();
  console.log("\n=== RC pipeline: infrastructure prep ===\n");
  await manager.verifyDependencies({ startServers: true });
  manager.writeReport();

  for (const step of steps) {
    runStep(step);
  }

  await manager.teardown();
  manager.writeReport();
  console.log("\nRelease Candidate validation pipeline passed.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
