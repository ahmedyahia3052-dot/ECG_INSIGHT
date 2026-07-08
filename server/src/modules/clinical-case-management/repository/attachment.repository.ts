import type { CaseAttachmentCategory, Prisma } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import { serializeCaseAttachment } from "../domain/types";

function fromApiAttachmentCategory(category: string): CaseAttachmentCategory {
  const map: Record<string, CaseAttachmentCategory> = {
    clinical_document: "CLINICAL_DOCUMENT",
    ecg_image: "ECG_IMAGE",
    other: "OTHER",
    pdf: "PDF",
    report: "REPORT",
  };
  return map[category] ?? "OTHER";
}

export class AttachmentRepository {
  async list(caseId: string) {
    const attachments = await prisma.caseAttachment.findMany({
      orderBy: { createdAt: "desc" },
      where: { caseId },
    });
    return attachments.map(serializeCaseAttachment);
  }

  async create(input: {
    actorId: string;
    caseId: string;
    category?: string;
    checksum?: string;
    fileName: string;
    metadata?: Prisma.InputJsonValue;
    mimeType: string;
    sizeBytes?: number;
    storagePath: string;
  }) {
    const attachment = await prisma.caseAttachment.create({
      data: {
        caseId: input.caseId,
        category: fromApiAttachmentCategory(input.category ?? "other"),
        checksum: input.checksum,
        fileName: input.fileName,
        metadata: input.metadata,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        storagePath: input.storagePath,
        uploadedById: input.actorId,
      },
    });
    return serializeCaseAttachment(attachment);
  }
}

export const attachmentRepository = new AttachmentRepository();
