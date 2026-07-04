import { StartupHealthManager } from "../../scripts/infrastructure/startup-health-manager.mjs";
import { shouldReuseExistingServer } from "../../scripts/infrastructure/process-manager.mjs";

export default async function globalSetup() {
  const reuseExistingServer = shouldReuseExistingServer();
  const manager = new StartupHealthManager();
  try {
    await manager.verifyDependencies({
      reuseExistingServer,
      startServers: !reuseExistingServer,
    });
    manager.writeReport();
    globalThis.__ECG_STARTUP_HEALTH_MANAGER__ = manager;
    globalThis.__ECG_PROCESS_MANAGER__ = manager.getProcessManager();
  } catch (error) {
    manager.writeReport();
    throw error;
  }
}
