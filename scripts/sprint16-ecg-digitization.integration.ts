import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { runIntegrationMain } from "./finish-integration";
import {
  exportDigitalEcg,
  getDigitalEcg,
  reconstructCaseEcg,
} from "../server/src/modules/ecg-processing/ecg-digitization.service";
import { DIGITIZATION_PIPELINE_VERSION } from "../server/src/modules/ecg-digitization/types";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function createSyntheticEcgGridImage(outputPath: string) {
  const width = 960;
  const height = 720;
  const pixels = Buffer.alloc(width * height * 3, 255);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 3;
      const grid = x % 10 === 0 || y % 10 === 0 ? 220 : 255;
      const trace = y > 140 && y < 165 && Math.sin(x / 16) > 0.35 ? 38 : grid;
      pixels[index] = trace;
      pixels[index + 1] = trace;
      pixels[index + 2] = trace;
    }
  }
  await sharp(pixels, { raw: { channels: 3, height, width } }).png().toFile(outputPath);
}

async function main() {
  const stamp = Date.now();
  const uploadRoot = path.resolve(process.cwd(), "uploads", "sprint16-digitization");
  await fs.mkdir(uploadRoot, { recursive: true });
  const imagePath = path.join(uploadRoot, `sprint16-ecg-${stamp}.png`);
  await createSyntheticEcgGridImage(imagePath);

  const passwordHash = await bcrypt.hash("password", 12);
  const user = await prisma.user.create({
    data: {
      avatarInitials: "S16",
      email: `sprint16-${stamp}@ecginsight.test`,
      emailVerified: true,
      isActive: true,
      name: "Sprint 16 Digitization",
      passwordHash,
      role: "DOCTOR",
      subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
    },
  });
  const patient = await prisma.patient.create({
    data: {
      dateOfBirth: new Date("1980-05-01"),
      firstName: "Wave",
      gender: "FEMALE",
      lastName: "Digit",
      medicalRecordNumber: `S16-${stamp}`,
    },
  });
  const ecgCase = await prisma.eCGCase.create({
    data: {
      caseId: `CASE-S16-${stamp}`,
      ecgType: "12-Lead ECG",
      patientId: patient.id,
      priority: "MEDIUM",
      uploadedById: user.id,
    },
  });
  await prisma.eCGFile.create({
    data: {
      caseId: ecgCase.id,
      fileType: "IMAGE",
      metadataJson: { gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
      mimeType: "image/png",
      originalName: "patient-25mm-10mm-ecg-sprint16.png",
      patientId: patient.id,
      sizeBytes: (await fs.stat(imagePath)).size,
      storagePath: imagePath,
      storedName: path.basename(imagePath),
      uploadedById: user.id,
    },
  });

  const started = Date.now();
  const digital = await reconstructCaseEcg(ecgCase.id, user.id);
  const durationMs = Date.now() - started;
  assert(digital.status === "available", "Sprint 16 digitization should be available.");
  assert(digital.leads.length === 12, "Sprint 16 must digitize 12 leads.");
  assert(digital.leadSegments.length === 12, "Sprint 16 must detect 12 lead segments.");
  assert(digital.calibration.pixelsPerMm !== undefined || digital.calibration.pixelsPerSmallSquare !== undefined, "Grid engine must expose pixel calibration.");
  assert(digital.validation?.score !== undefined, "Validation metrics must be persisted.");
  assert(digital.validation!.digitizationAccuracy >= 0, "Digitization accuracy metric must be present.");
  assert(digital.ocrMetadata?.speed || digital.calibration.paperSpeedMmPerSec, "OCR/metadata speed must be available.");
  assert(durationMs < 60_000, `Sprint 16 digitization exceeded performance budget: ${durationMs}ms.`);

  const metadata = await prisma.eCGFile.findFirst({ orderBy: { createdAt: "desc" }, where: { caseId: ecgCase.id } });
  const digitization = metadata?.metadataJson && typeof metadata.metadataJson === "object"
    ? (metadata.metadataJson as Record<string, unknown>)["digitization"] as Record<string, unknown>
    : undefined;
  assert(digitization?.["pipelineVersion"] === DIGITIZATION_PIPELINE_VERSION, "Pipeline version must be Sprint 16.");
  assert(digitization?.["artifacts"], "Intermediate artifacts must be stored.");

  const persisted = await getDigitalEcg(ecgCase.id);
  const csvExport = exportDigitalEcg(persisted, "csv");
  const binaryExport = exportDigitalEcg(persisted, "binary");
  assert(csvExport.contentType === "text/csv", "CSV export must be available.");
  assert(String(csvExport.data).includes("lead,sample_index"), "CSV export must include headers.");
  assert(binaryExport.contentType === "application/octet-stream", "Binary export must be available.");
  assert(Buffer.isBuffer(binaryExport.data) && binaryExport.data.length > 12, "Binary export must contain signal payload.");

  console.log(`sprint16-ecg-digitization.integration.ts: passed in ${durationMs}ms`);
}

runIntegrationMain(main);
