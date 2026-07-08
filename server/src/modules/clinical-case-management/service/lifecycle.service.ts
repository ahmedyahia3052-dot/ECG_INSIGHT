import { AppError } from "../../../middleware/error";
import { assertCaseEditable } from "../../../cases/state-machine";
import {
  ecgCaseStatusForLifecycle,
  managementStatusForLifecycle,
  type ClinicalCaseLifecycle,
} from "../domain/lifecycle";
import { serializeClinicalCase } from "../domain/types";
import { caseRepository } from "../repository/case.repository";
import { historyRepository } from "../repository/history.repository";
import { versionRepository } from "../repository/version.repository";
import { resolveCaseLifecycle, validateLifecycleTransition } from "../validators/lifecycle.validator";
import { assertCaseUnlockedForActor } from "../validators/lock.validator";
import { caseLockRepository } from "../repository/lock.repository";

export class LifecycleService {
  async getCase(caseRef: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    const lifecycle = resolveCaseLifecycle(ecgCase);
    return serializeClinicalCase(ecgCase, lifecycle);
  }

  async transition(caseRef: string, actorId: string, target: ClinicalCaseLifecycle, reason?: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId, caseId: ecgCase.id });

    const current = resolveCaseLifecycle(ecgCase);
    validateLifecycleTransition({ from: current, to: target });

    await versionRepository.create(ecgCase.id, actorId, reason ?? `Lifecycle transition ${current} -> ${target}`);

    const updated = await caseRepository.updateLifecycle(ecgCase.id, {
      actorId,
      archivedAt: target === "archived" ? new Date() : null,
      managementStatus: managementStatusForLifecycle(target),
      status: ecgCaseStatusForLifecycle(target),
    });

    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: target === "archived" ? "ARCHIVED" : "STATUS_CHANGED",
      fromStatus: ecgCase.managementStatus,
      payload: { fromLifecycle: current, reason, toLifecycle: target },
      summary: reason,
      title: `Lifecycle changed to ${target}`,
      toStatus: updated.managementStatus,
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_LIFECYCLE_CHANGED",
      actorId,
      caseId: ecgCase.id,
      message: `Case lifecycle transitioned from ${current} to ${target}.`,
      metadata: { reason },
      newValue: { lifecycle: target, managementStatus: updated.managementStatus, status: updated.status },
      oldValue: { lifecycle: current, managementStatus: ecgCase.managementStatus, status: ecgCase.status },
    });

    return serializeClinicalCase(updated, target);
  }

  async archive(caseRef: string, actorId: string, reason?: string) {
    return this.transition(caseRef, actorId, "archived", reason);
  }

  async restore(caseRef: string, actorId: string, lifecycle: ClinicalCaseLifecycle = "draft", reason?: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    if (resolveCaseLifecycle(ecgCase) !== "archived") {
      throw new AppError(409, "Case is not archived.", "CASE_NOT_ARCHIVED");
    }

    await versionRepository.create(ecgCase.id, actorId, reason ?? "Restore snapshot");

    const updated = await caseRepository.updateLifecycle(ecgCase.id, {
      archivedAt: null,
      managementStatus: managementStatusForLifecycle(lifecycle),
      status: ecgCaseStatusForLifecycle(lifecycle),
    });

    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: "RESTORED",
      fromStatus: "ARCHIVED",
      payload: { lifecycle, reason },
      summary: reason,
      title: `Case restored to ${lifecycle}`,
      toStatus: updated.managementStatus,
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_RESTORED",
      actorId,
      caseId: ecgCase.id,
      message: `Case restored to ${lifecycle}.`,
      metadata: { reason },
      newValue: { lifecycle, managementStatus: updated.managementStatus },
      oldValue: { lifecycle: "archived", managementStatus: ecgCase.managementStatus },
    });

    return serializeClinicalCase(updated, lifecycle);
  }
}

export const lifecycleService = new LifecycleService();
