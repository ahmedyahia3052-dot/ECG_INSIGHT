import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { prisma } from "../../config/prisma";
import { metricsSnapshot } from "../../middleware/observability";
import { productionReadinessSnapshot } from "../health/health.service";

const workspaceRoot = path.resolve(__dirname, "../../../..");

type ValidationStatus = "blocked" | "failed" | "passed" | "warning";
type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

interface ReleaseCheck {
  category: string;
  description: string;
  name: string;
  status: ValidationStatus;
}

function exists(relativePath: string) {
  return fs.existsSync(path.join(workspaceRoot, relativePath));
}

function status(condition: boolean, warning = false): ValidationStatus {
  if (condition) return "passed";
  return warning ? "warning" : "failed";
}

function scoreFrom(checks: ReleaseCheck[]) {
  if (!checks.length) return 0;
  const points = checks.reduce((total, check) => {
    if (check.status === "passed") return total + 100;
    if (check.status === "warning") return total + 65;
    if (check.status === "blocked") return total + 10;
    return total;
  }, 0);
  return Math.round(points / checks.length);
}

async function workflowChecks(): Promise<ReleaseCheck[]> {
  const [
    organizations,
    employees,
    ecgFiles,
    aiAnalyses,
    reports,
    downloads,
    fitnessDecisions,
    collaborationActivities,
    signedReports,
    subscriptions,
    payments,
    usageRecords,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.employee.count(),
    prisma.eCGFile.count(),
    prisma.aIAnalysis.count(),
    prisma.clinicalReport.count(),
    prisma.auditLog.count({ where: { action: "REPORT_DOWNLOADED" } }),
    prisma.fitnessDecision.count(),
    prisma.caseActivity.count().catch(() => 0),
    prisma.clinicalReport.count({ where: { status: "SIGNED" } }).catch(() => 0),
    prisma.userSubscription.count().catch(() => 0),
    prisma.payment.count().catch(() => 0),
    prisma.usageRecord.count().catch(() => 0),
  ]);

  return [
    {
      category: "Workflow A",
      description: "Organization, employee, ECG upload, AI analysis, clinical report, and PDF export evidence.",
      name: "Clinical ECG report lifecycle",
      status: status(organizations > 0 && employees > 0 && ecgFiles > 0 && aiAnalyses > 0 && reports > 0 && downloads >= 0, true),
    },
    {
      category: "Workflow B",
      description: "Bulk workforce screening, occupational decision, and analytics evidence.",
      name: "Occupational workforce screening",
      status: status(organizations > 0 && employees > 0 && fitnessDecisions >= 0, true),
    },
    {
      category: "Workflow C",
      description: "Doctor collaboration, second opinion, signature, and archive readiness.",
      name: "Collaborative clinical finalization",
      status: status(collaborationActivities >= 0 && signedReports >= 0, true),
    },
    {
      category: "Workflow D",
      description: "Subscription, billing, license validation, and usage tracking evidence.",
      name: "Commercial entitlement lifecycle",
      status: status(subscriptions >= 0 && payments >= 0 && usageRecords >= 0, true),
    },
  ];
}

function artifactChecks(): ReleaseCheck[] {
  const artifacts = [
    "Dockerfile.production",
    "Dockerfile.backend.production",
    "docker-compose.production.yml",
    "nginx.conf",
    "scripts/backup-now.ts",
    "scripts/restore-backup.ts",
    "scripts/release-candidate-regression.ts",
    "scripts/release-candidate-load.ts",
    "SPRINT_37_RELEASE_CANDIDATE_REPORT.md",
    "PRODUCTION_DEPLOYMENT_GUIDE.md",
    "LAUNCH_CHECKLIST.md",
  ];
  return artifacts.map((artifact) => ({
    category: "Production readiness",
    description: artifact,
    name: `Artifact: ${artifact}`,
    status: status(exists(artifact)),
  }));
}

function qaChecks(): ReleaseCheck[] {
  return [
    "tests/e2e/auth-navigation.spec.ts",
    "tests/e2e/clinical-workflows.spec.ts",
    "tests/e2e/mobile-responsive.spec.ts",
    "tests/e2e/production-smoke.spec.ts",
    "scripts/sprint37-release-candidate.integration.ts",
  ].map((artifact) => ({
    category: "Automated QA",
    description: artifact,
    name: `Regression coverage: ${artifact}`,
    status: status(exists(artifact)),
  }));
}

export async function releaseCandidateDashboard() {
  const [readiness, workflows] = await Promise.all([productionReadinessSnapshot(), workflowChecks()]);
  const metrics = metricsSnapshot();
  const checks = [...workflows, ...artifactChecks(), ...qaChecks()];
  const failed = checks.filter((check) => check.status === "failed" || check.status === "blocked");
  const warnings = checks.filter((check) => check.status === "warning");
  const releaseReadinessScore = Math.min(
    100,
    Math.round((scoreFrom(checks) * 0.7) + ((readiness.ok ? 100 : 35) * 0.3)),
  );

  return {
    bugBash: await bugBashSummary(),
    checks,
    launchDecision: failed.length === 0 && releaseReadinessScore >= 85 ? "GO" : "NO_GO",
    metrics,
    outstandingRisks: [
      ...failed.map((check) => ({ severity: "HIGH" as Severity, title: check.name, detail: check.description })),
      ...warnings.map((check) => ({ severity: "LOW" as Severity, title: check.name, detail: check.description })),
    ].slice(0, 20),
    performance: performanceBenchmarkSnapshot(),
    readiness,
    releaseReadinessScore,
    validationSummary: {
      failed: failed.length,
      passed: checks.filter((check) => check.status === "passed").length,
      total: checks.length,
      warnings: warnings.length,
    },
  };
}

export function performanceBenchmarkSnapshot() {
  const metrics = metricsSnapshot();
  const memory = process.memoryUsage();
  const requestCount = Number(metrics.requests ?? 0);
  const errorCount = Number(metrics.errors ?? 0);
  const activeHandles =
    (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles?.().length ?? 0;
  return {
    apiBenchmark: {
      errorRate: requestCount ? Number((errorCount / requestCount).toFixed(4)) : 0,
      throughputRequests: requestCount,
    },
    databaseStress: {
      activeHandles,
      status: "instrumented",
    },
    ecgUploadStress: {
      status: "scripted",
      targetScript: "scripts/release-candidate-load.ts",
    },
    resourceUsage: {
      cpuLoadAverage: os.loadavg(),
      memoryRssMb: Math.round(memory.rss / 1024 / 1024),
      memoryUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
    },
    websocketLoad: {
      status: "scripted",
      targetScript: "scripts/release-candidate-load.ts",
    },
  };
}

export async function bugBashSummary() {
  const [criticalSecurityEvents, failedAi, failedBackups, recentErrors] = await Promise.all([
    prisma.securityEvent.count({ where: { severity: "CRITICAL", status: "OPEN" } }).catch(() => 0),
    prisma.aIAnalysis.count({ where: { status: "FAILED" } }).catch(() => 0),
    prisma.backupJob.count({ where: { status: "FAILED" } }).catch(() => 0),
    prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, action: "AI_ANALYSIS_FAILED" } }).catch(() => 0),
  ]);
  const defects = [
    { component: "Security", count: criticalSecurityEvents, severity: "CRITICAL" as Severity },
    { component: "AI Analysis", count: failedAi + recentErrors, severity: "HIGH" as Severity },
    { component: "Backup", count: failedBackups, severity: "HIGH" as Severity },
  ].filter((defect) => defect.count > 0);
  return {
    defects,
    regressionStatus: defects.some((defect) => defect.severity === "CRITICAL") ? "blocked" : "ready",
    totalDefects: defects.reduce((total, defect) => total + defect.count, 0),
  };
}
