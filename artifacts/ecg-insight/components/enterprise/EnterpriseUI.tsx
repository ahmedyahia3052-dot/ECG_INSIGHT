import { Feather } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Redirect, Slot, usePathname, useRouter } from "expo-router";
import React, { PropsWithChildren, ReactNode, useEffect, useMemo, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { deleteNotification, listNotifications, markAllNotificationsRead, markNotificationRead, type NotificationRecord } from "@/services/collaboration";

export const medicalTheme = {
  background: "#06111F",
  border: "#1E3A4A",
  card: "#0C1A2D",
  cardAlt: "#10243A",
  critical: "#F43F5E",
  muted: "#8EA5B8",
  primary: "#14DDE6",
  primaryDark: "#0891B2",
  success: "#22C55E",
  surface: "#081625",
  text: "#F8FAFC",
  warning: "#F59E0B",
};

type NavItem = {
  group: "ACCOUNT" | "ADMINISTRATION" | "CLINICAL" | "WORKSPACE";
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
  { group: "WORKSPACE", href: "/notifications", icon: "bell", title: "Notifications" },
  { group: "ADMINISTRATION", href: "/admin-dashboard", icon: "shield", minRole: "admin", title: "Admin Dashboard" },
  { group: "ADMINISTRATION", href: "/team-management", icon: "user-plus", minRole: "admin", title: "Team Management" },
  { group: "ADMINISTRATION", href: "/owner/licenses", icon: "award", minRole: "super_admin", ownerOnly: true, title: "License Management" },
  { group: "ADMINISTRATION", href: "/billing-subscription", icon: "credit-card", title: "Billing & Subscription" },
  { group: "ACCOUNT", href: "/profile", icon: "user", title: "Profile" },
  { group: "ACCOUNT", href: "/settings", icon: "settings", title: "Settings" },
];

const PAGE_TITLES: Record<string, { subtitle: string; title: string }> = {
  "/analytics": { subtitle: "Enterprise BI, trends, workload, and quality signals.", title: "Analytics" },
  "/admin-dashboard": { subtitle: "Administrative overview, users, subscriptions, and platform health.", title: "Admin Dashboard" },
  "/billing-subscription": { subtitle: "Subscription plan, quota, billing, and license status.", title: "Billing & Subscription" },
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<"ai" | "all" | "critical" | "license" | "system" | "unread">("all");
  const isMobile = width < 860;
  const sidebarCompact = !isMobile && sidebarCollapsed;
  const meta = pageMeta(pathname);
  const navItems = useMemo(() => NAV_ITEMS.filter((item) => {
    if (item.ownerOnly && user?.email?.toLowerCase() !== "ahmedyahia3052@gmail.com") return false;
    return !item.minRole || roleRank(user?.role) >= roleRank(item.minRole);
  }), [user?.isOwner, user?.protectedOwner, user?.role]);
  const notificationQuery = useQuery({
    enabled: !!authToken?.token,
    queryFn: () => listNotifications(authToken!.token, new URLSearchParams({ pageSize: "30" })),
    queryKey: ["enterprise-shell-notifications", authToken?.token],
    retry: false,
  });
  const unreadCount = notificationQuery.data?.notifications.filter((item) => !item.read).length ?? 0;
  const filteredNotifications = useMemo(() => (notificationQuery.data?.notifications ?? []).filter((item) => notificationMatchesFilter(item, notificationFilter)), [notificationFilter, notificationQuery.data?.notifications]);
  const invalidateNotifications = () => {
    void queryClient.invalidateQueries({ queryKey: ["enterprise-shell-notifications", authToken?.token] });
    void queryClient.invalidateQueries({ queryKey: ["enterprise-notifications", authToken?.token] });
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
    setDrawerOpen(false);
    setNotificationOpen(false);
    router.push(href as never);
  };

  const openNotification = (notification: NotificationRecord) => {
    readNotificationMutation.mutate(notification.id);
    navigate(notification.actionUrl ?? (notification.caseId ? `/ecg-cases/${notification.caseId}` : notification.patientId ? `/patients/${notification.patientId}` : notification.reportId ? `/reports/${notification.reportId}` : "/notifications"));
  };

  useEffect(() => {
    if (!notificationOpen || typeof document === "undefined") return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNotificationOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [notificationOpen]);

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
          onPress={() => setSidebarCollapsed((value) => !value)}
          style={styles.collapseButton}
        >
          <Feather name={sidebarCollapsed ? "chevrons-right" : "chevrons-left"} size={17} color={medicalTheme.primary} />
          {!sidebarCompact ? <Text style={styles.collapseText}>Collapse</Text> : null}
        </Pressable>
      ) : null}

      <ScrollView contentContainerStyle={[styles.navScroll, sidebarCompact && styles.navScrollCollapsed]} showsVerticalScrollIndicator={false}>
        {(["CLINICAL", "WORKSPACE", "ADMINISTRATION", "ACCOUNT"] as const).map((group) => {
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
                    key={item.href}
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
                    {item.href === "/notifications" ? <View style={styles.badgeDot} /> : null}
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
          <Pressable style={styles.backdrop} onPress={() => setDrawerOpen(false)} />
          {sidebar}
        </View>
      ) : null}
      <View style={styles.contentRoot}>
        <View style={[styles.topbar, { paddingTop: isMobile ? insets.top + 12 : 18 }]}>
          {isMobile ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Open navigation" onPress={() => setDrawerOpen(true)} style={styles.iconButton}>
              <Feather name="menu" size={20} color={medicalTheme.text} />
            </Pressable>
          ) : null}
          <View style={styles.titleBlock}>
            <Text style={styles.breadcrumb}>ECG Insight / {meta.title}</Text>
            <Text style={styles.pageTitle}>{meta.title}</Text>
            <Text style={styles.pageSubtitle}>{meta.subtitle}</Text>
          </View>
          <View style={styles.topActions}>
            <View style={[styles.searchBox, searchFocused && styles.searchBoxFocused]}>
              <Feather name="search" size={16} color={medicalTheme.muted} />
              <TextInput
                accessibilityLabel="Global search"
                onBlur={() => setSearchFocused(false)}
                onFocus={() => setSearchFocused(true)}
                placeholder="Search patient, ECG ID, report, physician..."
                placeholderTextColor={medicalTheme.muted}
                style={styles.searchInput}
              />
              <Text style={styles.shortcutHint}>Ctrl+K</Text>
            </View>
            <Pressable accessibilityLabel="Notifications" accessibilityRole="button" onPress={() => setNotificationOpen((value) => !value)} style={styles.iconButton}>
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
          <Pressable style={styles.notificationBackdrop} onPress={() => setNotificationOpen(false)} />
          <Card style={styles.notificationDrawer}>
            <SectionHeader
              title="Notification Center"
              subtitle={`${unreadCount} unread • ${notificationQuery.data?.total ?? 0} total`}
              action={<PrimaryButton label="Read All" onPress={() => readAllNotificationMutation.mutate()} variant="outline" />}
            />
            <View style={styles.notificationFilters}>
              {(["all", "unread", "critical", "system", "license", "ai"] as const).map((filter) => (
                <PrimaryButton key={filter} label={filter} onPress={() => setNotificationFilter(filter)} variant={notificationFilter === filter ? "primary" : "outline"} />
              ))}
            </View>
            <ScrollView style={styles.notificationList} showsVerticalScrollIndicator>
              {filteredNotifications.length ? filteredNotifications.map((notification) => (
                <View key={notification.id} style={styles.notificationRow}>
                  <View style={styles.notificationIcon}>
                    <Feather name={notificationIcon(notification)} size={16} color={notificationColor(notification)} />
                  </View>
                  <Pressable onPress={() => openNotification(notification)} style={styles.notificationTextWrap}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text numberOfLines={3} style={styles.notificationMessage}>{notification.message}</Text>
                    <Text style={styles.notificationMeta}>{formatDate(notification.timestamp)} • {notification.read ? "Read" : "Unread"}</Text>
                  </Pressable>
                  <View style={styles.notificationActions}>
                    <Badge label={notification.type} tone={notification.type === "critical" ? "critical" : "primary"} />
                    <Pressable accessibilityLabel="Mark notification read" onPress={() => readNotificationMutation.mutate(notification.id)} style={styles.smallIconButton}>
                      <Feather name="check" size={14} color={medicalTheme.success} />
                    </Pressable>
                    <Pressable accessibilityLabel="Dismiss notification" onPress={() => deleteNotificationMutation.mutate(notification.id)} style={styles.smallIconButton}>
                      <Feather name="trash-2" size={14} color={medicalTheme.critical} />
                    </Pressable>
                  </View>
                </View>
              )) : <EmptyState title="No notifications" message="No notifications match this filter." />}
            </ScrollView>
            <PrimaryButton label="Open Full Notification Center" onPress={() => navigate("/notifications")} variant="outline" />
          </Card>
        </View>
      ) : null}
    </View>
  );
}

function notificationMatchesFilter(notification: NotificationRecord, filter: "ai" | "all" | "critical" | "license" | "system" | "unread") {
  const haystack = `${notification.type} ${notification.entityType ?? ""} ${notification.title} ${notification.message}`.toLowerCase();
  if (filter === "all") return true;
  if (filter === "unread") return !notification.read;
  return haystack.includes(filter);
}

function notificationIcon(notification: NotificationRecord): keyof typeof Feather.glyphMap {
  const haystack = `${notification.type} ${notification.entityType ?? ""} ${notification.title}`.toLowerCase();
  if (haystack.includes("critical")) return "alert-triangle";
  if (haystack.includes("license")) return "award";
  if (haystack.includes("ai")) return "cpu";
  if (haystack.includes("system")) return "server";
  return "bell";
}

function notificationColor(notification: NotificationRecord) {
  if (notification.type === "critical") return medicalTheme.critical;
  if (notification.type === "warning") return medicalTheme.warning;
  if (notification.type === "success") return medicalTheme.success;
  return medicalTheme.primary;
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
  navScrollCollapsed: { alignItems: "center", paddingHorizontal: 10 },
  navText: { color: medicalTheme.muted, flex: 1, fontSize: 14, fontWeight: "800" },
  navTextActive: { color: medicalTheme.text },
  notificationActions: { flexDirection: "row", gap: 6 },
  notificationBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,6,23,0.08)" },
  notificationDrawer: { backgroundColor: "rgba(12,26,45,0.96)", gap: 12, maxHeight: 600, position: "absolute", right: 18, shadowColor: "#000", shadowOpacity: 0.34, shadowRadius: 28, top: 76, width: 420, zIndex: 80 },
  notificationFilters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  notificationIcon: { alignItems: "center", backgroundColor: medicalTheme.surface, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, height: 38, justifyContent: "center", width: 38 },
  notificationList: { maxHeight: 390 },
  notificationMessage: { color: medicalTheme.muted, fontSize: 12, lineHeight: 17 },
  notificationMeta: { color: medicalTheme.primary, fontSize: 10, fontWeight: "900", marginTop: 4, textTransform: "uppercase" },
  notificationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 70 },
  notificationRow: { alignItems: "center", borderBottomColor: medicalTheme.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, paddingVertical: 10 },
  notificationTextWrap: { flex: 1, gap: 2 },
  notificationTitle: { color: medicalTheme.text, fontSize: 13, fontWeight: "900" },
  pageScroll: { gap: 16, padding: 18, paddingBottom: 42 },
  pageSubtitle: { color: medicalTheme.muted, fontSize: 13, lineHeight: 19, marginTop: 3 },
  pageTitle: { color: medicalTheme.text, fontSize: 26, fontWeight: "900", letterSpacing: -0.6 },
  breadcrumb: { color: medicalTheme.primary, fontSize: 11, fontWeight: "900", letterSpacing: 0.8, textTransform: "uppercase" },
  searchBox: { alignItems: "center", backgroundColor: medicalTheme.card, borderColor: medicalTheme.border, borderRadius: 12, borderWidth: 1, flexDirection: "row", gap: 8, minHeight: 44, paddingHorizontal: 12, width: 280 },
  searchBoxFocused: { borderColor: medicalTheme.primary, shadowColor: medicalTheme.primary, shadowOpacity: 0.2, shadowRadius: 14 },
  searchInput: { color: medicalTheme.text, flex: 1, fontSize: 13 },
  section: { gap: 14 },
  sectionHeader: { alignItems: "flex-start", flexDirection: "row", gap: 12, justifyContent: "space-between" },
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
