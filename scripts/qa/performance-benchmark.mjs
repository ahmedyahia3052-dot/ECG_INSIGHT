/**
 * Performance benchmarks — measures API and optional viewer readiness (QA infra only).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { QA_DIRS, REPO_ROOT, THRESHOLDS } from "./config.mjs";

const API_ORIGIN = process.env.PLAYWRIGHT_API_URL?.replace(/\/api\/?$/, "") ?? "http://127.0.0.1:3002";

async function timedFetch(label, url) {
  const start = performance.now();
  const response = await fetch(url);
  const ms = Math.round(performance.now() - start);
  const body = await response.text();
  let ok = response.ok;
  try {
    const json = JSON.parse(body);
    if (json.ok === false) ok = false;
  } catch {
    // non-json endpoints
  }
  return { label, url, ms, ok, status: response.status };
}

async function main() {
  const results = [];
  for (const endpoint of ["/health", "/live", "/ready"]) {
    results.push(await timedFetch(`api${endpoint}`, `${API_ORIGIN}${endpoint}`));
  }

  const loginStart = performance.now();
  const loginRes = await fetch(`${API_ORIGIN}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "doctor@ecginsight.com", password: "password", rememberMe: true }),
  });
  results.push({
    label: "apiLogin",
    url: `${API_ORIGIN}/api/auth/login`,
    ms: Math.round(performance.now() - loginStart),
    ok: loginRes.ok,
    status: loginRes.status,
  });

  let bundleSizeKb = null;
  const distDir = path.join(REPO_ROOT, "dist");
  if (fs.existsSync(distDir)) {
    let bytes = 0;
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else bytes += fs.statSync(full).size;
      }
    };
    walk(distDir);
    bundleSizeKb = Math.round(bytes / 1024);
  }

  const pw = spawnSync(
    "npx",
    ["playwright", "test", "tests/e2e/performance-viewer-ready.spec.ts", "--project=chromium-desktop"],
    { cwd: REPO_ROOT, shell: true, encoding: "utf8", stdio: "pipe" },
  );
  const viewerReadyMs = pw.status === 0 ? extractMs(pw.stdout + pw.stderr, "viewer-ready-ms") : null;

  const report = {
    generatedAt: new Date().toISOString(),
    thresholds: THRESHOLDS.performanceMs,
    bundleSizeKb,
    metrics: results,
    viewerReadyMs,
    playwrightExitCode: pw.status,
    passed: results.every((r) => r.ok && r.ms <= (THRESHOLDS.performanceMs[r.label.replace("api", "").toLowerCase()] ?? 10_000)),
  };

  fs.mkdirSync(QA_DIRS.performance, { recursive: true });
  fs.writeFileSync(path.join(QA_DIRS.performance, "benchmark.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.passed ? 0 : 1);
}

function extractMs(text, key) {
  const match = text.match(new RegExp(`${key}=(\\d+)`));
  return match ? Number(match[1]) : null;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
