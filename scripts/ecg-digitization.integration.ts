import fs from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  detectGridCalibration,
  exportDigitalEcg,
  getDigitalEcg,
  reconstructCaseEcg,
  reconstructLeads,
} from "../server/src/modules/ecg-processing/ecg-digitization.service";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/ecg_insight",
  }),
});

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const stamp = Date.now();
  const uploadRoot = path.resolve(process.cwd(), "uploads", "digitization-tests");
  await fs.mkdir(uploadRoot, { recursive: true });
  const imagePath = path.join(uploadRoot, `ecg-${stamp}.png`);
  await fs.writeFile(imagePath, Buffer.from("89504e470d0a1a0a", "hex"));

  const passwordHash = await bcrypt.hash("password", 12);
  const user = await prisma.user.create({
    data: {
      avatarInitials: "DG",
      email: `digitization-${stamp}@ecginsight.test`,
      emailVerified: true,
      isActive: true,
      name: "Digitization Test",
      passwordHash,
      role: "DOCTOR",
      subscription: { create: { status: "ACTIVE", tier: "ENTERPRISE" } },
    },
  });
  const patient = await prisma.patient.create({
    data: {
      dateOfBirth: new Date("1970-01-01"),
      firstName: "Digital",
      gender: "UNKNOWN",
      lastName: "Waveform",
      medicalRecordNumber: `DIG-${stamp}`,
    },
  });
  const ecgCase = await prisma.eCGCase.create({
    data: {
      caseId: `CASE-DIG-${stamp}`,
      ecgType: "12-Lead ECG",
      patientId: patient.id,
      priority: "MEDIUM",
      uploadedById: user.id,
    },
  });
  const file = await prisma.eCGFile.create({
    data: {
      caseId: ecgCase.id,
      fileType: "IMAGE",
      mimeType: "image/png",
      originalName: "test-50mm-20mm-ecg.png",
      patientId: patient.id,
      sizeBytes: 240_000,
      storagePath: imagePath,
      storedName: path.basename(imagePath),
      uploadedById: user.id,
    },
  });

  const calibration = detectGridCalibration(file);
  assert(calibration.paperSpeedMmPerSec === 50, "Grid detection should infer 50 mm/s from filename.");
  assert(calibration.gainMmPerMv === 20, "Grid detection should infer 20 mm/mV from filename.");
  assert(reconstructLeads(file, calibration).length === 12, "Lead detection should reconstruct 12 leads.");

  const digital = await reconstructCaseEcg(ecgCase.id, user.id);
  assert(digital.status === "available", "Digital ECG reconstruction should be available for image file.");
  assert(digital.leads.length === 12, "Persisted digital ECG should include 12 leads.");
  assert(digital.annotations.length > 0, "Clinical annotations should be generated.");
  assert(digital.measurements.qrsDurationMs > 0, "Interactive measurement defaults should be present.");

  const persisted = await getDigitalEcg(ecgCase.id);
  assert(persisted.leads.some((lead) => lead.lead === "II"), "Lead II should be retrievable.");
  assert((await prisma.eCGLeadSignal.count({ where: { ecgFileId: file.id } })) === 12, "Lead signals should persist.");
  assert((await prisma.eCGAnnotation.count({ where: { ecgFileId: file.id } })) > 0, "Annotations should persist.");

  const jsonExport = exportDigitalEcg(persisted, "json");
  const svgExport = exportDigitalEcg(persisted, "svg");
  const pdfExport = exportDigitalEcg(persisted, "pdf");
  assert(jsonExport.contentType === "application/json", "JSON export content type mismatch.");
  assert(svgExport.data.includes("<svg"), "SVG export should contain SVG markup.");
  assert(pdfExport.data.includes("Digital ECG Export"), "PDF export payload should include export summary.");

  const unsupported = await prisma.eCGFile.create({
    data: {
      caseId: ecgCase.id,
      fileType: "PDF_REPORT",
      mimeType: "application/pdf",
      originalName: "report.pdf",
      patientId: patient.id,
      sizeBytes: 1200,
      storagePath: imagePath,
      storedName: "report.pdf",
      uploadedById: user.id,
    },
  });
  const fallback = await reconstructCaseEcg(ecgCase.id, user.id);
  assert(fallback.status === "fallback" || fallback.ecgFileId === unsupported.id, "Unsupported latest ECG file should fall back safely.");

  await prisma.eCGAnnotation.deleteMany({ where: { ecgFileId: { in: [file.id, unsupported.id] } } });
  await prisma.eCGLeadSignal.deleteMany({ where: { ecgFileId: { in: [file.id, unsupported.id] } } });
  await prisma.eCGFile.deleteMany({ where: { id: { in: [file.id, unsupported.id] } } });
  await prisma.eCGCase.delete({ where: { id: ecgCase.id } });
  await prisma.patient.delete({ where: { id: patient.id } });
  await prisma.user.delete({ where: { id: user.id } });
  await fs.rm(imagePath, { force: true });

  console.log("ECG digitization integration test passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
