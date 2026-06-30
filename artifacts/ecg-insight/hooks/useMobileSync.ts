import { useCallback, useEffect, useState } from "react";
import {
  mobileSyncSnapshot,
  registerPwaRuntime,
  subscribeNetworkStatus,
  syncNow,
  type MobileSyncSnapshot,
} from "@/services/mobileOffline";

const initialSnapshot: MobileSyncSnapshot = {
  apiUrl: "unknown",
  backendReachable: true,
  backendHealthStatus: "not checked yet",
  browserOnline: true,
  isOnline: true,
  lastHealthCheckAt: "not checked yet",
  offlineReason: "online",
  pendingActions: 0,
  pendingUploads: 0,
  serviceWorkerReady: false,
};

export function useMobileSync(accessToken?: string | null) {
  const [snapshot, setSnapshot] = useState<MobileSyncSnapshot>(initialSnapshot);
  const [updateAvailable, setUpdateAvailable] = useState(false);
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
    void registerPwaRuntime(() => setUpdateAvailable(true)).then(refresh).catch(() => refresh());
  }, [refresh]);

  useEffect(() => subscribeNetworkStatus(() => {
    void refresh();
    if (accessToken) void runSync();
  }), [accessToken, refresh, runSync]);

  useEffect(() => {
    if (typeof window === "undefined") return () => undefined;
    const listener = () => {
      if (accessToken) void runSync();
    };
    window.addEventListener("ecg-insight-background-sync", listener);
    return () => window.removeEventListener("ecg-insight-background-sync", listener);
  }, [accessToken, runSync]);

  return {
    refresh,
    runSync,
    snapshot,
    syncing,
    updateAvailable,
  };
}
