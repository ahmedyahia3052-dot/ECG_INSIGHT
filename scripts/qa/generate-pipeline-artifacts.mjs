/**
 * Collect CI pipeline artifacts (screenshots, traces, junit, coverage, performance).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { QA_DIRS } from "./config.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "..", "..");

function safeReadJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function countFiles(dir, pattern) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.includes(pattern)) count += 1;
    }
  };
  walk(dir);
  return count;
}

const artifactRoot = path.join(repoRoot, "test-results", "playwright-artifacts");
const manifest = {
  generatedAt: new Date().toISOString(),
  screenshots: countFiles(artifactRoot, ".png"),
  traces: countFiles(artifactRoot, ".zip"),
  videos: countFiles(artifactRoot, ".webm"),
  junit: fs.existsSync(path.join(repoRoot, "test-results", "playwright-junit.xml")),
  playwrightSequential: safeReadJson(path.join(QA_DIRS.artifacts, "playwright-sequential-summary.json")),
  ciPipeline: safeReadJson(path.join(QA_DIRS.artifacts, "ci-pipeline-summary.json")),
  performance: safeReadJson(path.join(QA_DIRS.performance, "benchmark.json")),
  coverage: safeReadJson(path.join(QA_DIRS.artifacts, "coverage-summary.json")),
};

fs.mkdirSync(QA_DIRS.artifacts, { recursive: true });
fs.writeFileSync(path.join(QA_DIRS.artifacts, "pipeline-artifacts.json"), JSON.stringify(manifest, null, 2));
console.log("[pipeline-artifacts]", JSON.stringify(manifest, null, 2));
