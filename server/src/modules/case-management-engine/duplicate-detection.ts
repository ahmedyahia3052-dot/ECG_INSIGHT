import type { ECGCase } from "@prisma/client";
import { prisma } from "../../config/prisma";
import type { DuplicateCandidate } from "./types";

function hoursBetween(left: Date, right: Date) {
  return Math.abs(left.getTime() - right.getTime()) / (1000 * 60 * 60);
}

export async function detectDuplicateCases(ecgCase: Pick<
  ECGCase,
  "acquisitionDate" | "caseId" | "caseNumber" | "createdAt" | "ecgType" | "heartRate" | "id" | "imagePath" | "patientId" | "rhythm"
>) {
  const candidates = await prisma.eCGCase.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      acquisitionDate: true,
      caseId: true,
      caseNumber: true,
      createdAt: true,
      ecgType: true,
      heartRate: true,
      id: true,
      imagePath: true,
      patientId: true,
      rhythm: true,
    },
    take: 25,
    where: {
      id: { not: ecgCase.id },
      patientId: ecgCase.patientId,
    },
  });

  const duplicates: DuplicateCandidate[] = [];
  for (const candidate of candidates) {
    const reasons: string[] = [];
    let score = 0;

    if (candidate.ecgType === ecgCase.ecgType) {
      score += 25;
      reasons.push("same_ecg_type");
    }
    if (candidate.heartRate != null && ecgCase.heartRate != null && candidate.heartRate === ecgCase.heartRate) {
      score += 15;
      reasons.push("same_heart_rate");
    }
    if (candidate.rhythm && ecgCase.rhythm && candidate.rhythm.toLowerCase() === ecgCase.rhythm.toLowerCase()) {
      score += 15;
      reasons.push("same_rhythm");
    }
    if (candidate.imagePath && ecgCase.imagePath && candidate.imagePath === ecgCase.imagePath) {
      score += 35;
      reasons.push("same_image_path");
    }
    if (hoursBetween(candidate.acquisitionDate, ecgCase.acquisitionDate) <= 24) {
      score += 20;
      reasons.push("acquisition_within_24h");
    }

    if (score >= 55) {
      duplicates.push({
        caseId: candidate.id,
        caseNumber: candidate.caseNumber,
        createdAt: candidate.createdAt.toISOString(),
        matchScore: score,
        patientId: candidate.patientId,
        publicCaseId: candidate.caseId,
        reasons,
      });
    }
  }

  return duplicates.sort((left, right) => right.matchScore - left.matchScore);
}
