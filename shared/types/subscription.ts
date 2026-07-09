export type PlanTier = "free" | "basic" | "professional" | "enterprise" | "lifetime";

export type Plan = {
  billingCycle?: string;
  code: PlanTier;
  id?: string;
  name: string;
  quota?: number | null;
};

export type Subscription = {
  lifetimeAccess: boolean;
  plan: Plan;
  remainingAnalyses?: number | null;
  renewalDate?: string;
  status: "active" | "expired" | "suspended" | "trial";
  usedAnalyses?: number;
};

export type DeveloperGrant = {
  expiresAt?: string;
  grantedAt?: string;
  grantedBy?: string;
  id: string;
  lifetime: boolean;
  notes?: string;
  plan: PlanTier;
  status: "ACTIVE" | "EXPIRED" | "REVOKED" | "SUSPENDED";
  userId: string;
};
