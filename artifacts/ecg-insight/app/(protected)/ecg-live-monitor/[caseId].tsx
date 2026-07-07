import React from "react";
import { useLocalSearchParams } from "expo-router";

import { EcgLiveMonitorWorkspaceScreen } from "@/components/ecg/viewer/EcgLiveMonitorWorkspaceScreen";

export default function EcgLiveMonitorCaseScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const resolvedCaseId = typeof caseId === "string" ? caseId : undefined;

  return <EcgLiveMonitorWorkspaceScreen caseId={resolvedCaseId} testIdPrefix="sprint37-live-monitor" />;
}
