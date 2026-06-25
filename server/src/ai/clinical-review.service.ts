import type { AISeverity, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error";
import { createNotification } from "../utils/notifications";
import { generateClinicalReport } from "../modules/reports/reports.service";

export async function submitClinicalReview(
  caseId: string,
  doctorId: string,
  review: {
    approved?: boolean;
    comments?: string;
    diagnosis?: string;
    interpretation?: string;
    severity?: AISeverity;
  },
) {
  const ecgCase = await prisma.eCGCase.findUnique({
    include: {
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      reports: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    where: { id: caseId },
  });
  if (!ecgCase) throw new AppError(404, "ECG case not found.", "CASE_NOT_FOUND");
  const latestAnalysis = ecgCase.analyses[0];

  if (latestAnalysis && (review.interpretation || review.diagnosis || review.severity)) {
    await prisma.aIAnalysis.update({
      data: {
        diagnosis: review.diagnosis ?? latestAnalysis.diagnosis,
        interpretation: review.interpretation ?? latestAnalysis.interpretation,
        severity: review.severity ?? latestAnalysis.severity,
      },
      where: { id: latestAnalysis.id },
    });
  }

  const diagnosis = review.diagnosis ?? latestAnalysis?.diagnosis ?? ecgCase.finalDiagnosis ?? "Doctor review completed";
  await prisma.eCGCase.update({
    data: {
      clinicalComments: review.comments,
      clinicalNotes: review.comments,
      doctorDiagnosis: diagnosis,
      finalDiagnosis: diagnosis,
      finalizedAt: review.approved ? new Date() : undefined,
      approvedAt: review.approved ? new Date() : undefined,
      priority: review.severity === "CRITICAL" ? "CRITICAL" : ecgCase.priority,
      recommendations: latestAnalysis?.recommendations.join("\n"),
      reviewedAt: new Date(),
      reviewedById: doctorId,
      severity: review.severity === "CRITICAL" ? "CRITICAL" : review.severity && review.severity !== "NORMAL" ? "ABNORMAL" : undefined,
      status: review.approved ? "APPROVED" : "UNDER_REVIEW",
    },
    where: { id: caseId },
  });

  await prisma.auditLog.create({
    data: {
      action: review.approved ? "CASE_STATUS_CHANGED" : "CASE_UPDATED",
      actorId: doctorId,
      caseId,
      message: review.approved ? "Doctor approved AI ECG analysis." : "Doctor reviewed and edited AI ECG analysis.",
      metadata: {
        approved: review.approved === true,
        comments: review.comments,
        diagnosis,
        severity: review.severity,
        workflow: ["AI Analysis", "Doctor Review", "Edit", "Approve", "Sign", "Finalize"],
      } satisfies Prisma.InputJsonObject,
      patientId: ecgCase.patientId,
    },
  });

  await prisma.timelineEvent.create({
    data: {
      caseId,
      metadata: {
        approved: review.approved === true,
        comments: review.comments,
        diagnosis,
      },
      patientId: ecgCase.patientId,
      title: review.approved ? "Doctor approved AI ECG analysis" : "Doctor reviewed AI ECG analysis",
      type: "AI_ANALYSIS_COMPLETED",
    },
  });

  const report = review.approved
    ? ecgCase.reports[0] ?? await generateClinicalReport(caseId, doctorId)
    : ecgCase.reports[0] ?? null;

  if (review.approved) {
    await createNotification({
      caseId,
      message: `ECG case ${ecgCase.caseId} was approved by a physician and is ready for report finalization/signature.`,
      targetRole: "DOCTOR",
      title: "ECG Review Approved",
      type: "SUCCESS",
    });
  }

  return { caseId, diagnosis, reportId: report?.id ?? null, status: review.approved ? "finalized" : "reviewed" };
}
