import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { BenchmarkDatasetId, BenchmarkRunSummary } from "./types";

const workspaceRoot = path.resolve(__dirname, "../../../..");
const benchmarkRoot = path.join(workspaceRoot, "uploads", "benchmarks");

export function benchmarkStorageRoot() {
  return benchmarkRoot;
}

interface BenchmarkIndexEntry {
  completedAt: string | null;
  dataset: BenchmarkDatasetId;
  datasetLabel: string;
  id: string;
  initiatedById: string;
  sampleCount: number;
  startedAt: string;
  status: BenchmarkRunSummary["status"];
  summary: {
    accuracy: number;
    f1: number;
    precision: number;
    recall: number;
  };
}

async function readIndex(): Promise<BenchmarkIndexEntry[]> {
  const indexPath = path.join(benchmarkRoot, "index.json");
  try {
    const raw = await fs.readFile(indexPath, "utf8");
    return JSON.parse(raw) as BenchmarkIndexEntry[];
  } catch {
    return [];
  }
}

async function writeIndex(entries: BenchmarkIndexEntry[]) {
  await fs.mkdir(benchmarkRoot, { recursive: true });
  await fs.writeFile(path.join(benchmarkRoot, "index.json"), JSON.stringify(entries, null, 2), "utf8");
}

export function createBenchmarkRunId() {
  return randomUUID();
}

export async function saveBenchmarkRun(run: BenchmarkRunSummary, cases: unknown[]) {
  const runDir = path.join(benchmarkRoot, run.id);
  await fs.mkdir(runDir, { recursive: true });
  await fs.writeFile(path.join(runDir, "run.json"), JSON.stringify(run, null, 2), "utf8");
  await fs.writeFile(path.join(runDir, "cases.json"), JSON.stringify(cases, null, 2), "utf8");

  const entries = await readIndex();
  const nextEntry: BenchmarkIndexEntry = {
    completedAt: run.completedAt,
    dataset: run.dataset,
    datasetLabel: run.datasetLabel,
    id: run.id,
    initiatedById: run.initiatedById,
    sampleCount: run.sampleCount,
    startedAt: run.startedAt,
    status: run.status,
    summary: {
      accuracy: run.metrics.accuracy,
      f1: run.metrics.f1,
      precision: run.metrics.precision,
      recall: run.metrics.recall,
    },
  };
  await writeIndex([nextEntry, ...entries.filter((item) => item.id !== run.id)]);
  return runDir;
}

export async function loadBenchmarkRun(runId: string): Promise<BenchmarkRunSummary | null> {
  try {
    const raw = await fs.readFile(path.join(benchmarkRoot, runId, "run.json"), "utf8");
    return JSON.parse(raw) as BenchmarkRunSummary;
  } catch {
    return null;
  }
}

export async function loadBenchmarkCases(runId: string) {
  try {
    const raw = await fs.readFile(path.join(benchmarkRoot, runId, "cases.json"), "utf8");
    return JSON.parse(raw) as unknown[];
  } catch {
    return [];
  }
}

export async function listBenchmarkRuns(limit = 20) {
  const entries = await readIndex();
  return entries.slice(0, limit);
}

export async function saveBenchmarkArtifact(runId: string, fileName: string, content: string | Buffer) {
  const runDir = path.join(benchmarkRoot, runId);
  await fs.mkdir(runDir, { recursive: true });
  const target = path.join(runDir, fileName);
  await fs.writeFile(target, content);
  return target;
}

export async function readBenchmarkArtifact(runId: string, fileName: string) {
  return fs.readFile(path.join(benchmarkRoot, runId, fileName));
}
