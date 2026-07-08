/**
 * Sprint 89 — ECG Viewer Backend API integration markers.
 */
import fs from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

const requiredFiles = [
  "server/src/modules/ecg-viewer-api/index.ts",
  "server/src/modules/ecg-viewer-api/ecg-viewer-api.service.ts",
  "server/src/modules/ecg-viewer-api/ecg-viewer-api.routes.ts",
  "server/src/modules/ecg-viewer-api/repository.ts",
  "server/src/modules/ecg-viewer-api/types.ts",
  "server/src/modules/ecg-viewer-api/schemas.ts",
  "prisma/migrations/20260709040000_sprint89_ecg_viewer_api/migration.sql",
  "SPRINT89_VIEWER_API_REPORT.md",
  "scripts/sprint89-ecg-viewer-api.test.ts",
];

for (const relativePath of requiredFiles) {
  const file = resolve(ROOT, relativePath);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing Sprint 89 artifact: ${relativePath}`);
  }
}

const modulesIndex = fs.readFileSync(resolve(ROOT, "server/src/modules/index.ts"), "utf8");
if (!modulesIndex.includes('modulesRouter.use("/ecg-viewer", ecgViewerApiRouter)')) {
  throw new Error("ECG viewer API router is not mounted at /ecg-viewer");
}

const routes = fs.readFileSync(resolve(ROOT, "server/src/modules/ecg-viewer-api/ecg-viewer-api.routes.ts"), "utf8");
const endpoints = [
  "/cases/:caseId/bundle",
  "/cases/:caseId/image",
  "/cases/:caseId/metadata",
  "/cases/:caseId/measurements",
  "/cases/:caseId/waveform",
  "/cases/:caseId/leads",
  "/cases/:caseId/annotations",
  "/cases/:caseId/overlay",
  "/cases/:caseId/compare",
  "/cases/:caseId/report",
  "/cases/:caseId/export",
  "/preferences",
  "/zoom-presets",
];

for (const endpoint of endpoints) {
  if (!routes.includes(endpoint)) {
    throw new Error(`Missing viewer API route: ${endpoint}`);
  }
}

const schema = fs.readFileSync(resolve(ROOT, "prisma/schema.prisma"), "utf8");
for (const marker of ["EcgViewerPreference", "EcgPhysicianAnnotation", "EcgViewerCaseOverlay"]) {
  if (!schema.includes(marker)) {
    throw new Error(`Prisma schema missing Sprint 89 marker: ${marker}`);
  }
}

console.log("Sprint 89 ECG Viewer API integration markers: PASS");
