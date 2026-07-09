/** Centralized React Query cache keys — avoid duplicated string literals across hooks/pages. */

export const queryKeys = {
  dashboard: {
    cases: (token?: string) => ["enterprise-dashboard-cases", token] as const,
    enterprise: (token?: string) => ["enterprise-clinical-dashboard", token] as const,
    notifications: (token?: string) => ["enterprise-dashboard-notifications", token] as const,
    patients: (token?: string) => ["enterprise-dashboard-patients", token] as const,
    reports: (token?: string) => ["enterprise-dashboard-reports", token] as const,
    subscription: (token?: string) => ["enterprise-dashboard-subscription", token] as const,
  },
  ecgCases: {
    detail: (token?: string, caseId?: string) => ["enterprise-ecg-case", token, caseId] as const,
    detailAi: (token?: string, caseId?: string) => ["enterprise-ecg-case-ai", token, caseId] as const,
    detailDigital: (token?: string, caseId?: string) => ["enterprise-ecg-case-digital", token, caseId] as const,
    detailExplainability: (token?: string, caseId?: string) => ["enterprise-ecg-case-explainability", token, caseId] as const,
    list: (token?: string, params?: string) => ["enterprise-ecg-cases", token, params] as const,
  },
  owner: {
    licenses: (token?: string) => ["owner-licenses", token] as const,
    users: (token?: string) => ["owner-license-users", token] as const,
  },
} as const;
