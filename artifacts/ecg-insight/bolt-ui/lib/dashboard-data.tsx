import React, { createContext, useContext, useMemo, type PropsWithChildren } from "react";

import type { DashboardScreenContract } from "@/types/screens/dashboard";

type BoltCase = {
  id: string;
  parameters: { rhythm: string };
  patientInfo: { name: string };
  priority: string;
  status: string;
};

type BoltActivity = {
  action: string;
  createdAt: string;
  id: string;
  target: string;
  type: string;
  user: string;
};

type BoltDashboardData = {
  DIAGNOSIS_DISTRIBUTION: Array<{ fill: string; name: string; value: number }>;
  MOCK_ACTIVITY: BoltActivity[];
  MOCK_ECG_CASES: BoltCase[];
  MOCK_STATS: {
    avgConfidence: number;
    casesThisMonth: number;
    criticalCases: number;
    pendingReviews: number;
    totalCases: number;
  };
  MONTHLY_CASES: Array<{ cases: number; critical: number; month: string }>;
};

const DashboardDataContext = createContext<BoltDashboardData | null>(null);

const DIAGNOSIS_FILL: Record<string, string> = {
  accent: "var(--chart-2)",
  chart4: "var(--chart-4)",
  critical: "var(--chart-3)",
  primary: "var(--chart-1)",
  warning: "var(--chart-5)",
};

function mapContractToBoltData(contract: DashboardScreenContract): BoltDashboardData {
  const { data } = contract;
  return {
    DIAGNOSIS_DISTRIBUTION: data.diagnosisDistribution.map((slice) => ({
      fill: DIAGNOSIS_FILL[slice.colorKey] ?? "var(--chart-1)",
      name: slice.name,
      value: slice.value,
    })),
    MOCK_ACTIVITY: data.activity,
    MOCK_ECG_CASES: data.recentCaseRows.map((row) => ({
      id: row.caseId,
      parameters: { rhythm: row.rhythm },
      patientInfo: { name: row.patientName },
      priority: row.priority,
      status: row.status,
    })),
    MOCK_STATS: {
      avgConfidence: data.boltStats.avgConfidence,
      casesThisMonth: data.boltStats.casesThisMonth,
      criticalCases: data.boltStats.criticalCases,
      pendingReviews: data.boltStats.pendingReviews,
      totalCases: data.boltStats.totalCases,
    },
    MONTHLY_CASES: data.monthlyCases,
  };
}

export function BoltDashboardDataProvider({
  children,
  contract,
}: PropsWithChildren<{ contract: DashboardScreenContract }>) {
  const value = useMemo(() => mapContractToBoltData(contract), [contract]);
  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useBoltDashboardData() {
  const value = useContext(DashboardDataContext);
  if (!value) throw new Error("BoltDashboardDataProvider is required for the imported Bolt dashboard.");
  return value;
}
