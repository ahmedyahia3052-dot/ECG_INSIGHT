export { ProcessManager, shouldReuseExistingServer } from "./process-manager.mjs";
export { StartupHealthManager, runStartupHealth } from "./startup-health-manager.mjs";

import { StartupHealthManager } from "./startup-health-manager.mjs";

export async function prepareValidationEnvironment(options = {}) {
  const manager = new StartupHealthManager(options);
  await manager.verifyDependencies({
    reuseExistingServer: options.reuseExistingServer ?? false,
    startServers: options.startServers ?? false,
  });
  manager.writeReport();
  return manager;
}

export async function resetValidationEnvironment(manager) {
  await manager.teardown({
    reason: "prepare-validation-reset",
    stoppedBy: "prepare-validation.mjs",
  });
}
