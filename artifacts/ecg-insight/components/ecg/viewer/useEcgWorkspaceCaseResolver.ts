import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { getPatientEcgHistory, listCases, type ApiECGCase } from "@/services/clinical";

function caseHasImage(ecgCase: ApiECGCase) {
  return Boolean(
    ecgCase.imagePath
    || ecgCase.ecgImage
    || ecgCase.originalFileUrl
    || ecgCase.files.some((file) => file.mimeType.startsWith("image/")),
  );
}

function pickDemoCase(cases: ApiECGCase[]) {
  return cases.find(caseHasImage)?.id;
}

export function useEcgWorkspaceCaseResolver(input: {
  caseId?: string;
  patientId?: string;
  token?: string;
}) {
  const explicitCaseId = typeof input.caseId === "string" && input.caseId.length > 0 ? input.caseId : undefined;
  const patientId = typeof input.patientId === "string" && input.patientId.length > 0 ? input.patientId : undefined;

  const patientHistoryQuery = useQuery({
    enabled: !!input.token && !!patientId && !explicitCaseId,
    queryFn: () => getPatientEcgHistory(input.token!, patientId!),
    queryKey: ["ecg-workspace-patient-history", input.token, patientId],
    staleTime: 30_000,
  });

  const demoCasesQuery = useQuery({
    enabled: !!input.token && !explicitCaseId && !patientId,
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", pageSize: "25" });
      return listCases(input.token!, params);
    },
    queryKey: ["ecg-workspace-demo-cases", input.token],
    staleTime: 60_000,
  });

  const resolvedCaseId = useMemo(() => {
    if (explicitCaseId) return explicitCaseId;
    if (patientId) return pickDemoCase(patientHistoryQuery.data?.cases ?? []);
    return pickDemoCase(demoCasesQuery.data?.cases ?? []);
  }, [demoCasesQuery.data?.cases, explicitCaseId, patientHistoryQuery.data?.cases, patientId]);

  const isResolving =
    !explicitCaseId
    && !!input.token
    && (
      (patientId && patientHistoryQuery.isLoading)
      || (!patientId && demoCasesQuery.isLoading)
    );

  const resolveError =
    !explicitCaseId
    && !isResolving
    && !!input.token
    && !resolvedCaseId
    && (patientHistoryQuery.isError || demoCasesQuery.isError || patientHistoryQuery.isSuccess || demoCasesQuery.isSuccess);

  return {
    demoMode: !explicitCaseId && !patientId,
    isResolving,
    resolveError,
    resolvedCaseId,
  };
}
