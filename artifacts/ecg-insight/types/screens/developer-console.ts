import type { ScreenContract, KpiMetricView } from "./common";

export type DeveloperConsoleScreenData = {
  auditEvents: number;
  kpis: KpiMetricView[];
  licensesActive: number;
  releaseReadinessScore?: number;
  section: "admin" | "audit" | "benchmark" | "licenses" | "release";
};

export type DeveloperConsoleScreenActions = {
  onOpenAudit: () => void;
  onOpenBenchmark: () => void;
  onOpenLicenses: () => void;
  onOpenReleaseCandidate: () => void;
};

export type DeveloperConsoleScreenContract = ScreenContract<DeveloperConsoleScreenData, DeveloperConsoleScreenActions>;
