import { existsSync } from "node:fs";
import { shouldReuseExistingServer } from "../../scripts/infrastructure/process-manager.mjs";

export default async function globalTeardown() {
  if (shouldReuseExistingServer()) {
    console.log("[global-teardown] reuseExistingServer=true — leaving shared servers running.");
    return;
  }

  const persistentManifest = `${process.cwd()}/test-results/persistent-dev-stack.json`;
  if (existsSync(persistentManifest)) {
    console.log("[global-teardown] persistent-dev-stack manifest found — leaving detached servers running.");
    return;
  }

  const manager = globalThis.__ECG_STARTUP_HEALTH_MANAGER__;
  if (!manager) {
    console.log("[global-teardown] No managed session found; skipping shutdown.");
    return;
  }

  console.log("[global-teardown] Shutting down managed session services...");
  await manager.teardown({
    reason: "playwright-global-teardown",
    stoppedBy: "global-teardown.mjs",
  });
  manager.writeReport();
}
