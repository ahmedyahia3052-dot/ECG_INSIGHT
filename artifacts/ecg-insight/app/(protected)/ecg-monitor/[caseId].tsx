import React from "react";
import { useLocalSearchParams } from "expo-router";

import { EcgEnterpriseWorkspaceScreen } from "@/components/ecg/viewer/EcgEnterpriseWorkspaceScreen";

export default function EcgMonitorScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const resolvedCaseId = typeof caseId === "string" ? caseId : undefined;

  return <EcgEnterpriseWorkspaceScreen caseId={resolvedCaseId} testIdPrefix="sprint13-ecg-monitor" />;
}
