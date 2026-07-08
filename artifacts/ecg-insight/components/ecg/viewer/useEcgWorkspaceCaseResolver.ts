import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { getPatientEcgHistory, listCases, type ApiECGCase } from "@/services/clinical";

export type EcgWorkspaceResolvePhase =
  | "empty"
  | "error"
  | "ready"
  | "resolving"
  | "select-examination";

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

function imageReadyCases(cases: ApiECGCase[]) {
  return cases.filter(caseHasImage);
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

  const sourceCases = useMemo(() => {
    if (explicitCaseId) return [];
    if (patientId) return patientHistoryQuery.data?.cases ?? [];
    return demoCasesQuery.data?.cases ?? [];
  }, [demoCasesQuery.data?.cases, explicitCaseId, patientHistoryQuery.data?.cases, patientId]);

  const candidateCases = useMemo(() => imageReadyCases(sourceCases), [sourceCases]);

  const resolvedCaseId = useMemo(() => {
    if (explicitCaseId) return explicitCaseId;
    if (candidateCases.length === 1) return candidateCases[0]?.id;
    if (candidateCases.length > 1) return undefined;
    return pickDemoCase(sourceCases);
  }, [candidateCases, explicitCaseId, sourceCases]);

  const demoCaseId = useMemo(() => pickDemoCase(sourceCases), [sourceCases]);

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
    && candidateCases.length === 0
    && (patientHistoryQuery.isError || demoCasesQuery.isError || patientHistoryQuery.isSuccess || demoCasesQuery.isSuccess);

  const phase = useMemo((): EcgWorkspaceResolvePhase => {
    if (explicitCaseId && resolvedCaseId) return "ready";
    if (!input.token) return "empty";
    if (isResolving) return "resolving";
    if (resolveError) return "error";
    if (candidateCases.length > 1 && !explicitCaseId) return "select-examination";
    if (resolvedCaseId) return "ready";
    if (candidateCases.length === 0 && (patientHistoryQuery.isSuccess || demoCasesQuery.isSuccess)) return "empty";
    return "error";
  }, [
    candidateCases.length,
    demoCasesQuery.isSuccess,
    explicitCaseId,
    input.token,
    isResolving,
    patientHistoryQuery.isSuccess,
    resolveError,
    resolvedCaseId,
  ]);

  const refetch = useCallback(() => {
    if (patientId) {
      void patientHistoryQuery.refetch();
      return;
    }
    void demoCasesQuery.refetch();
  }, [demoCasesQuery, patientHistoryQuery, patientId]);

  return {
    candidateCases,
    demoCaseId,
    demoMode: !explicitCaseId && !patientId,
    isResolving,
    phase,
    refetch,
    resolveError,
    resolvedCaseId,
  };
}
