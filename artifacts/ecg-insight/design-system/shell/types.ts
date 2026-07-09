import type { ReactNode, RefObject } from "react";
import type { TextInput } from "react-native";

import type { AppNavItem } from "@/types/navigation";
import type { NotificationRecord } from "@/services/collaboration";
import type { GlobalSearchResult } from "@/services/search";

export type ShellPageMeta = { subtitle: string; title: string };

export type ShellUser = {
  avatarInitials?: string;
  name?: string;
  role?: string;
};

export type BoltAppShellProps = {
  breadcrumb: string;
  children: ReactNode;
  closeDrawer: () => void;
  closeNotificationCenter: () => void;
  criticalCount: number;
  debouncedSearch: string;
  drawerOpen: boolean;
  expandedNotificationId: string | null;
  filteredNotifications: NotificationRecord[];
  focusSearch: (focused: boolean) => void;
  hideSidebar: boolean;
  isFullBleedWorkspace: boolean;
  isMobile: boolean;
  navItems: AppNavItem[];
  notificationFilter: "all" | "critical" | "license" | "system" | "unread";
  notificationOpen: boolean;
  notificationQueryError: boolean;
  notificationQueryLoading: boolean;
  notificationQueryRefetching: boolean;
  notificationSearch: string;
  notificationsTotal: number;
  onArchiveNotification: (id: string) => void;
  onLogout: () => void;
  onMarkAllNotificationsRead: () => void;
  onMarkNotificationRead: (id: string) => void;
  onNavigate: (href: string) => void;
  onNotificationExpand: (id: string | null) => void;
  onOpenNotification: (notification: NotificationRecord) => void;
  onOpenSearchResult: (result: GlobalSearchResult) => void;
  onRefetchNotifications: () => void;
  onRememberSearch: (value: string) => void;
  onSearchTextChange: (value: string) => void;
  onSetNotificationFilter: (filter: "all" | "critical" | "license" | "system" | "unread") => void;
  onSetNotificationSearch: (value: string) => void;
  openDrawer: () => void;
  pageMeta: ShellPageMeta;
  pathname: string;
  readAllPending: boolean;
  recentSearches: string[];
  searchFocused: boolean;
  searchInputRef: RefObject<TextInput | null>;
  searchQueryError: boolean;
  searchQueryLoading: boolean;
  searchResults: GlobalSearchResult[];
  searchText: string;
  showSearchPanel: boolean;
  sidebarCollapsed: boolean;
  sidebarCompact: boolean;
  toggleNotificationCenter: () => void;
  toggleSidebarCollapsed: () => void;
  unreadCount: number;
  user: ShellUser | null;
};
