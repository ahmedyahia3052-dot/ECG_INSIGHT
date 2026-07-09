import { useRouter } from "expo-router";
import React, { useState } from "react";

import { boltUiAdapter } from "@/adapters/bolt";
import { AsyncStateView } from "@/components/async-states/AsyncStateView";
import { useAuth } from "@/context/AuthContext";
import { useEcgCasesPage, type EcgCasesFilters } from "@/hooks/domain/useEcgCasesPage";
import { EcgCasesLegacyPresentation } from "@/legacy-ui/screens/EcgCasesLegacyPresentation";

type StatusFilter = EcgCasesFilters["status"];
type SeverityFilter = EcgCasesFilters["severity"];

/** Container — business logic only. Bolt UI replaces EcgCasesLegacyPresentation. */
export function EcgCasesContainer() {
  const router = useRouter();
  const { authToken } = useAuth();
  const token = authToken?.token;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [severity, setSeverity] = useState<SeverityFilter>("all");

  const hook = useEcgCasesPage(token, { query, severity, status });
  const contract = boltUiAdapter.toHistoryContract(
    hook,
    { query, severity, status },
    {
      onAnalyze: (caseId) => hook.analyzeMutation.mutate(caseId),
      onApprove: (caseId) => hook.approveMutation.mutate(caseId),
      onOpenCase: (caseId) => router.push(`/ecg-cases/${caseId}` as never),
      onProcess: (caseId) => hook.processingMutation.mutate(caseId),
      onReject: (caseId) => hook.rejectMutation.mutate(caseId),
      onReport: (caseId) => hook.reportMutation.mutate(caseId),
      onSetQuery: setQuery,
      onSetSeverity: (value) => setSeverity(value as SeverityFilter),
      onSetStatus: (value) => setStatus(value as StatusFilter),
    },
  );

  return (
    <AsyncStateView isLoading={contract.status === "loading"} isError={contract.status === "error"}>
      <EcgCasesLegacyPresentation contract={contract} onNewCase={() => router.push("/ecg-cases/new" as never)} />
    </AsyncStateView>
  );
}
