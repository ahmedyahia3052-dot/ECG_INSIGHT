import { create } from "zustand";

type AppUiState = {
  activeRoute: string | null;
  lastNavigationAt: string | null;
  setActiveRoute: (route: string) => void;
};

export const useAppStore = create<AppUiState>((set) => ({
  activeRoute: null,
  lastNavigationAt: null,
  setActiveRoute: (route) =>
    set({
      activeRoute: route,
      lastNavigationAt: new Date().toISOString(),
    }),
}));

export { useApiLoadingStore, trackApiLoading } from "@/services/foundation/state/api-loading-store";
export { useDashboardStore } from "@/context/DashboardStore";
export { queryKeys } from "./query-keys";
