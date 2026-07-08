import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "../..");
const summaryPath = path.join(repoRoot, "test-results", "coverage", "coverage-summary.json");
const outPath = path.join(repoRoot, "test-results", "qa-artifacts", "coverage-before.json");

const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8").replace(/^\uFEFF/, ""));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(summary.total, null, 2));
console.log("[coverage-baseline] Saved coverage-before.json");
