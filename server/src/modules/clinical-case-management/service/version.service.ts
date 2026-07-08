import { AppError } from "../../../middleware/error";
import { assertCaseEditable } from "../../../cases/state-machine";
import { resolveCaseLifecycle } from "../validators/lifecycle.validator";
import { serializeClinicalCase } from "../domain/types";
import { caseRepository } from "../repository/case.repository";
import { historyRepository } from "../repository/history.repository";
import { versionRepository } from "../repository/version.repository";
import { assertCaseUnlockedForActor } from "../validators/lock.validator";
import { caseLockRepository } from "../repository/lock.repository";

export class VersionService {
  async list(caseRef: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    return versionRepository.list(ecgCase.id);
  }

  async create(caseRef: string, actorId: string, reason?: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId, caseId: ecgCase.id });

    const version = await versionRepository.create(ecgCase.id, actorId, reason);
    if (!version) throw new AppError(500, "Failed to create case version.", "VERSION_CREATE_FAILED");

    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: "VERSION_CREATED",
      payload: { reason, version: version.version },
      title: `Version ${version.version} created`,
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_VERSION_CREATED",
      actorId,
      caseId: ecgCase.id,
      entityId: version.id,
      message: `Case version ${version.version} created.`,
      metadata: { reason, version: version.version },
    });

    return version;
  }

  async restore(caseRef: string, actorId: string, versionId: string, reason?: string) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);
    await assertCaseUnlockedForActor(caseLockRepository, { actorId, caseId: ecgCase.id });

    const version = await versionRepository.findById(ecgCase.id, versionId);
    if (!version) throw new AppError(404, "Case version not found.", "VERSION_NOT_FOUND");

    await versionRepository.create(ecgCase.id, actorId, reason ?? "Before version restore");

    const snapshot = version.snapshot as Record<string, unknown>;
    const restored = await caseRepository.restoreFromSnapshot(ecgCase.id, snapshot);
    await versionRepository.markRestored(versionId);

    const lifecycle = resolveCaseLifecycle(restored);

    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: "VERSION_CREATED",
      payload: { restoredVersion: version.version, reason },
      title: `Restored to version ${version.version}`,
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_VERSION_RESTORED",
      actorId,
      caseId: ecgCase.id,
      entityId: versionId,
      entityType: "CaseVersion",
      message: `Case restored to version ${version.version}.`,
      metadata: { reason },
    });

    return { case: serializeClinicalCase(restored, lifecycle), version };
  }
}

export const versionService = new VersionService();
