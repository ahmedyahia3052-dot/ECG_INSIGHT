import { useQuery } from "@tanstack/react-query";

import { compareEcgViewerCases } from "@/services/ecgViewerApi";

export function useEcgProViewerComparison(input: {
  baselineCaseId?: string;
  caseId?: string;
  enabled?: boolean;
  token?: string;
}) {
  const query = useQuery({
    enabled:
      !!input.enabled &&
      !!input.token &&
      !!input.caseId &&
      !!input.baselineCaseId &&
      input.baselineCaseId !== input.caseId,
    queryFn: () => compareEcgViewerCases(input.token!, input.caseId!, input.baselineCaseId!),
    queryKey: ["ecg-pro-viewer-compare", input.token, input.caseId, input.baselineCaseId],
    staleTime: 30_000,
  });

  return {
    comparison: query.data?.comparison ?? null,
    isError: query.isError,
    isLoading: query.isLoading,
  };
}
