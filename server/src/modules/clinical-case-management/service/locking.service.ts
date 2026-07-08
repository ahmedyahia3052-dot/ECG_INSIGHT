import { AppError } from "../../../middleware/error";
import { assertCaseEditable } from "../../../cases/state-machine";
import { caseRepository } from "../repository/case.repository";
import { caseLockRepository } from "../repository/lock.repository";
import { historyRepository } from "../repository/history.repository";

export class LockingService {
  async acquire(caseRef: string, actorId: string, resource = "case", ttlMinutes = 30) {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    assertCaseEditable(ecgCase);

    const blocking = await caseLockRepository.findBlockingLock(ecgCase.id, actorId, resource);
    if (blocking) {
      throw new AppError(409, "Case is locked by another clinician.", "CASE_LOCKED");
    }

    const lock = await caseLockRepository.acquire(ecgCase.id, actorId, resource, ttlMinutes);
    await historyRepository.recordHistory({
      actorId,
      caseId: ecgCase.id,
      eventType: "LOCKED",
      payload: { expiresAt: lock.expiresAt, resource },
      title: "Case locked for review",
    });
    await historyRepository.recordAudit({
      action: "CLINICAL_CASE_LOCKED",
      actorId,
      caseId: ecgCase.id,
      entityId: lock.id,
      message: `Case lock acquired for ${resource}.`,
    });
    return lock;
  }

  async release(caseRef: string, actorId: string, resource = "case") {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");

    const active = await caseLockRepository.findActiveLock(ecgCase.id, resource);
    if (active && active.userId !== actorId) {
      throw new AppError(403, "Only the lock holder can release this lock.", "CASE_LOCK_FORBIDDEN");
    }

    const lock = await caseLockRepository.release(ecgCase.id, resource);
    if (lock) {
      await historyRepository.recordHistory({
        actorId,
        caseId: ecgCase.id,
        eventType: "UNLOCKED",
        payload: { resource },
        title: "Case unlocked",
      });
      await historyRepository.recordAudit({
        action: "CLINICAL_CASE_UNLOCKED",
        actorId,
        caseId: ecgCase.id,
        entityId: lock.id,
        message: `Case lock released for ${resource}.`,
      });
    }
    return lock;
  }

  async getActiveLock(caseRef: string, resource = "case") {
    const ecgCase = await caseRepository.findByRef(caseRef);
    if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
    return caseLockRepository.findActiveLock(ecgCase.id, resource);
  }
}

export const lockingService = new LockingService();
