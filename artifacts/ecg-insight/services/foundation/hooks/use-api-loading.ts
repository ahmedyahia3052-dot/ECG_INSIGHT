import { useEffect, useState } from "react";

import { useApiLoadingStore } from "../state/api-loading-store";

export function useApiLoading() {
  return useApiLoadingStore((state) => state.isLoading);
}

export function useActiveRequestCount() {
  return useApiLoadingStore((state) => state.activeRequests);
}
