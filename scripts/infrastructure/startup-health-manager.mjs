import { mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { ProcessManager, shouldReuseExistingServer } from "./process-manager.mjs";

export { ProcessManager, shouldReuseExistingServer };

export class StartupHealthManager {
  constructor(options = {}) {
    this.apiOrigin = (options.apiOrigin ?? process.env["PLAYWRIGHT_API_URL"] ?? "http://127.0.0.1:3002/api").replace(/\/api\/?$/, "");
    this.baseURL = options.baseURL ?? process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:8081";
    this.ollamaURL = (options.ollamaURL ?? process.env["OLLAMA_BASE_URL"] ?? "http://127.0.0.1:11434").replace(/\/$/, "");
    this.redisURL = options.redisURL ?? process.env["REDIS_URL"] ?? "";
    this.requireOllama =
      options.requireOllama ??
      !["true", "1"].includes(String(process.env["COPILOT_LLM_MOCK"] ?? "").toLowerCase());
    this.requireRedis = Boolean(this.redisURL);
    this.reportPath = options.reportPath ?? "InfrastructureReport.md";
    this.startedAt = performance.now();
    this.processManager = options.processManager ?? new ProcessManager({
      apiOrigin: this.apiOrigin,
      baseURL: this.baseURL,
      reuseExistingServer: options.reuseExistingServer ?? shouldReuseExistingServer(),
    });
    this.metrics = {
      browserStartupMs: null,
      cpu: os.cpus().length,
      failedConnections: [],
      memory: {
        freeMb: Math.round(os.freemem() / 1024 / 1024),
        totalMb: Math.round(os.totalmem() / 1024 / 1024),
      },
      reuseExistingServer: shouldReuseExistingServer(),
      sessionId: this.processManager.sessionId,
      startupMs: null,
      steps: {},
    };
  }

  log(message) {
    console.log(`[startup-health] ${message}`);
  }

  fail(message) {
    this.metrics.failedConnections.push(message);
    throw new Error(`[startup-health] ${message}`);
  }

  getProcessManager() {
    return this.processManager;
  }

  async verifyOllama() {
    if (!this.requireOllama) {
      this.metrics.steps.ollama = { durationMs: 0, ok: true, skipped: true };
      return { ok: true, skipped: true };
    }
    const started = performance.now();
    try {
      const response = await fetch(`${this.ollamaURL}/api/version`, { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) this.fail(`Ollama unhealthy: HTTP ${response.status}`);
      const payload = await response.json();
      this.metrics.steps.ollama = {
        durationMs: Math.round(performance.now() - started),
        ok: true,
        version: payload.version ?? null,
      };
      return payload;
    } catch (error) {
      this.fail(`Ollama unreachable at ${this.ollamaURL}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async verifyRedis() {
    if (!this.requireRedis) {
      this.metrics.steps.redis = { durationMs: 0, ok: true, skipped: true };
      return { ok: true, skipped: true };
    }
    this.fail("Redis verification is configured but not implemented for E2E.");
  }

  async verifyDependencies({ reuseExistingServer = shouldReuseExistingServer(), startServers = false } = {}) {
    const reuse = reuseExistingServer || shouldReuseExistingServer();
    this.processManager.reuseExistingServer = reuse;
    this.metrics.reuseExistingServer = reuse;
    this.metrics.steps.mode = reuse ? "reuse-existing-server" : "managed-session";

    if (reuse) {
      this.log("reuseExistingServer=true — skipping startup cleanup and server spawn.");
    } else {
      this.log("Recovering abandoned session PIDs (ownership-safe)...");
      const recovery = await ProcessManager.recoverAbandonedSession(this.processManager.manifestPath);
      this.metrics.steps.recovery = recovery;
      if (recovery.recovered?.length) {
        this.log(`Recovered ${recovery.recovered.length} abandoned process(es) from prior crashed session.`);
      }

      if (startServers) {
        this.log("Starting managed API server...");
        await this.processManager.startApiServer();
        this.log("Starting managed frontend server...");
        await this.processManager.startFrontendServer();
      }
    }

    this.log("Waiting for API /live...");
    const live = await this.processManager.waitForApiLive();
    this.metrics.steps.live = live;

    this.log("Waiting for API /ready...");
    const ready = await this.processManager.waitForApiReady();
    this.metrics.steps.apiReady = { attempts: ready.attempts, durationMs: ready.durationMs, ok: true };
    this.metrics.steps.apiReadiness = ready.payload;

    this.log("Waiting for frontend...");
    const frontendStarted = performance.now();
    const frontend = await this.processManager.waitForFrontendReady();
    this.metrics.browserStartupMs = frontend.durationMs ?? Math.round(performance.now() - frontendStarted);
    this.metrics.steps.frontend = frontend;

    await this.verifyOllama();
    await this.verifyRedis();

    this.metrics.startupMs = Math.round(performance.now() - this.startedAt);
    this.processManager.writeLifecycleReport();
    return ready.payload;
  }

  writeReport() {
    mkdirSync("test-results", { recursive: true });
    const databaseLatency = this.metrics.steps.apiReadiness?.checks?.database?.durationMs ?? "n/a";
    const ollama = this.metrics.steps.ollama ?? {};
    const report = `# Infrastructure Report

Generated: ${new Date().toISOString()}

## Summary

| Metric | Value |
|--------|-------|
| Session ID | ${this.metrics.sessionId} |
| Reuse existing server | ${this.metrics.reuseExistingServer ? "yes" : "no"} |
| Startup time | ${this.metrics.startupMs ?? "n/a"} ms |
| API readiness | ${this.metrics.steps.apiReady?.ok ? "ready" : "failed"} |
| Ollama readiness | ${ollama.skipped ? "skipped (mock mode)" : ollama.ok ? "healthy" : "failed"} |
| Database latency | ${databaseLatency} ms |
| Frontend startup | ${this.metrics.browserStartupMs ?? "n/a"} ms |
| CPU cores | ${this.metrics.cpu} |
| Memory free / total | ${this.metrics.memory.freeMb} MB / ${this.metrics.memory.totalMb} MB |
| Process lifecycle report | PROCESS_LIFECYCLE_REPORT.md |

## Failed connections

${this.metrics.failedConnections.length ? this.metrics.failedConnections.map((item) => `- ${item}`).join("\n") : "- None"}

## Step timings

\`\`\`json
${JSON.stringify(this.metrics.steps, null, 2)}
\`\`\`
`;
    writeFileSync(this.reportPath, report, "utf8");
    this.log(`Wrote ${this.reportPath}`);
    return report;
  }

  async teardown({ reason = "startup-health-teardown", stoppedBy = "StartupHealthManager.teardown" } = {}) {
    if (shouldReuseExistingServer()) {
      this.log("reuseExistingServer=true — skipping managed shutdown.");
      return [];
    }
    return this.processManager.shutdown({ reason, stoppedBy });
  }
}

export async function runStartupHealth(options = {}) {
  const manager = new StartupHealthManager(options);
  try {
    await manager.verifyDependencies(options);
    manager.writeReport();
    return manager;
  } catch (error) {
    manager.writeReport();
    throw error;
  }
}

if (process.argv[1]?.endsWith("startup-health-manager.mjs")) {
  runStartupHealth({ startServers: process.argv.includes("--start-servers") }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
