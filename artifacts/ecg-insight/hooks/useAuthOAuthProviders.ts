import { useEffect, useReducer, useRef } from "react";
import { checkBackendHealth } from "@/services/api";
import { EMPTY_OAUTH_PROVIDERS, listOAuthProviders, type OAuthProviderStatus } from "@/services/oauth";
import { filterArray } from "@/utils/collections";

type AuthOAuthState = {
  checkingBackend: boolean;
  configuredProviders: OAuthProviderStatus[];
  serverUnavailable: boolean;
};

type AuthOAuthAction =
  | { type: "checking" }
  | { type: "offline" }
  | { type: "ready"; providers: OAuthProviderStatus[] };

const initialAuthOAuthState: AuthOAuthState = {
  checkingBackend: true,
  configuredProviders: EMPTY_OAUTH_PROVIDERS,
  serverUnavailable: false,
};

function authOAuthReducer(state: AuthOAuthState, action: AuthOAuthAction): AuthOAuthState {
  switch (action.type) {
    case "checking":
      return { ...state, checkingBackend: true, serverUnavailable: false };
    case "offline":
      return { checkingBackend: false, configuredProviders: EMPTY_OAUTH_PROVIDERS, serverUnavailable: true };
    case "ready":
      return {
        checkingBackend: false,
        configuredProviders: filterArray(action.providers, (provider) => provider.configured),
        serverUnavailable: false,
      };
    default:
      return state;
  }
}

const BACKEND_RETRY_MS = 4_000;

export function useAuthOAuthProviders(options: { requireHealthyBackend?: boolean } = {}) {
  const requireHealthyBackend = options.requireHealthyBackend ?? true;
  const [state, dispatch] = useReducer(authOAuthReducer, initialAuthOAuthState);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const clearRetryTimer = () => {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };

    const scheduleRetry = () => {
      if (retryTimerRef.current || connectedRef.current) return;
      retryTimerRef.current = setInterval(() => {
        if (!cancelled && !connectedRef.current) {
          void probeBackend(false);
        }
      }, BACKEND_RETRY_MS);
    };

    const probeBackend = async (initialProbe: boolean) => {
      if (!requireHealthyBackend) {
        connectedRef.current = true;
        dispatch({ type: "ready", providers: EMPTY_OAUTH_PROVIDERS });
        clearRetryTimer();
        return;
      }

      if (initialProbe) dispatch({ type: "checking" });

      const health = await checkBackendHealth();
      if (cancelled) return;

      if (!health.ok) {
        connectedRef.current = false;
        dispatch({ type: "offline" });
        scheduleRetry();
        return;
      }

      try {
        const { providers } = await listOAuthProviders();
        if (cancelled) return;
        connectedRef.current = true;
        dispatch({ type: "ready", providers: providers ?? EMPTY_OAUTH_PROVIDERS });
        clearRetryTimer();
      } catch {
        if (!cancelled) {
          connectedRef.current = true;
          dispatch({ type: "ready", providers: EMPTY_OAUTH_PROVIDERS });
          clearRetryTimer();
        }
      }
    };

    connectedRef.current = false;
    void probeBackend(true);

    return () => {
      cancelled = true;
      connectedRef.current = false;
      clearRetryTimer();
    };
  }, [requireHealthyBackend]);

  return state;
}
