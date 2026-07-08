import { useEffect, useState } from "react";

import { offlineDetector } from "../api/offline-detector";

export function useOfflineStatus() {
  const [online, setOnline] = useState(offlineDetector.isOnline);

  useEffect(() => {
    return offlineDetector.subscribe(setOnline);
  }, []);

  return {
    isOffline: !online,
    isOnline: online,
  };
}
