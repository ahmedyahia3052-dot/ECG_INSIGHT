import { AppError } from "../../../middleware/error";
import type { CaseLockRepository } from "../repository/lock.repository";

export async function assertCaseUnlockedForActor(
  lockRepository: CaseLockRepository,
  input: { actorId: string; caseId: string; resource?: string },
): Promise<void> {
  const blocking = await lockRepository.findBlockingLock(input.caseId, input.actorId, input.resource ?? "case");
  if (blocking) {
    throw new AppError(409, "Case is locked by another clinician.", "CASE_LOCKED");
  }
}
