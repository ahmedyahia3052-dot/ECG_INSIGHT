import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { metricsSnapshot } from "../../middleware/observability";
import { hasLocalOnnxModel, resolveOnnxModelPath } from "../../ai/onnx-runtime.service";
import { probeOllama } from "../../llm/ollama-runtime";

const workspaceRoot = path.resolve(__dirname, "../../../..");

export type HealthStatus = "degraded" | "down" | "healthy";

function statusFrom(ok: boolean): HealthStatus {
  return ok ? "healthy" : "down";
}

async function timed<T>(check: () => Promise<T>) {
  const start = Date.now();
  try {
    const details = await check();
    return { details, durationMs: Date.now() - start, ok: true };
  } catch (error) {
    return {
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
      durationMs: Date.now() - start,
      ok: false,
    };
  }
}

export async function databaseHealth() {
  return timed(async () => {
    await prisma.$queryRaw`SELECT 1`;
    const [users, auditEvents, activeSessions] = await Promise.all([
      prisma.user.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.session.count({ where: { expiresAt: { gt: new Date() }, revokedAt: null } }),
    ]);
    return { activeSessions, auditEventsLast24h: auditEvents, provider: "postgresql", users };
  });
}

export async function aiHealth() {
  return timed(async () => {
    if (env.AI_ENGINE_URL) {
      const response = await fetch(`${env.AI_ENGINE_URL.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(4_000) });
      return {
        engineUrlConfigured: true,
        externalEngineHealthy: response.ok,
        provider: env.AI_PROVIDER,
        statusCode: response.status,
      };
    }

    return {
      engineUrlConfigured: false,
      localOnnxModel: hasLocalOnnxModel(),
      modelPath: resolveOnnxModelPath(),
      provider: env.AI_PROVIDER,
      ruleBasedFallback: true,
    };
  });
}

export async function storageHealth() {
  return timed(async () => {
    const storagePath = path.isAbsolute(env.STORAGE_PATH) ? env.STORAGE_PATH : path.join(workspaceRoot, env.STORAGE_PATH);
    await fsp.mkdir(storagePath, { recursive: true });
    await fsp.access(storagePath, fs.constants.R_OK | fs.constants.W_OK);
    const usage = await prisma.eCGFile.aggregate({ _sum: { sizeBytes: true }, _count: { _all: true } });
    return {
      fileCount: usage._count._all,
      path: storagePath,
      sizeBytes: usage._sum.sizeBytes ?? 0,
      writable: true,
    };
  });
}

export async function queueHealth() {
  return timed(async () => {
    const [syncQueue, failedBackups, latestBackup] = await Promise.all([
      prisma.syncQueue.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.backupJob.count({ where: { status: "FAILED" } }),
      prisma.backupJob.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);
    return {
      failedBackups,
      latestBackup,
      syncQueue: syncQueue.map((item) => ({ count: item._count._all, status: item.status })),
    };
  });
}

export async function auditPipelineHealth() {
  return timed(async () => {
    const recentWindow = new Date(Date.now() - 60 * 60 * 1000);
    const [recentAuditLogs, recentSecurityEvents] = await Promise.all([
      prisma.auditLog.count({ where: { createdAt: { gte: recentWindow } } }),
      prisma.securityEvent.count({ where: { createdAt: { gte: recentWindow } } }),
    ]);
    return { recentAuditLogs, recentSecurityEvents };
  });
}

function componentStatus(result: { ok: boolean }, degraded = false): HealthStatus {
  if (result.ok) return degraded ? "degraded" : "healthy";
  return "down";
}

async function pingRedis(url: string) {
  const parsed = new URL(url);
  const port = parsed.port ? Number(parsed.port) : 6379;
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host: parsed.hostname, port });
    socket.setTimeout(4_000);
    socket.once("connect", () => {
      socket.end();
      resolve();
    });
    socket.once("error", reject);
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error("Redis connection timed out."));
    });
  });
}

export async function ollamaReadinessHealth() {
  const required = env.OLLAMA_ENABLED && env.LLM_PROVIDER === "ollama" && !env.COPILOT_LLM_MOCK;
  if (!required) {
    return {
      details: { connected: false, mockMode: env.COPILOT_LLM_MOCK, provider: env.LLM_PROVIDER, required: false, skipped: true },
      durationMs: 0,
      ok: true,
    };
  }
  const start = Date.now();
  try {
    const runtime = await probeOllama(env.OLLAMA_BASE_URL);
    return {
      details: {
        baseUrl: runtime.baseUrl,
        connected: runtime.connected,
        ollamaVersion: runtime.ollamaVersion,
        required: true,
        selectedModel: runtime.selectedModel,
        skipped: false,
      },
      durationMs: Date.now() - start,
      ok: runtime.connected,
    };
  } catch (error) {
    return {
      details: {
        error: error instanceof Error ? error.message : String(error),
        required: true,
        skipped: false,
      },
      durationMs: Date.now() - start,
      ok: false,
    };
  }
}

export async function redisReadinessHealth() {
  const required = Boolean(env.REDIS_URL);
  if (!required) {
    return { details: { connected: false, required: false, skipped: true }, durationMs: 0, ok: true };
  }
  const start = Date.now();
  try {
    await pingRedis(env.REDIS_URL!);
    return {
      details: { connected: true, required: true, skipped: false, url: env.REDIS_URL },
      durationMs: Date.now() - start,
      ok: true,
    };
  } catch (error) {
    return {
      details: {
        error: error instanceof Error ? error.message : String(error),
        required: true,
        skipped: false,
        url: env.REDIS_URL,
      },
      durationMs: Date.now() - start,
      ok: false,
    };
  }
}

export async function dependencyReadinessSnapshot() {
  const started = Date.now();
  const [database, ollama, redis, storage] = await Promise.all([
    databaseHealth(),
    ollamaReadinessHealth(),
    redisReadinessHealth(),
    storageHealth(),
  ]);

  const ollamaOk = ollama.ok;
  const redisOk = redis.ok;
  const ok = database.ok && storage.ok && ollamaOk && redisOk;

  return {
    checks: {
      database: { ...database, status: componentStatus(database) },
      ollama: { ...ollama, status: ollamaOk ? "healthy" : "down" },
      redis: { ...redis, status: redisOk ? (redis.details?.skipped ? "skipped" : "healthy") : "down" },
      storage: { ...storage, status: componentStatus(storage) },
    },
    durationMs: Date.now() - started,
    environment: env.NODE_ENV,
    ok,
    service: "ecg-insight-api",
    timestamp: new Date().toISOString(),
  };
}

export async function productionReadinessSnapshot() {
  const [database, ai, storage, queue, auditPipeline] = await Promise.all([
    databaseHealth(),
    aiHealth(),
    storageHealth(),
    queueHealth(),
    auditPipelineHealth(),
  ]);
  const activeUsers = await prisma.session.count({ where: { expiresAt: { gt: new Date() }, revokedAt: null } });

  const components = {
    ai: { ...ai, status: componentStatus(ai) },
    auditPipeline: { ...auditPipeline, status: componentStatus(auditPipeline) },
    database: { ...database, status: componentStatus(database) },
    queue: { ...queue, status: componentStatus(queue) },
    storage: { ...storage, status: componentStatus(storage) },
  };
  const statuses = Object.values(components).map((component) => component.status);
  const status: HealthStatus = statuses.includes("down") ? "down" : statuses.includes("degraded") ? "degraded" : "healthy";

  return {
    activeUsers,
    components,
    environment: env.NODE_ENV,
    metrics: metricsSnapshot(),
    ok: status !== "down",
    service: "ecg-insight-api",
    status,
    timestamp: new Date().toISOString(),
  };
}
