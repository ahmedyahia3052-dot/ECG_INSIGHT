import { prisma } from "../../../config/prisma";
import { serializeCaseLock } from "../domain/types";

export class CaseLockRepository {
  async findBlockingLock(caseId: string, actorId: string, resource = "case") {
    return prisma.caseLock.findFirst({
      orderBy: { createdAt: "desc" },
      where: {
        caseId,
        expiresAt: { gt: new Date() },
        resource,
        status: "ACTIVE",
        userId: { not: actorId },
      },
    });
  }

  async findActiveLock(caseId: string, resource = "case") {
    return prisma.caseLock.findFirst({
      orderBy: { createdAt: "desc" },
      where: { caseId, expiresAt: { gt: new Date() }, resource, status: "ACTIVE" },
    });
  }

  async acquire(caseId: string, actorId: string, resource = "case", ttlMinutes = 30) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    await prisma.caseLock.updateMany({
      data: { releasedAt: new Date(), status: "RELEASED" },
      where: { caseId, resource, status: "ACTIVE", userId: actorId },
    });
    const lock = await prisma.caseLock.create({
      data: { caseId, expiresAt, resource, status: "ACTIVE", userId: actorId },
    });
    return serializeCaseLock(lock);
  }

  async release(caseId: string, resource = "case") {
    const lock = await this.findActiveLock(caseId, resource);
    if (!lock) return null;
    const released = await prisma.caseLock.update({
      data: { releasedAt: new Date(), status: "RELEASED" },
      where: { id: lock.id },
    });
    return serializeCaseLock(released);
  }
}

export const caseLockRepository = new CaseLockRepository();
