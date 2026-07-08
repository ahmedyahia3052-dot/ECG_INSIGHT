import { AppError } from "../../../middleware/error";
import { assertCaseEditable } from "../../../cases/state-machine";
import { attachmentRepository } from "../repository/attachment.repository";
import { caseRepository } from "../repository/case.repository";
import { historyRepository } from "../repository/history.repository";
import { assertCaseUnlockedForActor } from "../validators/lock.validator";
import { caseLockRepository } from "../repository/lock.repository";
import type { Prisma } from "@prisma/client";

export class ClinicalCaseManagementService {
  async addAttachment(input: {
    actorId: string;
    caseRef: string;
    category?: string;
    checksum?: string;
    fileName: string;
    metadata?: Prisma.InputJsonValue;
    mimeType: string;
    sizeBytes?: number;
    storagePath: string;
  }) {
    const ecgCase = await caseRepository.findByRef(input.caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId: input.actorId, caseId: ecgCase.id });

    const attachment = await attachmentRepository.create({
      actorId: input.actorId,
      caseId: ecgCase.id,
      category: input.category,
      checksum: input.checksum,
      fileName: input.fileName,
      metadata: input.metadata,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
    });

    await historyRepository.recordHistory({
      actorId: input.actorId,
      caseId: ecgCase.id,
      eventType: "ATTACHMENT_ADDED",
      payload: { attachmentId: attachment.id, category: attachment.category, fileName: attachment.fileName },
      title: "Attachment added",
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_ATTACHMENT_ADDED",
      actorId: input.actorId,
      caseId: ecgCase.id,
      entityId: attachment.id,
      message: `Attachment ${attachment.fileName} added.`,
      newValue: { category: attachment.category, fileName: attachment.fileName },
    });

    return attachment;
  }

  async listAttachments(caseRef: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    return attachmentRepository.list(ecgCase.id);
  }
}

export const clinicalCaseManagementService = new ClinicalCaseManagementService();
