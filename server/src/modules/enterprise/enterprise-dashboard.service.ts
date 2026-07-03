import { prisma } from "../../config/prisma";
import { listBenchmarkRuns, loadBenchmarkRun } from "../ecg-benchmark/storage";
import { hasLocalOnnxModel } from "../../ai/onnx-runtime.service";
import { getAIProvider } from "../../ai/providers";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function resolveModelOnline() {
  try {
    const provider = getAIProvider();
    return provider.name === "onnx_runtime" ? hasLocalOnnxModel() : provider.name !== "mock";
  } catch {
    return false;
  }
}

export async function enterpriseClinicalDashboard(actorId: string) {
  const today = startOfToday();
  const [
    todaysEcgs,
    criticalEcgs,
    pendingReviews,
    avgProcessing,
    hospitalActivity,
    recentCritical,
  ] = await Promise.all([
    prisma.eCGCase.count({ where: { uploadDate: { gte: today } } }),
    prisma.eCGCase.count({ where: { severity: { in: ["CRITICAL", "ABNORMAL"] }, status: { notIn: ["ARCHIVED"] } } }),
    prisma.eCGCase.count({ where: { status: { in: ["AI_COMPLETED", "UNDER_REVIEW"] } } }),
    prisma.aIAnalysis.aggregate({ _avg: { processingTime: true }, where: { status: "COMPLETED" } }),
    prisma.patient.groupBy({
      _count: { _all: true },
      by: ["company"],
      where: { archivedAt: null, cases: { some: { uploadDate: { gte: today } } } },
    }),
    prisma.eCGCase.findMany({
      include: { patient: true },
      orderBy: { uploadDate: "desc" },
      take: 8,
      where: { severity: "CRITICAL" },
    }),
  ]);

  const benchmarkRuns = await listBenchmarkRuns(1);
  const latestBenchmark = benchmarkRuns[0] ? await loadBenchmarkRun(benchmarkRuns[0].id) : null;
  const aiAccuracy = latestBenchmark?.metrics.accuracy ?? null;

  const modelOnline = resolveModelOnline();

  return {
    aiAccuracy,
    aiMetrics: {
      accuracy: aiAccuracy,
      f1: latestBenchmark?.metrics.f1 ?? null,
      precision: latestBenchmark?.metrics.precision ?? null,
      recall: latestBenchmark?.metrics.recall ?? null,
      source: latestBenchmark ? "clinical_benchmark" : "pending_validation",
    },
    avgProcessingTimeMs: Math.round(avgProcessing._avg.processingTime ?? 0),
    criticalEcgs,
    hospitalActivity: hospitalActivity
      .filter((item) => item.company)
      .map((item) => ({ casesToday: item._count._all, hospital: item.company ?? "Unknown" })),
    modelOnline,
    pendingReviews,
    recentCritical: recentCritical.map((item) => ({
      aiDiagnosis: item.aiDiagnosis,
      caseId: item.caseId,
      id: item.id,
      patientName: `${item.patient.firstName} ${item.patient.lastName}`.trim(),
      severity: item.severity.toLowerCase(),
      uploadDate: item.uploadDate.toISOString(),
    })),
    todaysEcgs,
    updatedAt: new Date().toISOString(),
    viewerId: actorId,
  };
}
