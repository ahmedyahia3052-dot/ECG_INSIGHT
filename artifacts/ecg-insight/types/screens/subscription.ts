import type { ScreenContract } from "./common";

export type SubscriptionScreenData = {
  billingEvents: Array<{ amountLabel: string; date: string; id: string; status: string }>;
  lifetimeAccess: boolean;
  planName: string;
  quotaLabel: string;
  remainingAnalyses?: number;
  renewalDate?: string;
  status: string;
};

export type SubscriptionScreenActions = {
  onManageBilling: () => void;
  onUpgradePlan: () => void;
  onViewInvoices: () => void;
};

export type SubscriptionScreenContract = ScreenContract<SubscriptionScreenData, SubscriptionScreenActions>;
