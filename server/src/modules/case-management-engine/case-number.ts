import { randomUUID } from "node:crypto";
import { prisma } from "../../config/prisma";

export function nextPublicCaseId() {
  return `ECG-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now()
    .toString()
    .slice(-6)}`;
}

export async function nextEnterpriseCaseNumber() {
  const latest = await prisma.eCGCase.findFirst({
    orderBy: { createdAt: "desc" },
    select: { caseNumber: true },
    where: { caseNumber: { startsWith: "ECGCASE-" } },
  });
  const serial = latest?.caseNumber?.match(/^ECGCASE-(\d+)$/)?.[1];
  const base = serial ? Number(serial) + 1 : 1;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = `ECGCASE-${String(base + attempt).padStart(6, "0")}`;
    const exists = await prisma.eCGCase.findFirst({ select: { id: true }, where: { caseNumber: candidate } });
    if (!exists) return candidate;
  }
  return `ECGCASE-${Date.now().toString().slice(-8)}${randomUUID().slice(0, 4).toUpperCase()}`;
}
