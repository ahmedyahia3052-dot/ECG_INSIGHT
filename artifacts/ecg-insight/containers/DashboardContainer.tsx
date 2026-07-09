import { useRouter } from "expo-router";
import React from "react";

import { boltUiAdapter } from "@/adapters/bolt";
import { AsyncStateView } from "@/components/async-states/AsyncStateView";
import { useAuth } from "@/context/AuthContext";
import { useDashboardData } from "@/hooks/domain/useDashboardData";
import { DashboardLegacyPresentation } from "@/legacy-ui/screens/DashboardLegacyPresentation";

/** Container — business logic + data only. Bolt UI replaces DashboardLegacyPresentation. */
export function DashboardContainer() {
  const router = useRouter();
  const { authToken, user } = useAuth();
  const token = authToken?.token;
  const hook = useDashboardData(token);

  const contract = boltUiAdapter.toDashboardContract(
    hook,
    {
      email: user?.email,
      institution: user?.institution,
      name: user?.name,
      role: user?.role,
    },
    {
      onAddPatient: () => router.push("/patients/create" as never),
      onAnalyzeEcg: () => router.push("/ecg-analysis" as never),
      onGenerateReport: () => router.push("/reports" as never),
      onOpenCopilot: () => router.push("/copilot" as never),
      onUploadEcg: () => router.push("/upload-ecg" as never),
    },
  );

  return (
    <AsyncStateView
      errorMessage={contract.errorMessage}
      isError={contract.status === "error"}
      isLoading={contract.status === "loading"}
    >
      <DashboardLegacyPresentation contract={contract} />
    </AsyncStateView>
  );
}
