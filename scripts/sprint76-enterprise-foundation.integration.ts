/**
 * Sprint 76 — Enterprise Clean Architecture integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(ROOT, "server/src/modules/copilot/attachment/pipeline-stage.types.ts"),
    markers: ["PipelineStageRecord", "PipelineStageName"],
  },
  {
    file: resolve(ROOT, "server/src/modules/copilot/engine/knowledge-route.types.ts"),
    markers: ["ClinicalKnowledgeRouteResult", "ClinicalKnowledgeDomain"],
  },
  {
    file: resolve(ROOT, "server/src/modules/copilot/engine/types.ts"),
    markers: ['from "./knowledge-route.types"'],
  },
  {
    file: resolve(ROOT, "scripts/sprint76-circular-deps.mjs"),
    markers: ["findCycles", "filesScanned"],
  },
  {
    file: resolve(ROOT, "server/src/api/registry/mount-points.ts"),
    markers: ["API_MOUNT_POINTS", "enterprise-rules-engine"],
  },
  {
    file: resolve(ROOT, "SPRINT76_ENTERPRISE_FOUNDATION_REPORT.md"),
    markers: ["Sprint 76", "Circular Dependencies", "Module Boundaries"],
  },
  {
    file: resolve(ROOT, "ENTERPRISE_READINESS_REPORT.md"),
    markers: ["Deployment Readiness", "Architecture Score", "Remaining Risks"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 76 Enterprise Clean Architecture integration markers: PASS");
