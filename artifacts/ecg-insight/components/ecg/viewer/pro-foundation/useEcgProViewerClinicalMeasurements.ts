import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import {
  getClinicalMeasurementSnapshot,
  runAutoClinicalMeasurement,
  saveManualClinicalMeasurement,
  type ClinicalMeasurementSnapshot,
} from "@/services/clinicalMeasurementApi";

import { manualPayloadFromWorkspace } from "./clinicalMeasurementMapper";
import type { EcgViewerWorkspaceState } from "../measurementTypes";

export function useEcgProViewerClinicalMeasurements(options: {
  caseId?: string;
  enabled?: boolean;
  onHydrateWorkspace?: (workspace: EcgViewerWorkspaceState) => void;
  token?: string;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["sprint96-clinical-measurements", options.token, options.caseId];

  const snapshotQuery = useQuery({
    enabled: Boolean(options.enabled && options.token && options.caseId),
    queryFn: () => getClinicalMeasurementSnapshot(options.token!, options.caseId!),
    queryKey,
    staleTime: 20_000,
  });

  const autoMutation = useMutation({
    mutationFn: () => runAutoClinicalMeasurement(options.token!, options.caseId!),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, (current: Awaited<ReturnType<typeof getClinicalMeasurementSnapshot>> | undefined) =>
        current
          ? { ...current, latestRecord: result.record }
          : {
              caseId: options.caseId!,
              clinicalPreview: null,
              engineVersion: result.record.engineVersion,
              latestRecord: result.record,
              workspace: null,
            },
      );
    },
  });

  const manualMutation = useMutation({
    mutationFn: (state: EcgViewerWorkspaceState) =>
      saveManualClinicalMeasurement(options.token!, options.caseId!, manualPayloadFromWorkspace(state)),
    onSuccess: (result) => {
      queryClient.setQueryData(queryKey, (current: Awaited<ReturnType<typeof getClinicalMeasurementSnapshot>> | undefined) =>
        current ? { ...current, latestRecord: result.record } : current,
      );
    },
  });

  const hydrateFromSnapshot = useCallback(() => {
    const workspace = snapshotQuery.data?.workspace;
    if (workspace && options.onHydrateWorkspace) {
      options.onHydrateWorkspace(workspace as EcgViewerWorkspaceState);
    }
  }, [options.onHydrateWorkspace, snapshotQuery.data?.workspace]);

  return {
    autoMeasure: () => autoMutation.mutateAsync(),
    autoPending: autoMutation.isPending,
    hydrateFromSnapshot,
    latestRecord: snapshotQuery.data?.latestRecord as ClinicalMeasurementSnapshot | null | undefined,
    saveManual: (state: EcgViewerWorkspaceState) => manualMutation.mutateAsync(state),
    savePending: manualMutation.isPending,
    snapshot: snapshotQuery.data,
  };
}
