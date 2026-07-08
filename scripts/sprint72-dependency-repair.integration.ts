import fs from "node:fs";

function read(path: string) {
  return fs.readFileSync(path, "utf8");
}

function assertContains(path: string, needles: string[]) {
  const content = read(path);
  for (const needle of needles) {
    if (!content.includes(needle)) {
      throw new Error(`${path} is missing required Sprint 72 marker: ${needle}`);
    }
  }
}

assertContains("server/src/errors/app-error.ts", ["export class AppError"]);
assertContains("server/src/ai/ai-provider.types.ts", ["export interface AIProvider"]);
assertContains("scripts/sprint72-dependency-graph-scan.mjs", ["findCycles"]);
assertContains("DEPENDENCY_REPAIR_REPORT.md", [
  "Dependency Repair Report",
  "Circular Import",
  "FAIL-SAFE STOP",
  "Live Monitor",
  "Viewer Foundation",
]);

console.log("Sprint 72 dependency repair integration markers: PASS");
