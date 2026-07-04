import { useEffect, useState } from "react";
import { Platform } from "react-native";

import { cacheImageDimensions } from "./ecgImageEngine";

type ResolvedAsset = {
  error: string | null;
  height: number;
  loading: boolean;
  url?: string;
  width: number;
};

const blobUrlCache = new Map<string, string>();

function cacheKey(url: string, accessToken?: string | null) {
  return `${url}::${accessToken ?? ""}`;
}

function readImageDimensions(blobUrl: string) {
  return new Promise<{ height: number; width: number }>((resolve, reject) => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      resolve({ height: 0, width: 0 });
      return;
    }
    const image = new window.Image();
    image.onload = () => resolve({ height: image.naturalHeight, width: image.naturalWidth });
    image.onerror = () => reject(new Error("Unable to decode ECG image."));
    image.src = blobUrl;
  });
}

async function resolveAuthenticatedAsset(sourceUrl: string, accessToken?: string | null) {
  if (!sourceUrl || sourceUrl.startsWith("blob:") || sourceUrl.startsWith("data:")) {
    return { error: null as string | null, url: sourceUrl };
  }
  if (Platform.OS !== "web" || typeof window === "undefined" || !accessToken) {
    return { error: null as string | null, url: sourceUrl };
  }

  const key = cacheKey(sourceUrl, accessToken);
  const cachedBlobUrl = blobUrlCache.get(key);
  if (cachedBlobUrl) {
    return { error: null as string | null, url: cachedBlobUrl };
  }

  const response = await fetch(sourceUrl, {
    credentials: "include",
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`ECG image request failed (${response.status}).`);
  }
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  blobUrlCache.set(key, blobUrl);
  return { error: null as string | null, url: blobUrl };
}

export function useAuthenticatedEcgAsset(sourceUrl?: string, accessToken?: string | null): ResolvedAsset {
  const [state, setState] = useState<ResolvedAsset>({
    error: null,
    height: 0,
    loading: Boolean(sourceUrl),
    url: sourceUrl,
    width: 0,
  });

  useEffect(() => {
    if (!sourceUrl) {
      setState({ error: null, height: 0, loading: false, url: undefined, width: 0 });
      return undefined;
    }

    const requiresAuth =
      Platform.OS === "web" &&
      typeof window !== "undefined" &&
      (sourceUrl.includes("/api/") || sourceUrl.startsWith(window.location.origin));

    if (requiresAuth && !accessToken) {
      setState({ error: null, height: 0, loading: true, url: undefined, width: 0 });
      return undefined;
    }

    let cancelled = false;
    setState((current) => ({ ...current, error: null, loading: true, url: sourceUrl }));

    void (async () => {
      try {
        const resolved = await resolveAuthenticatedAsset(sourceUrl, accessToken);
        if (cancelled || !resolved.url) return;
        const dimensions = await readImageDimensions(resolved.url);
        if (cancelled) return;
        cacheImageDimensions(sourceUrl, dimensions.width, dimensions.height);
        setState({
          error: null,
          height: dimensions.height,
          loading: false,
          url: resolved.url,
          width: dimensions.width,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          error: error instanceof Error ? error.message : "Unable to load ECG image.",
          height: 0,
          loading: false,
          url: sourceUrl,
          width: 0,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, sourceUrl]);

  return state;
}

export function clearAuthenticatedEcgAssetCache() {
  for (const blobUrl of blobUrlCache.values()) {
    if (Platform.OS === "web" && typeof URL !== "undefined") {
      URL.revokeObjectURL(blobUrl);
    }
  }
  blobUrlCache.clear();
}
