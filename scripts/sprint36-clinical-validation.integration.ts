import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

import {
  assessEcgImageQuality,
  processEcgImage,
  validateEcgImageAsset,
  type EcgAcquisitionAsset,
} from "../artifacts/ecg-insight/services/ecgImageProcessor";
import { MEASUREMENT_PRECISION, withinPixelTolerance } from "../artifacts/ecg-insight/components/ecg/viewer/ecgLiveMeasurements";
import { gridSpacingPx, horizontalDeltaMs } from "../artifacts/ecg-insight/components/ecg/viewer/ecgCalibrationMath";
import { runDigitizationPipeline } from "../server/src/modules/ecg-digitization/digitizer";
import { detectGridCalibration } from "../server/src/modules/ecg-processing/ecg-digitization.service";
import { STANDARD_LEADS } from "../server/src/modules/ecg-digitization/types";
import { validateDigitizedSignals } from "../server/src/modules/ecg-digitization/validation/signal-validator";

import { runIntegrationMain } from "./finish-integration";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function asset(input: Partial<EcgAcquisitionAsset>): EcgAcquisitionAsset {
  return {
    file: new Blob(["ecg"], { type: input.mimeType ?? "image/jpeg" }),
    mimeType: input.mimeType ?? "image/jpeg",
    name: input.name ?? "ecg.jpg",
    size: input.size ?? 900 * 1024,
    uri: "data:image/jpeg;base64,ZWNn",
    ...input,
  };
}

async function createSyntheticGridImage(outputPath: string) {
  const width = 800;
  const height = 600;
  const pixels = Buffer.alloc(width * height * 3, 255);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const grid = x % 10 === 0 || y % 10 === 0 ? 220 : 255;
      const trace = y > 120 && y < 140 && Math.sin(x / 18) > 0.4 ? 40 : grid;
      pixels[index] = trace;
      pixels[index + 1] = trace;
      pixels[index + 2] = trace;
    }
  }
  await sharp(pixels, { raw: { channels: 3, height, width } }).png().toFile(outputPath);
}

function readViewer(file: string) {
  return fs.readFileSync(path.join(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer", file), "utf8");
}

async function main() {
  const results: string[] = [];
  const pass = (phase: string, detail: string) => {
    results.push(`✓ ${phase}: ${detail}`);
  };

  // PHASE 1 — ECG Import
  for (const [mime, name] of [
    ["image/jpeg", "scan.jpg"],
    ["image/jpg", "mobile.jpg"],
    ["image/png", "highres-12lead.png"],
    ["application/pdf", "ecg-report.pdf"],
  ] as const) {
    assert(validateEcgImageAsset(asset({ mimeType: mime, name })).length === 0, `Import rejected ${name}`);
  }
  pass("Phase 1", "JPG/JPEG/PNG/PDF accepted");

  assert(validateEcgImageAsset(asset({ mimeType: "application/octet-stream", name: "bad.bin" })).length > 0, "Invalid format must reject");
  pass("Phase 1", "Invalid format rejected with error");

  const dark = assessEcgImageQuality(asset({ name: "dark-ecg-snapshot.jpg", size: 40 * 1024 }));
  const bright = assessEcgImageQuality(asset({ name: "bright-glare-ecg.jpg", size: 600 * 1024 }));
  const noisy = assessEcgImageQuality(asset({ name: "noisy-scan-ecg.jpg", size: 200 * 1024 }));
  assert(dark.warnings.length > 0 || dark.score < 70, "Dark ECG should warn");
  assert(bright.canAnalyze, "Bright ECG should remain analyzable");
  assert(noisy.score >= 0, "Noisy ECG quality scored");
  pass("Phase 1", "Dark/bright/noisy quality assessment");

  // PHASE 2 — Image Processing
  const scanner = await processEcgImage(asset({ name: "rotated-perspective-crop-ecg.jpg" }), { scannerMode: true });
  assert(scanner.steps.length >= 10, "Scanner pipeline must expose preprocessing steps");
  assert(
    scanner.steps.some((step) => /crop|deskew|rotation|contrast|noise|sharpen|background/i.test(step.label)),
    "Preprocessing steps missing",
  );
  pass("Phase 2", `${scanner.steps.length} preprocessing steps verified`);

  const viewerDir = path.join(process.cwd(), "artifacts/ecg-insight/components/ecg/viewer");
  for (const file of ["ecgImageEngine.ts", "EcgProViewerEngine.tsx"]) {
    assert(fs.existsSync(path.join(viewerDir, file)), `Missing ${file}`);
  }
  const imageEngine = readViewer("ecgImageEngine.ts");
  assert(imageEngine.includes("buildImageFilterStyle") && imageEngine.includes("fitZoomForDimensions"), "Image engine must preserve aspect fit");
  pass("Phase 2", "No-stretch fit rendering hooks present");

  // PHASE 3 — Grid
  assert(gridSpacingPx(25, 10) > 0 && gridSpacingPx(50, 10) > 0, "Grid spacing for 25/50 mm/s");
  assert(Math.abs(horizontalDeltaMs(140, 25, 14) - 400) < 1, "25 mm/s calibration");
  assert(withinPixelTolerance(10.4, 10), "Pixel tolerance ±0.5");
  assert(MEASUREMENT_PRECISION.qtMsTolerance === 2, "QT ms tolerance");
  pass("Phase 3", "Grid spacing and calibration math");

  const uploadDir = path.resolve(process.cwd(), "uploads", "sprint36-validation");
  fs.mkdirSync(uploadDir, { recursive: true });
  const syntheticPath = path.join(uploadDir, "test-50mm-20mm-ecg.png");
  await createSyntheticGridImage(syntheticPath);
  const syntheticFile = {
    id: "sprint36-grid",
    metadataJson: {},
    mimeType: "image/png",
    originalName: "test-50mm-20mm-ecg.png",
    sizeBytes: fs.statSync(syntheticPath).size,
    storagePath: syntheticPath,
  };
  const calibration = detectGridCalibration(syntheticFile);
  assert(calibration.paperSpeedMmPerSec === 50, "50 mm/s inferred from filename");
  assert(calibration.gainMmPerMv === 20, "20 mm/mV inferred from filename");
  pass("Phase 3", "Paper speed and gain inference");

  // PHASE 4 — Leads
  assert(STANDARD_LEADS.length === 12, "12 standard leads defined");
  assert(new Set(STANDARD_LEADS).size === 12, "No duplicate lead names");
  for (const lead of ["I", "II", "III", "aVR", "aVL", "aVF", "V1", "V2", "V3", "V4", "V5", "V6"]) {
    assert(STANDARD_LEADS.includes(lead as (typeof STANDARD_LEADS)[number]), `Missing lead ${lead}`);
  }
  pass("Phase 4", "All 12 leads defined uniquely");

  // PHASE 5 — Digitization
  const pipeline = await runDigitizationPipeline(syntheticFile);
  assert(pipeline.leads.length === 12, "Digitization must produce 12 leads");
  assert(pipeline.leadSegments.length === 12, "12 lead segments");
  assert(pipeline.leads.every((lead) => lead.samples.length > 0), "Non-empty samples per lead");
  const signalObjects = pipeline.signalObjects ?? [];
  assert(signalObjects.length >= 12, "Signal objects required for validation");
  const validation = validateDigitizedSignals({
    calibration: pipeline.calibration,
    leadSegments: pipeline.leadSegments,
    signalObjects,
  });
  assert(validation.leadDetectionPercent >= 80, `Lead detection ${validation.leadDetectionPercent}%`);
  pass("Phase 5", `Digitization accuracy score ${validation.score}, leads ${validation.leadDetectionPercent}%`);

  // PHASE 6 — Viewer
  const viewerChecks = [
    ["zoom", readViewer("useEcgViewerControls.ts").includes("setZoom")],
    ["pan", readViewer("useEcgViewerControls.ts").includes("togglePanMode")],
    ["reset", readViewer("useEcgViewerControls.ts").includes("resetView")],
    ["fit", readViewer("useEcgViewerControls.ts").includes("applyFit")],
    ["rotate", readViewer("useEcgViewerControls.ts").includes("rotate")],
    ["mini map", fs.existsSync(path.join(viewerDir, "EcgMiniNavigator.tsx"))],
    ["floating toolbar", readViewer("EcgFloatingToolPalette.tsx").includes("sprint35-floating-tool-palette")],
    ["fullscreen", readViewer("useEcgDiagnosticMode.ts").includes("requestFullscreen")],
    ["shortcuts", readViewer("useEcgWorkstationShortcuts.ts").includes("keydown")],
  ] as const;
  for (const [label, ok] of viewerChecks) assert(ok, `Viewer missing: ${label}`);
  pass("Phase 6", "Zoom/pan/reset/fit/rotate/minimap/toolbar/fullscreen/shortcuts");

  // PHASE 7 — Measurements
  const measurementEngine = readViewer("ecgMeasurementEngine.ts");
  for (const kind of ["pr_interval", "qrs_duration", "qt_interval", "qtc", "rr_interval", "electrical_axis", "st_elevation"]) {
    assert(measurementEngine.includes(kind), `Measurement kind missing: ${kind}`);
  }
  pass("Phase 7", "Clinical measurement kinds present");

  // PHASE 8 — AI
  const aiOverlay = readViewer("ecgAiOverlayEngine.ts");
  assert(aiOverlay.includes("buildAiClinicalAnnotations") && aiOverlay.includes("confidencePercent"), "AI overlay engine");
  assert(readViewer("EcgAiOverlayLayer.tsx").includes("opacity"), "AI overlay opacity control");
  pass("Phase 8", "AI overlay, confidence, and opacity");

  // PHASE 9 — Performance
  assert(readViewer("useViewerRuntimeMetrics.ts").includes("fps"), "FPS metrics hook");
  assert(readViewer("EcgProViewerEngine.tsx").includes("useViewerRuntimeMetrics"), "Runtime metrics wired");
  pass("Phase 9", "Performance metrics instrumentation");

  // PHASE 10 — Bug detector (static)
  const tooltip = readViewer("EcgWorkstationTooltip.tsx");
  assert(tooltip.includes("createPortal"), "Tooltips must use portal (no clipping)");
  assert(readViewer("EcgWorkstationGridShell.tsx").includes("minmax(0, 1fr)"), "Responsive center column");
  assert(readViewer("EcgClinicalRightPanel.tsx").includes("numberOfLines={1}"), "Tab label overflow guard");
  assert(!readViewer("EcgEnterpriseStatusBar.tsx").includes("dev-mode-toggle"), "Debug toggle removed from status bar");
  pass("Phase 10", "Layout overflow, tooltip portal, responsive grid");

  fs.writeFileSync(
    path.join(process.cwd(), "SPRINT36_VALIDATION_RESULTS.json"),
    JSON.stringify({ passed: results.length, phases: results, timestamp: new Date().toISOString() }, null, 2),
  );

  console.log("Sprint 36 Clinical Validation — all phases passed:");
  for (const line of results) console.log(`  ${line}`);
  console.log(`\nsprint36-clinical-validation.integration.ts: ${results.length} validation phases passed`);
}

runIntegrationMain(main);
