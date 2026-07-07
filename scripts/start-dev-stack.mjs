import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function waitForHttp(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
        if (response.ok) {
          resolve(undefined);
          return;
        }
      } catch {
        // retry
      }
      if (Date.now() >= deadline) {
        reject(new Error(`Timed out waiting for ${url}`));
        return;
      }
      setTimeout(() => {
        void tick();
      }, 2_000);
    };
    void tick();
  });
}

function startDetached(scriptName) {
  return spawn("node", [path.join(root, "scripts", scriptName)], {
    cwd: root,
    detached: true,
    env: { ...process.env, E2E_DETACHED: "1" },
    stdio: "ignore",
    windowsHide: true,
  });
}

async function main() {
  console.log("[dev:stack] Starting API (port 3002) and Expo Web frontend (port 8081)...");

  const api = startDetached("start-api-dev.mjs");
  api.unref();

  const frontend = startDetached("start-frontend-dev.mjs");
  frontend.unref();

  console.log("[dev:stack] Waiting for API /liveness...");
  await waitForHttp("http://127.0.0.1:3002/liveness");
  console.log("[dev:stack] Waiting for frontend...");
  await waitForHttp("http://127.0.0.1:8081/");

  console.log("");
  console.log("ECG Insight development stack is ready.");
  console.log("  Login:    http://localhost:8081/login");
  console.log("  API:      http://localhost:3002/liveness");
  console.log("");
  console.log("Both processes are running detached. Use dev:stack again if either port stops responding.");
}

main().catch((error) => {
  console.error(`[dev:stack] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
