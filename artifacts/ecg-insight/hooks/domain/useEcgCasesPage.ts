import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { clinicalUiAdapter } from "@/adapters/ui";
import type { ApiECGCase } from "@/services/clinical";
import { aiDomainService, clinicalDomainService, reportsDomainService } from "@/services/domain";
import { queryKeys } from "@/store/query-keys";
import { toQueryAsyncView } from "@/utils/asyncState";

export type EcgCasesFilters = {
  query: string;
  severity: "all" | NonNullable<ApiECGCase["severity"]>;
  status: "all" | ApiECGCase["status"];
};

export function useEcgCasesPage(accessToken?: string, filters?: EcgCasesFilters) {
  const queryClient = useQueryClient();
  const params = useMemo(() => {
    const next = new URLSearchParams({ pageSize: "50" });
    if (filters?.query.trim()) next.set("q", filters.query.trim());
    if (filters?.status && filters.status !== "all") next.set("status", filters.status);
    if (filters?.severity && filters.severity !== "all") next.set("severity", filters.severity);
    return next;
  }, [filters?.query, filters?.severity, filters?.status]);

  const casesQuery = useQuery({
    enabled: !!accessToken,
    queryFn: () => clinicalDomainService.listCases(accessToken!, params),
    queryKey: queryKeys.ecgCases.list(accessToken, params.toString()),
    retry: false,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["enterprise-ecg-cases", accessToken] });
  const analyzeMutation = useMutation({ mutationFn: (id: string) => aiDomainService.analyzeCase(accessToken!, id), onSuccess: invalidate });
  const approveMutation = useMutation({ mutationFn: (id: string) => clinicalDomainService.approve(accessToken!, id), onSuccess: invalidate });
  const rejectMutation = useMutation({
    mutationFn: (id: string) => clinicalDomainService.reject(accessToken!, id, "Rejected from ECG Case Management."),
    onSuccess: invalidate,
  });
  const reportMutation = useMutation({ mutationFn: (id: string) => reportsDomainService.generateReport(accessToken!, id), onSuccess: invalidate });
  const processingMutation = useMutation({
    mutationFn: (id: string) => clinicalDomainService.updateStatus(accessToken!, id, "processing"),
    onSuccess: invalidate,
  });

  const cases = casesQuery.data?.cases ?? [];
  const casesView = clinicalUiAdapter.mapCaseList(cases);
  const view = toQueryAsyncView({
    data: cases,
    emptyWhen: (data) => !data?.length,
    error: casesQuery.error,
    isError: casesQuery.isError,
    isLoading: casesQuery.isLoading,
  });

  return {
    analyzeMutation,
    approveMutation,
    cases,
    casesQuery,
    casesView,
    processingMutation,
    rejectMutation,
    reportMutation,
    view,
  };
}
