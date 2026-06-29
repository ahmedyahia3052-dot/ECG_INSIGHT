import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, Slot, usePathname, useRouter } from "expo-router";
import React, { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  PanResponder,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useDashboardStore } from "@/context/DashboardStore";
import { MedicalAICopilot } from "@/components/copilot/MedicalAICopilot";
import { deleteNotification, listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRecord } from "@/services/collaboration";
import { globalSearch, type GlobalSearchResult } from "@/services/search";
import { medicalTheme } from "@/theme/medicalTheme";

export { medicalTheme };

type NavItem = {
  group: "CLINICAL" | "DEVELOPER" | "WORKSPACE";
  href: string;
  icon: keyof typeof Feather.glyphMap;
  minRole?: "admin" | "doctor" | "student" | "super_admin";
  ownerOnly?: boolean;
  title: string;
};

const NAV_ITEMS: NavItem[] = [
  { group: "CLINICAL", href: "/dashboard", icon: "grid", title: "Dashboard" },
  { group: "CLINICAL", href: "/ecg-analysis", icon: "activity", title: "ECG Analysis" },
  { group: "CLINICAL", href: "/ecg-cases", icon: "clipboard", title: "ECG Cases" },
  { group: "CLINICAL", href: "/upload-ecg", icon: "upload-cloud", title: "Upload ECG" },
  { group: "CLINICAL", href: "/patients", icon: "users", title: "Patients" },
  { group: "CLINICAL", href: "/reports", icon: "file-text", title: "Reports" },
  { group: "WORKSPACE", href: "/analytics", icon: "bar-chart-2", title: "Analytics" },
  { group: "WORKSPACE", href: "/team-management", icon: "briefcase", minRole: "admin", title: "Organizations" },
  { group: "WORKSPACE", href: "/team-management", icon: "user-plus", minRole: "admin", title: "Employees" },
  { group: "WORKSPACE", href: "/notifications", icon: "bell", title: "Notifications" },
  { group: "WORKSPACE", href: "/support", icon: "life-buoy", title: "Support" },
  { group: "WORKSPACE", href: "/settings", icon: "settings", title: "Settings" },
  { group: "WORKSPACE", href: "/profile", icon: "user", title: "Profile" },
  { group: "DEVELOPER", href: "/admin-dashboard", icon: "shield", minRole: "admin", title: "Admin Controls" },
  { group: "DEVELOPER", href: "/billing-subscription", icon: "credit-card", minRole: "admin", title: "Subscription Controls" },
  { group: "DEVELOPER", href: "/owner/licenses", icon: "award", minRole: "super_admin", ownerOnly: true, title: "License Controls" },
];

const PAGE_TITLES: Record<string, { subtitle: string; title: string }> = {
  "/analytics": { subtitle: "Enterprise BI, trends, workload, and quality signals.", title: "Analytics" },
  "/admin-dashboard": { subtitle: "Administrative overview, users, subscriptions, and platform health.", title: "Admin Dashboard" },
  "/billing-subscription": { subtitle: "Subscription plan, quota, billing, and license status.", title: "Billing & Subscription" },
  "/support": { subtitle: "Contact support and submit operational requests.", title: "Support" },
  "/dashboard": { subtitle: "Executive medical command center for ECG operations.", title: "Dashboard" },
  "/ecg-analysis": { subtitle: "Review cases, AI findings, validation, and report generation.", title: "ECG Analysis" },
  "/ecg-cases": { subtitle: "Enterprise ECG case workflow, review, approval, and reports.", title: "ECG Cases" },
  "/notifications": { subtitle: "Clinical alerts, workflow events, and collaboration updates.", title: "Notifications" },
  "/owner/licenses": { subtitle: "Hidden owner-only license grants, subscription control, and lifetime access.", title: "License Management" },
  "/patients": { subtitle: "Enterprise patient registry, risk profile, and ECG history.", title: "Patients" },
  "/profile": { subtitle: "Account, role, institution, and secure session details.", title: "Profile" },
  "/reports": { subtitle: "Draft, review, finalize, sign, export, and email reports.", title: "Reports" },
  "/settings": { subtitle: "Workspace preferences, accessibility, and clinical defaults.", title: "Settings" },
  "/team-management": { subtitle: "Manage users, roles, access, and clinical workspace membership.", title: "Team Management" },
  "/upload-ecg": { subtitle: "Capture, upload, preview, analyze, validate, and save ECG records.", title: "Upload ECG" },
};

function roleRank(role?: string) {
  if (role === "super_admin") return 4;
  if (role === "admin") return 3;
  if (role === "doctor") return 2;
  if (role === "student") return 1;
  return 0;
}

function pageMeta(pathname: string) {
  const exact = PAGE_TITLES[pathname];
  if (exact) return exact;
  if (pathname.startsWith("/patients/")) return { title: "Patient Profile", subtitle: "Demographics, ECG history, documents, and timeline." };
  if (pathname.startsWith("/ecg-cases/")) return { title: "ECG Case", subtitle: "Viewer, measurements, AI findings, doctor review, and report workflow." };
  if (pathname.startsWith("/reports/")) return { title: "Report Detail", subtitle: "Clinical report review, finalization, signing, and export." };
  return { title: "ECG Insight", subtitle: "Enterprise Medical AI Platform." };
}

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullScreenLoader label="Restoring secure session..." />;
  if (!isAuthenticated) return <Redirect href="/login" />;
  return (
    <EnterpriseShell>
      <Slot />
    </EnterpriseShell>
  );
}

export function EnterpriseShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { authToken, logout, user } = useAuth();
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);
  const notificationEntrance = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const {
    closeDrawer,
    closeNotificationCenter,
    debouncedSearch,
    drawerOpen,
    focusSearch,
    hydrateDashboardState,
    notificationFilter,
    notificationOpen,
    notificationSearch,
    openDrawer,
    recentSearches,
    rememberSearch,
    resetSearch,
    searchFocused,
    searchText,
    setDebouncedSearch,
    setNotificationFilter,
    setNotificationSearch,
    setRecentSearches,
    setSearchText,
    sidebarCollapsed,
    toggleNotificationCenter,
    toggleSidebarCollapsed,
  } = useDashboardStore();
  const isMobile = width < 860;
  const sidebarCompact = !isMobile && sidebarCollapsed;
  const meta = pageMeta(pathname);
  const navItems = useMemo(() => NAV_ITEMS.filter((item) => {
    if (item.ownerOnly && user?.email?.toLowerCase() !== "ahmedyahia3052@gmail.com") return false;
    return !item.minRole || roleRank(user?.role) >= roleRank(item.minRole);
  }), [user?.isOwner, user?.protectedOwner, user?.role]);
  const notificationQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: () => {
      const params = new URLSearchParams({ pageSize: "50" });
      if (notificationSearch.trim()) params.set("q", notificationSearch.trim());
      return listNotifications(authToken!.token, params);
    },
    queryKey: ["enterprise-shell-notifications", authToken?.token, notificationSearch],
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
    retry: false,
  });
  const searchQuery = useQuery({
    enabled: !!authToken?.token && debouncedSearch.trim().length >= 2,
    queryFn: () => globalSearch(authToken!.token, debouncedSearch.trim()),
    queryKey: ["global-search", authToken?.token, debouncedSearch.trim()],
    retry: false,
  });
  const notifications = notificationQuery.data?.notifications ?? [];
  const unreadCount = notifications.filter((item) => !item.read).length;
  const criticalCount = notifications.filter((item) => isCriticalNotification(item)).length;
  const filteredNotifications = useMemo(() => notifications.filter((item) => notificationMatchesFilter(item, notificationFilter)), [notificationFilter, notifications]);
  const searchResults = searchQuery.data?.results ?? [];
  const showSearchPanel = searchFocused && (searchText.trim().length > 0 || recentSearches.length > 0);
  const invalidateNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: ["enterprise-shell-notifications"] });
    void queryClient.invalidateQueries({ queryKey: ["enterprise-notifications", authToken?.token] });
    void queryClient.invalidateQueries({ queryKey: ["enterprise-dashboard-notifications", authToken?.token] });
  };
  const readNotificationMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(authToken!.token, id),
    onSuccess: invalidateNotifications,
  });
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: string) => deleteNotification(authToken!.token, id),
    onSuccess: invalidateNotifications,
  });
  const readAllNotificationMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(authToken!.token),
    onSuccess: invalidateNotifications,
  });

  const navigate = (href: string) => {
    closeDrawer();
    closeNotificationCenter();
    focusSearch(false);
    router.push(href as never);
  };

  const openSearchResult = (result: GlobalSearchResult) => {
    rememberSearch(searchText || result.title);
    resetSearch();
    navigate(result.url);
  };

  const openNotification = (notification: NotificationRecord) => {
    readNotificationMutation.mutate(notification.id);
    navigate(notification.actionUrl ?? (notification.caseId ? `/ecg-cases/${notification.caseId}` : notification.patientId ? `/patients/${notification.patientId}` : notification.reportId ? `/reports/${notification.reportId}` : "/notifications"));
  };

  useEffect(() => {
    hydrateDashboardState();
  }, [hydrateDashboardState]);

  useEffect(() => {
    if (!notificationOpen || typeof document === "undefined") return undefined;
    notificationEntrance.setValue(0);
    Animated.parallel([
      Animated.timing(notificationEntrance, { duration: 180, easing: Easing.out(Easing.quad), toValue: 1, useNativeDriver: true }),
      Animated.spring(notificationEntrance, { damping: 18, stiffness: 190, toValue: 1, useNativeDriver: true }),
    ]).start();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNotificationCenter();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closeNotificationCenter, notificationEntrance, notificationOpen]);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchText.trim()), 260);
    return () => clearTimeout(timeout);
  }, [searchText]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("ecg-insight:recent-searches");
      if (stored) setRecentSearches(JSON.parse(stored) as string[]);
    } catch {
      setRecentSearches([]);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        focusSearch(true);
      }
      if (event.key === "Escape") focusSearch(false);
    };
    document.addEventListener("keydown", handleSearchShortcut);
    return () => document.removeEventListener("keydown", handleSearchShortcut);
  }, [focusSearch]);

  const sidebar = (
    <View style={[styles.sidebar, sidebarCompact && styles.sidebarCollapsed, isMobile && styles.drawer, { paddingTop: isMobile ? insets.top + 18 : 24 }]}>
      <View style={[styles.brandRow, sidebarCompact && styles.brandRowCollapsed]}>
        <View style={styles.logo}><Feather name="activity" size={20} color={medicalTheme.background} /></View>
        {!sidebarCompact ? (
          <View>
            <Text style={styles.brand}>ECG Insight</Text>
            <Text style={styles.brandSub}>Medical AI Platform</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.userCard, sidebarCompact && styles.userCardCollapsed]}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.avatarInitials ?? "DR"}</Text></View>
        {!sidebarCompact ? (
          <View style={styles.userText}>
            <Text numberOfLines={1} style={styles.userName}>{user?.name ?? "Clinical User"}</Text>
            <Text numberOfLines={1} style={styles.userRole}>{roleLabel(user?.role)} • Online</Text>
          </View>
        ) : null}
      </View>

      {!isMobile ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onPress={toggleSidebarCollapsed}
          style={styles.collapseButton}
        >
          <Feather name={sidebarCollapsed ? "chevrons-right" : "chevrons-left"} size={17} color={medicalTheme.primary} />
          {!sidebarCompact ? <Text style={styles.collapseText}>Collapse</Text> : null}
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={[styles.navScroll, sidebarCompact && styles.navScrollCollapsed]} showsVerticalScrollIndicator style={styles.navScrollArea}>
        {(["CLINICAL", "WORKSPACE", "DEVELOPER"] as const).map((group) => {
          const groupItems = navItems.filter((item) => item.group === group);
          if (!groupItems.length) return null;
          return (
            <View key={group} style={[styles.navGroup, sidebarCompact && styles.navGroupCollapsed]}>
              {!sidebarCompact ? <Text style={styles.navGroupTitle}>{group}</Text> : null}
              {groupItems.map((item) => {
                const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
                const hovered = hoveredNav === item.href;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.title}`}
                    key={`${item.group}-${item.href}-${item.title}`}
                    onHoverIn={() => setHoveredNav(item.href)}
                    onHoverOut={() => setHoveredNav(null)}
                    onPress={() => navigate(item.href)}
                    style={[styles.navItem, sidebarCompact && styles.navItemCollapsed, hovered && styles.navItemHover, active && styles.navItemActive]}
                  >
                    {active ? <View style={styles.activeRail} /> : null}
                    <View style={[styles.navIconWrap, (active || hovered) && styles.navIconWrapActive]}>
                      <Feather name={item.icon} size={18} color={active || hovered ? medicalTheme.primary : medicalTheme.muted} />
                    </View>
                    {!sidebarCompact ? <Text style={[styles.navText, active && styles.navTextActive]}>{item.title}</Text> : null}
                    {item.href === "/notifications" && unreadCount ? <View style={styles.badgeDot} /> : null}
                    {sidebarCompact && hovered ? <View style={styles.tooltip}><Text style={styles.tooltipText}>{item.title}</Text></View> : null}
                  </Pressable>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Log out"
        onPress={() => void logout().then(() => router.replace("/login" as never))}
        style={[styles.logoutButton, sidebarCompact && styles.logoutButtonCollapsed]}
      >
        <Feather name="log-out" size={18} color={medicalTheme.critical} />
        {!sidebarCompact ? <Text style={styles.logoutText}>Logout</Text> : null}
      </Pressable>
    </View>
  );

  return (
    <View style={styles.shellRoot}>
      {!isMobile ? sidebar : null}
      {isMobile && drawerOpen ? (
        <View style={styles.mobileOverlay}>
          <Pressable style={styles.backdrop} onPress={closeDrawer} />
          {sidebar}
        </View>
      ) : null}
      <View style={styles.contentRoot}>
        <View style={[styles.topbar, { paddingTop: isMobile ? insets.top + 12 : 18 }]}>
          {isMobile ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Open navigation" onPress={openDrawer} style={styles.iconButton}>
              <Feather name="menu" size={20} color={medicalTheme.text} />
            </Pressable>
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={styles.breadcrumb}>ECG Insight / {meta.title}</Text>
            <Text style={styles.pageTitle}>{meta.title}</Text>
            <Text style={styles.pageSubtitle}>{meta.subtitle}</Text>
          </View>
          <View style={styles.topActions}>
            <View style={styles.searchWrap}>
              <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
                <Feather name="search" size={16} color={medicalTheme.muted} />
                <TextInput
                  accessibilityLabel="Global search"
                  onBlur={() => setTimeout(() => focusSearch(false), 140)}
                  onChangeText={setSearchText}
                  onFocus={() => focusSearch(true)}
                  onSubmitEditing={() => {
                    const firstResult = searchResults[0];
                    if (firstResult) openSearchResult(firstResult);
                    else rememberSearch(searchText);
                  }}
                  placeholder="Search patient, ECG ID, report, physician..."
                  placeholderTextColor={medicalTheme.muted}
                  ref={searchInputRef}
                  returnKeyType="search"
                  style={styles.searchInput}
                  value={searchText}
                />
                {searchText ? (
                  <Pressable accessibilityLabel="Clear search" onPress={() => setSearchText("")}>
                    <Feather name="x" size={15} color={medicalTheme.muted} />
                  </Pressable>
                ) : <Text style={styles.shortcutHint}>Ctrl+K</Text>}
              </View>
              {showSearchPanel ? (
                <Card style={styles.searchPanel}>
                  {searchText.trim().length < 2 ? (
                    <>
                      <Text style={styles.searchPanelTitle}>Recent searches</Text>
                      {recentSearches.length ? recentSearches.map((item) => (
                        <Pressable key={item} onPress={() => setSearchText(item)} style={styles.searchRecentRow}>
                          <Feather name="clock" size={14} color={medicalTheme.primary} />
                          <Text style={styles.searchResultTitle}>{item}</Text>
                        </Pressable>
                      )) : <Text style={styles.searchEmptyText}>Start typing to search patients, ECG cases, reports, organizations, and doctors.</Text>}
                    </>
                  ) : searchQuery.isLoading ? (
                    <Text style={styles.searchEmptyText}>Searching clinical workspace...</Text>
                  ) : searchQuery.isError ? (
                    <Text style={styles.searchErrorText}>Search is temporarily unavailable. Please try again.</Text>
                  ) : searchResults.length ? (
                    searchResults.map((result) => (
                      <Pressable key={`${result.type}-${result.id}`} onPress={() => openSearchResult(result)} style={styles.searchResultRow}>
                        <View style={styles.searchResultIcon}>
                          <Feather name={searchResultIcon(result.type)} size={15} color={medicalTheme.primary} />
                        </View>
                        <View style={styles.searchResultText}>
                          <Text numberOfLines={1} style={styles.searchResultTitle}>{result.title}</Text>
                          <Text numberOfLines={1} style={styles.searchResultSubtitle}>{searchResultTypeLabel(result.type)}{result.meta ? ` • ${result.meta}` : ""}{result.subtitle ? ` • ${result.subtitle}` : ""}</Text>
                        </View>
                      </Pressable>
                    ))
                  ) : <Text style={styles.searchEmptyText}>No matching clinical records found.</Text>}
                </Card>
              ) : null}
            </View>
            <Pressable accessibilityLabel="Notifications" accessibilityRole="button" onPress={toggleNotificationCenter} style={styles.iconButton}>
              <Feather name="bell" size={18} color={medicalTheme.text} />
              {unreadCount ? <View style={styles.countBadge}><Text style={styles.countBadgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text></View> : null}
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.pageScroll} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
      {notificationOpen ? (
        <View style={styles.notificationOverlay} pointerEvents="box-none">
          <Pressable style={styles.notificationBackdrop} onPress={closeNotificationCenter} />
          <Animated.View
            style={[
              styles.card,
              styles.notificationDrawer,
              isMobile && styles.notificationDrawerMobile,
              {
                opacity: notificationEntrance,
                transform: [
                  { translateY: notificationEntrance.interpolate({ inputRange: [0, 1], outputRange: [isMobile ? 280 : -14, 0] }) },
                  { scale: notificationEntrance.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
                ],
              },
            ]}
          >
            <View style={styles.sheetHandle} />
            <SectionHeader
              title="Alerts"
              subtitle="Premium haptic-ready notification sheet with live clinical, system, subscription, and workflow alerts."
              action={<PrimaryButton disabled={!unreadCount || readAllNotificationMutation.isPending} label="Read All" onPress={() => readAllNotificationMutation.mutate()} variant="outline" />}
            />
            <View style={styles.notificationSearchBox}>
              <Feather name="search" size={15} color={medicalTheme.muted} />
              <TextInput
                accessibilityLabel="Search notifications"
                onChangeText={setNotificationSearch}
                placeholder="Search notifications..."
                placeholderTextColor={medicalTheme.muted}
                style={styles.notificationSearchInput}
                value={notificationSearch}
              />
            </View>
            <View style={styles.notificationCounterRow}>
              <View style={styles.notificationCounterCard}>
                <Text style={[styles.notificationCounterValue, { color: medicalTheme.critical }]}>{criticalCount}</Text>
                <Text style={styles.notificationCounterLabel}>Critical</Text>
              </View>
              <View style={styles.notificationCounterCard}>
                <Text style={[styles.notificationCounterValue, { color: medicalTheme.primary }]}>{unreadCount}</Text>
                <Text style={styles.notificationCounterLabel}>Unread</Text>
              </View>
              <View style={styles.notificationCounterCard}>
                <Text style={[styles.notificationCounterValue, { color: medicalTheme.success }]}>{notificationQuery.data?.total ?? notifications.length}</Text>
                <Text style={styles.notificationCounterLabel}>Total</Text>
              </View>
            </View>
            <View style={styles.notificationFilters}>
              {(["all", "unread", "critical", "system", "license"] as const).map((filter) => (
                <PrimaryButton key={filter} label={notificationFilterLabel(filter)} onPress={() => setNotificationFilter(filter)} variant={notificationFilter === filter ? "primary" : "outline"} />
              ))}
            </View>
            <ScrollView
              refreshControl={<RefreshControl colors={[medicalTheme.primary]} onRefresh={() => void notificationQuery.refetch()} refreshing={notificationQuery.isRefetching} tintColor={medicalTheme.primary} />}
              style={styles.notificationList}
              showsVerticalScrollIndicator
            >
              {filteredNotifications.length ? filteredNotifications.map((notification) => (
                <PremiumNotificationCard
                  expanded={expandedNotificationId === notification.id}
                  key={notification.id}
                  notification={notification}
                  onArchive={() => deleteNotificationMutation.mutate(notification.id)}
                  onExpand={() => setExpandedNotificationId(expandedNotificationId === notification.id ? null : notification.id)}
                  onMarkRead={() => readNotificationMutation.mutate(notification.id)}
                  onOpen={() => openNotification(notification)}
                />
              )) : (
                <EmptyState title={notificationQuery.isLoading ? "Loading alerts..." : "No critical alerts"} message={notificationQuery.isError ? "Unable to load live notifications. Please try again." : "STEMI alerts, urgent reviews, failed analyses, subscription notices, and system events will appear here."} />
              )}
            </ScrollView>
            <PrimaryButton label="Open Notification History" onPress={() => navigate("/notifications")} variant="outline" />
          </Animated.View>
        </View>
      ) : null}
      <MedicalAICopilot />
    </View>
  );
}

function PremiumNotificationCard({
  expanded,
  notification,
  onArchive,
  onExpand,
  onMarkRead,
  onOpen,
}: {
  expanded: boolean;
  notification: NotificationRecord;
  onArchive: () => void;
  onExpand: () => void;
  onMarkRead: () => void;
  onOpen: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 14,
    onPanResponderMove: Animated.event([null, { dx: translateX }], { useNativeDriver: false }),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx < -72) onMarkRead();
      if (gesture.dx > 72) onArchive();
      Animated.spring(translateX, { damping: 18, stiffness: 220, toValue: 0, useNativeDriver: true }).start();
    },
  }), [onArchive, onMarkRead, translateX]);
  const critical = isCriticalNotification(notification);
  const category = classifyNotification(notification);

  const pressIn = () => {
    hapticReadyInteraction("notification-card-press");
    Animated.spring(scale, { damping: 14, stiffness: 260, toValue: 0.985, useNativeDriver: true }).start();
  };
  const pressOut = () => Animated.spring(scale, { damping: 14, stiffness: 260, toValue: 1, useNativeDriver: true }).start();

  return (
    <View style={styles.swipeFrame}>
      <View style={styles.swipeActionRail}>
        <Text style={[styles.swipeActionText, { color: medicalTheme.success }]}>Archive</Text>
        <Text style={[styles.swipeActionText, { color: medicalTheme.primary }]}>Mark read</Text>
      </View>
      <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX }, { scale }] }}>
        <Pressable
          accessibilityRole="button"
          onLongPress={onExpand}
          onPress={onOpen}
          onPressIn={pressIn}
          onPressOut={pressOut}
          style={[styles.notificationCard, critical && styles.notificationCardCritical]}
        >
          <View style={styles.notificationCardHeader}>
            <View style={styles.notificationTitleRow}>
              <View style={[styles.notificationIcon, critical && styles.notificationIconCritical]}>
                {critical ? <View style={styles.criticalPulse} /> : null}
                <Feather name={notificationIcon(notification)} size={16} color={notificationColor(notification)} />
              </View>
              <View style={styles.notificationTextWrap}>
                <Text numberOfLines={1} style={styles.notificationTitle}>{notification.title}</Text>
                <Text style={styles.notificationMeta}>{category} • {formatDate(notification.timestamp)}</Text>
              </View>
            </View>
            <Badge label={notificationStatusLabel(notification)} tone={critical ? "critical" : notification.read ? "muted" : "primary"} />
          </View>
          <Text numberOfLines={expanded ? undefined : 3} style={styles.notificationMessage}>{notification.message}</Text>
          {expanded ? <Text style={styles.notificationHint}>Swipe left to mark read, swipe right to archive, long press to collapse.</Text> : null}
          <View style={styles.notificationActions}>
            {!notification.read ? <PrimaryButton label="Mark read" onPress={onMarkRead} variant="outline" /> : null}
            <PrimaryButton label="Open details" onPress={onOpen} variant="outline" />
            <PrimaryButton label="Archive" onPress={onArchive} variant="danger" />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function notificationMatchesFilter(notification: NotificationRecord, filter: "all" | "critical" | "license" | "system" | "unread") {
  const haystack = `${notification.type} ${notification.entityType ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  if (filter === "all") return true;
  if (filter === "unread") return !notification.read;
  if (filter === "critical") return isCriticalNotification(notification);
  if (filter === "license") return haystack.includes("license") || haystack.includes("subscription") || haystack.includes("billing");
  if (filter === "system") return haystack.includes("system") || haystack.includes("sync") || haystack.includes("failed");
  return haystack.includes(filter);
}

function notificationFilterLabel(filter: "all" | "critical" | "license" | "system" | "unread") {
  if (filter === "all") return "All";
  if (filter === "unread") return "Unread";
  if (filter === "critical") return "Critical";
  if (filter === "system") return "System";
  return "License";
}

function isCriticalNotification(notification: NotificationRecord) {
  const haystack = `${notification.type} ${notification.category ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  return haystack.includes("critical") || haystack.includes("stemi") || haystack.includes("urgent") || haystack.includes("failed");
}

function classifyNotification(notification: NotificationRecord) {
  const haystack = `${notification.type} ${notification.category ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  if (haystack.includes("stemi")) return "STEMI";
  if (haystack.includes("subscription") || haystack.includes("license") || haystack.includes("billing")) return "License";
  if (haystack.includes("system") || haystack.includes("sync") || haystack.includes("failed")) return "System";
  if (haystack.includes("urgent") || haystack.includes("review")) return "Urgent review";
  return "Clinical";
}

function notificationStatusLabel(notification: NotificationRecord) {
  if (isCriticalNotification(notification)) return "Critical";
  return notification.read ? "Read" : "Unread";
}

function searchResultIcon(type: GlobalSearchResult["type"]): keyof typeof Feather.glyphMap {
  if (type === "case") return "activity";
  if (type === "doctor") return "user-check";
  if (type === "employee") return "briefcase";
  if (type === "organization") return "briefcase";
  if (type === "report") return "file-text";
  return "users";
}

function searchResultTypeLabel(type: GlobalSearchResult["type"]) {
  if (type === "case") return "ECG Case";
  if (type === "doctor") return "Doctor";
  if (type === "employee") return "Employee";
  if (type === "organization") return "Organization";
  if (type === "report") return "Report";
  return "Patient";
}

function notificationIcon(notification: NotificationRecord): keyof typeof Feather.glyphMap {
  const haystack = `${notification.type} ${notification.entityType ?? ""} ${notification.title}`.toLowerCase();
  if (haystack.includes("critical")) return "alert-triangle";
  if (haystack.includes("license") || haystack.includes("subscription")) return "award";
  if (haystack.includes("system")) return "server";
  return "bell";
}

function notificationColor(notification: NotificationRecord) {
  if (notification.type === "critical") return medicalTheme.critical;
  if (notification.type === "warning") return medicalTheme.warning;
  if (notification.type === "success") return medicalTheme.success;
  return medicalTheme.primary;
}

function hapticReadyInteraction(_eventName: string) {
  // Central hook for native haptics when this shell is embedded in the mobile app.
}

export function FullScreenLoader({ label }: { label: string }) {
  return (
    <View style={styles.loaderScreen}>
      <ActivityIndicator color={medicalTheme.primary} size="large" />
      <Text style={styles.loaderText}>{label}</Text>
    </View>
  );
}

export function PageSection({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.section, style]}>{children}</View>;
}

export function Card({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionHeader({ action, subtitle, title }: { action?: ReactNode; subtitle?: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

export function StatCard({ icon, label, tone = "primary", value }: { icon: keyof typeof Feather.glyphMap; label: string; tone?: "critical" | "primary" | "success" | "warning"; value: string }) {
  const color = tone === "critical" ? medicalTheme.critical : tone === "success" ? medicalTheme.success : tone === "warning" ? medicalTheme.warning : medicalTheme.primary;
  return (
    <Card style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

export function Badge({ label, tone = "primary" }: { label: string; tone?: "critical" | "muted" | "primary" | "success" | "warning" }) {
  const color = tone === "critical" ? medicalTheme.critical : tone === "success" ? medicalTheme.success : tone === "warning" ? medicalTheme.warning : tone === "muted" ? medicalTheme.muted : medicalTheme.primary;
  return <Text style={[styles.badge, { backgroundColor: `${color}20`, borderColor: `${color}55`, color }]}>{label}</Text>;
}

export function EmptyState({ action, message, title }: { action?: ReactNode; message: string; title: string }) {
  return (
    <Card style={styles.emptyState}>
      <Feather name="inbox" size={30} color={medicalTheme.primary} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action}
    </Card>
  );
}

export function PrimaryButton({ disabled, icon, label, onPress, variant = "primary" }: { disabled?: boolean; icon?: keyof typeof Feather.glyphMap; label: string; onPress: () => void; variant?: "danger" | "outline" | "primary" }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, variant === "outline" && styles.buttonOutline, variant === "danger" && styles.buttonDanger, disabled && styles.buttonDisabled]}
    >
      {icon ? <Feather name={icon} size={16} color={variant === "outline" ? medicalTheme.primary : medicalTheme.background} /> : null}
      <Text style={[styles.buttonText, variant === "outline" && styles.buttonTextOutline]}>{label}</Text>
    </Pressable>
  );
}

type FieldProps = Omit<TextInputProps, "style"> & {
  containerStyle?: StyleProp<ViewStyle>;
  label: string;
};

export function Field({ containerStyle, label, ...props }: FieldProps) {
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={medicalTheme.muted} style={styles.fieldInput} {...props} />
    </View>
  );
}

export function roleLabel(role?: string) {
  if (role === "super_admin") return "Developer Super Admin";
  if (role === "admin") return "Admin";
  if (role === "doctor") return "Doctor";
  if (role === "student") return "Student";
  return "Clinical User";
}

export function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

export function patientDisplayName(patient: { firstName: string; lastName: string }) {
  return `${patient.firstName} ${patient.lastName}`.trim() || "Unnamed Patient";
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#123B4A", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  avatarText: { color: medicalTheme.primary, fontSize: 14, fontWeight: "800" },
  activeRail: { backgroundColor: medicalTheme.primary, borderRadius: 999, bottom: 8, left: 0, position: "absolute", top: 8, width: 3 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.62)" },
  badge: { alignSelf: "flex-start", borderRadius: 999, borderWidth: 1, fontSize: 11, fontWeight: "800", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5 },
  badgeDot: { backgroundColor: medicalTheme.critical, borderRadius: 99, height: 8, marginLeft: "auto", width: 8 },
  badgeDotTop: { backgroundColor: medicalTheme.critical, borderRadius: 99, height: 8, position: "absolute", right: 10, top: 9, width: 8 },
  brand: { color: medicalTheme.text, fontSize: 18, fontWeight: "900" },
  brandRow: { alignItems: "center", flexDirection: "row", gap: 12, paddingHorizontal: 18 },
  brandRowCollapsed: { justifyContent: "center", paddingHorizontal: 0 },
  brandSub: { color: medicalTheme.muted, fontSize: 10, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  button: { alignItems: "center", backgroundColor: medicalTheme.primary, borderRadius: 12, flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 44, paddingHorizontal: 14, paddingVertical: 11 },
  buttonDanger: { backgroundColor: medicalTheme.critical },
  buttonDisabled: { opacity: 0.45 },
  buttonOutline: { backgroundColor: "transparent", borderColor: medicalTheme.border, borderWidth: 1 },
  buttonText: { color: medicalTheme.background, fontSize: 13, fontWeight: "900" },
  buttonTextOutline: { color: medicalTheme.primary },
  card: { backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 18, borderWidth: 1, padding: 16 },
  contentRoot: { backgroundColor: medicalTheme.background, flex: 1, minWidth: 0 },
  countBadge: { alignItems: "center", backgroundColor: medicalTheme.critical, borderRadius: 999, minWidth: 18, paddingHorizontal: 4, position: "absolute", right: 5, top: 4 },
  countBadgeText: { color: "#FFFFFF", fontSize: 10, fontWeight: "900" },
  collapseButton: { alignItems: "center", alignSelf: "center", backgroundColor: "#0B2134", borderColor: "#1F7085", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 38, paddingHorizontal: 12 },
  collapseText: { color: medicalTheme.primary, fontSize: 12, fontWeight: "900" },
  criticalPulse: { backgroundColor: medicalTheme.critical, borderRadius: 999, height: 8, position: "absolute", right: 5, top: 5, width: 8 },
  drawer: { bottom: 0, left: 0, position: "absolute", top: 0, width: 318, zIndex: 10 },
  emptyMessage: { color: medicalTheme.muted, fontSize: 13, lineHeight: 19, maxWidth: 520, textAlign: "center" },
  emptyState: { alignItems: "center", gap: 10, paddingVertical: 30 },
  emptyTitle: { color: medicalTheme.text, fontSize: 17, fontWeight: "900" },
  fieldInput: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, color: medicalTheme.text, minHeight: 44, paddingHorizontal: 12 },
  fieldLabel: { color: medicalTheme.text, fontSize: 12, fontWeight: "800", marginBottom: 7 },
  fieldWrap: { gap: 2 },
  iconButton: { alignItems: "center", backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
  loaderScreen: { alignItems: "center", backgroundColor: medicalTheme.background, flex: 1, gap: 12, justifyContent: "center", padding: 24 },
  loaderText: { color: medicalTheme.text, fontSize: 14, fontWeight: "700" },
  logo: { alignItems: "center", backgroundColor: medicalTheme.primary, borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  logoutButton: { alignItems: "center", borderColor: medicalTheme.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 10, margin: 18, minHeight: 46, paddingHorizontal: 14 },
  logoutButtonCollapsed: { justifyContent: "center", marginHorizontal: 12, paddingHorizontal: 0 },
  logoutText: { color: medicalTheme.critical, fontSize: 13, fontWeight: "900" },
  mobileOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  navGroup: { gap: 8 },
  navGroupCollapsed: { alignItems: "center" },
  navGroupTitle: { color: medicalTheme.muted, fontSize: 11, fontWeight: "900", letterSpacing: 1.1, paddingHorizontal: 8 },
  navItem: { alignItems: "center", borderColor: "transparent", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 11, minHeight: 44, paddingHorizontal: 12 },
  navIconWrap: { alignItems: "center", borderRadius: 10, height: 30, justifyContent: "center", width: 30 },
  navIconWrapActive: { backgroundColor: "rgba(20,221,230,0.12)", shadowColor: medicalTheme.primary, shadowOpacity: 0.4, shadowRadius: 10 },
  navItemActive: { backgroundColor: "#0E3345", borderColor: "#1F7085", shadowColor: medicalTheme.primary, shadowOpacity: 0.18, shadowRadius: 14 },
  navItemCollapsed: { justifyContent: "center", paddingHorizontal: 0, width: 48 },
  navItemHover: { backgroundColor: "rgba(20,221,230,0.08)", borderColor: "rgba(20,221,230,0.22)" },
  navScroll: { gap: 18, padding: 18, paddingBottom: 6 },
  navScrollArea: { flex: 1 },
  navScrollCollapsed: { alignItems: "center", paddingHorizontal: 10 },
  navText: { color: medicalTheme.muted, flex: 1, fontSize: 14, fontWeight: "800" },
  navTextActive: { color: medicalTheme.text },
  notificationActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  notificationBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.34)" },
  notificationCard: { backgroundColor: "rgba(15,33,53,0.96)", borderColor: "rgba(148,163,184,0.22)", borderRadius: 20, borderWidth: 1, gap: 9, padding: 13, shadowColor: medicalTheme.primary, shadowOpacity: 0.08, shadowRadius: 16 },
  notificationCardCritical: { borderColor: `${medicalTheme.critical}99`, shadowColor: medicalTheme.critical, shadowOpacity: 0.22 },
  notificationCardHeader: { alignItems: "center", flexDirection: "row", gap: 10, justifyContent: "space-between" },
  notificationCounterCard: { alignItems: "center", backgroundColor: "rgba(15,33,53,0.72)", borderColor: "rgba(20,221,230,0.18)", borderRadius: 16, borderWidth: 1, flex: 1, gap: 3, minHeight: 72, padding: 10 },
  notificationCounterLabel: { color: medicalTheme.muted, fontSize: 10, fontWeight: "900", letterSpacing: 0.6, textTransform: "uppercase" },
  notificationCounterRow: { flexDirection: "row", gap: 8 },
  notificationCounterValue: { fontSize: 25, fontWeight: "900" },
  notificationDrawer: { backgroundColor: "rgba(12,26,45,0.97)", borderColor: "rgba(20,221,230,0.24)", gap: 12, maxHeight: 650, position: "absolute", right: 18, shadowColor: medicalTheme.primary, shadowOpacity: 0.18, shadowRadius: 28, top: 76, width: 440, zIndex: 80 },
  notificationDrawerMobile: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, bottom: 0, left: 0, maxHeight: "92%", right: 0, top: undefined, width: "100%" },
  notificationFilters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  notificationIcon: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  notificationIconCritical: { backgroundColor: "rgba(239,68,68,0.12)", borderColor: `${medicalTheme.critical}66` },
  notificationHint: { color: medicalTheme.primary, fontSize: 10, fontWeight: "800", lineHeight: 15 },
  notificationList: { maxHeight: 356 },
  notificationMessage: { color: medicalTheme.muted, fontSize: 12, lineHeight: 17 },
  notificationMeta: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", marginTop: 4, textTransform: "uppercase" },
  notificationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 70 },
  notificationSearchBox: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 13, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 42, paddingHorizontal: 10 },
  notificationSearchInput: { color: medicalTheme.text, flex: 1, fontSize: 13 },
  notificationTextWrap: { flex: 1, minWidth: 0 },
  notificationTitle: { color: medicalTheme.text, flex: 1, fontSize: 13, fontWeight: "900" },
  notificationTitleRow: { alignItems: "center", flex: 1, flexDirection: "row", gap: 10, minWidth: 0 },
  pageScroll: { gap: 16, padding: 18, paddingBottom: 42 },
  pageSubtitle: { color: medicalTheme.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  pageTitle: { color: medicalTheme.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.6 },
  breadcrumb: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  searchBox: { alignItems: "center", backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 44, paddingHorizontal: 12, width: 280 },
  searchBoxFocused: { borderColor: medicalTheme.primary, shadowColor: medicalTheme.primary, shadowOpacity: 0.2, shadowRadius: 14 },
  searchEmptyText: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", lineHeight: 18, padding: 10 },
  searchErrorText: { color: medicalTheme.critical, fontSize: 12, fontWeight: "800", lineHeight: 18, padding: 10 },
  searchInput: { color: medicalTheme.text, flex: 1, fontSize: 13 },
  searchPanel: { backgroundColor: "rgba(12,26,45,0.98)", gap: 6, maxHeight: 430, padding: 10, position: "absolute", right: 0, shadowColor: "#000", shadowOpacity: 0.34, shadowRadius: 24, top: 52, width: 380, zIndex: 90 },
  searchPanelTitle: { color: medicalTheme.text, fontSize: 12, fontWeight: "900", letterSpacing: 0.6, paddingHorizontal: 8, paddingVertical: 6, textTransform: "uppercase" },
  searchRecentRow: { alignItems: "center", borderRadius: 12, flexDirection: "row", gap: 9, minHeight: 38, paddingHorizontal: 10 },
  searchResultIcon: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 10, borderWidth: 1, height: 34, justifyContent: "center", width: 34 },
  searchResultRow: { alignItems: "center", borderRadius: 12, flexDirection: "row", gap: 10, padding: 9 },
  searchResultSubtitle: { color: medicalTheme.muted, fontSize: 11, fontWeight: "700", marginTop: 2 },
  searchResultText: { flex: 1, minWidth: 0 },
  searchResultTitle: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
  searchWrap: { position: "relative", zIndex: 95 },
  section: { gap: 14 },
  sectionHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
  sheetHandle: { alignSelf: "center", backgroundColor: "rgba(148,163,184,0.54)", borderRadius: 999, height: 4, marginBottom: 2, width: 44 },
  sectionSubtitle: { color: medicalTheme.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  sectionTitle: { color: medicalTheme.text, fontSize: 18, fontWeight: "900" },
  sectionTitleWrap: { flex: 1 },
  shellRoot: { backgroundColor: medicalTheme.background, flex: 1, flexDirection: "row" },
  sidebar: { backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRightWidth: 1, width: 306 },
  sidebarCollapsed: { width: 82 },
  shortcutHint: { backgroundColor: "#0A2236", borderColor: medicalTheme.border, borderRadius: 7, borderWidth: 1, color: medicalTheme.muted, fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 6, paddingVertical: 3 },
  smallIconButton: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 9, borderWidth: 1, height: 32, justifyContent: "center", width: 32 },
  statCard: { flex: 1, gap: 9, minWidth: 158 },
  statIcon: { alignItems: "center", borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
  statLabel: { color: medicalTheme.muted, fontSize: 12, fontWeight: "800" },
  statValue: { color: medicalTheme.text, fontSize: 24, fontWeight: "900" },
  swipeActionRail: { ...StyleSheet.absoluteFillObject, alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 18 },
  swipeActionText: { fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  swipeFrame: { borderRadius: 20, marginBottom: 10, overflow: "hidden" },
  titleBlock: { flex: 1, minWidth: 0 },
  topActions: { alignItems: "center", flexDirection: "row", gap: 10 },
  topbar: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 14, paddingBottom: 16, paddingHorizontal: 18 },
  tooltip: { backgroundColor: medicalTheme.cardAlt, borderColor: medicalTheme.border, borderRadius: 10, borderWidth: 1, left: 58, paddingHorizontal: 10, paddingVertical: 7, position: "absolute", shadowColor: "#000", shadowOpacity: 0.24, shadowRadius: 14, zIndex: 30 },
  tooltipText: { color: medicalTheme.text, fontSize: 12, fontWeight: "900", minWidth: 96 },
  userCard: { alignItems: "center", backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 12, margin: 18, padding: 12 },
  userCardCollapsed: { justifyContent: "center", marginHorizontal: 12, paddingHorizontal: 0 },
  userName: { color: medicalTheme.text, fontSize: 14, fontWeight: "900" },
  userRole: { color: medicalTheme.muted, fontSize: 12, fontWeight: "700", marginTop: 2 },
  userText: { flex: 1, minWidth: 0 },
});
