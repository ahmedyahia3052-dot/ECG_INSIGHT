import { create } from "zustand";

type NotificationFilter = "all" | "critical" | "license" | "system" | "unread";

type AssistantSize = {
  height: number;
  width: number;
};

type AssistantPosition = {
  bottom: number;
  right: number;
};

interface DashboardState {
  assistantFullscreen: boolean;
  assistantMinimized: boolean;
  assistantOpen: boolean;
  assistantPosition: AssistantPosition;
  assistantSize: AssistantSize;
  debouncedSearch: string;
  drawerOpen: boolean;
  notificationFilter: NotificationFilter;
  notificationOpen: boolean;
  notificationSearch: string;
  recentSearches: string[];
  searchFocused: boolean;
  searchText: string;
  sidebarCollapsed: boolean;
  closeAssistant: () => void;
  closeDrawer: () => void;
  closeNotificationCenter: () => void;
  focusSearch: (focused: boolean) => void;
  hydrateDashboardState: () => void;
  openAssistant: () => void;
  openDrawer: () => void;
  rememberSearch: (query: string) => void;
  resetSearch: () => void;
  setAssistantFullscreen: (fullscreen: boolean) => void;
  setAssistantMinimized: (minimized: boolean) => void;
  setAssistantPosition: (position: AssistantPosition) => void;
  setAssistantSize: (size: AssistantSize) => void;
  setDebouncedSearch: (query: string) => void;
  setNotificationFilter: (filter: NotificationFilter) => void;
  setNotificationSearch: (query: string) => void;
  setRecentSearches: (queries: string[]) => void;
  setSearchText: (query: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleAssistant: () => void;
  toggleAssistantFullscreen: () => void;
  toggleAssistantMinimized: () => void;
  toggleNotificationCenter: () => void;
  toggleSidebarCollapsed: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  assistantFullscreen: false,
  assistantMinimized: false,
  assistantOpen: false,
  assistantPosition: { bottom: 24, right: 24 },
  assistantSize: { height: 420, width: 320 },
  debouncedSearch: "",
  drawerOpen: false,
  notificationFilter: "all",
  notificationOpen: false,
  notificationSearch: "",
  recentSearches: [],
  searchFocused: false,
  searchText: "",
  sidebarCollapsed: false,
  closeAssistant: () => set({ assistantOpen: false }),
  closeDrawer: () => set({ drawerOpen: false }),
  closeNotificationCenter: () => set({ notificationOpen: false }),
  focusSearch: (focused) => set({ searchFocused: focused }),
  hydrateDashboardState: () => set((state) => {
    if (typeof window === "undefined") return state;
    try {
      const raw = window.localStorage.getItem("ecg-insight:dashboard-layout");
      if (!raw) return state;
      const parsed = JSON.parse(raw) as Partial<Pick<DashboardState, "assistantPosition" | "assistantSize" | "sidebarCollapsed">>;
      return {
        assistantPosition: parsed.assistantPosition ?? state.assistantPosition,
        assistantSize: parsed.assistantSize ?? state.assistantSize,
        sidebarCollapsed: parsed.sidebarCollapsed ?? state.sidebarCollapsed,
      };
    } catch {
      return state;
    }
  }),
  openAssistant: () => set({ assistantMinimized: false, assistantOpen: true }),
  openDrawer: () => set({ drawerOpen: true }),
  rememberSearch: (query) => set((state) => {
    const normalized = query.trim();
    if (!normalized) return state;
    const recentSearches = [normalized, ...state.recentSearches.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 6);
    if (typeof window !== "undefined") window.localStorage.setItem("ecg-insight:recent-searches", JSON.stringify(recentSearches));
    return { recentSearches };
  }),
  resetSearch: () => set({ debouncedSearch: "", searchFocused: false, searchText: "" }),
  setAssistantFullscreen: (assistantFullscreen) => set({ assistantFullscreen }),
  setAssistantMinimized: (assistantMinimized) => set({ assistantMinimized }),
  setAssistantPosition: (assistantPosition) => set((state) => {
    persistLayout({ assistantPosition, assistantSize: state.assistantSize, sidebarCollapsed: state.sidebarCollapsed });
    return { assistantPosition };
  }),
  setAssistantSize: (assistantSize) => set((state) => {
    persistLayout({ assistantPosition: state.assistantPosition, assistantSize, sidebarCollapsed: state.sidebarCollapsed });
    return { assistantSize };
  }),
  setDebouncedSearch: (debouncedSearch) => set({ debouncedSearch }),
  setNotificationFilter: (notificationFilter) => set({ notificationFilter }),
  setNotificationSearch: (notificationSearch) => set({ notificationSearch }),
  setRecentSearches: (recentSearches) => set({ recentSearches: recentSearches.slice(0, 6) }),
  setSearchText: (searchText) => set({ searchText }),
  setSidebarCollapsed: (sidebarCollapsed) => set((state) => {
    persistLayout({ assistantPosition: state.assistantPosition, assistantSize: state.assistantSize, sidebarCollapsed });
    return { sidebarCollapsed };
  }),
  toggleAssistant: () => set((state) => ({ assistantOpen: !state.assistantOpen })),
  toggleAssistantFullscreen: () => set((state) => ({ assistantFullscreen: !state.assistantFullscreen })),
  toggleAssistantMinimized: () => set((state) => ({ assistantMinimized: !state.assistantMinimized })),
  toggleNotificationCenter: () => set((state) => ({ notificationOpen: !state.notificationOpen })),
  toggleSidebarCollapsed: () => set((state) => {
    const sidebarCollapsed = !state.sidebarCollapsed;
    persistLayout({ assistantPosition: state.assistantPosition, assistantSize: state.assistantSize, sidebarCollapsed });
    return { sidebarCollapsed };
  }),
}));

function persistLayout(value: { assistantPosition: AssistantPosition; assistantSize: AssistantSize; sidebarCollapsed: boolean }) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("ecg-insight:dashboard-layout", JSON.stringify(value));
}

export type { AssistantSize, NotificationFilter };
