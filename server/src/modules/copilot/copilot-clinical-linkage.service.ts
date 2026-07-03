import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { reconstructCaseEcg } from "../ecg-processing/ecg-digitization.service";
import type { ClinicalOcrStructuredData } from "../ocr/clinical-ocr.service";

type AttachmentKind = "camera" | "ecg" | "echo" | "file" | "image" | "labs";

export type CopilotClinicalLinkage = {
  caseId: string;
  caseNumber?: string | null;
  createdPatient: boolean;
  patientId: string;
  visitId: string;
};

function nextCaseId() {
  return `ECG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`;
}

async function nextCaseNumber() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = `${Date.now().toString().slice(-8)}${attempt}`;
    const candidate = `ECGCASE-${suffix}`;
    const exists = await prisma.eCGCase.findFirst({ where: { caseNumber: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `ECGCASE-${randomUUID().slice(0, 12).toUpperCase()}`;
}

function nextMedicalRecordNumber() {
  return `COPILOT-${Date.now().toString().slice(-8)}`;
}

function parseNameParts(fullName?: string) {
  if (!fullName?.trim()) {
    return { firstName: "Clinical", lastName: "Upload" };
  }
  const cleaned = fullName.replace(/\s+/g, " ").trim();
  if (cleaned.includes(",")) {
    const [last, first] = cleaned.split(",").map((part) => part.trim());
    return { firstName: first || "Clinical", lastName: last || "Upload" };
  }
  const parts = cleaned.split(" ");
  if (parts.length === 1) return { firstName: parts[0], lastName: "Patient" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") || "Patient" };
}

function estimateDateOfBirth(age?: number) {
  const safeAge = typeof age === "number" && age > 0 && age < 120 ? age : 45;
  const dob = new Date();
  dob.setFullYear(dob.getFullYear() - safeAge);
  return dob;
}

function isEcgDocument(documentType: string, kind: AttachmentKind) {
  return kind === "ecg" || /ecg|ekg|rhythm|holter|stress|dicom/i.test(documentType);
}

async function findExistingPatient(userId: string, structured: Partial<ClinicalOcrStructuredData> & { patientId?: string }) {
  const or: Prisma.PatientWhereInput[] = [];
  if (structured.patientId) {
    or.push({ medicalRecordNumber: structured.patientId }, { employeeId: structured.patientId }, { patientCode: structured.patientId });
  }
  if (structured.patientName) {
    or.push({ fullName: { contains: structured.patientName, mode: "insensitive" } });
    const { firstName, lastName } = parseNameParts(structured.patientName);
    or.push({ AND: [{ firstName: { equals: firstName, mode: "insensitive" } }, { lastName: { equals: lastName, mode: "insensitive" } }] });
  }
  if (!or.length) return null;

  return prisma.patient.findFirst({
    orderBy: { updatedAt: "desc" },
    where: {
      archivedAt: null,
      OR: or,
    },
  });
}

async function createPatientFromOcr(userId: string, structured: Partial<ClinicalOcrStructuredData> & { patientId?: string }) {
  const { firstName, lastName } = parseNameParts(structured.patientName);
  const medicalRecordNumber = structured.patientId?.trim() || nextMedicalRecordNumber();
  return prisma.patient.create({
    data: {
      createdById: userId,
      dateOfBirth: estimateDateOfBirth(structured.age),
      firstName,
      fullName: structured.patientName?.trim() || `${firstName} ${lastName}`.trim(),
      gender: "UNKNOWN",
      lastName,
      medicalRecordNumber,
      notes: structured.hospital ? `Hospital: ${structured.hospital}` : "Auto-created from Copilot clinical upload.",
    },
  });
}

export async function autoLinkCopilotClinicalUpload(input: {
  attachmentId: string;
  documentType: string;
  ecgMeasurements?: Record<string, unknown>;
  existingCaseId?: string | null;
  existingPatientId?: string | null;
  kind: AttachmentKind;
  mimeType: string;
  originalName: string;
  storagePath: string;
  structured: Partial<ClinicalOcrStructuredData> & { patientId?: string };
  userId: string;
}): Promise<CopilotClinicalLinkage | null> {
  if (!isEcgDocument(input.documentType, input.kind)) return null;

  let patientId = input.existingPatientId ?? undefined;
  let createdPatient = false;

  if (patientId) {
    const existing = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!existing) patientId = undefined;
  }

  if (!patientId) {
    const matched = await findExistingPatient(input.userId, input.structured);
    if (matched) {
      patientId = matched.id;
    } else {
      const created = await createPatientFromOcr(input.userId, input.structured);
      patientId = created.id;
      createdPatient = true;
    }
  }

  let caseId = input.existingCaseId ?? undefined;
  if (caseId) {
    const existingCase = await prisma.eCGCase.findFirst({ where: { id: caseId, patientId } });
    if (!existingCase) caseId = undefined;
  }

  const visit = await prisma.timelineEvent.create({
    data: {
      metadata: {
        attachmentId: input.attachmentId,
        documentType: input.documentType,
        source: "copilot-auto-link",
      } as Prisma.InputJsonObject,
      notes: "Automated clinical visit created from Copilot ECG upload.",
      patientId,
      title: "Clinical Visit — Copilot ECG Upload",
      type: "ECG_UPLOADED",
    },
  });

  if (!caseId) {
    const ecgCase = await prisma.eCGCase.create({
      data: {
        acquisitionDate: new Date(),
        caseId: nextCaseId(),
        caseNumber: await nextCaseNumber(),
        ecgType: input.documentType.replace(/_/g, " "),
        heartRate: typeof input.ecgMeasurements?.heartRate === "number" ? input.ecgMeasurements.heartRate : undefined,
        imagePath: `/api/copilot/attachments/${input.attachmentId}/download`,
        patientId,
        prInterval: typeof input.ecgMeasurements?.prIntervalMs === "number" ? input.ecgMeasurements.prIntervalMs : undefined,
        qrsDuration: typeof input.ecgMeasurements?.qrsDurationMs === "number" ? input.ecgMeasurements.qrsDurationMs : undefined,
        qtInterval: typeof input.ecgMeasurements?.qtIntervalMs === "number" ? input.ecgMeasurements.qtIntervalMs : undefined,
        qtcInterval: typeof input.ecgMeasurements?.qtcBazettMs === "number" ? input.ecgMeasurements.qtcBazettMs : undefined,
        rhythm: typeof input.ecgMeasurements?.rhythm === "string" ? input.ecgMeasurements.rhythm : undefined,
        uploadedById: input.userId,
      },
    });
    caseId = ecgCase.id;

    await prisma.timelineEvent.update({
      data: { caseId, notes: "Clinical visit linked to automatically created ECG case." },
      where: { id: visit.id },
    });

    const clinicalStorageDir = path.resolve(process.cwd(), "uploads", "clinical-ecg");
    fs.mkdirSync(clinicalStorageDir, { recursive: true });
    const storedName = `${Date.now()}-${path.basename(input.storagePath)}`;
    const clinicalPath = path.join(clinicalStorageDir, storedName);
    fs.copyFileSync(input.storagePath, clinicalPath);

    const ecgFile = await prisma.eCGFile.create({
      data: {
        caseId,
        fileName: input.originalName,
        mimeType: input.mimeType,
        originalName: input.originalName,
        patientId,
        sizeBytes: fs.statSync(clinicalPath).size,
        storagePath: clinicalPath,
        storedName,
        uploadedById: input.userId,
      },
    });

    try {
      await reconstructCaseEcg(caseId, input.userId);
    } catch {
      await prisma.eCGFile.update({
        data: {
          metadataJson: {
            digitizationStatus: "pending_manual_review",
            sourceAttachmentId: input.attachmentId,
          } as Prisma.InputJsonObject,
        },
        where: { id: ecgFile.id },
      });
    }
  } else {
    await prisma.timelineEvent.update({
      data: { caseId },
      where: { id: visit.id },
    });
  }

  await prisma.copilotAttachment.update({
    data: { caseId, patientId },
    where: { id: input.attachmentId },
  });

  const linkedCase = await prisma.eCGCase.findUnique({ where: { id: caseId } });
  return {
    caseId,
    caseNumber: linkedCase?.caseNumber,
    createdPatient,
    patientId,
    visitId: visit.id,
  };
}
