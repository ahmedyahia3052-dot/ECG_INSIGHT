/**
 * Sprint 85 — ECG Storage Engine integration markers.
 */
import fs from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();

const requiredFiles = [
  "server/src/modules/ecg-storage-engine/index.ts",
  "server/src/modules/ecg-storage-engine/ecg-storage-engine.service.ts",
  "server/src/modules/ecg-storage-engine/ecg-storage-engine.routes.ts",
  "server/src/modules/ecg-storage-engine/repository.ts",
  "server/src/modules/ecg-storage-engine/providers/local.provider.ts",
  "server/src/modules/ecg-storage-engine/providers/s3.provider.ts",
  "server/src/modules/ecg-storage-engine/formats.ts",
  "prisma/migrations/20260709030000_sprint85_ecg_storage_engine/migration.sql",
  "SPRINT85_ECG_STORAGE.md",
  "scripts/sprint85-ecg-storage-engine.test.ts",
];

for (const relativePath of requiredFiles) {
  const file = resolve(ROOT, relativePath);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing Sprint 85 artifact: ${relativePath}`);
  }
}

const modulesIndex = fs.readFileSync(resolve(ROOT, "server/src/modules/index.ts"), "utf8");
if (!modulesIndex.includes('modulesRouter.use("/ecg-storage", ecgStorageEngineRouter)')) {
  throw new Error("ECG storage router is not mounted at /ecg-storage");
}

const schema = fs.readFileSync(resolve(ROOT, "prisma/schema.prisma"), "utf8");
for (const marker of ["checksum", "storageProvider", "ECGFileVersion", "recordUuid", "deletedAt"]) {
  if (!schema.includes(marker)) {
    throw new Error(`Prisma schema missing Sprint 85 marker: ${marker}`);
  }
}

console.log("Sprint 85 ECG Storage Engine integration markers: PASS");
