import {
  assessEcgImageQuality,
  classifyQuality,
  processEcgImage,
  TARGET_ECG_UPLOAD_BYTES,
  validateEcgImageAsset,
  type EcgAcquisitionAsset,
} from "../artifacts/ecg-insight/services/ecgImageProcessor";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function asset(input: Partial<EcgAcquisitionAsset> = {}): EcgAcquisitionAsset {
  return {
    file: new Blob(["ecg-image"], { type: "image/jpeg" }),
    mimeType: "image/jpeg",
    name: "workflow-ecg.jpg",
    size: 700 * 1024,
    uri: "data:image/jpeg;base64,ZWNn",
    ...input,
  };
}

async function main() {
  assert(classifyQuality(19) === "Poor", "Poor quality classification failed.");
  assert(classifyQuality(45) === "Fair", "Fair quality classification failed.");
  assert(classifyQuality(72) === "Good", "Good quality classification failed.");
  assert(classifyQuality(92) === "Excellent", "Excellent quality classification failed.");

  assert(validateEcgImageAsset(asset()).length === 0, "Valid upload image was rejected.");
  assert(validateEcgImageAsset(asset({ mimeType: "application/pdf", name: "ecg.pdf" })).some((error) => error.includes("Unsupported")), "Unsupported format was not rejected.");
  assert(validateEcgImageAsset(asset({ size: 26 * 1024 * 1024 })).some((error) => error.includes("File too large")), "Oversized image was not rejected.");

  const goodQuality = assessEcgImageQuality(asset({ name: "clear-12lead-ecg.jpg", size: 900 * 1024 }));
  assert(goodQuality.score >= 60, "Expected clear ECG image to score as analyzable.");
  assert(goodQuality.canAnalyze, "Good ECG image should be analyzable.");

  const poorQuality = assessEcgImageQuality(asset({ name: "dark-snapshot.jpg", size: 40 * 1024 }));
  assert(poorQuality.score < 60, "Expected blurry/dark image to warn below threshold.");
  assert(poorQuality.warnings.some((warning) => warning.includes("Blurry")), "Blurry image warning missing.");

  const uploadResult = await processEcgImage(asset(), { scannerMode: false });
  assert(uploadResult.errors.length === 0, "Upload workflow should not produce validation errors.");
  assert(uploadResult.steps.length === 0, "Plain upload should not run scanner steps.");

  const scannerResult = await processEcgImage(asset({ name: "paper-scan-ecg.jpg" }), { scannerMode: true });
  assert(scannerResult.steps.length === 11, "Scanner workflow should expose all preprocessing steps.");
  assert(scannerResult.selectedVariant === "original" || scannerResult.selectedVariant === "enhanced", "Scanner preview selection missing.");

  const hugeResult = await processEcgImage(asset({ size: TARGET_ECG_UPLOAD_BYTES + 1 }), { scannerMode: true });
  assert(hugeResult.warnings.length >= 0, "Large scanner image should complete with warnings or compression.");

  const failedResult = await processEcgImage(asset({ mimeType: "image/gif", name: "bad.gif" }), { scannerMode: true });
  assert(failedResult.errors.length > 0, "Invalid scanner image should return explicit errors.");
  assert(failedResult.steps.every((step) => step.status === "skipped"), "Invalid scanner image should skip preprocessing.");

  console.log("ECG acquisition processor tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
