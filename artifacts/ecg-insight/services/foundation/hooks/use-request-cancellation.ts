import { useCallback, useEffect, useRef } from "react";

import { requestCancellationRegistry } from "../api/cancellation";

export function useRequestCancellation(scope: string) {
  const keysRef = useRef<string[]>([]);

  const createSignal = useCallback(
    (resourceId?: string) => {
      const key = resourceId ? `${scope}:${resourceId}` : scope;
      keysRef.current.push(key);
      return requestCancellationRegistry.createSignal(key);
    },
    [scope],
  );

  const cancel = useCallback((resourceId?: string) => {
    const key = resourceId ? `${scope}:${resourceId}` : scope;
    requestCancellationRegistry.cancel(key);
  }, [scope]);

  const cancelAll = useCallback(() => {
    keysRef.current.forEach((key) => requestCancellationRegistry.cancel(key));
    keysRef.current = [];
  }, []);

  useEffect(() => cancelAll, [cancelAll]);

  return {
    cancel,
    cancelAll,
    createSignal,
  };
}
