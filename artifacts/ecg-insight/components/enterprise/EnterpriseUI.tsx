import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, Slot, usePathname, useRouter } from "expo-router";
import React, { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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

import { useAuth } from "@/context/AuthContext";
import { useDashboardStore } from "@/context/DashboardStore";
import { BoltAppShell } from "@/design-system/shell";
import { APP_NAV_ITEMS, resolvePageMeta, roleRank } from "@/routes";
import { deleteNotification, listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRecord } from "@/services/collaboration";
import { globalSearch, type GlobalSearchResult } from "@/services/search";
import { medicalTheme } from "@/theme/medicalTheme";
import { safeArray } from "@/utils/collections";

export { medicalTheme };

type NavItem = (typeof APP_NAV_ITEMS)[number];

const NAV_ITEMS = APP_NAV_ITEMS;

function pageMeta(pathname: string) {
  return resolvePageMeta(pathname);
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
  const queryClient = useQueryClient();
  const { authToken, logout, user } = useAuth();
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null);
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
  const isCopilotWorkspace = pathname.startsWith("/copilot");
  const isEcgMonitorWorkspace =
    pathname.startsWith("/ecg-monitor")
    || pathname.startsWith("/ecg-workspace")
    || pathname.startsWith("/ecg-viewer")
    || pathname.startsWith("/ecg-live-monitor");
  const isFullBleedWorkspace = isCopilotWorkspace || isEcgMonitorWorkspace;
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
  const notifications = safeArray(notificationQuery.data?.notifications);
  const unreadCount = safeArray(notifications).filter((item) => !item.read).length;
  const criticalCount = safeArray(notifications).filter((item) => isCriticalNotification(item)).length;
  const filteredNotifications = useMemo(() => safeArray(notifications).filter((item) => notificationMatchesFilter(item, notificationFilter)), [notificationFilter, notifications]);
  const searchResults = safeArray(searchQuery.data?.results);
  const showSearchPanel = searchFocused && (searchText.trim().length > 0 || safeArray(recentSearches).length > 0);
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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeNotificationCenter();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closeNotificationCenter, notificationOpen]);

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


  return (
    <BoltAppShell
      breadcrumb={`ECG Insight / ${meta.title}`}
      closeDrawer={closeDrawer}
      closeNotificationCenter={closeNotificationCenter}
      criticalCount={criticalCount}
      debouncedSearch={debouncedSearch}
      drawerOpen={drawerOpen}
      expandedNotificationId={expandedNotificationId}
      filteredNotifications={filteredNotifications}
      focusSearch={focusSearch}
      hideSidebar={isEcgMonitorWorkspace}
      isFullBleedWorkspace={isFullBleedWorkspace}
      isMobile={isMobile}
      navItems={navItems}
      notificationFilter={notificationFilter}
      notificationOpen={notificationOpen}
      notificationQueryError={notificationQuery.isError}
      notificationQueryLoading={notificationQuery.isLoading}
      notificationQueryRefetching={notificationQuery.isRefetching}
      notificationSearch={notificationSearch}
      notificationsTotal={notificationQuery.data?.total ?? notifications.length}
      onArchiveNotification={(id) => deleteNotificationMutation.mutate(id)}
      onLogout={() => void logout().then(() => router.replace("/login?force=1" as never))}
      onMarkAllNotificationsRead={() => readAllNotificationMutation.mutate()}
      onMarkNotificationRead={(id) => readNotificationMutation.mutate(id)}
      onNavigate={navigate}
      onNotificationExpand={setExpandedNotificationId}
      onOpenNotification={openNotification}
      onOpenSearchResult={openSearchResult}
      onRefetchNotifications={() => void notificationQuery.refetch()}
      onRememberSearch={rememberSearch}
      onSearchTextChange={setSearchText}
      onSetNotificationFilter={setNotificationFilter}
      onSetNotificationSearch={setNotificationSearch}
      openDrawer={openDrawer}
      pageMeta={meta}
      pathname={pathname}
      readAllPending={readAllNotificationMutation.isPending}
      recentSearches={recentSearches}
      searchFocused={searchFocused}
      searchInputRef={searchInputRef}
      searchQueryError={searchQuery.isError}
      searchQueryLoading={searchQuery.isLoading}
      searchResults={searchResults}
      searchText={searchText}
      showSearchPanel={showSearchPanel}
      sidebarCollapsed={sidebarCollapsed}
      sidebarCompact={sidebarCompact}
      toggleNotificationCenter={toggleNotificationCenter}
      toggleSidebarCollapsed={toggleSidebarCollapsed}
      unreadCount={unreadCount}
      user={{
        avatarInitials: user?.avatarInitials,
        name: user?.name,
        role: user?.role,
      }}
    >
      {children}
    </BoltAppShell>
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

function isCriticalNotification(notification: NotificationRecord) {
  const haystack = `${notification.type} ${notification.category ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  return haystack.includes("critical") || haystack.includes("stemi") || haystack.includes("urgent") || haystack.includes("failed");
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

export function PrimaryButton({ disabled, icon, label, onPress, testID, variant = "primary" }: { disabled?: boolean; icon?: keyof typeof Feather.glyphMap; label: string; onPress: () => void; testID?: string; variant?: "danger" | "outline" | "primary" }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, variant === "outline" && styles.buttonOutline, variant === "danger" && styles.buttonDanger, disabled && styles.buttonDisabled]}
      testID={testID}
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
  contentRootFullBleed: { overflow: "hidden" },
  fullBleedPage: { flex: 1, minHeight: 0, overflow: "hidden" },
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
