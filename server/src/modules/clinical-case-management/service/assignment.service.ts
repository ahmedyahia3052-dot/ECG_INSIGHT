import { AppError } from "../../../middleware/error";
import { fromApiPriority } from "../../../utils/clinical";
import { assertCaseEditable } from "../../../cases/state-machine";
import { resolveCaseLifecycle } from "../validators/lifecycle.validator";
import { serializeClinicalCase } from "../domain/types";
import { caseRepository } from "../repository/case.repository";
import { historyRepository } from "../repository/history.repository";
import { assertCaseUnlockedForActor } from "../validators/lock.validator";
import { caseLockRepository } from "../repository/lock.repository";

export class AssignmentService {
  async assignReviewer(caseRef: string, actorId: string, reviewerId: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId, caseId: ecgCase.id });

    const updated = await caseRepository.updateReviewer(ecgCase.id, reviewerId);
    const lifecycle = resolveCaseLifecycle(updated);

    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: "REVIEWER_ASSIGNED",
      payload: { previousReviewerId: ecgCase.reviewerId, reviewerId },
      title: "Reviewer assigned",
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_REVIEWER_ASSIGNED",
      actorId,
      caseId: ecgCase.id,
      message: "Reviewer assigned to case.",
      newValue: { reviewerId },
      oldValue: { reviewerId: ecgCase.reviewerId },
    });

    return serializeClinicalCase(updated, lifecycle);
  }

  async reassignCase(caseRef: string, actorId: string, reviewerId: string, reason?: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    if (!ecgCase.reviewerId) {
      return this.assignReviewer(caseRef, actorId, reviewerId);
    }
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId, caseId: ecgCase.id });

    const updated = await caseRepository.updateReviewer(ecgCase.id, reviewerId);
    const lifecycle = resolveCaseLifecycle(updated);

    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: "REVIEWER_ASSIGNED",
      payload: { previousReviewerId: ecgCase.reviewerId, reason, reviewerId, reassigned: true },
      summary: reason,
      title: "Case reassigned",
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_REASSIGNED",
      actorId,
      caseId: ecgCase.id,
      message: "Case reassigned to a different reviewer.",
      metadata: { reason },
      newValue: { reviewerId },
      oldValue: { reviewerId: ecgCase.reviewerId },
    });

    return serializeClinicalCase(updated, lifecycle);
  }

  async updatePriority(caseRef: string, actorId: string, priority: "low" | "medium" | "high" | "critical", reason?: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId, caseId: ecgCase.id });

    const nextPriority = fromApiPriority(priority);
    const updated = await caseRepository.updatePriority(ecgCase.id, nextPriority);
    const lifecycle = resolveCaseLifecycle(updated);

    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: "PRIORITY_CHANGED",
      payload: { from: ecgCase.priority, reason, to: nextPriority },
      summary: reason,
      title: "Priority updated",
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_PRIORITY_CHANGED",
      actorId,
      caseId: ecgCase.id,
      message: `Case priority changed to ${priority}.`,
      metadata: { reason },
      newValue: { priority: nextPriority },
      oldValue: { priority: ecgCase.priority },
    });

    return serializeClinicalCase(updated, lifecycle);
  }

  async updateCriticalFlag(caseRef: string, actorId: string, critical: boolean, reason?: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId, caseId: ecgCase.id });

    const updated = await caseRepository.updatePriority(
      ecgCase.id,
      critical ? "CRITICAL" : ecgCase.priority === "CRITICAL" ? "HIGH" : ecgCase.priority,
      critical ? "CRITICAL" : ecgCase.severity === "CRITICAL" ? "NORMAL" : ecgCase.severity,
    );
    const lifecycle = resolveCaseLifecycle(updated);

    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: "PRIORITY_CHANGED",
      payload: { critical, reason },
      summary: reason,
      title: critical ? "Case marked critical" : "Critical flag cleared",
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_CRITICAL_FLAG_CHANGED",
      actorId,
      caseId: ecgCase.id,
      message: critical ? "Case marked as critical." : "Critical flag removed from case.",
      metadata: { reason },
      newValue: { critical, priority: updated.priority, severity: updated.severity },
      oldValue: {
        critical: ecgCase.priority === "CRITICAL" || ecgCase.severity === "CRITICAL",
        priority: ecgCase.priority,
        severity: ecgCase.severity,
      },
    });

    return serializeClinicalCase(updated, lifecycle);
  }

  async updateLabels(caseRef: string, actorId: string, labels: string[]) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId, caseId: ecgCase.id });

    const updated = await caseRepository.updateLabels(ecgCase.id, labels);
    const lifecycle = resolveCaseLifecycle(updated);

    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: "TAG_ADDED",
      payload: { labels },
      title: "Labels updated",
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_LABELS_UPDATED",
      actorId,
      caseId: ecgCase.id,
      message: "Case labels updated.",
      newValue: { labels },
      oldValue: { labels: ecgCase.tags },
    });

    return serializeClinicalCase(updated, lifecycle);
  }
}

export const assignmentService = new AssignmentService();
