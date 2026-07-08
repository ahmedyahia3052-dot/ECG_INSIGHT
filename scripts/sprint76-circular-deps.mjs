/**
 * Sprint 76 — lightweight circular dependency scan (read-only analysis).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TARGETS = [
  resolve(ROOT, "server/src"),
  resolve(ROOT, "artifacts/ecg-insight/components/ecg/viewer"),
  resolve(ROOT, "artifacts/ecg-insight/services"),
  resolve(ROOT, "artifacts/ecg-insight/hooks"),
];

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?|export\s+(?:type\s+)?(?:\*|\{[^}]+\})\s+from\s+|require\(\s*)['"]([^'"]+)['"]/g;

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(ts|tsx|js|mjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".") && !spec.startsWith("@/")) return null;
  let base = spec;
  if (spec.startsWith("@/")) {
    base = spec.replace("@/", join(ROOT, "artifacts/ecg-insight/") + "/");
  } else {
    base = resolve(dirname(fromFile), spec);
  }
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.mjs`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
  ];
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // continue
    }
  }
  return null;
}

function buildGraph(files) {
  const graph = new Map();
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    const deps = new Set();
    for (const match of text.matchAll(IMPORT_RE)) {
      const resolved = resolveImport(file, match[1]);
      if (resolved && files.includes(resolved)) deps.add(resolved);
    }
    graph.set(file, deps);
  }
  return graph;
}

function findCycles(graph) {
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();
  const stack = [];

  function dfs(node) {
    if (visiting.has(node)) {
      const idx = stack.indexOf(node);
      if (idx >= 0) cycles.push(stack.slice(idx).concat(node));
      return;
    }
    if (visited.has(node)) return;
    visiting.add(node);
    stack.push(node);
    for (const dep of graph.get(node) ?? []) dfs(dep);
    stack.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) dfs(node);
  return cycles;
}

const allFiles = TARGETS.flatMap((target) => walk(target));
const graph = buildGraph(allFiles);
const cycles = findCycles(graph);

const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");
console.log(JSON.stringify({
  filesScanned: allFiles.length,
  circularCount: cycles.length,
  cycles: cycles.map((cycle) => cycle.map(rel)),
}, null, 2));

if (cycles.length) process.exitCode = 1;
