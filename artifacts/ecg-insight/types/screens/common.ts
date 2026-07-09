import type { AsyncStatus } from "@/types/async-state";

/** Base contract every Bolt-bound screen receives from containers. */
export type ScreenContract<TData, TActions = Record<string, never>> = {
  actions: TActions;
  data: TData;
  errorMessage?: string;
  route: string;
  screenId: string;
  status: AsyncStatus;
};

export type ScreenUserContext = {
  email?: string;
  institution?: string;
  name?: string;
  role?: string;
};

export type KpiMetricView = {
  label: string;
  loading?: boolean;
  tone?: "critical" | "primary" | "success" | "warning";
  trend?: string;
  value: string;
};

export type ListRowView = {
  badges?: Array<{ label: string; tone?: "critical" | "primary" | "success" | "warning" }>;
  id: string;
  meta?: string;
  subtitle?: string;
  title: string;
};
