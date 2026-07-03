import { execSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const apiOrigin = (process.env["PLAYWRIGHT_API_URL"] ?? "http://127.0.0.1:3002/api").replace(/\/api\/?$/, "");
const baseURL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:8081";

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

async function waitForUrl(url, timeoutMs = 240_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
      if (response.ok) return;
    } catch {
      // Retry until timeout.
    }
    await delay(1_000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function startDetached(command, env) {
  const child = spawn(command, {
    detached: true,
    env: { ...process.env, ...env },
    shell: true,
    stdio: "ignore",
  });
  child.unref();
}

export default async function globalSetup() {
  if (process.env["PLAYWRIGHT_REUSE_SERVER"] === "1") return;

  killPort(3002);
  killPort(8081);
  await delay(1_500);

  if (process.env["PLAYWRIGHT_REUSE_SERVER"] === "0") return;

  console.log("[global-setup] Starting fresh API and frontend for E2E...");
  startDetached("npm run dev:api", {
    CLIENT_ORIGIN: baseURL,
    COPILOT_LLM_MOCK: "1",
    EXPO_PUBLIC_API_URL: `${apiOrigin}/api`,
    LLM_MAX_CONCURRENT: "1",
    NODE_ENV: "development",
    PLAYWRIGHT_E2E_FAST: "1",
    PLAYWRIGHT_SKIP_PRISMA: "1",
    RATE_LIMIT_MAX: "10000",
    PORT: "3002",
  });

  startDetached("npm run dev:frontend", {
    EXPO_NO_DOCTOR: "1",
    EXPO_OFFLINE: "1",
    EXPO_PUBLIC_API_URL: `${apiOrigin}/api`,
    NODE_ENV: "development",
  });

  console.log("[global-setup] Waiting for API health...");
  await waitForUrl(`${apiOrigin}/health`);
  console.log("[global-setup] Waiting for frontend...");
  await waitForUrl(baseURL);
  console.log("[global-setup] E2E servers ready.");
}
