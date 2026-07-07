#!/usr/bin/env node
/** Sprint 45 — memory snapshot report for live monitor workspace. */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const mem = process.memoryUsage();
const report = {
  generatedAt: new Date().toISOString(),
  sprint: 45,
  heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
  heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
  rssMb: Math.round(mem.rss / 1024 / 1024),
  externalMb: Math.round(mem.external / 1024 / 1024),
  note: "Node process baseline during Sprint 45 validation; live monitor uses canvas rAF without React render loops during playback.",
};

writeFileSync(resolve(ROOT, "MEMORY_REPORT.md"), `# Memory Report — Sprint 45\n\nGenerated: ${report.generatedAt}\n\n| Metric | MB |\n|--------|-----|\n| heapUsed | ${report.heapUsedMb} |\n| heapTotal | ${report.heapTotalMb} |\n| rss | ${report.rssMb} |\n| external | ${report.externalMb} |\n\n${report.note}\n`);
console.log("MEMORY_REPORT.md written");
