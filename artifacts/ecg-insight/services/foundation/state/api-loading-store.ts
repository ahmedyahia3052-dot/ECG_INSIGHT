import { create } from "zustand";

interface ApiLoadingState {
  activeRequests: number;
  decrement: () => void;
  increment: () => void;
  isLoading: boolean;
  reset: () => void;
}

export const useApiLoadingStore = create<ApiLoadingState>((set) => ({
  activeRequests: 0,
  decrement: () =>
    set((state) => {
      const activeRequests = Math.max(0, state.activeRequests - 1);
      return { activeRequests, isLoading: activeRequests > 0 };
    }),
  increment: () =>
    set((state) => ({
      activeRequests: state.activeRequests + 1,
      isLoading: true,
    })),
  isLoading: false,
  reset: () => set({ activeRequests: 0, isLoading: false }),
}));

export function trackApiLoading<T>(operation: () => Promise<T>): Promise<T> {
  useApiLoadingStore.getState().increment();
  return operation().finally(() => {
    useApiLoadingStore.getState().decrement();
  });
}
