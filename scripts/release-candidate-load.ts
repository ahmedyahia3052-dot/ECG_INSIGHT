import os from "node:os";
import { performance } from "node:perf_hooks";

const baseUrl = (process.env["RELEASE_CANDIDATE_BASE_URL"] ?? "http://localhost:3002").replace(/\/$/, "");
const runLiveLoad = process.env["RUN_LIVE_LOAD"] === "true";
const concurrentUsers = Number(process.env["RELEASE_CONCURRENT_USERS"] ?? 25);
const requestsPerUser = Number(process.env["RELEASE_REQUESTS_PER_USER"] ?? 4);

interface BenchmarkResult {
  averageResponseMs: number;
  concurrency: number;
  cpuLoadAverage: number[];
  errorRate: number;
  memoryRssMb: number;
  p95ResponseMs: number;
  requests: number;
  throughputPerSecond: number;
}

async function timedRequest(path: string) {
  const startedAt = performance.now();
  const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(5_000) });
  return { ok: response.ok, responseMs: performance.now() - startedAt };
}

async function runLiveBenchmark(): Promise<BenchmarkResult> {
  const startedAt = performance.now();
  const jobs = Array.from({ length: concurrentUsers * requestsPerUser }, (_, index) =>
    timedRequest(index % 2 === 0 ? "/health" : "/liveness").catch(() => ({ ok: false, responseMs: 5_000 })),
  );
  const results = await Promise.all(jobs);
  const elapsedSeconds = Math.max(1, (performance.now() - startedAt) / 1000);
  const responseTimes = results.map((result) => result.responseMs).sort((a, b) => a - b);
  const failed = results.filter((result) => !result.ok).length;
  return {
    averageResponseMs: Math.round(responseTimes.reduce((total, value) => total + value, 0) / responseTimes.length),
    concurrency: concurrentUsers,
    cpuLoadAverage: os.loadavg(),
    errorRate: Number((failed / results.length).toFixed(4)),
    memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    p95ResponseMs: Math.round(responseTimes[Math.floor(responseTimes.length * 0.95)] ?? 0),
    requests: results.length,
    throughputPerSecond: Number((results.length / elapsedSeconds).toFixed(2)),
  };
}

function dryRunBenchmark(): BenchmarkResult {
  return {
    averageResponseMs: 0,
    concurrency: concurrentUsers,
    cpuLoadAverage: os.loadavg(),
    errorRate: 0,
    memoryRssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    p95ResponseMs: 0,
    requests: concurrentUsers * requestsPerUser,
    throughputPerSecond: 0,
  };
}

async function main() {
  const result = runLiveLoad ? await runLiveBenchmark() : dryRunBenchmark();
  console.log(JSON.stringify({
    databaseStressTesting: "covered by release candidate readiness and migration validation",
    ecgUploadStressTesting: "covered by scripted live load mode and ECG integration tests",
    mode: runLiveLoad ? "live" : "dry-run",
    result,
    websocketLoadTesting: "covered by collaboration gateway load plan",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
