import { apiRequest } from "./api";
import type { ProductionReadiness } from "./security";

export type ReleaseValidationStatus = "blocked" | "failed" | "passed" | "warning";

export interface ReleaseCheck {
  category: string;
  description: string;
  name: string;
  status: ReleaseValidationStatus;
}

export interface ReleaseRisk {
  detail: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
}

export interface ReleaseCandidateDashboard {
  bugBash: {
    defects: Array<{ component: string; count: number; severity: string }>;
    regressionStatus: string;
    totalDefects: number;
  };
  checks: ReleaseCheck[];
  launchDecision: "GO" | "NO_GO";
  metrics: Record<string, unknown>;
  outstandingRisks: ReleaseRisk[];
  performance: {
    apiBenchmark: Record<string, unknown>;
    databaseStress: Record<string, unknown>;
    ecgUploadStress: Record<string, unknown>;
    resourceUsage: Record<string, unknown>;
    websocketLoad: Record<string, unknown>;
  };
  readiness: ProductionReadiness;
  releaseReadinessScore: number;
  validationSummary: {
    failed: number;
    passed: number;
    total: number;
    warnings: number;
  };
}

export async function getReleaseCandidateDashboard(accessToken: string) {
  return apiRequest<{ release: ReleaseCandidateDashboard }>("/release-candidate/dashboard", { accessToken });
}

export async function getReleaseWorkflowValidation(accessToken: string) {
  return apiRequest<{ checks: ReleaseCheck[] }>("/release-candidate/workflows", { accessToken });
}
