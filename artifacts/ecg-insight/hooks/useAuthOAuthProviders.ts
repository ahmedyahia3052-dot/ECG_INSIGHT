import { useEffect, useReducer } from "react";
import { checkBackendHealth } from "@/services/api";
import { EMPTY_OAUTH_PROVIDERS, listOAuthProviders, type OAuthProviderStatus } from "@/services/oauth";
import { filterArray } from "@/utils/collections";

type AuthOAuthState = {
  configuredProviders: OAuthProviderStatus[];
  serverUnavailable: boolean;
};

type AuthOAuthAction =
  | { type: "offline" }
  | { type: "ready"; providers: OAuthProviderStatus[] };

const initialAuthOAuthState: AuthOAuthState = {
  configuredProviders: EMPTY_OAUTH_PROVIDERS,
  serverUnavailable: false,
};

function authOAuthReducer(state: AuthOAuthState, action: AuthOAuthAction): AuthOAuthState {
  switch (action.type) {
    case "offline":
      return { configuredProviders: EMPTY_OAUTH_PROVIDERS, serverUnavailable: true };
    case "ready":
      return {
        configuredProviders: filterArray(action.providers, (provider) => provider.configured),
        serverUnavailable: false,
      };
    default:
      return state;
  }
}

export function useAuthOAuthProviders(options: { requireHealthyBackend?: boolean } = {}) {
  const requireHealthyBackend = options.requireHealthyBackend ?? true;
  const [state, dispatch] = useReducer(authOAuthReducer, initialAuthOAuthState);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (requireHealthyBackend) {
        const health = await checkBackendHealth();
        if (cancelled) return;
        if (!health.ok) {
          dispatch({ type: "offline" });
          return;
        }
      }

      try {
        const { providers } = await listOAuthProviders();
        if (cancelled) return;
        dispatch({ type: "ready", providers: providers ?? EMPTY_OAUTH_PROVIDERS });
      } catch {
        if (!cancelled) dispatch({ type: "offline" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [requireHealthyBackend]);

  return state;
}
