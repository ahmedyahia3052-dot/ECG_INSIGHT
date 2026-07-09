import { execSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";

const isWindows = process.platform === "win32";
const DEFAULT_MANIFEST = path.join("test-results", "e2e-process-session.json");
const LIFECYCLE_REPORT = "PROCESS_LIFECYCLE_REPORT.md";

export function shouldReuseExistingServer() {
  return (
    process.env["PLAYWRIGHT_REUSE_SERVER"] === "1"
    || String(process.env["reuseExistingServer"] ?? "").toLowerCase() === "true"
    || String(process.env["REUSE_EXISTING_SERVER"] ?? "").toLowerCase() === "true"
  );
}

function isProcessAlive(pid) {
  if (!pid || pid <= 4) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && typeof error === "object" && "code" in error && error.code === "EPERM";
  }
}

function stopProcessTree(pid, signal = "SIGTERM") {
  if (!pid || pid <= 4) return false;
  try {
    if (isWindows) {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore", shell: true });
    } else {
      process.kill(-pid, signal);
    }
    return true;
  } catch {
    try {
      process.kill(pid, signal);
      return true;
    } catch {
      return false;
    }
  }
}

function killPortListeners(port) {
  const killed = [];
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8", shell: true });
      const pids = new Set(
        output
          .split(/\r?\n/)
          .map((line) => line.trim().split(/\s+/).pop())
          .filter((pid) => pid && /^\d+$/.test(pid) && Number(pid) > 4),
      );
      for (const pid of pids) {
        if (stopProcessTree(Number(pid))) killed.push(Number(pid));
      }
      return killed;
    }
    const output = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" });
    for (const pid of output.split(/\s+/).filter(Boolean)) {
      if (stopProcessTree(Number(pid))) killed.push(Number(pid));
    }
  } catch {
    // Port is already free.
  }
  return killed;
}

export class ProcessManager {
  constructor(options = {}) {
    this.sessionId = options.sessionId ?? randomUUID();
    this.manifestPath = options.manifestPath ?? DEFAULT_MANIFEST;
    this.apiOrigin = (options.apiOrigin ?? process.env["PLAYWRIGHT_API_URL"] ?? "http://127.0.0.1:3002/api").replace(/\/api\/?$/, "");
    this.baseURL = options.baseURL ?? process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:8081";
    this.reuseExistingServer = options.reuseExistingServer ?? shouldReuseExistingServer();
    this.processes = new Map();
    this.lifecycle = [];
    mkdirSync(path.dirname(this.manifestPath), { recursive: true });
    mkdirSync("test-results", { recursive: true });
  }

  log(message) {
    console.log(`[process-manager] ${message}`);
  }

  record(event, detail = {}) {
    const entry = {
      at: new Date().toISOString(),
      by: detail.by ?? "ProcessManager",
      event,
      sessionId: this.sessionId,
      ...detail,
    };
    this.lifecycle.push(entry);
    this.persist();
    return entry;
  }

  persist() {
    const payload = {
      lifecycle: this.lifecycle,
      ownerPid: process.pid,
      reuseExistingServer: this.reuseExistingServer,
      processes: [...this.processes.values()].map((item) => ({
        command: item.command,
        name: item.name,
        pid: item.pid,
        startedAt: item.startedAt,
        startedBy: item.startedBy,
        stoppedAt: item.stoppedAt ?? null,
        stoppedBy: item.stoppedBy ?? null,
      })),
      sessionId: this.sessionId,
      updatedAt: new Date().toISOString(),
    };
    writeFileSync(this.manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    this.writeLifecycleReport(payload);
    return payload;
  }

  static loadManifest(manifestPath = DEFAULT_MANIFEST) {
    if (!existsSync(manifestPath)) return null;
    try {
      return JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch {
      return null;
    }
  }

  static async recoverAbandonedSession(manifestPath = DEFAULT_MANIFEST) {
    const manifest = ProcessManager.loadManifest(manifestPath);
    if (!manifest) return { recovered: [], skipped: "no-manifest" };

    const ownerAlive = isProcessAlive(manifest.ownerPid);
    if (ownerAlive) {
      return { recovered: [], skipped: "owner-still-alive", ownerPid: manifest.ownerPid };
    }

    const recovered = [];
    for (const proc of manifest.processes ?? []) {
      if (proc.stoppedAt) continue;
      if (!isProcessAlive(proc.pid)) continue;
      stopProcessTree(proc.pid);
      recovered.push({ name: proc.name, pid: proc.pid, reason: "abandoned-session-recovery" });
    }
    return { manifest, recovered };
  }

  register(name, child, command, startedBy = "ProcessManager.start") {
    const entry = {
      child,
      command,
      name,
      pid: child.pid,
      startedAt: new Date().toISOString(),
      startedBy,
    };
    this.processes.set(name, entry);
    child.on("exit", (code, signal) => {
      const current = this.processes.get(name);
      if (!current || current.stoppedAt) return;
      current.stoppedAt = new Date().toISOString();
      current.stoppedBy = signal ? `signal:${signal}` : `exit:${code ?? "unknown"}`;
      this.record("unexpected-exit", { code, name, pid: current.pid, signal });
    });
    this.record("started", { command, name, pid: child.pid, startedBy });
    return entry;
  }

  startManagedProcess(name, { args = [], command, cwd = process.cwd(), env = {}, logName = name }) {
    const logPath = path.join("test-results", `${logName}.log`);
    const logFd = openSync(logPath, "a");
    const mergedEnv = {
      ...process.env,
      ...env,
      E2E_SESSION_ID: this.sessionId,
      E2E_SERVICE_NAME: name,
    };
    const useShell = isWindows && !String(command).endsWith(".cmd");
    const resolvedCommand = isWindows && command === "npx" ? "npx.cmd" : command;
    const child = spawn(resolvedCommand, args, {
      cwd,
      detached: false,
      env: mergedEnv,
      shell: useShell,
      stdio: ["ignore", logFd, logFd],
      windowsHide: true,
    });
    if (!child.pid) {
      throw new Error(`[process-manager] Failed to spawn ${name}: ${command} ${args.join(" ")}`);
    }
    return this.register(name, child, `${command} ${args.join(" ")}`.trim(), "ProcessManager.startManagedProcess");
  }

  async startApiServer(options = {}) {
    const port = Number(options.port ?? 3002);
    const killed = killPortListeners(port);
    if (killed.length) {
      this.record("port-cleanup", { killed, port, service: "api" });
      await delay(750);
    }
    const skipPrisma = options.skipPrisma ?? process.env["PLAYWRIGHT_SKIP_PRISMA"] === "1";
    const apiEnv = {
      CLIENT_ORIGIN: this.baseURL,
      COPILOT_LLM_MOCK: "true",
      EXPO_PUBLIC_API_URL: `${this.apiOrigin}/api`,
      LLM_MAX_CONCURRENT: "1",
      NODE_ENV: "development",
      PLAYWRIGHT_E2E_FAST: "1",
      PLAYWRIGHT_SKIP_PRISMA: skipPrisma ? "1" : "0",
      PORT: String(options.port ?? 3002),
      RATE_LIMIT_MAX: "10000",
      API_SECURITY_IP_MAX: "10000",
      API_SECURITY_USER_MAX: "10000",
      ...options.env,
    };

    if (skipPrisma) {
      return this.startManagedProcess("api", {
        args: ["tsx", "server/src/index.ts"],
        command: "npx",
        cwd: process.cwd(),
        env: apiEnv,
        logName: "api-dev",
      });
    }

    return this.startManagedProcess("api", {
      args: ["tsx", "server/src/index.ts"],
      command: "npx",
      cwd: process.cwd(),
      env: apiEnv,
      logName: "api-dev",
    });
  }

  async startFrontendServer(options = {}) {
    const port = Number(options.port ?? 8081);
    const killed = killPortListeners(port);
    if (killed.length) {
      this.record("port-cleanup", { killed, port, service: "frontend" });
      await delay(750);
    }
    const frontendDir = path.join(process.cwd(), "artifacts", "ecg-insight");
    return this.startManagedProcess("frontend", {
      args: ["expo", "start", "--web", "--localhost", "--port", "8081"],
      command: "npx",
      cwd: frontendDir,
      env: {
        EXPO_DEV_API_PROXY: this.apiOrigin,
        EXPO_NO_DOCTOR: "1",
        EXPO_OFFLINE: "1",
        EXPO_PUBLIC_API_URL: "/api",
        EXPO_PUBLIC_APP_ENV: "development",
        EXPO_PUBLIC_USE_DEV_PROXY: "true",
        NODE_ENV: "development",
        ...options.env,
      },
      logName: "frontend-dev",
    });
  }

  async waitForHttp(name, url, validate, timeoutMs = 240_000) {
    const started = performance.now();
    let attempts = 0;
    while (performance.now() - started < timeoutMs) {
      attempts += 1;
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
        const payload = await response.json().catch(() => ({}));
        if (response.ok && validate(payload)) {
          const durationMs = Math.round(performance.now() - started);
          this.record("ready", { attempts, durationMs, name, url });
          return { attempts, durationMs, payload };
        }
        this.record("ready-retry", { attempts, name, status: response.status, url });
      } catch (error) {
        this.record("ready-retry", {
          attempts,
          error: error instanceof Error ? error.message : String(error),
          name,
          url,
        });
      }
      await delay(Math.min(250 + attempts * 100, 2_000));
    }
    throw new Error(`[process-manager] ${name} not ready at ${url} within ${timeoutMs}ms`);
  }

  async waitForApiLive() {
    return this.waitForHttp("api-live", `${this.apiOrigin}/live`, (payload) => payload.ok === true);
  }

  async waitForApiReady() {
    return this.waitForHttp(
      "api-ready",
      `${this.apiOrigin}/ready`,
      (payload) => payload.ok === true && payload.checks?.database?.ok === true,
    );
  }

  async waitForFrontendReady() {
    return this.waitForHttp("frontend", this.baseURL, () => true, 240_000);
  }

  async shutdown({ reason = "shutdown", stoppedBy = "ProcessManager.shutdown" } = {}) {
    const order = ["frontend", "api"];
    const stopped = [];
    for (const name of order) {
      const entry = this.processes.get(name);
      if (!entry || entry.stoppedAt) continue;
      this.record("stop-requested", { name, pid: entry.pid, reason, stoppedBy });
      const ok = stopProcessTree(entry.pid);
      entry.stoppedAt = new Date().toISOString();
      entry.stoppedBy = stoppedBy;
      stopped.push({ name, ok, pid: entry.pid, reason });
      this.record(ok ? "stopped" : "stop-failed", { name, pid: entry.pid, reason, stoppedBy });
    }
    this.persist();
    return stopped;
  }

  writeLifecycleReport(manifest = this.persist()) {
    const unexpected = (manifest.lifecycle ?? []).filter((entry) =>
      entry.event === "unexpected-exit" || entry.event === "stop-failed",
    );
    const report = `# Process Lifecycle Report

Generated: ${new Date().toISOString()}

## Session

| Field | Value |
|-------|-------|
| Session ID | ${manifest.sessionId} |
| Owner PID | ${manifest.ownerPid} |
| Reuse mode | ${manifest.reuseExistingServer ?? shouldReuseExistingServer() ? "yes" : "no"} |

## Processes

| Service | PID | Started by | Stopped by | Started | Stopped |
|---------|-----|------------|------------|---------|---------|
${(manifest.processes ?? []).map((item) =>
  `| ${item.name} | ${item.pid} | ${item.startedBy} | ${item.stoppedBy ?? "running"} | ${item.startedAt} | ${item.stoppedAt ?? "-"} |`,
).join("\n") || "| none | - | - | - | - | - |"}

## Startup order

${(manifest.lifecycle ?? []).filter((entry) => entry.event === "started").map((entry) => `- ${entry.at}: **${entry.name}** (PID ${entry.pid}) started by ${entry.startedBy}`).join("\n") || "- none"}

## Shutdown order

${(manifest.lifecycle ?? []).filter((entry) => entry.event === "stopped").map((entry) => `- ${entry.at}: **${entry.name}** (PID ${entry.pid}) stopped by ${entry.stoppedBy ?? entry.by}`).join("\n") || "- none"}

## Readiness checks

${(manifest.lifecycle ?? []).filter((entry) => entry.event === "ready").map((entry) => `- ${entry.at}: **${entry.name}** ready in ${entry.durationMs}ms (${entry.attempts} attempts) → ${entry.url}`).join("\n") || "- none"}

## Unexpected terminations

${unexpected.length
  ? unexpected.map((entry) => `- ${entry.at}: **${entry.name ?? entry.event}** PID ${entry.pid ?? "n/a"} — ${entry.signal ?? entry.code ?? entry.error ?? "unknown"}`).join("\n")
  : "- None recorded in this session"}

## Full lifecycle log

\`\`\`json
${JSON.stringify(manifest.lifecycle ?? [], null, 2)}
\`\`\`
`;
    writeFileSync(LIFECYCLE_REPORT, report, "utf8");
    return report;
  }
}
