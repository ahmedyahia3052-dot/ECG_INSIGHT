import fs from "node:fs";
import path from "node:path";

const root = path.resolve("server/src");

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) files.push(full);
  }
  return files;
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith(".")) return null;
  const base = path.resolve(path.dirname(fromFile), spec);
  const candidates = [
    base,
    `${base}.ts`,
    path.join(base, "index.ts"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate);
    }
  }
  return null;
}

function parseImports(file) {
  const content = fs.readFileSync(file, "utf8");
  const imports = [];
  const importRe = /(?:import|export)\s+(?:type\s+)?(?:[\w*{}\s,]+from\s+)?["']([^"']+)["']/g;
  let match;
  while ((match = importRe.exec(content))) {
    imports.push(match[1]);
  }
  return imports;
}

const files = walk(root);
const graph = new Map();

for (const file of files) {
  const deps = [];
  for (const spec of parseImports(file)) {
    const resolved = resolveImport(file, spec);
    if (resolved) deps.push(resolved);
  }
  graph.set(path.normalize(file), deps);
}

function findCycles() {
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

const cycles = findCycles();
const unique = new Map();
for (const cycle of cycles) {
  const key = cycle.slice().sort().join("->");
  if (!unique.has(key)) unique.set(key, cycle);
}

console.log(JSON.stringify({ cycleCount: unique.size, cycles: [...unique.values()] }, null, 2));
