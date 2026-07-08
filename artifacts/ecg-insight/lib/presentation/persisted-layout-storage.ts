import { useCallback, useEffect, useState } from "react";

/** Sprint 75 — shared persisted panel layout storage (web localStorage). */

export function readPersistedJson<T extends Record<string, unknown>>(
  storageKey: string,
  fallback: T,
  legacyKeys: string[] = [],
): T {
  if (typeof window === "undefined") return fallback;
  try {
    const keys = [storageKey, ...legacyKeys];
    const raw = keys.map((key) => window.localStorage.getItem(key)).find(Boolean);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}

export function writePersistedJson<T extends Record<string, unknown>>(storageKey: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    // Ignore storage failures.
  }
}

export function usePersistedJsonLayout<T extends Record<string, unknown>>(
  storageKey: string,
  initialValue: T,
  legacyKeys: string[] = [],
) {
  const [layout, setLayout] = useState<T>(() => readPersistedJson(storageKey, initialValue, legacyKeys));

  useEffect(() => {
    writePersistedJson(storageKey, layout);
  }, [layout, storageKey]);

  const replaceLayout = useCallback((next: T | ((current: T) => T)) => {
    setLayout((current) => (typeof next === "function" ? (next as (value: T) => T)(current) : next));
  }, []);

  return { layout, replaceLayout, setLayout };
}
