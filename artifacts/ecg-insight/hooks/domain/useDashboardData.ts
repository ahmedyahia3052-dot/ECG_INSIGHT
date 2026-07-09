import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { clinicalUiAdapter } from "@/adapters/ui";
import {
  collaborationDomainService,
  enterpriseDomainService,
  clinicalDomainService,
  reportsDomainService,
} from "@/services/domain";
import { queryKeys } from "@/store/query-keys";
import { safeArray } from "@/utils/collections";
import { toQueryAsyncView } from "@/utils/asyncState";

export function useDashboardData(accessToken?: string) {
  const casesQuery = useQuery({
    enabled: !!accessToken,
    queryFn: () => clinicalDomainService.listDashboardCases(accessToken!),
    queryKey: queryKeys.dashboard.cases(accessToken),
    retry: false,
  });
  const patientsQuery = useQuery({
    enabled: !!accessToken,
    queryFn: () => clinicalDomainService.listDashboardPatients(accessToken!),
    queryKey: queryKeys.dashboard.patients(accessToken),
    retry: false,
  });
  const reportsQuery = useQuery({
    enabled: !!accessToken,
    queryFn: () => reportsDomainService.listDashboardReports(accessToken!),
    queryKey: queryKeys.dashboard.reports(accessToken),
    retry: false,
  });
  const notificationsQuery = useQuery({
    enabled: !!accessToken,
    queryFn: () => collaborationDomainService.listDashboardNotifications(accessToken!),
    queryKey: queryKeys.dashboard.notifications(accessToken),
    retry: false,
  });
  const subscriptionQuery = useQuery({
    enabled: !!accessToken,
    queryFn: () => enterpriseDomainService.getMySubscription(accessToken!),
    queryKey: queryKeys.dashboard.subscription(accessToken),
    retry: false,
  });
  const enterpriseQuery = useQuery({
    enabled: !!accessToken,
    queryFn: () => enterpriseDomainService.getClinicalDashboard(accessToken!),
    queryKey: queryKeys.dashboard.enterprise(accessToken),
    retry: false,
  });

  const cases = safeArray(casesQuery.data?.cases);
  const patients = safeArray(patientsQuery.data?.patients);
  const reports = safeArray(reportsQuery.data?.reports);
  const notifications = safeArray(notificationsQuery.data?.notifications);

  const snapshot = useMemo(
    () =>
      clinicalUiAdapter.mapDashboardSnapshot({
        cases,
        notifications,
        patients,
        reports,
      }),
    [cases, notifications, patients, reports],
  );

  const view = toQueryAsyncView({
    data: snapshot,
    emptyWhen: (data) => !data?.cases.length && !data?.patients.length,
    error: casesQuery.error ?? patientsQuery.error ?? reportsQuery.error,
    isError: casesQuery.isError || patientsQuery.isError || reportsQuery.isError,
    isLoading: casesQuery.isLoading || patientsQuery.isLoading || reportsQuery.isLoading,
  });

  return {
    cases,
    enterprise: enterpriseQuery.data?.dashboard,
    notifications,
    patients,
    queries: {
      cases: casesQuery,
      enterprise: enterpriseQuery,
      notifications: notificationsQuery,
      patients: patientsQuery,
      reports: reportsQuery,
      subscription: subscriptionQuery,
    },
    reports,
    snapshot,
    subscription: subscriptionQuery.data,
    view,
  };
}
