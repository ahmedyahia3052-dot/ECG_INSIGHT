import type { AsyncStatus } from "@/types/async-state";
import type { DashboardScreenContract } from "@/types/screens/dashboard";
import type { HistoryScreenContract } from "@/types/screens/history";
import type { ScreenUserContext } from "@/types/screens/common";

import type { AnalyticsVM, AuthVM, CaseVM, DashboardVM, DeveloperVM, EcgVM, HistoryVM, MonitorVM, NotificationVM, OrganizationVM, PatientVM, ProfileVM, SettingsVM, SubscriptionVM, UploadVM } from "../view-models";
import type { AdapterViewState } from "../core/adapter-state";

export type ScreenContractBase = {
  route: string;
  screenId: string;
  status: AsyncStatus;
};

export type DashboardContract = ScreenContractBase & {
  data: DashboardVM;
  user: ScreenUserContext;
};

export type PatientContract = ScreenContractBase & {
  data: PatientVM | PatientVM[];
};

export type CaseContract = ScreenContractBase & {
  data: CaseVM | CaseVM[];
};

export type WorkspaceContract = ScreenContractBase & {
  caseId: string;
  data: EcgVM;
};

export type ViewerContract = ScreenContractBase & {
  caseId: string;
  data: EcgVM;
};

export type MonitorContract = ScreenContractBase & {
  caseId: string;
  data: MonitorVM;
};

export type UploadContract = ScreenContractBase & {
  data: UploadVM | UploadVM[];
};

export type HistoryContract = HistoryScreenContract;

export type SubscriptionContract = ScreenContractBase & {
  data: SubscriptionVM;
};

export type OrganizationContract = ScreenContractBase & {
  data: OrganizationVM | OrganizationVM[];
};

export type DeveloperContract = ScreenContractBase & {
  data: DeveloperVM;
};

export type ProfileContract = ScreenContractBase & {
  data: ProfileVM;
};

export type NotificationContract = ScreenContractBase & {
  data: NotificationVM[];
};

export type SettingsContract = ScreenContractBase & {
  data: SettingsVM;
};

export type AnalyticsContract = ScreenContractBase & {
  data: AnalyticsVM;
};

export type AuthContract = ScreenContractBase & {
  data: AuthVM;
};

export type HookSurface<TData, TActions = Record<string, unknown>> = {
  actions: () => TActions;
  data: TData | null;
  error: AdapterViewState<TData>["error"];
  loading: boolean;
  refresh: () => Promise<unknown>;
  state: AdapterViewState<TData>;
};

export type { DashboardScreenContract, HistoryScreenContract };
