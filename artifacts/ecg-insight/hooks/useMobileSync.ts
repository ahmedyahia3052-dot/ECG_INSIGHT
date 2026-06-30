import { useCallback, useEffect, useState } from "react";
import {
  mobileSyncSnapshot,
  removeOfflineRuntime,
  syncNow,
  type MobileSyncSnapshot,
} from "@/services/mobileOffline";

const initialSnapshot: MobileSyncSnapshot = {
  apiUrl: "unknown",
  backendHealthStatus: "not checked yet",
  backendReachable: true,
  lastHealthCheckAt: "not checked yet",
  pendingActions: 0,
  pendingUploads: 0,
};

export function useMobileSync(accessToken?: string | null) {
  const [snapshot, setSnapshot] = useState<MobileSyncSnapshot>(initialSnapshot);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setSnapshot(await mobileSyncSnapshot());
  }, []);

  const runSync = useCallback(async () => {
    if (!accessToken) return { actions: [], uploads: [] };
    setSyncing(true);
    try {
      const result = await syncNow(accessToken);
      await refresh();
      return result;
    } finally {
      setSyncing(false);
    }
  }, [accessToken, refresh]);

  useEffect(() => {
    void removeOfflineRuntime().then(refresh).catch(() => refresh());
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return () => undefined;
    const interval = window.setInterval(() => {
      void refresh();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  return {
    refresh,
    runSync,
    snapshot,
    syncing,
  };
}
