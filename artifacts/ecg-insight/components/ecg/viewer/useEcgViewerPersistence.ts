import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef } from "react";

import { getEcgViewerWorkspace, saveEcgViewerWorkspace } from "@/services/ecgViewerWorkspace";

import { createWorkspaceState, type EcgViewerWorkspaceState } from "./measurementTypes";

const STORAGE_PREFIX = "ecg-insight:ecg-monitor-workspace:";

export function workspaceStorageKey(caseId: string, patientId: string) {
  return `${STORAGE_PREFIX}${patientId}:${caseId}`;
}

export async function readLocalWorkspace(caseId: string, patientId: string) {
  const raw = await AsyncStorage.getItem(workspaceStorageKey(caseId, patientId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EcgViewerWorkspaceState;
  } catch {
    return null;
  }
}

export async function writeLocalWorkspace(caseId: string, patientId: string, state: EcgViewerWorkspaceState) {
  await AsyncStorage.setItem(workspaceStorageKey(caseId, patientId), JSON.stringify(state));
}

export function useEcgViewerPersistence(options: {
  accessToken?: string;
  caseId: string;
  enabled?: boolean;
  onHydrate: (state: EcgViewerWorkspaceState) => void;
  patientId: string;
  snapshot: () => EcgViewerWorkspaceState;
}) {
  const hydratedRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onHydrateRef = useRef(options.onHydrate);
  const snapshotRef = useRef(options.snapshot);
  onHydrateRef.current = options.onHydrate;
  snapshotRef.current = options.snapshot;

  useEffect(() => {
    if (!options.enabled || hydratedRef.current) return undefined;
    hydratedRef.current = true;
    let cancelled = false;
    void (async () => {
      let state = await readLocalWorkspace(options.caseId, options.patientId);
      if (!state && options.accessToken) {
        try {
          const remote = await getEcgViewerWorkspace(options.accessToken, options.caseId);
          state = remote.workspace ?? null;
        } catch {
          state = null;
        }
      }
      if (!cancelled && state) onHydrateRef.current(createWorkspaceState(state));
    })();
    return () => {
      cancelled = true;
    };
  }, [options.accessToken, options.caseId, options.enabled, options.patientId]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const state = snapshotRef.current();
      void writeLocalWorkspace(options.caseId, options.patientId, state);
      if (options.accessToken) {
        void saveEcgViewerWorkspace(options.accessToken, options.caseId, state).catch(() => undefined);
      }
    }, 1200);
  }, [options.accessToken, options.caseId, options.patientId]);

  useEffect(() => () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, []);

  return { scheduleSave };
}
