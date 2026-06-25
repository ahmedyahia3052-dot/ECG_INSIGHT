import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

interface OfflineSnapshot<T> {
  data: T;
  savedAt: string;
}

export function useOfflineCache<T>(key: string, liveData: T | undefined) {
  const [cachedData, setCachedData] = useState<T | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!mounted || !raw) return;
        const snapshot = JSON.parse(raw) as OfflineSnapshot<T>;
        setCachedData(snapshot.data);
        setSavedAt(snapshot.savedAt);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [key]);

  useEffect(() => {
    if (liveData === undefined) return;
    const snapshot: OfflineSnapshot<T> = {
      data: liveData,
      savedAt: new Date().toISOString(),
    };
    setCachedData(liveData);
    setSavedAt(snapshot.savedAt);
    AsyncStorage.setItem(key, JSON.stringify(snapshot)).catch(() => {});
  }, [key, liveData]);

  return {
    cachedData,
    hasOfflineData: cachedData !== null,
    savedAt,
  };
}
