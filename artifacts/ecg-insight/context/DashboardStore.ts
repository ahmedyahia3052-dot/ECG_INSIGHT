import { create } from "zustand";

type NotificationFilter = "ai" | "all" | "critical" | "license" | "system" | "unread";

type AssistantPosition = {
  bottom: number;
  right: number;
};

interface DashboardState {
  assistantFullscreen: boolean;
  assistantMinimized: boolean;
  assistantOpen: boolean;
  assistantPosition: AssistantPosition;
  debouncedSearch: string;
  drawerOpen: boolean;
  notificationFilter: NotificationFilter;
  notificationOpen: boolean;
  recentSearches: string[];
  searchFocused: boolean;
  searchText: string;
  sidebarCollapsed: boolean;
  closeAssistant: () => void;
  closeDrawer: () => void;
  closeNotificationCenter: () => void;
  focusSearch: (focused: boolean) => void;
  openAssistant: () => void;
  openDrawer: () => void;
  rememberSearch: (query: string) => void;
  resetSearch: () => void;
  setAssistantFullscreen: (fullscreen: boolean) => void;
  setAssistantMinimized: (minimized: boolean) => void;
  setAssistantPosition: (position: AssistantPosition) => void;
  setDebouncedSearch: (query: string) => void;
  setNotificationFilter: (filter: NotificationFilter) => void;
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
  debouncedSearch: "",
  drawerOpen: false,
  notificationFilter: "all",
  notificationOpen: false,
  recentSearches: [],
  searchFocused: false,
  searchText: "",
  sidebarCollapsed: false,
  closeAssistant: () => set({ assistantOpen: false }),
  closeDrawer: () => set({ drawerOpen: false }),
  closeNotificationCenter: () => set({ notificationOpen: false }),
  focusSearch: (focused) => set({ searchFocused: focused }),
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
  setAssistantPosition: (assistantPosition) => set({ assistantPosition }),
  setDebouncedSearch: (debouncedSearch) => set({ debouncedSearch }),
  setNotificationFilter: (notificationFilter) => set({ notificationFilter }),
  setRecentSearches: (recentSearches) => set({ recentSearches: recentSearches.slice(0, 6) }),
  setSearchText: (searchText) => set({ searchText }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  toggleAssistant: () => set((state) => ({ assistantOpen: !state.assistantOpen })),
  toggleAssistantFullscreen: () => set((state) => ({ assistantFullscreen: !state.assistantFullscreen })),
  toggleAssistantMinimized: () => set((state) => ({ assistantMinimized: !state.assistantMinimized })),
  toggleNotificationCenter: () => set((state) => ({ notificationOpen: !state.notificationOpen })),
  toggleSidebarCollapsed: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));

export type { NotificationFilter };
