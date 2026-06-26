import fs from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createApp } from "../server/src/app";
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

function expectStatus(response: { body: unknown; status: number }, expected: number, label: string) {
  assert(response.status === expected, `${label}: expected ${expected} but got ${response.status}: ${JSON.stringify(response.body).slice(0, 500)}`);
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
  assert(digital.leadSegments.length === 12, "Lead segmentation metadata should include all 12 leads.");
  assert(digital.quality.score >= 0 && digital.quality.score <= 100, "Digitization quality score should be normalized 0-100.");
  assert(digital.preprocessing?.croppingOptimization.widthPercent !== undefined, "Preprocessing metadata should include crop optimization.");
  assert(digital.extractionTimestamp, "Digitization extraction timestamp should be persisted.");

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
  await prisma.eCGFile.delete({ where: { id: unsupported.id } });

  const server = createServer(createApp());
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  assert(address && typeof address === "object", "Server did not expose a port.");
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  async function request(route: string, options: { body?: unknown; method?: string; token?: string } = {}) {
    const headers = new Headers();
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }
    const response = await fetch(`${baseUrl}${route}`, { body, headers, method: options.method ?? "GET" });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = text;
    }
    return { body: parsed, status: response.status };
  }
  const login = await request("/auth/login", {
    body: { email: user.email, password: "password", rememberMe: true },
    method: "POST",
  });
  expectStatus(login, 200, "digitization API login");
  const token = (login.body as { accessToken?: string }).accessToken;
  assert(token, "Login must return access token.");

  let response = await request("/ecg/digitize", {
    body: { caseId: ecgCase.id, gainMmPerMv: 10, paperSpeedMmPerSec: 25 },
    method: "POST",
    token,
  });
  expectStatus(response, 202, "POST /api/v1/ecg/digitize");
  const apiDigital = (response.body as { clinicalDisclaimer?: string; digitalEcg?: typeof digital }).digitalEcg;
  assert(apiDigital?.quality.score !== undefined, "Digitize API must return quality score.");
  assert(apiDigital.leadSegments.length === 12, "Digitize API must return 12 lead segments.");
  assert(apiDigital.preprocessing?.borderDetected !== undefined, "Digitize API must return preprocessing metadata.");
  assert((response.body as { clinicalDisclaimer?: string }).clinicalDisclaimer?.includes("physician review"), "Digitize API must return clinical disclaimer.");

  response = await request(`/ecg/${ecgCase.id}/digitized`, { token });
  expectStatus(response, 200, "GET /api/v1/ecg/:id/digitized");
  assert((response.body as { digitalEcg?: typeof digital }).digitalEcg?.leads.length === 12, "Digitized endpoint must return persisted 12 leads.");

  response = await request(`/ecg/${ecgCase.caseId}/digitization-quality`, { token });
  expectStatus(response, 200, "GET /api/v1/ecg/:id/digitization-quality");
  const quality = (response.body as { digitizationQuality?: { quality?: { score?: number; warnings?: string[] }; status?: string } }).digitizationQuality;
  assert(typeof quality?.quality?.score === "number", "Quality endpoint must return score.");
  assert(Array.isArray(quality.quality.warnings), "Quality endpoint must return warnings.");
  assert(quality.status === "available", "Quality endpoint must report available digitization.");
  server.close();

  await prisma.eCGAnnotation.deleteMany({ where: { ecgFileId: file.id } });
  await prisma.eCGLeadSignal.deleteMany({ where: { ecgFileId: file.id } });
  await prisma.eCGFile.deleteMany({ where: { id: file.id } });
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: user.id }, { caseId: ecgCase.id }, { patientId: patient.id }] } });
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
