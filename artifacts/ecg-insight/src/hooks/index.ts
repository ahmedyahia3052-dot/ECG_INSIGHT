import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { useAuth } from "@/context/AuthContext";
import { queryKeys } from "@/store/query-keys";

import {
  analyticsAdapter,
  authAdapter,
  caseAdapter,
  dashboardAdapter,
  developerAdapter,
  ecgViewerAdapter,
  ecgWorkspaceAdapter,
  historyAdapter,
  liveMonitorAdapter,
  notificationAdapter,
  organizationAdapter,
  patientAdapter,
  profileAdapter,
  settingsAdapter,
  subscriptionAdapter,
} from "../adapters/module-adapters";
import { toAdapterViewState } from "../core/adapter-state";
import type { HookSurface } from "../contracts";

function useAccessToken() {
  const { authToken } = useAuth();
  return authToken?.token;
}

function buildHookSurface<TData, TActions>(
  query: {
    data: TData | undefined;
    error: unknown;
    isError: boolean;
    isFetching: boolean;
    isLoading: boolean;
    refetch: () => Promise<unknown>;
  },
  actions: TActions,
  emptyWhen?: (data: TData | undefined) => boolean,
): HookSurface<TData, TActions> {
  const state = toAdapterViewState({
    data: query.data,
    emptyWhen: emptyWhen as ((data: TData | null | undefined) => boolean) | undefined,
    error: query.error,
    isError: query.isError,
    isFetching: query.isFetching,
    isLoading: query.isLoading,
  });

  return {
    actions: () => actions,
    data: state.data,
    error: state.error,
    loading: state.loading,
    refresh: () => query.refetch(),
    state,
  };
}

export function useDashboard() {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken,
    queryFn: () => dashboardAdapter.load(accessToken!),
    queryKey: [...queryKeys.dashboard.cases(accessToken), "sprint103-vm"],
  });
  return buildHookSurface(query, { openCase: (_caseId: string) => undefined });
}

export function usePatients(params = new URLSearchParams()) {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken,
    queryFn: () => patientAdapter.list(accessToken!, params),
    queryKey: ["sprint103", "patients", accessToken, params.toString()],
  });
  return buildHookSurface(query, { archive: (_patientId: string) => undefined }, (data) => !data?.length);
}

export function usePatient(patientId?: string) {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken && !!patientId,
    queryFn: () => patientAdapter.getHistory(accessToken!, patientId!),
    queryKey: ["sprint103", "patient", accessToken, patientId],
  });
  return buildHookSurface(query, { refreshHistory: () => query.refetch() }, (data) => !data?.length);
}

export function useCases(params = new URLSearchParams()) {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken,
    queryFn: () => caseAdapter.list(accessToken!, params),
    queryKey: ["sprint103", "cases", accessToken, params.toString()],
  });
  return buildHookSurface(
    query,
    {
      approve: (caseId: string) => (accessToken ? caseAdapter.approve(accessToken, caseId) : Promise.resolve()),
      reject: (caseId: string, reason: string) => (accessToken ? caseAdapter.reject(accessToken, caseId, reason) : Promise.resolve()),
    },
    (data) => !data?.cases.length,
  );
}

export function useWorkspace(caseId?: string) {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => ecgWorkspaceAdapter.load(accessToken!, caseId!),
    queryKey: ["sprint103", "workspace", accessToken, caseId],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() });
}

export function useViewer(caseId?: string) {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => ecgViewerAdapter.load(accessToken!, caseId!),
    queryKey: ["sprint103", "viewer", accessToken, caseId],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() });
}

export function useLiveMonitor(caseId?: string, runtime?: { filter: string; layoutMode: string; playback: string; heartRate?: number; rhythm?: string; signalQuality?: string }) {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () =>
      liveMonitorAdapter.load({
        accessToken: accessToken!,
        caseId: caseId!,
        filter: runtime?.filter ?? "Monitor",
        heartRate: runtime?.heartRate,
        layoutMode: runtime?.layoutMode ?? "12-lead",
        playback: runtime?.playback ?? "live",
        rhythm: runtime?.rhythm,
        signalQuality: runtime?.signalQuality,
      }),
    queryKey: ["sprint103", "live-monitor", accessToken, caseId, runtime?.layoutMode, runtime?.playback],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() });
}

export function useUpload() {
  const accessToken = useAccessToken();
  const actions = useMemo(
    () => ({
      queueFile: (_file: File) => undefined,
      token: accessToken,
    }),
    [accessToken],
  );
  return {
    actions: () => actions,
    data: null,
    error: null,
    loading: false,
    refresh: async () => undefined,
    state: toAdapterViewState({ data: null, error: null, isError: false, isLoading: false }),
  };
}

export function useOrganizations() {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken,
    queryFn: () => organizationAdapter.list(accessToken!),
    queryKey: ["sprint103", "organizations", accessToken],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() }, (data) => !data?.length);
}

export function useSubscriptions() {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken,
    queryFn: () => subscriptionAdapter.load(accessToken!),
    queryKey: ["sprint103", "subscriptions", accessToken],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() });
}

export function useDeveloper() {
  const query = useQuery({
    queryFn: () => developerAdapter.load(),
    queryKey: ["sprint103", "developer"],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() });
}

export function useNotifications() {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken,
    queryFn: () => notificationAdapter.list(accessToken!),
    queryKey: ["sprint103", "notifications", accessToken],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() }, (data) => !data?.length);
}

export function useProfile() {
  const { authToken, user } = useAuth();
  const accessToken = authToken?.token;
  const query = useQuery({
    enabled: !!accessToken && !!user?.id,
    queryFn: () => profileAdapter.load(accessToken!, user!.id),
    queryKey: ["sprint103", "profile", accessToken, user?.id],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() });
}

export function useHistory(filters: { query: string; severity: string; status: string }) {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken,
    queryFn: () => historyAdapter.load(accessToken!, filters),
    queryKey: ["sprint103", "history", accessToken, filters.query, filters.severity, filters.status],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() }, (data) => !data?.cases.length);
}

export function useAnalytics() {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken,
    queryFn: () => analyticsAdapter.load(accessToken!),
    queryKey: ["sprint103", "analytics", accessToken],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() });
}

export function useSettings() {
  const accessToken = useAccessToken();
  const query = useQuery({
    enabled: !!accessToken,
    queryFn: () => settingsAdapter.load(accessToken!),
    queryKey: ["sprint103", "settings", accessToken],
  });
  return buildHookSurface(query, { refresh: () => query.refetch() });
}

export function useAuthSession() {
  const { authToken, user } = useAuth();
  const accessToken = authToken?.token;
  const data = useMemo(
    () =>
      authAdapter.toSession({
        email: user?.email ?? "",
        role: user?.role,
        token: accessToken ?? undefined,
        userId: user?.id ?? "",
        userName: user?.name ?? user?.email ?? "Clinician",
      }),
    [accessToken, user],
  );
  const refresh = useCallback(async () => data, [data]);
  return {
    actions: () => ({ refresh }),
    data,
    error: null,
    loading: false,
    refresh,
    state: toAdapterViewState({ data, error: null, isError: false, isLoading: false }),
  };
}
