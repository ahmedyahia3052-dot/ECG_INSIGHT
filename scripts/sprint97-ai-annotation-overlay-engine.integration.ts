/**
 * Sprint 97 — AI Annotation & Overlay Engine integration markers.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const MOD = resolve(ROOT, "server/src/modules/ai-annotation-overlay-engine");

function assertFileContains(file: string, markers: string[]) {
  const text = readFileSync(file, "utf8");
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`Missing marker "${marker}" in ${file}`);
  }
}

const files = [
  {
    file: resolve(MOD, "types.ts"),
    markers: ["AI_ANNOTATION_OVERLAY_ENGINE_VERSION", "p_wave_markers", "ABNORMALITY_COLORS"],
  },
  {
    file: resolve(MOD, "overlay-builder.ts"),
    markers: ["buildMeasurementOverlayAnnotations", "mapDatabaseAnnotationsToOverlay", "buildPhysicianNoteAnnotation"],
  },
  {
    file: resolve(MOD, "layer-renderer.ts"),
    markers: ["renderMultiLayerOverlay", "confidence_badges", "abnormality_highlights"],
  },
  {
    file: resolve(MOD, "repository.ts"),
    markers: ["EcgAiOverlayWorkspace", "createOverlayVersion", "upsertOverlayWorkspace"],
  },
  {
    file: resolve(MOD, "ai-annotation-overlay.service.ts"),
    markers: ["generateAiOverlayWorkspace", "toggleAiOverlay", "exportAiOverlayBundle", "loadAiOverlayForReport"],
  },
  {
    file: resolve(MOD, "ai-annotation-overlay.routes.ts"),
    markers: ["/cases/:caseId/workspace", "/cases/:caseId/generate", "/cases/:caseId/toggle", "/cases/:caseId/export"],
  },
  {
    file: resolve(ROOT, "prisma/schema.prisma"),
    markers: ["model EcgAiOverlayWorkspace", "model EcgAiOverlayVersion"],
  },
  {
    file: resolve(ROOT, "prisma/migrations/20260709050000_sprint97_ai_annotation_overlay_engine/migration.sql"),
    markers: ["EcgAiOverlayWorkspace", "EcgAiOverlayVersion"],
  },
  {
    file: resolve(ROOT, "server/src/modules/ecg-viewer-api/ecg-viewer-api.service.ts"),
    markers: ["aiOverlay", "getViewerAiOverlay", "generateViewerAiOverlay"],
  },
  {
    file: resolve(ROOT, "server/src/modules/medical-report-engine/exporters.ts"),
    markers: ["overlayExport", "loadAiOverlayForReport"],
  },
  {
    file: resolve(ROOT, "server/src/modules/index.ts"),
    markers: ["/ai-annotation-overlay-engine", "aiAnnotationOverlayEngineRouter"],
  },
  {
    file: resolve(ROOT, "SPRINT97_AI_OVERLAY_REPORT.md"),
    markers: ["P wave markers", "Multi-layer rendering", "Version history", "Export overlay with report"],
  },
];

for (const entry of files) {
  assertFileContains(entry.file, entry.markers);
}

console.log("Sprint 97 AI Annotation Overlay Engine integration markers: PASS");
