import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createSignedDownloadToken, verifySignedDownloadToken } from "../server/src/utils/file-security";
import {
  ECG_STORAGE_ENGINE_VERSION,
  assertEcgStorageMagicBytes,
  assertSupportedEcgStorageFormat,
  buildStorageKey,
  getLocalStorageRoot,
  LocalStorageProvider,
  mapFormatToFileType,
  resolveEcgStorageFormat,
  resolveSignedDownloadPath,
  SUPPORTED_ECG_STORAGE_EXTENSIONS,
} from "../server/src/modules/ecg-storage-engine";
import { createStoredName } from "../server/src/modules/ecg-storage-engine/repository";

assert.equal(ECG_STORAGE_ENGINE_VERSION, "sprint85-ecg-storage-v1");
assert.ok(SUPPORTED_ECG_STORAGE_EXTENSIONS.has(".png"));
assert.ok(SUPPORTED_ECG_STORAGE_EXTENSIONS.has(".dicom"));
assert.equal(resolveEcgStorageFormat("scan.PDF", "application/pdf"), "pdf");
assert.equal(mapFormatToFileType("dicom"), "DICOM_ECG");
assert.match(buildStorageKey("patient-1", "file.png"), /^ecg\/patient-1\//);
assert.match(createStoredName("ecg.png"), /\.png$/);

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sprint85-storage-"));
const pngPath = path.join(tempDir, "sample.png");
const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
fs.writeFileSync(pngPath, Buffer.concat([pngHeader, Buffer.from("fakepng")]));
assert.equal(assertSupportedEcgStorageFormat("sample.png", "image/png"), "png");
assert.doesNotThrow(() => assertEcgStorageMagicBytes(pngPath, "sample.png", "image/png"));

const provider = new LocalStorageProvider();
const key = buildStorageKey("patient-test", "unit.png");
const stored = await provider.put({
  key,
  mimeType: "image/png",
  sizeBytes: fs.statSync(pngPath).size,
  sourcePath: pngPath,
});
assert.equal(stored.provider, "local");
const resolved = await provider.getPath(key);
assert.equal(fs.existsSync(resolved), true);
const head = await provider.head(key);
assert.equal(head.exists, true);
await provider.delete(key);
assert.equal((await provider.head(key)).exists, false);
assert.ok(getLocalStorageRoot().includes("ecg-storage"));

const token = createSignedDownloadToken(resolved, 300);
assert.equal(verifySignedDownloadToken(token), resolved);
assert.throws(() => resolveSignedDownloadPath("invalid-token"));

fs.rmSync(tempDir, { force: true, recursive: true });

console.log("Sprint 85 ECG Storage Engine unit tests: PASS");
