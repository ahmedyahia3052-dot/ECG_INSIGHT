import assert from "node:assert/strict";

import {
  buildImageFilterStyle,
  clampZoom,
  detectImageFormat,
  fitZoomForDimensions,
  isSupportedEcgAsset,
  zoomStep,
} from "../artifacts/ecg-insight/components/ecg/viewer/ecgImageEngine";
import { DEFAULT_ADJUSTMENTS } from "../artifacts/ecg-insight/components/ecg/viewer/types";

assert.equal(detectImageFormat("https://cdn/ecg/sample.png"), "png");
assert.equal(detectImageFormat("https://cdn/ecg/sample.JPG"), "jpg");
assert.equal(detectImageFormat("https://cdn/ecg/sample.jpeg"), "jpeg");
assert.equal(detectImageFormat("https://cdn/ecg/sample.webp"), "webp");
assert.equal(detectImageFormat("https://cdn/ecg/sample.tiff"), "tiff");
assert.equal(detectImageFormat("https://cdn/ecg/sample.bmp"), "bmp");
assert.equal(detectImageFormat("https://cdn/ecg/report.pdf"), "pdf");
assert.equal(detectImageFormat("https://cdn/ecg/unknown.bin"), "unknown");
assert.equal(detectImageFormat("https://cdn/ecg/report.pdf", "application/pdf"), "pdf");
assert.equal(isSupportedEcgAsset("https://cdn/ecg/sample.png"), true);
assert.equal(isSupportedEcgAsset("https://cdn/ecg/unknown.bin"), false);
assert.equal(clampZoom(12), 8);
assert.equal(clampZoom(0), 0.1);
assert.equal(zoomStep(1, 0.5), 1.5);
assert.equal(fitZoomForDimensions(800, 600, 1600, 1200, "width"), 1);
assert.equal(fitZoomForDimensions(800, 600, 1600, 1200, "height"), 1);
assert.equal(fitZoomForDimensions(400, 600, 1600, 1200, "height"), 2);
assert.match(buildImageFilterStyle({ ...DEFAULT_ADJUSTMENTS, grayscale: true, invert: true }) ?? "", /grayscale\(1\)/);
assert.match(buildImageFilterStyle({ ...DEFAULT_ADJUSTMENTS, brightness: 120 }) ?? "", /brightness\(1\.2\)/);

console.log("ecg-viewer-engine.test.ts: all unit tests passed");
