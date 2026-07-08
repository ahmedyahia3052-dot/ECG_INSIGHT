/**
 * Ensures API (3002) and Expo Web frontend (8081) run as persistent detached processes.
 * Idempotent: skips spawn when endpoints are already healthy; restarts when down.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const manifestPath = path.join(root, "test-results", "persistent-dev-stack.json");
const apiLog = path.join(root, "test-results", "persistent-api-dev.log");
const frontendLog = path.join(root, "test-results", "persistent-frontend-dev.log");

const API_LIVENESS = "http://127.0.0.1:3002/liveness";
const FRONTEND_URL = "http://127.0.0.1:8081/";

function isAlive(pid) {
  if (!pid || pid <= 4) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && typeof error === "object" && "code" in error && error.code === "EPERM";
  }
}

async function probe(url, validateJson = false) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) return false;
    if (!validateJson) return true;
    const payload = await response.json();
    return payload?.ok === true;
  } catch {
    return false;
  }
}

function startDetached(scriptName, logPath) {
  mkdirSync(path.dirname(logPath), { recursive: true });
  const logFd = openSync(logPath, "a");
  const child = spawn("node", [path.join(root, "scripts", scriptName)], {
    cwd: root,
    detached: true,
    env: {
      ...process.env,
      E2E_DETACHED: "1",
      PLAYWRIGHT_REUSE_SERVER: "1",
      STARTUP_LOG_PATH: logPath,
    },
    stdio: ["ignore", logFd, logFd],
    windowsHide: true,
  });
  child.unref();
  return child.pid ?? null;
}

async function waitFor(url, validateJson, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await probe(url, validateJson)) return true;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  return false;
}

function loadManifest() {
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function saveManifest(data) {
  mkdirSync(path.dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function ensureService(name, scriptName, logPath, healthUrl, validateJson) {
  const healthy = await probe(healthUrl, validateJson);
  if (healthy) {
    console.log(`[persistent-dev] ${name} already healthy at ${healthUrl}`);
    return { name, action: "already-healthy", pid: null };
  }

  const manifest = loadManifest();
  const existingPid = manifest?.processes?.[name]?.pid;
  if (existingPid && isAlive(existingPid)) {
    console.log(`[persistent-dev] ${name} PID ${existingPid} alive but unhealthy — waiting...`);
    const ready = await waitFor(healthUrl, validateJson, 60_000);
    if (ready) return { name, action: "recovered", pid: existingPid };
  }

  console.log(`[persistent-dev] Starting detached ${name}...`);
  const pid = startDetached(scriptName, logPath);
  const ready = await waitFor(healthUrl, validateJson);
  if (!ready) throw new Error(`${name} failed to become healthy at ${healthUrl}`);
  console.log(`[persistent-dev] ${name} ready (PID ${pid})`);
  return { name, action: "started", pid };
}

async function main() {
  console.log("[persistent-dev] Ensuring persistent detached dev servers...");

  const api = await ensureService("api", "start-api-dev.mjs", apiLog, API_LIVENESS, true);
  const frontend = await ensureService("frontend", "start-frontend-dev.mjs", frontendLog, FRONTEND_URL, false);

  const manifest = {
    apiOrigin: "http://127.0.0.1:3002",
    baseURL: "http://127.0.0.1:8081",
    ensuredAt: new Date().toISOString(),
    persistent: true,
    playwrightReuseServer: true,
    processes: {
      api: { ...api, log: apiLog, script: "start-api-dev.mjs" },
      frontend: { ...frontend, log: frontendLog, script: "start-frontend-dev.mjs" },
    },
  };
  saveManifest(manifest);

  console.log("");
  console.log("Persistent development stack is running (detached).");
  console.log("  Frontend: http://localhost:8081");
  console.log("  API:      http://localhost:3002/liveness");
  console.log(`  Manifest: ${manifestPath}`);
}

main().catch((error) => {
  console.error(`[persistent-dev] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
