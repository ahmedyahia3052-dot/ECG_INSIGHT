import assert from "node:assert/strict";
import {
  DEFAULT_OVERLAY_CONFIG,
  DEFAULT_ZOOM_PRESETS,
  ECG_VIEWER_API_VERSION,
  getEcgViewerApiStatus,
  getZoomPresets,
} from "../server/src/modules/ecg-viewer-api";

assert.equal(ECG_VIEWER_API_VERSION, "sprint89-ecg-viewer-v1");
assert.deepEqual(DEFAULT_ZOOM_PRESETS, [0.5, 1, 2, 4, 8, 16]);
assert.equal(DEFAULT_OVERLAY_CONFIG.showAiFindings, true);
assert.equal(DEFAULT_OVERLAY_CONFIG.showGrid, true);

const status = getEcgViewerApiStatus();
assert.equal(status.version, "sprint89-ecg-viewer-v1");
assert.equal(status.apiId, "ecg-insight-ecg-viewer-api");

const presets = await getZoomPresets();
assert.equal(presets.presets.length, 6);

console.log("Sprint 89 ECG Viewer API unit tests: PASS");
