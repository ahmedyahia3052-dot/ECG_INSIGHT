import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { clinicalUiAdapter } from "@/adapters/ui";
import { API_URL } from "@/services/api";
import { createCaseRevision } from "@/services/clinical";
import {
  aiDomainService,
  clinicalDomainService,
  ecgProcessingDomainService,
  reportsDomainService,
} from "@/services/domain";
import { queryKeys } from "@/store/query-keys";
import { toQueryAsyncView } from "@/utils/asyncState";

export function useEcgCaseDetail(accessToken?: string, caseId?: string) {
  const queryClient = useQueryClient();

  const caseQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => clinicalDomainService.getCase(accessToken!, caseId!),
    queryKey: queryKeys.ecgCases.detail(accessToken, caseId),
    retry: false,
  });
  const analysisQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => aiDomainService.getResult(accessToken!, caseId!),
    queryKey: queryKeys.ecgCases.detailAi(accessToken, caseId),
    retry: false,
  });
  const explainabilityQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => aiDomainService.getExplainability(accessToken!, caseId!),
    queryKey: queryKeys.ecgCases.detailExplainability(accessToken, caseId),
    retry: false,
  });
  const digitalEcgQuery = useQuery({
    enabled: !!accessToken && !!caseId,
    queryFn: () => ecgProcessingDomainService.getDigitalEcg(accessToken!, caseId!),
    queryKey: queryKeys.ecgCases.detailDigital(accessToken, caseId),
    retry: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.ecgCases.detail(accessToken, caseId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.ecgCases.list(accessToken) });
  };

  const analyzeMutation = useMutation({ mutationFn: () => aiDomainService.analyzeCase(accessToken!, caseId!), onSuccess: invalidate });
  const processMutation = useMutation({ mutationFn: () => clinicalDomainService.updateStatus(accessToken!, caseId!, "processing"), onSuccess: invalidate });
  const approveMutation = useMutation({ mutationFn: () => clinicalDomainService.approve(accessToken!, caseId!), onSuccess: invalidate });
  const rejectMutation = useMutation({
    mutationFn: () => clinicalDomainService.reject(accessToken!, caseId!, "Rejected from detail review."),
    onSuccess: invalidate,
  });
  const finalizeMutation = useMutation({ mutationFn: () => clinicalDomainService.updateStatus(accessToken!, caseId!, "finalized"), onSuccess: invalidate });
  const reportMutation = useMutation({ mutationFn: () => reportsDomainService.generateReport(accessToken!, caseId!), onSuccess: invalidate });
  const revisionMutation = useMutation({ mutationFn: () => createCaseRevision(accessToken!, caseId!), onSuccess: invalidate });

  const ecgCase = caseQuery.data?.case;
  const imageUrl = ecgCase?.files.find((file) => file.mimeType.startsWith("image/"))?.downloadUrl;
  const absoluteImageUrl = imageUrl
    ? imageUrl.startsWith("http")
      ? imageUrl
      : `${API_URL.replace(/\/api$/, "")}${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`
    : undefined;

  const caseView = ecgCase ? clinicalUiAdapter.mapCaseDetail(ecgCase, absoluteImageUrl) : null;
  const view = toQueryAsyncView({
    data: caseView,
    error: caseQuery.error,
    isError: caseQuery.isError,
    isLoading: caseQuery.isLoading,
  });

  return {
    analysisQuery,
    analyzeMutation,
    approveMutation,
    caseQuery,
    caseView,
    digitalEcgQuery,
    ecgCase,
    explainabilityQuery,
    finalizeMutation,
    imageUrl: absoluteImageUrl,
    processMutation,
    rejectMutation,
    reportMutation,
    revisionMutation,
    view,
  };
}
